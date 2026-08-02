import type { Pool, PoolClient, QueryResult } from "pg";
import {
  INDEX_SQL,
  SCHEMA_SQL,
  applySchemaMigrations,
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

const makeStatement = (
  queryable: { query: (text: string, params?: unknown[]) => Promise<QueryResult> },
  sql: string,
): SovereignStatement => {
  const text = toPg(sql);
  return {
    run: async (...params: unknown[]): Promise<SovereignRunResult> => {
      const result = await queryable.query(text, params);
      return { changes: result.rowCount || 0 };
    },
    get: async <T = Record<string, unknown>>(...params: unknown[]) => {
      const result = await queryable.query(text, params);
      return (result.rows[0] as T | undefined) ?? undefined;
    },
    all: async <T = Record<string, unknown>>(...params: unknown[]) => {
      const result = await queryable.query(text, params);
      return result.rows as T[];
    },
  };
};

/**
 * Normalize Postgres URLs for node-pg / Neon.
 * Prefer sslmode=verify-full (cert check) over require (encrypt-only).
 * Drop uselibpqcompat=require pairings that silently disable verification.
 */
export const normalizePostgresConnectionString = (connectionString: string): string => {
  try {
    const url = new URL(connectionString);
    const isNeon = /neon\.tech/i.test(url.hostname);
    url.searchParams.delete("uselibpqcompat");
    if (isNeon) {
      url.searchParams.set("sslmode", "verify-full");
    } else if (!url.searchParams.get("sslmode")) {
      url.searchParams.set("sslmode", "verify-full");
    } else if (/^require$/i.test(url.searchParams.get("sslmode") || "")) {
      url.searchParams.set("sslmode", "verify-full");
    }
    return url.toString();
  } catch {
    return connectionString;
  }
};

const poolMax = (): number => {
  const raw = Number(process.env.MIMI_SOVEREIGN_PG_POOL_MAX || "");
  if (Number.isFinite(raw) && raw > 0) return Math.min(Math.floor(raw), 20);
  return /neon\.tech/i.test(process.env.MIMI_SOVEREIGN_DATABASE_URL || process.env.DATABASE_URL || "")
    ? 3
    : 8;
};

const runStatements = async (pool: Pool, sql: string) => {
  const parts = sql
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);
  for (const part of parts) {
    await pool.query(part);
  }
};

export const openPostgresDriver = async (connectionString: string): Promise<SovereignDriver> => {
  const { default: pg } = await import("pg");
  const isNeon = /neon\.tech/i.test(connectionString);
  const normalized = normalizePostgresConnectionString(connectionString);
  const max = poolMax();

  const pool: Pool = new pg.Pool({
    connectionString: normalized,
    max,
    idleTimeoutMillis: 30_000,
    // Keep under typical serverless limits so /api/health cannot hang the isolate.
    connectionTimeoutMillis: isNeon || process.env.VERCEL ? 8_000 : 10_000,
    allowExitOnIdle: Boolean(process.env.VERCEL),
    application_name: process.env.MIMI_SOVEREIGN_APP_NAME || "mimi-sovereign",
  });

  pool.on("error", (error) => {
    console.warn("MIMI // Sovereign pg pool error:", error);
  });

  pool.on("connect", (client) => {
    void client.query("SET statement_timeout = 12000").catch(() => {
      // ignore — some roles may lack permission
    });
  });

  await runStatements(pool, SCHEMA_SQL);
  for (const sql of INDEX_SQL) {
    try {
      await pool.query(sql);
    } catch {
      // index may already exist / DESC nuance — ignore
    }
  }

  const driver: SovereignDriver = {
    backend: "postgres",
    pathOrUrl: connectionString.replace(/:[^:@/]+@/, ":***@"),
    exec: async (sql: string) => {
      await pool.query(sql);
    },
    prepare: (sql: string) => makeStatement(pool, sql),
    withTransaction: async <T>(fn: (tx: SovereignDriver) => Promise<T>): Promise<T> => {
      const client: PoolClient = await pool.connect();
      const txDriver: SovereignDriver = {
        backend: "postgres",
        pathOrUrl: driver.pathOrUrl,
        exec: async (sql: string) => {
          await client.query(sql);
        },
        prepare: (sql: string) => makeStatement(client, sql),
        withTransaction: async () => {
          throw new Error("Nested sovereign transactions are not supported");
        },
        close: async () => undefined,
      };
      try {
        await client.query("BEGIN");
        const value = await fn(txDriver);
        await client.query("COMMIT");
        return value;
      } catch (error) {
        try {
          await client.query("ROLLBACK");
        } catch {
          // ignore rollback failures
        }
        throw error;
      } finally {
        client.release();
      }
    },
    ping: async () => {
      const started = Date.now();
      await pool.query("SELECT 1");
      return Date.now() - started;
    },
    close: async () => {
      await pool.end();
    },
  };

  await applySchemaMigrations(driver);
  return driver;
};
