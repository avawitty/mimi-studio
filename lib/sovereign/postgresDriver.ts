import {
  INDEX_SQL,
  MIGRATION_SQL,
  SCHEMA_STATEMENTS,
  type SovereignDriver,
  type SovereignRunResult,
  type SovereignStatement,
} from "./driver";

/** Convert `?` placeholders to Postgres `$1`, `$2`, … */
export const toPgPlaceholders = (sql: string): string => {
  let i = 0;
  return sql.replace(/\?/g, () => {
    i += 1;
    return `$${i}`;
  });
};

/**
 * Strip sslmode / uselibpqcompat / channel_binding so node-pg / Neon HTTP
 * control TLS explicitly (sslmode=require can weaken rejectUnauthorized).
 */
export const stripPgSslQueryParams = (connectionString: string): string => {
  try {
    const url = new URL(connectionString);
    url.searchParams.delete("sslmode");
    url.searchParams.delete("uselibpqcompat");
    url.searchParams.delete("ssl");
    url.searchParams.delete("channel_binding");
    return url.toString();
  } catch {
    return connectionString
      .replace(/([?&])sslmode=[^&]*/gi, "$1")
      .replace(/([?&])uselibpqcompat=[^&]*/gi, "$1")
      .replace(/([?&])channel_binding=[^&]*/gi, "$1")
      .replace(/[?&]$/, "")
      .replace(/\?&/, "?");
  }
};

const redactUrl = (connectionString: string): string =>
  connectionString.replace(/:[^:@/]+@/, ":***@");

const applySchema = async (exec: (sql: string) => Promise<void>): Promise<void> => {
  for (const sql of SCHEMA_STATEMENTS) {
    await exec(sql);
  }
  for (const sql of MIGRATION_SQL) {
    try {
      await exec(sql);
    } catch {
      // column may already exist
    }
  }
  for (const sql of INDEX_SQL) {
    try {
      await exec(sql);
    } catch {
      // index may already exist / DESC nuance — ignore
    }
  }
};

/** Neon HTTP driver — preferred on Vercel (no node:sqlite, no pg SSL quirks). */
const openNeonHttpDriver = async (connectionString: string): Promise<SovereignDriver> => {
  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(stripPgSslQueryParams(connectionString), {
    fullResults: true,
  });

  await applySchema(async (statement) => {
    await sql.query(statement, []);
  });

  const prepare = (rawSql: string): SovereignStatement => {
    const text = toPgPlaceholders(rawSql);
    return {
      run: async (...params: unknown[]): Promise<SovereignRunResult> => {
        const result = await sql.query(text, params as unknown[]);
        return { changes: Number(result.rowCount || 0) };
      },
      get: async <T = Record<string, unknown>>(...params: unknown[]) => {
        const result = await sql.query(text, params as unknown[]);
        return (result.rows[0] as T | undefined) ?? undefined;
      },
      all: async <T = Record<string, unknown>>(...params: unknown[]) => {
        const result = await sql.query(text, params as unknown[]);
        return result.rows as T[];
      },
    };
  };

  return {
    backend: "postgres",
    pathOrUrl: redactUrl(connectionString),
    exec: async (statement: string) => {
      await sql.query(statement, []);
    },
    prepare,
    close: async () => {
      // HTTP driver is stateless
    },
  };
};

/** Generic Postgres via node-pg (local / non-Neon hosts). */
const openNodePgDriver = async (connectionString: string): Promise<SovereignDriver> => {
  const { default: pg } = await import("pg");
  const pool = new pg.Pool({
    connectionString: stripPgSslQueryParams(connectionString),
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    ssl: /localhost|127\.0\.0\.1/i.test(connectionString)
      ? undefined
      : { rejectUnauthorized: true },
  });

  await applySchema(async (statement) => {
    await pool.query(statement);
  });

  const prepare = (rawSql: string): SovereignStatement => {
    const text = toPgPlaceholders(rawSql);
    return {
      run: async (...params: unknown[]): Promise<SovereignRunResult> => {
        const result = await pool.query(text, params);
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
    pathOrUrl: redactUrl(connectionString),
    exec: async (statement: string) => {
      await pool.query(statement);
    },
    prepare,
    close: async () => {
      await pool.end();
    },
  };
};

export const openPostgresDriver = async (connectionString: string): Promise<SovereignDriver> => {
  if (/neon\.tech/i.test(connectionString)) {
    return openNeonHttpDriver(connectionString);
  }
  return openNodePgDriver(connectionString);
};
