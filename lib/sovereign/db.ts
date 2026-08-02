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
import { openPostgresDriver } from "./postgresDriver";
import { openSqliteDriver } from "./sqliteDriver";

let driverInstance: SovereignDriver | null = null;
let initAttempted = false;
let initPromise: Promise<SovereignDriver | null> | null = null;

export const isSovereignEnabled = (): boolean => {
  if (process.env.MIMI_SOVEREIGN_ENABLED === "0" || process.env.MIMI_SOVEREIGN_ENABLED === "false") {
    return false;
  }
  const hasPostgres = Boolean(
    process.env.MIMI_SOVEREIGN_DATABASE_URL?.trim() ||
      (process.env.MIMI_SOVEREIGN_USE_DATABASE_URL === "1" && process.env.DATABASE_URL?.trim()),
  );
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

const resolvePostgresUrl = (): string | null => {
  const explicit = process.env.MIMI_SOVEREIGN_DATABASE_URL?.trim();
  if (explicit) return explicit;
  if (process.env.MIMI_SOVEREIGN_USE_DATABASE_URL === "1") {
    return process.env.DATABASE_URL?.trim() || null;
  }
  return null;
};

const openDriver = async (): Promise<SovereignDriver | null> => {
  if (!isSovereignEnabled()) return null;

  const postgresUrl = resolvePostgresUrl();
  if (postgresUrl) {
    const driver = await openPostgresDriver(postgresUrl);
    console.info(`MIMI // Sovereign archive ready (postgres): ${driver.pathOrUrl}`);
    return driver;
  }

  const dbPath = resolveSovereignDbPath();
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
