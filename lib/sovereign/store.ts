import type { PocketItem, UserProfile, ZineMetadata } from "../../types.js";
import { cacheGet, cacheInvalidatePrefix, cacheSet } from "./cache.js";
import { getSovereignDb, isSovereignEnabled, resolveSovereignDbPath } from "./db.js";
import { SOVEREIGN_SCHEMA_VERSION } from "./driver.js";
import {
  countIndexedEmbeddings,
  isSovereignGatewayEmbedEnabled,
  scheduleZineEmbedding,
  searchPublicZinesSemantic,
} from "./embeddings.js";
import { emitSovereignEvent } from "./events.js";
import { neonAuthStatusSnippet } from "./neonAuth.js";

const COMMUNITY_CAP = 60;
const FLOOR_CACHE_TTL_MS = 30_000;
const IMPORT_BATCH_CAP = 500;
const POCKET_LIST_CAP = 200;

const asZine = (raw: string): ZineMetadata => JSON.parse(raw) as ZineMetadata;
const asProfile = (raw: string): UserProfile => JSON.parse(raw) as UserProfile;
const asPocket = (raw: string): PocketItem => JSON.parse(raw) as PocketItem;

export type PublicZinePage = {
  zines: ZineMetadata[];
  nextCursor: number | null;
  searchMode?: "recency" | "keyword" | "hybrid" | "semantic";
  embeddingModel?: string | null;
};

/** Slim payload safe for Floor cards (no full pages / artifacts blobs). */
export const slimZineForFloor = (zine: ZineMetadata): ZineMetadata => {
  const content = zine.content || ({} as ZineMetadata["content"]);
  return {
    ...zine,
    artifacts: undefined,
    embedding: undefined,
    content: {
      ...content,
      pages: Array.isArray(content.pages)
        ? content.pages.slice(0, 1).map((page) => {
            const { threadData: _threadData, ...rest } = page as typeof page & {
              threadData?: unknown;
            };
            return {
              ...rest,
              bodyCopy:
                typeof page.bodyCopy === "string" ? page.bodyCopy.slice(0, 400) : page.bodyCopy,
            };
          })
        : [],
      pagesJson: undefined,
    },
  };
};

export const sovereignStatus = async () => {
  const gatewayEmbed = isSovereignGatewayEmbedEnabled();
  const neonAuth = neonAuthStatusSnippet();
  const empty = {
    enabled: isSovereignEnabled(),
    ready: false,
    backend: null as "sqlite" | "postgres" | null,
    path: null as string | null,
    zineCount: 0,
    publicCount: 0,
    profileCount: 0,
    pocketCount: 0,
    schemaVersion: null as number | null,
    latencyMs: null as number | null,
    gatewayEmbed,
    embeddedCount: 0,
    ...neonAuth,
  };

  try {
    const db = await getSovereignDb();
    if (!db) return empty;

    let latencyMs: number | null = null;
    if (db.ping) {
      try {
        latencyMs = await db.ping();
      } catch {
        latencyMs = null;
      }
    }

    const total = await db.prepare("SELECT COUNT(*) AS n FROM zines").get<{ n: number | string }>();
    const pub = await db
      .prepare("SELECT COUNT(*) AS n FROM zines WHERE is_public = 1")
      .get<{ n: number | string }>();
    const profiles = await db
      .prepare("SELECT COUNT(*) AS n FROM profiles")
      .get<{ n: number | string }>();
    const pocket = await db
      .prepare("SELECT COUNT(*) AS n FROM pocket_items")
      .get<{ n: number | string }>();
    const schema = await db
      .prepare("SELECT value FROM schema_meta WHERE key = ?")
      .get<{ value: string }>("schema_version");

    let embeddedCount = 0;
    try {
      embeddedCount = await countIndexedEmbeddings();
    } catch {
      embeddedCount = 0;
    }

    return {
      enabled: true,
      ready: true,
      backend: db.backend,
      path: db.backend === "sqlite" ? resolveSovereignDbPath() : db.pathOrUrl,
      zineCount: Number(total?.n || 0),
      publicCount: Number(pub?.n || 0),
      profileCount: Number(profiles?.n || 0),
      pocketCount: Number(pocket?.n || 0),
      schemaVersion: Number(schema?.value || SOVEREIGN_SCHEMA_VERSION),
      latencyMs,
      gatewayEmbed,
      embeddedCount,
      ...neonAuth,
    };
  } catch (error) {
    console.warn("MIMI // Sovereign status failed:", error);
    return empty;
  }
};

export const listPublicZinesPage = async (
  count: number,
  queryText = "",
  cursor?: number | null,
): Promise<PublicZinePage> => {
  const db = await getSovereignDb();
  if (!db) return { zines: [], nextCursor: null, searchMode: "recency" };
  const take = Math.max(0, Math.min(count || 0, COMMUNITY_CAP));
  if (take === 0) return { zines: [], nextCursor: null, searchMode: "recency" };

  const qRaw = queryText.trim();
  const q = qRaw.toLowerCase();
  const cursorTs =
    typeof cursor === "number" && Number.isFinite(cursor) && cursor > 0 ? cursor : null;

  // Hybrid semantic search (AI Gateway) — first page only; pagination stays keyword/recency.
  if (q && !cursorTs && isSovereignGatewayEmbedEnabled()) {
    const cacheKey = `floor:${db.backend}:hybrid:${take}:${q}`;
    const cached = cacheGet<PublicZinePage>(cacheKey);
    if (cached) return cached;

    const keywordRows = await db
      .prepare(
        `SELECT id, data, timestamp FROM zines
         WHERE is_public = 1
           AND (
             lower(title) LIKE ? OR
             lower(user_handle) LIKE ? OR
             lower(coalesce(tone, '')) LIKE ?
           )
         ORDER BY timestamp DESC
         LIMIT ?`,
      )
      .all<{ id: string; data: string; timestamp: number | string }>(
        `%${q}%`,
        `%${q}%`,
        `%${q}%`,
        take * 2,
      );

    const { hits, model, usedGateway } = await searchPublicZinesSemantic(qRaw, take * 2);
    const byId = new Map<
      string,
      { data: string; timestamp: number; keyword: boolean; semantic: number }
    >();

    for (const row of keywordRows) {
      byId.set(row.id, {
        data: row.data,
        timestamp: Number(row.timestamp || 0),
        keyword: true,
        semantic: 0,
      });
    }
    for (const hit of hits) {
      const prev = byId.get(hit.id);
      if (prev) {
        prev.semantic = hit.score;
      } else {
        byId.set(hit.id, {
          data: hit.data,
          timestamp: hit.timestamp,
          keyword: false,
          semantic: hit.score,
        });
      }
    }

    const ranked = [...byId.values()]
      .map((entry) => ({
        ...entry,
        rank: (entry.keyword ? 0.4 : 0) + entry.semantic * 0.6 + entry.timestamp / 1e15,
      }))
      .sort((a, b) => b.rank - a.rank)
      .slice(0, take);

    const page: PublicZinePage = {
      zines: ranked.map((row) => slimZineForFloor(asZine(row.data))),
      // Hybrid rank order is not timestamp-keyset compatible — no page 2.
      nextCursor: null,
      searchMode: usedGateway && hits.length > 0 ? "hybrid" : "keyword",
      embeddingModel: model,
    };
    cacheSet(cacheKey, page, FLOOR_CACHE_TTL_MS);
    return page;
  }

  const cacheKey = `floor:${db.backend}:${take}:${q}:c=${cursorTs ?? "head"}`;
  const cached = cacheGet<PublicZinePage>(cacheKey);
  if (cached) return cached;

  let rows: Array<{ data: string; timestamp: number | string }>;
  if (q) {
    rows = cursorTs
      ? await db
          .prepare(
            `SELECT data, timestamp FROM zines
             WHERE is_public = 1
               AND timestamp < ?
               AND (
                 lower(title) LIKE ? OR
                 lower(user_handle) LIKE ? OR
                 lower(coalesce(tone, '')) LIKE ?
               )
             ORDER BY timestamp DESC
             LIMIT ?`,
          )
          .all<{ data: string; timestamp: number | string }>(
            cursorTs,
            `%${q}%`,
            `%${q}%`,
            `%${q}%`,
            take,
          )
      : await db
          .prepare(
            `SELECT data, timestamp FROM zines
             WHERE is_public = 1
               AND (
                 lower(title) LIKE ? OR
                 lower(user_handle) LIKE ? OR
                 lower(coalesce(tone, '')) LIKE ?
               )
             ORDER BY timestamp DESC
             LIMIT ?`,
          )
          .all<{ data: string; timestamp: number | string }>(
            `%${q}%`,
            `%${q}%`,
            `%${q}%`,
            take,
          );
  } else {
    rows = cursorTs
      ? await db
          .prepare(
            `SELECT data, timestamp FROM zines
             WHERE is_public = 1 AND timestamp < ?
             ORDER BY timestamp DESC
             LIMIT ?`,
          )
          .all<{ data: string; timestamp: number | string }>(cursorTs, take)
      : await db
          .prepare(
            `SELECT data, timestamp FROM zines
             WHERE is_public = 1
             ORDER BY timestamp DESC
             LIMIT ?`,
          )
          .all<{ data: string; timestamp: number | string }>(take);
  }

  const zines = rows.map((row) => slimZineForFloor(asZine(row.data)));
  const nextCursor =
    rows.length === take ? Number(rows[rows.length - 1]?.timestamp || 0) || null : null;
  const page: PublicZinePage = {
    zines,
    nextCursor,
    searchMode: q ? "keyword" : "recency",
  };
  cacheSet(cacheKey, page, FLOOR_CACHE_TTL_MS);
  return page;
};

export const listPublicZines = async (
  count: number,
  queryText = "",
): Promise<ZineMetadata[]> => {
  const page = await listPublicZinesPage(count, queryText, null);
  return page.zines;
};

export const getZineById = async (
  id: string,
  opts?: { requesterUid?: string; includePrivate?: boolean },
): Promise<ZineMetadata | null> => {
  const db = await getSovereignDb();
  if (!db || !id) return null;
  const row = await db
    .prepare("SELECT data, is_public, user_id FROM zines WHERE id = ?")
    .get<{ data: string; is_public: number | string; user_id: string }>(id);
  if (!row) return null;
  const zine = asZine(row.data);
  // Trust the SQL column — JSON `isPublic` can lag after unpublish.
  const isPublic = Number(row.is_public) === 1;
  if (isPublic) return { ...zine, isPublic: true };
  if (opts?.includePrivate && opts.requesterUid && opts.requesterUid === row.user_id) {
    return { ...zine, isPublic: false };
  }
  return null;
};

export const listUserZines = async (
  userId: string,
  opts?: { publicOnly?: boolean; limit?: number },
): Promise<ZineMetadata[]> => {
  const db = await getSovereignDb();
  if (!db || !userId) return [];
  const take = Math.max(1, Math.min(opts?.limit || 100, 200));
  const rows = opts?.publicOnly
    ? await db
        .prepare(
          `SELECT data FROM zines
           WHERE user_id = ? AND is_public = 1
           ORDER BY timestamp DESC
           LIMIT ?`,
        )
        .all<{ data: string }>(userId, take)
    : await db
        .prepare(
          `SELECT data FROM zines
           WHERE user_id = ?
           ORDER BY timestamp DESC
           LIMIT ?`,
        )
        .all<{ data: string }>(userId, take);
  return rows.map((row) => asZine(row.data));
};

export const upsertZine = async (
  zine: ZineMetadata,
  opts?: { skipEmbed?: boolean },
): Promise<void> => {
  const db = await getSovereignDb();
  if (!db) {
    throw new Error("Sovereign archive unavailable");
  }
  if (!zine?.id || !zine.userId) {
    throw new Error("Zine id and userId are required");
  }

  const existing = await db
    .prepare("SELECT user_id FROM zines WHERE id = ?")
    .get<{ user_id: string }>(zine.id);
  if (existing?.user_id && existing.user_id !== zine.userId) {
    throw new Error("Zine id is owned by another user");
  }

  const now = Date.now();
  const isPublic = zine.isPublic ? 1 : 0;
  const timestamp = Number(zine.timestamp || zine.createdAt || now);
  const publishedAt = zine.publishedAt ?? (isPublic ? timestamp : null);
  // Keep JSON payload aligned with the SQL visibility column.
  const payload = JSON.stringify({ ...zine, isPublic: Boolean(isPublic) });

  await db
    .prepare(
      `INSERT INTO zines (
      id, user_id, user_handle, title, tone, is_public, published_at,
      timestamp, cover_image_url, likes, data, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      user_handle = excluded.user_handle,
      title = excluded.title,
      tone = excluded.tone,
      is_public = excluded.is_public,
      published_at = excluded.published_at,
      timestamp = excluded.timestamp,
      cover_image_url = excluded.cover_image_url,
      likes = excluded.likes,
      data = excluded.data,
      updated_at = excluded.updated_at
    WHERE zines.user_id = excluded.user_id`,
    )
    .run(
      zine.id,
      zine.userId,
      zine.userHandle || "",
      zine.title || "Untitled",
      zine.tone || null,
      isPublic,
      publishedAt,
      timestamp,
      zine.coverImageUrl || null,
      Number(zine.likes || 0),
      payload,
      now,
    );
  cacheInvalidatePrefix("floor:");
  emitSovereignEvent({
    type: "zine_upsert",
    id: zine.id,
    userId: zine.userId,
    isPublic: Boolean(isPublic),
  });
  // AI Gateway embedding index (async; skipped when no gateway credential).
  if (!opts?.skipEmbed) {
    scheduleZineEmbedding(zine);
  }
};

/** Destructive — used by export --replace to avoid stale Floor rows. */
export const clearAllZines = async (): Promise<number> => {
  const db = await getSovereignDb();
  if (!db) return 0;
  const before = await db.prepare("SELECT COUNT(*) AS n FROM zines").get<{ n: number | string }>();
  await db.prepare("DELETE FROM zines").run();
  cacheInvalidatePrefix("floor:");
  return Number(before?.n || 0);
};

export const deleteZine = async (id: string, userId?: string): Promise<boolean> => {
  const db = await getSovereignDb();
  if (!db || !id) return false;
  const result = userId
    ? await db.prepare("DELETE FROM zines WHERE id = ? AND user_id = ?").run(id, userId)
    : await db.prepare("DELETE FROM zines WHERE id = ?").run(id);
  const changed = Number(result.changes || 0) > 0;
  if (changed) {
    cacheInvalidatePrefix("floor:");
    emitSovereignEvent({
      type: "zine_delete",
      id,
      userId: userId || "",
    });
  }
  return changed;
};

export const upsertProfile = async (profile: UserProfile): Promise<void> => {
  const db = await getSovereignDb();
  if (!db) throw new Error("Sovereign archive unavailable");
  if (!profile?.uid) throw new Error("Profile uid is required");

  const handle = (profile.handle || "").trim().toLowerCase() || null;
  await db
    .prepare(
      `INSERT INTO profiles (uid, handle, display_name, photo_url, data, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(uid) DO UPDATE SET
       handle = excluded.handle,
       display_name = excluded.display_name,
       photo_url = excluded.photo_url,
       data = excluded.data,
       updated_at = excluded.updated_at`,
    )
    .run(
      profile.uid,
      handle,
      profile.displayName || null,
      profile.photoURL || null,
      JSON.stringify(profile),
      Date.now(),
    );
  emitSovereignEvent({ type: "profile_upsert", uid: profile.uid });
};

export const getProfileByUid = async (uid: string): Promise<UserProfile | null> => {
  const db = await getSovereignDb();
  if (!db || !uid) return null;
  const row = await db
    .prepare("SELECT data FROM profiles WHERE uid = ?")
    .get<{ data: string }>(uid);
  return row ? asProfile(row.data) : null;
};

export const getProfileByHandle = async (handle: string): Promise<UserProfile | null> => {
  const db = await getSovereignDb();
  if (!db) return null;
  const normalized = handle.trim().toLowerCase();
  if (!normalized) return null;
  const row = await db
    .prepare("SELECT data FROM profiles WHERE handle = ?")
    .get<{ data: string }>(normalized);
  return row ? asProfile(row.data) : null;
};

export const listPocketItems = async (
  userId: string,
  opts?: { limit?: number },
): Promise<PocketItem[]> => {
  const db = await getSovereignDb();
  if (!db || !userId) return [];
  const take = Math.max(1, Math.min(opts?.limit || POCKET_LIST_CAP, POCKET_LIST_CAP));
  const rows = await db
    .prepare(
      `SELECT data FROM pocket_items
       WHERE user_id = ?
       ORDER BY saved_at DESC
       LIMIT ?`,
    )
    .all<{ data: string }>(userId, take);
  return rows.map((row) => asPocket(row.data));
};

export const upsertPocketItem = async (item: PocketItem): Promise<void> => {
  const db = await getSovereignDb();
  if (!db) throw new Error("Sovereign archive unavailable");
  if (!item?.id || !item.userId) throw new Error("Pocket item id and userId are required");

  await db
    .prepare(
      `INSERT INTO pocket_items (id, user_id, type, saved_at, data)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       user_id = excluded.user_id,
       type = excluded.type,
       saved_at = excluded.saved_at,
       data = excluded.data`,
    )
    .run(
      item.id,
      item.userId,
      item.type || "text",
      Number(item.savedAt || Date.now()),
      JSON.stringify(item),
    );
  emitSovereignEvent({ type: "pocket_upsert", id: item.id, userId: item.userId });
};

export const deletePocketItem = async (id: string, userId?: string): Promise<boolean> => {
  const db = await getSovereignDb();
  if (!db || !id) return false;
  const result = userId
    ? await db.prepare("DELETE FROM pocket_items WHERE id = ? AND user_id = ?").run(id, userId)
    : await db.prepare("DELETE FROM pocket_items WHERE id = ?").run(id);
  const changed = Number(result.changes || 0) > 0;
  if (changed) {
    emitSovereignEvent({ type: "pocket_delete", id, userId: userId || "" });
  }
  return changed;
};

export const importZines = async (
  zines: ZineMetadata[],
): Promise<{ imported: number; skipped: number; truncated: boolean }> => {
  const db = await getSovereignDb();
  if (!db) throw new Error("Sovereign archive unavailable");

  const truncated = zines.length > IMPORT_BATCH_CAP;
  const batch = zines.slice(0, IMPORT_BATCH_CAP);
  let imported = 0;
  let skipped = 0;

  // Sequential upserts (no shared prepare hijack). Embeds deferred to reindex.
  for (const zine of batch) {
    if (!zine?.id || !zine.userId) {
      skipped += 1;
      continue;
    }
    try {
      await upsertZine(zine, { skipEmbed: true });
      imported += 1;
    } catch {
      skipped += 1;
    }
  }

  return { imported, skipped, truncated };
};

/** Seed a small public demo shelf when the archive is empty (opt-in). */
export const seedDemoShelfIfEmpty = async (): Promise<number> => {
  if (process.env.MIMI_SOVEREIGN_SEED_DEMO !== "1") return 0;
  const db = await getSovereignDb();
  if (!db) return 0;
  const status = await sovereignStatus();
  if (status.publicCount > 0) return 0;

  const now = Date.now();
  const demos: ZineMetadata[] = [
    {
      id: "sovereign_demo_press",
      userId: "mimi_press",
      userHandle: "mimi",
      title: "The Press Is Open",
      tone: "editorial",
      timestamp: now - 60_000,
      createdAt: now - 60_000,
      likes: 12,
      isPublic: true,
      publishedAt: now - 60_000,
      fragmentsUsed: [],
      theme: "sovereign",
      aestheticVector: {},
      coverImageUrl: null,
      content: {
        title: "The Press Is Open",
        headlines: ["A shelf that belongs to the house"],
        vocal_summary_blurb:
          "Public issues now live in Mimi’s own archive — quiet, local, free of cloud quotas.",
        pages: [
          {
            pageNumber: 1,
            bodyCopy:
              "Floor reads no longer spend Firebase free-tier units. Publish once; the stand remembers.",
          },
        ],
      } as ZineMetadata["content"],
    },
    {
      id: "sovereign_demo_floor",
      userId: "mimi_press",
      userHandle: "mimi",
      title: "Notes from the Floor",
      tone: "research",
      timestamp: now - 120_000,
      createdAt: now - 120_000,
      likes: 7,
      isPublic: true,
      publishedAt: now - 120_000,
      fragmentsUsed: [],
      theme: "sovereign",
      aestheticVector: {},
      content: {
        title: "Notes from the Floor",
        headlines: ["Covers as plates"],
        vocal_summary_blurb: "The Floor is a shelf, not a feed. Come back when something new lands.",
        pages: [
          {
            pageNumber: 1,
            bodyCopy: "Search the stand. Filter by tone. Leave when you’ve found your issue.",
          },
        ],
      } as ZineMetadata["content"],
    },
  ];

  await upsertProfile({
    uid: "mimi_press",
    handle: "mimi",
    displayName: "Mimi Press",
    photoURL: null,
  } as UserProfile);

  for (const zine of demos) await upsertZine(zine);
  return demos.length;
};
