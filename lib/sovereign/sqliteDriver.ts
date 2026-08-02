import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  INDEX_SQL,
  SCHEMA_SQL,
  type SovereignDriver,
  type SovereignRunResult,
  type SovereignStatement,
} from "./driver";

export const openSqliteDriver = async (dbPath: string): Promise<SovereignDriver> => {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
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

  return {
    backend: "sqlite",
    pathOrUrl: dbPath,
    exec: async (sql: string) => {
      db.exec(sql);
    },
    prepare,
    close: async () => {
      db.close();
    },
  };
};
