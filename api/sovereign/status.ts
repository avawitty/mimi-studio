import { cors, requireMethod, sendJson } from "../../lib/apiUtils.js";
import {
  isSovereignEnabled,
  resolvePostgresUrl,
  resolveSovereignDbPath,
} from "../../lib/sovereign/db.js";
import { isSovereignGatewayEmbedEnabled } from "../../lib/sovereign/embeddings.js";
import { neonAuthStatusSnippet } from "../../lib/sovereign/neonAuth.js";

// Must exceed Neon connectionTimeoutMillis (15s) + schema apply headroom,
// otherwise cold starts always report offline while open is still racing.
const STATUS_BUDGET_MS = 18_000;

/** Path hint for degraded status — never claim SQLite on Postgres/Neon hosts. */
const statusPathHint = (): string | null => {
  if (!isSovereignEnabled()) return null;
  const pg = resolvePostgresUrl();
  if (pg) return pg.replace(/:[^:@/]+@/, ":***@");
  // Vercel is Postgres-only; avoid advertising a local sqlite path.
  if (process.env.VERCEL) return null;
  return resolveSovereignDbPath();
};

/** GET /api/sovereign/status — archive health for ops + client degraded mode. */
export default async function handler(req: any, res: any) {
  if (cors(req, res)) return;
  if (!requireMethod(req, res, "GET")) return;

  const fallback = {
    enabled: isSovereignEnabled(),
    ready: false,
    backend: null as "sqlite" | "postgres" | null,
    path: statusPathHint(),
    zineCount: 0,
    publicCount: 0,
    profileCount: 0,
    pocketCount: 0,
    schemaVersion: null as number | null,
    latencyMs: null as number | null,
    gatewayEmbed: isSovereignGatewayEmbedEnabled(),
    embeddedCount: 0,
    ...neonAuthStatusSnippet(),
  };

  try {
    const { sovereignStatus } = await import("../../lib/sovereign/store.js");
    const status = await Promise.race([
      sovereignStatus(),
      new Promise<typeof fallback>((resolve) => {
        setTimeout(() => resolve(fallback), STATUS_BUDGET_MS);
      }),
    ]);
    return sendJson(res, 200, {
      ...status,
      enabledFlag: isSovereignEnabled(),
      path: status.path ?? statusPathHint(),
      message: status.ready
        ? `Sovereign archive online (${status.backend || "unknown"})`
        : "Sovereign archive offline — Floor may fall back to Firestore",
    });
  } catch (error: unknown) {
    console.warn("MIMI // sovereign status failed", error);
    return sendJson(res, 200, {
      ...fallback,
      enabledFlag: isSovereignEnabled(),
      message: "Sovereign archive offline — Floor may fall back to Firestore",
      error: error instanceof Error ? error.message.slice(0, 200) : String(error).slice(0, 200),
    });
  }
}
