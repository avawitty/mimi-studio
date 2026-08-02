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
  close: () => Promise<void>;
};

/** One statement per entry — Neon HTTP and many pg configs reject multi-statement queries. */
export const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS profiles (
  uid TEXT PRIMARY KEY,
  handle TEXT UNIQUE,
  display_name TEXT,
  photo_url TEXT,
  data TEXT NOT NULL,
  updated_at BIGINT NOT NULL
)`,
  `CREATE TABLE IF NOT EXISTS zines (
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
)`,
  `CREATE TABLE IF NOT EXISTS pocket_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  saved_at BIGINT NOT NULL,
  data TEXT NOT NULL
)`,
] as const;

/** Joined form for SQLite `exec` convenience. */
export const SCHEMA_SQL = `${SCHEMA_STATEMENTS.join(";\n")};`;

export const INDEX_SQL = [
  `CREATE INDEX IF NOT EXISTS idx_zines_public_ts ON zines (is_public, timestamp DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_zines_user_ts ON zines (user_id, timestamp DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_pocket_user_saved ON pocket_items (user_id, saved_at DESC)`,
];
