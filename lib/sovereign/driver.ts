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
  /**
   * Run work inside a single transaction.
   * Callback receives a tx-scoped driver — never mutates the shared prepare().
   */
  withTransaction: <T>(fn: (tx: SovereignDriver) => Promise<T>) => Promise<T>;
  close: () => Promise<void>;
  /** Optional ping — returns round-trip ms or throws. */
  ping?: () => Promise<number>;
};

/** Schema version stored in schema_meta. Bump when adding migrations. */
export const SOVEREIGN_SCHEMA_VERSION = 3;

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
  updated_at BIGINT NOT NULL,
  embedding TEXT,
  embedding_model TEXT,
  embedding_dims INTEGER,
  embedding_updated_at BIGINT
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
  `CREATE INDEX IF NOT EXISTS idx_zines_public_embed ON zines (is_public, embedding_updated_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_pocket_user_saved ON pocket_items (user_id, saved_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_profiles_updated ON profiles (updated_at DESC)`,
];

const setSchemaVersion = async (driver: SovereignDriver, version: number) => {
  await driver
    .prepare(
      `INSERT INTO schema_meta (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    )
    .run("schema_version", String(version));
};

/** Apply additive migrations after base schema. Idempotent. */
export const applySchemaMigrations = async (driver: SovereignDriver): Promise<void> => {
  const row = await driver
    .prepare("SELECT value FROM schema_meta WHERE key = ?")
    .get<{ value: string }>("schema_version");
  const current = Number(row?.value || 0);

  if (current < 1) {
    await setSchemaVersion(driver, 1);
  }

  if (current < 2) {
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
    await setSchemaVersion(driver, 2);
  }

  if (current < 3) {
    // AI Gateway embedding columns (additive; ignore if already present).
    for (const sql of [
      `ALTER TABLE zines ADD COLUMN embedding TEXT`,
      `ALTER TABLE zines ADD COLUMN embedding_model TEXT`,
      `ALTER TABLE zines ADD COLUMN embedding_dims INTEGER`,
      `ALTER TABLE zines ADD COLUMN embedding_updated_at BIGINT`,
      `CREATE INDEX IF NOT EXISTS idx_zines_public_embed ON zines (is_public, embedding_updated_at DESC)`,
    ]) {
      try {
        await driver.exec(sql);
      } catch {
        // column/index may already exist
      }
    }
    await setSchemaVersion(driver, SOVEREIGN_SCHEMA_VERSION);
  }
};
