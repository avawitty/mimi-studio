import { cors, readJsonBody, requireMethod, sendError, sendJson } from "../../lib/apiUtils.js";
import { isSovereignEnabled } from "../../lib/sovereign/db.js";
import {
  isSovereignGatewayEmbedEnabled,
  reindexZineEmbeddings,
} from "../../lib/sovereign/embeddings.js";
import { sovereignStatus } from "../../lib/sovereign/store.js";

const authorizeReindex = (req: any): boolean => {
  const ingestKey = process.env.MIMI_SOVEREIGN_INGEST_KEY?.trim();
  const provided =
    String(req.headers?.["x-mimi-ingest-key"] || "").trim() ||
    String(req.headers?.["x-api-key"] || "").trim();
  if (ingestKey) return Boolean(provided && provided === ingestKey);
  return !process.env.VERCEL;
};

/**
 * POST /api/sovereign/reindex
 * Backfill AI Gateway embeddings for sovereign zines.
 * Body: { limit?: number, force?: boolean }
 */
export default async function handler(req: any, res: any) {
  if (cors(req, res)) return;
  if (!requireMethod(req, res, "POST")) return;

  if (!isSovereignEnabled()) {
    return sendError(res, 503, "Sovereign archive disabled on this host.", "SOVEREIGN_DISABLED");
  }
  if (!isSovereignGatewayEmbedEnabled()) {
    return sendError(
      res,
      503,
      "AI Gateway embeddings unavailable (set AI_GATEWAY_API_KEY).",
      "GATEWAY_EMBED_DISABLED",
    );
  }
  if (!authorizeReindex(req)) {
    return sendError(res, 401, "Reindex requires MIMI_SOVEREIGN_INGEST_KEY", "UNAUTHORIZED");
  }

  try {
    const body = (await readJsonBody(req)) || {};
    const limit = Number(body.limit || 50);
    const force = Boolean(body.force);
    const result = await reindexZineEmbeddings({
      limit: Number.isFinite(limit) ? limit : 50,
      force,
    });
    return sendJson(res, 200, {
      ok: true,
      ...result,
      archive: await sovereignStatus(),
    });
  } catch (error: any) {
    return sendError(res, 500, error?.message || String(error), "SOVEREIGN_REINDEX_FAILED");
  }
}
