import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  INDEX_SQL,
  SCHEMA_SQL,
  applySchemaMigrations,
  type SovereignDriver,
  type SovereignRunResult,
  type SovereignStatement,
} from "./driver";

export const openSqliteDriver = async (dbPath: string): Promise<SovereignDriver> => {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA synchronous = NORMAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec("PRAGMA busy_timeout = 5000;");
  db.exec(SCHEMA_SQL);
  for (const sql of INDEX_SQL) {
    try {
      db.exec(sql);
    } catch {
      // Some SQLite builds reject DESC in index defs; non-fatal.
    }
  }

  const prepare = (sql: string): SovereignStatement => {
    const stmt = db.prepare(sql);
    return {
      run: async (...params: unknown[]): Promise<SovereignRunResult> => {
        const result = stmt.run(...(params as never[]));
        return { changes: Number((result as { changes?: number })?.changes || 0) };
      },
      get: async <T = Record<string, unknown>>(...params: unknown[]) =>
        stmt.get(...(params as never[])) as T | undefined,
      all: async <T = Record<string, unknown>>(...params: unknown[]) =>
        stmt.all(...(params as never[])) as T[],
    };
  };

  const driver: SovereignDriver = {
    backend: "sqlite",
    pathOrUrl: dbPath,
    exec: async (sql: string) => {
      db.exec(sql);
    },
    prepare,
    withTransaction: async <T>(fn: (tx: SovereignDriver) => Promise<T>): Promise<T> => {
      db.exec("BEGIN");
      try {
        // SQLite is process-local; the same prepare() is already serialized.
        const value = await fn(driver);
        db.exec("COMMIT");
        return value;
      } catch (error) {
        try {
          db.exec("ROLLBACK");
        } catch {
          // ignore
        }
        throw error;
      }
    },
    ping: async () => {
      const started = Date.now();
      db.prepare("SELECT 1").get();
      return Date.now() - started;
    },
    close: async () => {
      db.close();
    },
  };

  await applySchemaMigrations(driver);
  return driver;
};
