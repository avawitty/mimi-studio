import type { Pool, QueryResult } from "pg";
import {
  INDEX_SQL,
  SCHEMA_SQL,
  type SovereignDriver,
  type SovereignRunResult,
  type SovereignStatement,
} from "./driver";

/** Convert `?` placeholders to Postgres `$1`, `$2`, … */
const toPg = (sql: string): string => {
  let i = 0;
  return sql.replace(/\?/g, () => {
    i += 1;
    return `$${i}`;
  });
};

export const openPostgresDriver = async (connectionString: string): Promise<SovereignDriver> => {
  const { default: pg } = await import("pg");
  const pool: Pool = new pg.Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 30_000,
  });

  await pool.query(SCHEMA_SQL);
  for (const sql of INDEX_SQL) {
    try {
      await pool.query(sql);
    } catch {
      // index may already exist / DESC nuance — ignore
    }
  }

  const prepare = (sql: string): SovereignStatement => {
    const text = toPg(sql);
    return {
      run: async (...params: unknown[]): Promise<SovereignRunResult> => {
        const result: QueryResult = await pool.query(text, params);
        return { changes: result.rowCount || 0 };
      },
      get: async <T = Record<string, unknown>>(...params: unknown[]) => {
        const result = await pool.query(text, params);
        return (result.rows[0] as T | undefined) ?? undefined;
      },
      all: async <T = Record<string, unknown>>(...params: unknown[]) => {
        const result = await pool.query(text, params);
        return result.rows as T[];
      },
    };
  };

  return {
    backend: "postgres",
    pathOrUrl: connectionString.replace(/:[^:@/]+@/, ":***@"),
    exec: async (sql: string) => {
      await pool.query(sql);
    },
    prepare,
    close: async () => {
      await pool.end();
    },
  };
};
