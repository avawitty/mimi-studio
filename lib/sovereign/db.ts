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
import type { SovereignDriver } from "./driver.js";

let driverInstance: SovereignDriver | null = null;
/** True after a successful open that returned null (feature disabled). */
let initSettledDisabled = false;
/** True after open threw — retry allowed after cooldown (Neon cold start / TLS blips). */
let initFailed = false;
let lastInitFailureAt = 0;
/** Last open failure message (truncated) for /api/sovereign/status diagnostics. */
let lastInitError: string | null = null;
let initPromise: Promise<SovereignDriver | null> | null = null;

/** Cooldown before retrying a failed Postgres/SQLite open in the same isolate. */
const INIT_RETRY_COOLDOWN_MS = 5_000;

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
  // Vercel: Neon/Postgres only — SQLite is not durable and crashes some runtimes.
  if (process.env.VERCEL) {
    return hasPostgres;
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
    const { openPostgresDriver } = await import("./postgresDriver.js");
    const driver = await openPostgresDriver(postgresUrl);
    console.info(`MIMI // Sovereign archive ready (postgres): ${driver.pathOrUrl}`);
    return driver;
  }

  // Vercel serverless: require Neon/Postgres.
  if (process.env.VERCEL) {
    console.warn(
      "MIMI // Sovereign archive: set DATABASE_URL (Neon) or MIMI_SOVEREIGN_DATABASE_URL on Vercel",
    );
    return null;
  }

  // Local/Fly only. Non-literal specifier so esbuild/nft do not pack sqlite into
  // API lambdas that import this module for status/health.
  const dbPath = resolveSovereignDbPath();
  const sqliteSpecifier = `./${"sqlite"}Driver.js`;
  const sqliteModule = (await import(sqliteSpecifier)) as {
    openSqliteDriver: (path: string) => Promise<SovereignDriver>;
  };
  const driver = await sqliteModule.openSqliteDriver(dbPath);
  console.info(`MIMI // Sovereign archive ready (sqlite): ${dbPath}`);
  return driver;
};

/** Open (or return) the sovereign driver. Null when disabled / unavailable. */
export const getSovereignDb = async (): Promise<SovereignDriver | null> => {
  if (driverInstance) return driverInstance;
  if (initPromise) return initPromise;
  if (initSettledDisabled) return null;
  if (initFailed && Date.now() - lastInitFailureAt < INIT_RETRY_COOLDOWN_MS) {
    return null;
  }

  initPromise = openDriver()
    .then((driver) => {
      driverInstance = driver;
      initFailed = false;
      lastInitError = null;
      if (!driver) {
        // Disabled on this host — do not spin-retry every request.
        initSettledDisabled = true;
        return null;
      }
      import("./store.js")
        .then(({ seedDemoShelfIfEmpty }) => seedDemoShelfIfEmpty())
        .then((seeded) => {
          if (seeded > 0) {
            console.info(`MIMI // Sovereign demo shelf seeded (${seeded} issues)`);
          }
        })
        .catch(() => {
          // ignore seed failures at boot
        });
      return driver;
    })
    .catch((error: unknown): null => {
      console.warn("MIMI // Sovereign archive unavailable:", error);
      driverInstance = null;
      initFailed = true;
      lastInitFailureAt = Date.now();
      lastInitError =
        error instanceof Error
          ? error.message.slice(0, 240)
          : String(error).slice(0, 240);
      return null;
    })
    .finally(() => {
      initPromise = null;
    });

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
  initSettledDisabled = false;
  initFailed = false;
  lastInitFailureAt = 0;
  lastInitError = null;
  initPromise = null;
};

/** Latest driver open failure (ops / status); null when healthy or never failed. */
export const getSovereignLastInitError = (): string | null => lastInitError;
