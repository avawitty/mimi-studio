export type SovereignBackend = "sqlite" | "postgres";

export type SovereignRunResult = { changes: number };

export type SovereignStatement = {
  run: (...params: unknown[]) => Promise<SovereignRunResult>;
  get: <T = Record<string, unknown>>(...params: unknown[]) => Promise<T | undefined>;
  all: <T = Record<string, unknown>>(...params: unknown[]) => Promise<T[]>;
};

export type SovereignDriver = {
  backend: SovereignBackend;
  pathOrUrl: string;
  exec: (sql: string) => Promise<void>;
  prepare: (sql: string) => SovereignStatement;
  /** Run work inside a single transaction when the backend supports it. */
  withTransaction: <T>(fn: () => Promise<T>) => Promise<T>;
  close: () => Promise<void>;
  /** Optional ping — returns round-trip ms or throws. */
  ping?: () => Promise<number>;
};

/** Schema version stored in schema_meta. Bump when adding migrations. */
export const SOVEREIGN_SCHEMA_VERSION = 2;

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS schema_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS profiles (
  uid TEXT PRIMARY KEY,
  handle TEXT UNIQUE,
  display_name TEXT,
  photo_url TEXT,
  data TEXT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS zines (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_handle TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  tone TEXT,
  is_public INTEGER NOT NULL DEFAULT 0,
  published_at BIGINT,
  timestamp BIGINT NOT NULL,
  cover_image_url TEXT,
  likes INTEGER NOT NULL DEFAULT 0,
  data TEXT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS pocket_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  saved_at BIGINT NOT NULL,
  data TEXT NOT NULL
);
`;

export const INDEX_SQL = [
  `CREATE INDEX IF NOT EXISTS idx_zines_public_ts ON zines (is_public, timestamp DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_zines_user_ts ON zines (user_id, timestamp DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_zines_handle ON zines (user_handle)`,
  `CREATE INDEX IF NOT EXISTS idx_pocket_user_saved ON pocket_items (user_id, saved_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_profiles_updated ON profiles (updated_at DESC)`,
];

/** Apply additive migrations after base schema. Idempotent. */
export const applySchemaMigrations = async (driver: SovereignDriver): Promise<void> => {
  const row = await driver
    .prepare("SELECT value FROM schema_meta WHERE key = ?")
    .get<{ value: string }>("schema_version");
  const current = Number(row?.value || 0);

  if (current < 1) {
    await driver
      .prepare(
        `INSERT INTO schema_meta (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      )
      .run("schema_version", "1");
  }

  if (current < 2) {
    // v2: scale indexes (IF NOT EXISTS — safe on re-run)
    for (const sql of [
      `CREATE INDEX IF NOT EXISTS idx_zines_handle ON zines (user_handle)`,
      `CREATE INDEX IF NOT EXISTS idx_profiles_updated ON profiles (updated_at DESC)`,
    ]) {
      try {
        await driver.exec(sql);
      } catch {
        // ignore dialect quirks
      }
    }
    await driver
      .prepare(
        `INSERT INTO schema_meta (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      )
      .run("schema_version", String(SOVEREIGN_SCHEMA_VERSION));
  }
};
