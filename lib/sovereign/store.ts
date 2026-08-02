import type { PocketItem, UserProfile, ZineMetadata } from "../../types";
import { getSovereignDb } from "./db";

const COMMUNITY_CAP = 60;

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
    return { enabled: false, ready: false, zineCount: 0, publicCount: 0 };
  }
  const total = db.prepare("SELECT COUNT(*) AS n FROM zines").get() as { n: number };
  const pub = db.prepare("SELECT COUNT(*) AS n FROM zines WHERE is_public = 1").get() as {
    n: number;
  };
  return {
    enabled: true,
    ready: true,
    zineCount: Number(total?.n || 0),
    publicCount: Number(pub?.n || 0),
  };
};

export const listPublicZines = (count: number): ZineMetadata[] => {
  const db = getSovereignDb();
  if (!db) return [];
  const take = Math.max(0, Math.min(count || 0, COMMUNITY_CAP));
  if (take === 0) return [];

  const rows = db
    .prepare(
      `SELECT data FROM zines
       WHERE is_public = 1
       ORDER BY timestamp DESC
       LIMIT ?`,
    )
    .all(take) as Array<{ data: string }>;

  return rows.map((row) => slimZineForFloor(asZine(row.data)));
};

export const getZineById = (id: string): ZineMetadata | null => {
  const db = getSovereignDb();
  if (!db || !id) return null;
  const row = db.prepare("SELECT data, is_public FROM zines WHERE id = ?").get(id) as
    | { data: string; is_public: number }
    | undefined;
  if (!row) return null;
  const zine = asZine(row.data);
  if (!row.is_public && !zine.isPublic) return null;
  return zine;
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
};

export const deleteZine = (id: string, userId?: string): boolean => {
  const db = getSovereignDb();
  if (!db || !id) return false;
  if (userId) {
    const result = db.prepare("DELETE FROM zines WHERE id = ? AND user_id = ?").run(id, userId);
    return Number(result.changes || 0) > 0;
  }
  const result = db.prepare("DELETE FROM zines WHERE id = ?").run(id);
  return Number(result.changes || 0) > 0;
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
