import { cors, readJsonBody, sendError, sendJson, validateBody } from "../../lib/apiUtils.js";
import { authorizeSovereignWrite } from "../../lib/sovereign/auth.js";
import { isSovereignEnabled } from "../../lib/sovereign/db.js";
import {
  deleteZine,
  getZineById,
  listUserZines,
  upsertZine,
} from "../../lib/sovereign/store.js";
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

/**
 * GET    /api/sovereign/zines/:id
 * GET    /api/sovereign/zines?userId=&publicOnly=
 * POST   /api/sovereign/zines
 * DELETE /api/sovereign/zines/:id
 */
export default async function handler(req: any, res: any) {
  if (cors(req, res)) return;

  if (!isSovereignEnabled()) {
    return sendError(res, 503, "Sovereign archive disabled on this host.", "SOVEREIGN_DISABLED");
  }

  try {
    if (req.method === "GET") {
      const id = String(req.params?.id || req.query?.id || "").trim();
      const userId = String(req.query?.userId || "").trim();

      if (id) {
        const requesterUid = String(req.headers?.["x-user-id"] || "").trim();
        const zine = getZineById(id, {
          requesterUid,
          includePrivate: Boolean(requesterUid),
        });
        if (!zine) return sendError(res, 404, "Zine not found", "NOT_FOUND");
        res.setHeader("Cache-Control", zine.isPublic
          ? "public, s-maxage=120, stale-while-revalidate=600"
          : "private, no-store");
        res.setHeader("X-Mimi-Archive", "sovereign");
        return sendJson(res, 200, { zine });
      }

      if (userId) {
        const publicOnly = String(req.query?.publicOnly || "1") !== "0";
        const requesterUid = String(req.headers?.["x-user-id"] || "").trim();
        const zines = listUserZines(userId, {
          publicOnly: publicOnly || requesterUid !== userId,
          limit: Number(req.query?.limit || 100),
        });
        res.setHeader("X-Mimi-Archive", "sovereign");
        return sendJson(res, 200, { zines, count: zines.length });
      }

      return sendError(res, 400, "zine id or userId required", "MISSING_ID");
    }

    if (req.method === "POST") {
      const body = await readJsonBody(req);
      const parsed = validateBody<{ zine: ZineMetadata }>(res, zineBodySchema, body);
      if (!parsed) return;

      const auth = await authorizeSovereignWrite(req, parsed.zine.userId);
      if (auth.ok === false) {
        return sendError(res, auth.status, auth.message, auth.code);
      }

      upsertZine(parsed.zine);
      return sendJson(res, 200, {
        ok: true,
        id: parsed.zine.id,
        archive: "sovereign",
        via: auth.via,
      });
    }

    if (req.method === "DELETE") {
      const id = String(req.params?.id || req.query?.id || "").trim();
      const userId = String(req.headers["x-user-id"] || req.query?.userId || "").trim();
      if (!id) return sendError(res, 400, "zine id required", "MISSING_ID");
      const auth = await authorizeSovereignWrite(req, userId);
      if (auth.ok === false) {
        return sendError(res, auth.status, auth.message, auth.code);
      }
      const deleted = deleteZine(id, userId);
      return sendJson(res, 200, { ok: deleted, id });
    }

    return sendError(res, 405, `Method ${req.method} not allowed`, "METHOD_NOT_ALLOWED");
  } catch (error: any) {
    return sendError(res, 500, error?.message || String(error), "SOVEREIGN_ZINE_FAILED");
  }
}
