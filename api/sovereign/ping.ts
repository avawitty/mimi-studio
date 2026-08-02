import { cors, requireMethod, sendJson } from "../../lib/apiUtils.js";
import {
  isSovereignEnabled,
  looksLikeNeonUrl,
  resolvePostgresUrl,
} from "../../lib/sovereign/db.js";

/**
 * GET /api/sovereign/ping
 * Env/diagnostics only — does not open a DB driver (safe on Vercel).
 */
export default async function handler(req: any, res: any) {
  if (cors(req, res)) return;
  if (!requireMethod(req, res, "GET")) return;

  const postgresUrl = resolvePostgresUrl();
  return sendJson(res, 200, {
    ok: true,
    vercel: Boolean(process.env.VERCEL),
    enabled: isSovereignEnabled(),
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL?.trim()),
    hasSovereignDatabaseUrl: Boolean(process.env.MIMI_SOVEREIGN_DATABASE_URL?.trim()),
    postgresResolved: Boolean(postgresUrl),
    neonResolved: looksLikeNeonUrl(postgresUrl),
    // never echo credentials — host only
    host: postgresUrl
      ? postgresUrl.replace(/^postgresql?:\/\/[^@]+@/i, "").split("/")[0]
      : null,
  });
}
