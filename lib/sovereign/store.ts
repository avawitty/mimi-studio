import type { PocketItem, UserProfile, ZineMetadata } from "../../types";
import { cacheGet, cacheInvalidatePrefix, cacheSet } from "./cache";
import { getSovereignDb, resolveSovereignDbPath } from "./db";

const COMMUNITY_CAP = 60;
const FLOOR_CACHE_TTL_MS = 30_000;

const asZine = (raw: string): ZineMetadata => JSON.parse(raw) as ZineMetadata;
const asProfile = (raw: string): UserProfile => JSON.parse(raw) as UserProfile;
const asPocket = (raw: string): PocketItem => JSON.parse(raw) as PocketItem;

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

export const sovereignStatus = () => {
  const db = getSovereignDb();
  if (!db) {
    return {
      enabled: false,
      ready: false,
      backend: "sqlite" as const,
      path: null as string | null,
      zineCount: 0,
      publicCount: 0,
      profileCount: 0,
      pocketCount: 0,
    };
  }
  const total = db.prepare("SELECT COUNT(*) AS n FROM zines").get() as { n: number };
  const pub = db.prepare("SELECT COUNT(*) AS n FROM zines WHERE is_public = 1").get() as {
    n: number;
  };
  const profiles = db.prepare("SELECT COUNT(*) AS n FROM profiles").get() as { n: number };
  const pocket = db.prepare("SELECT COUNT(*) AS n FROM pocket_items").get() as { n: number };
  return {
    enabled: true,
    ready: true,
    backend: "sqlite" as const,
    path: resolveSovereignDbPath(),
    zineCount: Number(total?.n || 0),
    publicCount: Number(pub?.n || 0),
    profileCount: Number(profiles?.n || 0),
    pocketCount: Number(pocket?.n || 0),
  };
};

export const listPublicZines = (count: number, queryText = ""): ZineMetadata[] => {
  const db = getSovereignDb();
  if (!db) return [];
  const take = Math.max(0, Math.min(count || 0, COMMUNITY_CAP));
  if (take === 0) return [];

  const q = queryText.trim().toLowerCase();
  const cacheKey = `floor:${take}:${q}`;
  const cached = cacheGet<ZineMetadata[]>(cacheKey);
  if (cached) return cached;

  let rows: Array<{ data: string }>;
  if (q) {
    rows = db
      .prepare(
        `SELECT data FROM zines
         WHERE is_public = 1
           AND (
             lower(title) LIKE ? OR
             lower(user_handle) LIKE ? OR
             lower(coalesce(tone, '')) LIKE ?
           )
         ORDER BY timestamp DESC
         LIMIT ?`,
      )
      .all(`%${q}%`, `%${q}%`, `%${q}%`, take) as Array<{ data: string }>;
  } else {
    rows = db
      .prepare(
        `SELECT data FROM zines
         WHERE is_public = 1
         ORDER BY timestamp DESC
         LIMIT ?`,
      )
      .all(take) as Array<{ data: string }>;
  }

  const result = rows.map((row) => slimZineForFloor(asZine(row.data)));
  cacheSet(cacheKey, result, FLOOR_CACHE_TTL_MS);
  return result;
};

export const getZineById = (
  id: string,
  opts?: { requesterUid?: string; includePrivate?: boolean },
): ZineMetadata | null => {
  const db = getSovereignDb();
  if (!db || !id) return null;
  const row = db.prepare("SELECT data, is_public, user_id FROM zines WHERE id = ?").get(id) as
    | { data: string; is_public: number; user_id: string }
    | undefined;
  if (!row) return null;
  const zine = asZine(row.data);
  const isPublic = Boolean(row.is_public || zine.isPublic);
  if (isPublic) return zine;
  if (opts?.includePrivate && opts.requesterUid && opts.requesterUid === row.user_id) {
    return zine;
  }
  return null;
};

export const listUserZines = (
  userId: string,
  opts?: { publicOnly?: boolean; limit?: number },
): ZineMetadata[] => {
  const db = getSovereignDb();
  if (!db || !userId) return [];
  const take = Math.max(1, Math.min(opts?.limit || 100, 200));
  const rows = opts?.publicOnly
    ? (db
        .prepare(
          `SELECT data FROM zines
           WHERE user_id = ? AND is_public = 1
           ORDER BY timestamp DESC
           LIMIT ?`,
        )
        .all(userId, take) as Array<{ data: string }>)
    : (db
        .prepare(
          `SELECT data FROM zines
           WHERE user_id = ?
           ORDER BY timestamp DESC
           LIMIT ?`,
        )
        .all(userId, take) as Array<{ data: string }>);
  return rows.map((row) => asZine(row.data));
};

export const upsertZine = (zine: ZineMetadata): void => {
  const db = getSovereignDb();
  if (!db) {
    throw new Error("Sovereign archive unavailable");
  }
  if (!zine?.id || !zine.userId) {
    throw new Error("Zine id and userId are required");
  }

  const now = Date.now();
  const isPublic = zine.isPublic ? 1 : 0;
  const timestamp = Number(zine.timestamp || zine.createdAt || now);
  const publishedAt = zine.publishedAt ?? (isPublic ? timestamp : null);
  const payload = JSON.stringify(zine);

  db.prepare(
    `INSERT INTO zines (
      id, user_id, user_handle, title, tone, is_public, published_at,
      timestamp, cover_image_url, likes, data, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      user_id = excluded.user_id,
      user_handle = excluded.user_handle,
      title = excluded.title,
      tone = excluded.tone,
      is_public = excluded.is_public,
      published_at = excluded.published_at,
      timestamp = excluded.timestamp,
      cover_image_url = excluded.cover_image_url,
      likes = excluded.likes,
      data = excluded.data,
      updated_at = excluded.updated_at`,
  ).run(
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
};

export const deleteZine = (id: string, userId?: string): boolean => {
  const db = getSovereignDb();
  if (!db || !id) return false;
  const result = userId
    ? db.prepare("DELETE FROM zines WHERE id = ? AND user_id = ?").run(id, userId)
    : db.prepare("DELETE FROM zines WHERE id = ?").run(id);
  const changed = Number(result.changes || 0) > 0;
  if (changed) cacheInvalidatePrefix("floor:");
  return changed;
};

export const upsertProfile = (profile: UserProfile): void => {
  const db = getSovereignDb();
  if (!db) throw new Error("Sovereign archive unavailable");
  if (!profile?.uid) throw new Error("Profile uid is required");

  const handle = (profile.handle || "").trim().toLowerCase() || null;
  db.prepare(
    `INSERT INTO profiles (uid, handle, display_name, photo_url, data, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(uid) DO UPDATE SET
       handle = excluded.handle,
       display_name = excluded.display_name,
       photo_url = excluded.photo_url,
       data = excluded.data,
       updated_at = excluded.updated_at`,
  ).run(
    profile.uid,
    handle,
    profile.displayName || null,
    profile.photoURL || null,
    JSON.stringify(profile),
    Date.now(),
  );
};

export const getProfileByUid = (uid: string): UserProfile | null => {
  const db = getSovereignDb();
  if (!db || !uid) return null;
  const row = db.prepare("SELECT data FROM profiles WHERE uid = ?").get(uid) as
    | { data: string }
    | undefined;
  return row ? asProfile(row.data) : null;
};

export const getProfileByHandle = (handle: string): UserProfile | null => {
  const db = getSovereignDb();
  if (!db) return null;
  const normalized = handle.trim().toLowerCase();
  if (!normalized) return null;
  const row = db.prepare("SELECT data FROM profiles WHERE handle = ?").get(normalized) as
    | { data: string }
    | undefined;
  return row ? asProfile(row.data) : null;
};

export const listPocketItems = (userId: string): PocketItem[] => {
  const db = getSovereignDb();
  if (!db || !userId) return [];
  const rows = db
    .prepare(
      `SELECT data FROM pocket_items
       WHERE user_id = ?
       ORDER BY saved_at DESC`,
    )
    .all(userId) as Array<{ data: string }>;
  return rows.map((row) => asPocket(row.data));
};

export const upsertPocketItem = (item: PocketItem): void => {
  const db = getSovereignDb();
  if (!db) throw new Error("Sovereign archive unavailable");
  if (!item?.id || !item.userId) throw new Error("Pocket item id and userId are required");

  db.prepare(
    `INSERT INTO pocket_items (id, user_id, type, saved_at, data)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       user_id = excluded.user_id,
       type = excluded.type,
       saved_at = excluded.saved_at,
       data = excluded.data`,
  ).run(
    item.id,
    item.userId,
    item.type || "text",
    Number(item.savedAt || Date.now()),
    JSON.stringify(item),
  );
};

export const deletePocketItem = (id: string, userId?: string): boolean => {
  const db = getSovereignDb();
  if (!db || !id) return false;
  const result = userId
    ? db.prepare("DELETE FROM pocket_items WHERE id = ? AND user_id = ?").run(id, userId)
    : db.prepare("DELETE FROM pocket_items WHERE id = ?").run(id);
  return Number(result.changes || 0) > 0;
};

export const importZines = (
  zines: ZineMetadata[],
): { imported: number; skipped: number } => {
  let imported = 0;
  let skipped = 0;
  for (const zine of zines) {
    if (!zine?.id || !zine.userId) {
      skipped += 1;
      continue;
    }
    try {
      upsertZine(zine);
      imported += 1;
    } catch {
      skipped += 1;
    }
  }
  return { imported, skipped };
};

/** Seed a small public demo shelf when the archive is empty (opt-in). */
export const seedDemoShelfIfEmpty = (): number => {
  if (process.env.MIMI_SOVEREIGN_SEED_DEMO !== "1") return 0;
  const db = getSovereignDb();
  if (!db) return 0;
  const status = sovereignStatus();
  if (status.publicCount > 0) return 0;

  const now = Date.now();
  const demos: ZineMetadata[] = [
    {
      id: "sovereign_demo_press",
      userId: "mimi_press",
      userHandle: "mimi",
      title: "The Press Is Open",
      tone: "editorial" as ZineMetadata["tone"],
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
      tone: "research" as ZineMetadata["tone"],
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

  upsertProfile({
    uid: "mimi_press",
    handle: "mimi",
    displayName: "Mimi Press",
    photoURL: null,
  } as UserProfile);

  for (const zine of demos) upsertZine(zine);
  return demos.length;
};
