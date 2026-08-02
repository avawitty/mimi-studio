/**
 * Mimi Sovereign Archive — durable store owned by the Express process.
 *
 * Backends:
 * - SQLite (default): `.data/sovereign.sqlite` or `MIMI_SOVEREIGN_DB`
 * - Postgres: `MIMI_SOVEREIGN_DATABASE_URL` or `DATABASE_URL` (when enabled)
 *
 * Disabled on Vercel serverless unless an explicit durable URL/path is set.
 */

import path from "node:path";
import type { SovereignDriver } from "./driver";

let driverInstance: SovereignDriver | null = null;
let initAttempted = false;
let initPromise: Promise<SovereignDriver | null> | null = null;

/** True when a URL looks like a durable Postgres target (Neon, etc.). */
export const looksLikePostgresUrl = (url: string | undefined | null): boolean => {
  if (!url?.trim()) return false;
  const value = url.trim().toLowerCase();
  return (
    value.startsWith("postgres://") ||
    value.startsWith("postgresql://")
  );
};

/** Neon / pooled hosts — prefer these over local SQLite when present. */
export const looksLikeNeonUrl = (url: string | undefined | null): boolean => {
  if (!looksLikePostgresUrl(url)) return false;
  return url!.toLowerCase().includes("neon.tech");
};

export const isSovereignEnabled = (): boolean => {
  if (process.env.MIMI_SOVEREIGN_ENABLED === "0" || process.env.MIMI_SOVEREIGN_ENABLED === "false") {
    return false;
  }
  const hasPostgres = Boolean(resolvePostgresUrl());
  const hasSqlitePath = Boolean(process.env.MIMI_SOVEREIGN_DB?.trim());
  // Vercel: require durable Postgres URL or explicit sqlite path/volume.
  if (process.env.VERCEL && !hasPostgres && !hasSqlitePath) {
    return false;
  }
  return true;
};

export const resolveSovereignDbPath = (): string => {
  if (process.env.MIMI_SOVEREIGN_DB?.trim()) {
    return path.resolve(process.env.MIMI_SOVEREIGN_DB.trim());
  }
  return path.join(process.cwd(), ".data", "sovereign.sqlite");
};

export const resolvePostgresUrl = (): string | null => {
  const explicit = process.env.MIMI_SOVEREIGN_DATABASE_URL?.trim();
  if (looksLikePostgresUrl(explicit)) return explicit!;

  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!looksLikePostgresUrl(databaseUrl)) return null;

  // Explicit opt-in, or auto when DATABASE_URL is Neon (Vercel integration).
  if (
    process.env.MIMI_SOVEREIGN_USE_DATABASE_URL === "1" ||
    looksLikeNeonUrl(databaseUrl)
  ) {
    return databaseUrl!;
  }
  return null;
};

const openDriver = async (): Promise<SovereignDriver | null> => {
  if (!isSovereignEnabled()) return null;

  const postgresUrl = resolvePostgresUrl();
  if (postgresUrl) {
    // Lazy-load so Vercel/Neon never evaluates node:sqlite.
    const { openPostgresDriver } = await import("./postgresDriver");
    const driver = await openPostgresDriver(postgresUrl);
    console.info(`MIMI // Sovereign archive ready (postgres): ${driver.pathOrUrl}`);
    return driver;
  }

  // Local/Fly only — dynamic import keeps node:sqlite out of serverless bundles.
  const dbPath = resolveSovereignDbPath();
  const { openSqliteDriver } = await import("./sqliteDriver");
  const driver = await openSqliteDriver(dbPath);
  console.info(`MIMI // Sovereign archive ready (sqlite): ${dbPath}`);
  return driver;
};

/** Open (or return) the sovereign driver. Null when disabled / unavailable. */
export const getSovereignDb = async (): Promise<SovereignDriver | null> => {
  if (driverInstance) return driverInstance;
  if (initAttempted && !initPromise) return null;
  if (!initPromise) {
    initAttempted = true;
    initPromise = openDriver()
      .then((driver) => {
        driverInstance = driver;
        if (driver) {
          import("./store")
            .then(({ seedDemoShelfIfEmpty }) => seedDemoShelfIfEmpty())
            .then((seeded) => {
              if (seeded > 0) {
                console.info(`MIMI // Sovereign demo shelf seeded (${seeded} issues)`);
              }
            })
            .catch(() => {
              // ignore seed failures at boot
            });
        }
        return driver;
      })
      .catch((error: unknown): null => {
        console.warn("MIMI // Sovereign archive unavailable:", error);
        driverInstance = null;
        return null;
      })
      .finally(() => {
        initPromise = null;
      });
  }
  return initPromise;
};

/** Test helper — close and forget the singleton. */
export const resetSovereignDbForTests = async () => {
  try {
    await driverInstance?.close();
  } catch {
    // ignore
  }
  driverInstance = null;
  initAttempted = false;
  initPromise = null;
};
