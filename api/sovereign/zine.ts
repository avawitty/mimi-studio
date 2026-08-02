import { cors, readJsonBody, sendError, sendJson, validateBody } from "../../lib/apiUtils.js";
import { isSovereignEnabled } from "../../lib/sovereign/db.js";
import { deleteZine, getZineById, upsertZine } from "../../lib/sovereign/store.js";
import type { ZineMetadata } from "../../types";

const zineBodySchema = {
  safeParse: (input: unknown): { success: boolean; data?: { zine: ZineMetadata }; error?: any } => {
    const body = input as { zine?: ZineMetadata };
    if (!body?.zine || typeof body.zine !== "object") {
      return { success: false, error: { issues: [{ path: ["zine"], message: "zine object required" }] } };
    }
    if (!body.zine.id || !body.zine.userId) {
      return {
        success: false,
        error: { issues: [{ path: ["zine"], message: "zine.id and zine.userId are required" }] },
      };
    }
    return { success: true, data: { zine: body.zine } };
  },
};

const authorizeWrite = (req: any, userId: string): boolean => {
  if (!userId) return false;

  const ingestKey = process.env.MIMI_SOVEREIGN_INGEST_KEY?.trim();
  if (ingestKey) {
    const provided =
      String(req.headers["x-mimi-ingest-key"] || "").trim() ||
      String(req.headers["x-api-key"] || "").trim();
    return Boolean(provided && provided === ingestKey);
  }

  // Same-origin browser publishes: require matching uid header.
  const headerUid = String(req.headers["x-user-id"] || "").trim();
  return Boolean(headerUid && headerUid === userId);
};

/**
 * GET  /api/sovereign/zines/:id  — public zine document
 * POST /api/sovereign/zines      — upsert (publish mirror)
 * DELETE /api/sovereign/zines/:id
 */
export default async function handler(req: any, res: any) {
  if (cors(req, res)) return;

  if (!isSovereignEnabled()) {
    return sendError(
      res,
      503,
      "Sovereign archive disabled on this host.",
      "SOVEREIGN_DISABLED",
    );
  }

  try {
    if (req.method === "GET") {
      const id = String(req.params?.id || req.query?.id || "").trim();
      if (!id) return sendError(res, 400, "zine id required", "MISSING_ID");
      const zine = getZineById(id);
      if (!zine) return sendError(res, 404, "Zine not found", "NOT_FOUND");
      res.setHeader("Cache-Control", "public, s-maxage=120, stale-while-revalidate=600");
      res.setHeader("X-Mimi-Archive", "sovereign");
      return sendJson(res, 200, { zine });
    }

    if (req.method === "POST") {
      const body = await readJsonBody(req);
      const parsed = validateBody<{ zine: ZineMetadata }>(res, zineBodySchema, body);
      if (!parsed) return;

      if (!authorizeWrite(req, parsed.zine.userId)) {
        return sendError(res, 401, "Unauthorized sovereign write", "UNAUTHORIZED");
      }

      upsertZine(parsed.zine);
      return sendJson(res, 200, { ok: true, id: parsed.zine.id, archive: "sovereign" });
    }

    if (req.method === "DELETE") {
      const id = String(req.params?.id || req.query?.id || "").trim();
      const userId = String(req.headers["x-user-id"] || req.query?.userId || "").trim();
      if (!id) return sendError(res, 400, "zine id required", "MISSING_ID");
      if (!authorizeWrite(req, userId)) {
        return sendError(res, 401, "Unauthorized sovereign write", "UNAUTHORIZED");
      }
      const deleted = deleteZine(id, userId);
      return sendJson(res, 200, { ok: deleted, id });
    }

    return sendError(res, 405, `Method ${req.method} not allowed`, "METHOD_NOT_ALLOWED");
  } catch (error: any) {
    return sendError(res, 500, error?.message || String(error), "SOVEREIGN_ZINE_FAILED");
  }
}
