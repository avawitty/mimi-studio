import { Pool, neon, neonConfig, type PoolClient } from "@neondatabase/serverless";
import { drizzle as drizzleHttp } from "drizzle-orm/neon-http";
import { drizzle as drizzleWebSocket } from "drizzle-orm/neon-serverless";
import WebSocket from "ws";
import { neonSchema } from "./schema.js";

neonConfig.webSocketConstructor = WebSocket;

const POSTGRES_PROTOCOLS = new Set(["postgres:", "postgresql:"]);

function validateNeonUrl(raw: string, label: string): string {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`${label} must be a valid Postgres connection URL.`);
  }

  if (!POSTGRES_PROTOCOLS.has(parsed.protocol)) {
    throw new Error(`${label} must use the postgres:// or postgresql:// protocol.`);
  }

  const allowNonNeon =
    process.env.MIMI_ALLOW_NON_NEON_DATABASE === "1" ||
    process.env.NODE_ENV === "test";
  if (!allowNonNeon && !parsed.hostname.endsWith(".neon.tech")) {
    throw new Error(
      `${label} must point to Neon Postgres. Set MIMI_ALLOW_NON_NEON_DATABASE=1 only for controlled local tests.`,
    );
  }

  return raw;
}

export function resolveNeonQueryUrl(): string | null {
  const raw = (
    process.env.NEON_DATABASE_URL ||
    process.env.DATABASE_URL ||
    ""
  ).trim();
  return raw ? validateNeonUrl(raw, "NEON_DATABASE_URL/DATABASE_URL") : null;
}

export function resolveNeonPooledUrl(): string | null {
  const raw = (
    process.env.NEON_POOLED_DATABASE_URL ||
    process.env.DATABASE_URL ||
    process.env.NEON_DATABASE_URL ||
    ""
  ).trim();
  return raw ? validateNeonUrl(raw, "NEON_POOLED_DATABASE_URL/DATABASE_URL") : null;
}

export function isNeonOperationalDatabaseConfigured(): boolean {
  return Boolean(resolveNeonQueryUrl() && resolveNeonPooledUrl());
}

export function createNeonQueryDatabase(connectionString?: string) {
  const url = connectionString
    ? validateNeonUrl(connectionString, "connectionString")
    : resolveNeonQueryUrl();
  if (!url) {
    throw new Error("Neon Postgres is not configured. Set DATABASE_URL.");
  }
  const client = neon(url);
  return drizzleHttp({ client, schema: neonSchema });
}

export function createNeonPooledDatabase(client: PoolClient) {
  return drizzleWebSocket({ client, schema: neonSchema });
}

let queryDatabase: ReturnType<typeof createNeonQueryDatabase> | null = null;
let transactionPool: Pool | null = null;

export function getNeonQueryDatabase() {
  if (!queryDatabase) queryDatabase = createNeonQueryDatabase();
  return queryDatabase;
}

export function getNeonTransactionPool(): Pool {
  if (transactionPool) return transactionPool;
  const connectionString = resolveNeonPooledUrl();
  if (!connectionString) {
    throw new Error("Neon pooled Postgres is not configured. Set DATABASE_URL.");
  }

  transactionPool = new Pool({
    connectionString,
    max: Math.max(1, Math.min(Number(process.env.NEON_POOL_MAX || 3) || 3, 10)),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 15_000,
  });
  transactionPool.on("error", (error: Error) => {
    console.warn("MIMI // Neon transaction pool error:", error);
  });
  return transactionPool;
}

export async function closeNeonConnections(): Promise<void> {
  queryDatabase = null;
  if (transactionPool) {
    const pool = transactionPool;
    transactionPool = null;
    await pool.end();
  }
}

export type NeonQueryDatabase = ReturnType<typeof createNeonQueryDatabase>;
export type NeonPooledDatabase = ReturnType<typeof createNeonPooledDatabase>;
export type NeonRepositoryDatabase = NeonQueryDatabase | NeonPooledDatabase;
