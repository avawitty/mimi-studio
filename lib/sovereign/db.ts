/**
 * Mimi Sovereign Archive — durable SQLite owned by the Express process.
 *
 * Default path: `.data/sovereign.sqlite` (gitignored).
 * Override with `MIMI_SOVEREIGN_DB`.
 *
 * Disabled automatically on Vercel serverless unless `MIMI_SOVEREIGN_DB` is set
 * (ephemeral FS would lose data). Prefer Fly/Railway/VPS or local `npm run dev`
 * for the sovereign data plane; Firestore remains a fallback for public reads.
 */

import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

let dbInstance: DatabaseSync | null = null;
let initAttempted = false;

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS profiles (
  uid TEXT PRIMARY KEY,
  handle TEXT UNIQUE,
  display_name TEXT,
  photo_url TEXT,
  data TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS zines (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_handle TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  tone TEXT,
  is_public INTEGER NOT NULL DEFAULT 0,
  published_at INTEGER,
  timestamp INTEGER NOT NULL,
  cover_image_url TEXT,
  likes INTEGER NOT NULL DEFAULT 0,
  data TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_zines_public_ts
  ON zines (is_public, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_zines_user_ts
  ON zines (user_id, timestamp DESC);

CREATE TABLE IF NOT EXISTS pocket_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  saved_at INTEGER NOT NULL,
  data TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pocket_user_saved
  ON pocket_items (user_id, saved_at DESC);
`;

export const isSovereignEnabled = (): boolean => {
  if (process.env.MIMI_SOVEREIGN_ENABLED === "0" || process.env.MIMI_SOVEREIGN_ENABLED === "false") {
    return false;
  }
  // Vercel serverless has no durable disk unless an explicit path/volume is configured.
  if (process.env.VERCEL && !process.env.MIMI_SOVEREIGN_DB) {
    return false;
  }
  return true;
};

export const resolveSovereignDbPath = (): string => {
  if (process.env.MIMI_SOVEREIGN_DB?.trim()) {
    return path.resolve(process.env.MIMI_SOVEREIGN_DB.trim());
  }
  return path.join(process.cwd(), ".data", "sovereign.sqlite");
};

const migrate = (db: DatabaseSync) => {
  db.exec(SCHEMA_SQL);
};

/** Open (or return) the sovereign SQLite database. Null when disabled / unavailable. */
export const getSovereignDb = (): DatabaseSync | null => {
  if (dbInstance) return dbInstance;
  if (initAttempted) return null;
  initAttempted = true;

  if (!isSovereignEnabled()) {
    return null;
  }

  try {
    const dbPath = resolveSovereignDbPath();
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    const db = new DatabaseSync(dbPath);
    migrate(db);
    dbInstance = db;
    console.info(`MIMI // Sovereign archive ready: ${dbPath}`);
    // Lazy import avoids circular init with store ↔ db.
    import("./store")
      .then(({ seedDemoShelfIfEmpty }) => {
        const seeded = seedDemoShelfIfEmpty();
        if (seeded > 0) {
          console.info(`MIMI // Sovereign demo shelf seeded (${seeded} issues)`);
        }
      })
      .catch(() => {
        // ignore seed failures at boot
      });
    return dbInstance;
  } catch (error) {
    console.warn("MIMI // Sovereign archive unavailable:", error);
    return null;
  }
};

/** Test helper — close and forget the singleton. */
export const resetSovereignDbForTests = () => {
  try {
    dbInstance?.close();
  } catch {
    // ignore
  }
  dbInstance = null;
  initAttempted = false;
};
