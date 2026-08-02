import type { Pool, QueryResult } from "pg";
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

/**
 * Normalize Postgres URLs for node-pg.
 * Do NOT inject sslmode=require — with uselibpqcompat it maps to
 * rejectUnauthorized:false and silently disables cert verification.
 * TLS is enforced via Pool `ssl: { rejectUnauthorized: true }` instead.
 */
export const normalizePostgresConnectionString = (connectionString: string): string => {
  try {
    const url = new URL(connectionString);
    url.searchParams.delete("sslmode");
    url.searchParams.delete("uselibpqcompat");
    // Keep channel_binding if present; Neon pooler is fine without it.
    return url.toString();
  } catch {
    return connectionString
      .replace(/([?&])sslmode=[^&]*/gi, "$1")
      .replace(/([?&])uselibpqcompat=[^&]*/gi, "$1")
      .replace(/\?&/, "?")
      .replace(/[?&]$/, "");
  }
};

const poolMax = (): number => {
  const raw = Number(process.env.MIMI_SOVEREIGN_PG_POOL_MAX || "");
  if (Number.isFinite(raw) && raw > 0) return Math.min(Math.floor(raw), 20);
  return /neon\.tech/i.test(process.env.MIMI_SOVEREIGN_DATABASE_URL || process.env.DATABASE_URL || "")
    ? 3
    : 8;
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
    connectionTimeoutMillis: isNeon ? 15_000 : 10_000,
    allowExitOnIdle: Boolean(process.env.VERCEL),
    application_name: process.env.MIMI_SOVEREIGN_APP_NAME || "mimi-sovereign",
    ssl: { rejectUnauthorized: true },
  });

  // Bound runaway queries (ms). Neon / Postgres GUC.
  pool.on("connect", (client) => {
    void client.query("SET statement_timeout = 15000").catch(() => {
      // ignore — some roles may lack permission
    });
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

  let txLock: Promise<void> = Promise.resolve();

  const driver: SovereignDriver = {
    backend: "postgres",
    pathOrUrl: connectionString.replace(/:[^:@/]+@/, ":***@"),
    exec: async (sql: string) => {
      await pool.query(sql);
    },
    prepare,
    withTransaction: async <T>(fn: () => Promise<T>): Promise<T> => {
      // Serialize prepare() override so concurrent imports cannot stomp each other.
      let releaseLock: () => void = () => undefined;
      const previous = txLock;
      txLock = new Promise<void>((resolve) => {
        releaseLock = resolve;
      });
      await previous;

      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const originalPrepare = driver.prepare;
        driver.prepare = (sql: string): SovereignStatement => {
          const text = toPg(sql);
          return {
            run: async (...params: unknown[]) => {
              const result = await client.query(text, params);
              return { changes: result.rowCount || 0 };
            },
            get: async <TRow = Record<string, unknown>>(...params: unknown[]) => {
              const result = await client.query(text, params);
              return (result.rows[0] as TRow | undefined) ?? undefined;
            },
            all: async <TRow = Record<string, unknown>>(...params: unknown[]) => {
              const result = await client.query(text, params);
              return result.rows as TRow[];
            },
          };
        };
        try {
          const value = await fn();
          await client.query("COMMIT");
          return value;
        } catch (error) {
          await client.query("ROLLBACK");
          throw error;
        } finally {
          driver.prepare = originalPrepare;
        }
      } finally {
        client.release();
        releaseLock();
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
