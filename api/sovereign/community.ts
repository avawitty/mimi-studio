import { cors, requireMethod, sendError, sendJson } from "../../lib/apiUtils.js";
import { isSovereignEnabled } from "../../lib/sovereign/db.js";
import { listPublicZines, sovereignStatus } from "../../lib/sovereign/store.js";

/**
 * GET /api/sovereign/community?limit=40&q=search
 * Public Floor feed from the sovereign SQLite archive (no Firestore reads).
 */
export default async function handler(req: any, res: any) {
  if (cors(req, res)) return;
  if (!requireMethod(req, res, "GET")) return;

  if (!isSovereignEnabled()) {
    return sendError(
      res,
      503,
      "Sovereign archive disabled on this host (set MIMI_SOVEREIGN_DB for durable storage).",
      "SOVEREIGN_DISABLED",
    );
  }

  try {
    const rawLimit = Number(req.query?.limit ?? req.query?.count ?? 40);
    const limit = Number.isFinite(rawLimit) ? rawLimit : 40;
    const q = String(req.query?.q || req.query?.search || "");
    const zines = await listPublicZines(limit, q);
    const status = await sovereignStatus();

    res.setHeader("Cache-Control", "public, s-maxage=30, stale-while-revalidate=120");
    res.setHeader("X-Mimi-Archive", "sovereign");
    return sendJson(res, 200, {
      zines,
      count: zines.length,
      query: q || null,
      archive: status,
    });
  } catch (error: any) {
    return sendError(res, 500, error?.message || String(error), "SOVEREIGN_COMMUNITY_FAILED");
  }
}
