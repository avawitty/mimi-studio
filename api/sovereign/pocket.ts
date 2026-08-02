import { cors, readJsonBody, sendError, sendJson, validateBody } from "../../lib/apiUtils.js";
import { authorizeSovereignWrite } from "../../lib/sovereign/auth.js";
import { isSovereignEnabled } from "../../lib/sovereign/db.js";
import {
  deletePocketItem,
  listPocketItems,
  upsertPocketItem,
} from "../../lib/sovereign/store.js";
import type { PocketItem } from "../../types";

const pocketBodySchema = {
  safeParse: (input: unknown): { success: boolean; data?: { item: PocketItem }; error?: any } => {
    const body = input as { item?: PocketItem };
    if (!body?.item || typeof body.item !== "object" || !body.item.id || !body.item.userId) {
      return {
        success: false,
        error: { issues: [{ path: ["item"], message: "item.id and item.userId required" }] },
      };
    }
    return { success: true, data: { item: body.item } };
  },
};

/**
 * GET    /api/sovereign/pocket?userId=
 * POST   /api/sovereign/pocket
 * DELETE /api/sovereign/pocket?id=&userId=
 */
export default async function handler(req: any, res: any) {
  if (cors(req, res)) return;

  if (!isSovereignEnabled()) {
    return sendError(res, 503, "Sovereign archive disabled on this host.", "SOVEREIGN_DISABLED");
  }

  try {
    if (req.method === "GET") {
      const userId = String(req.query?.userId || req.headers?.["x-user-id"] || "").trim();
      if (!userId) return sendError(res, 400, "userId required", "MISSING_UID");
      const auth = await authorizeSovereignWrite(req, userId);
      if (auth.ok === false) {
        return sendError(res, auth.status, auth.message, auth.code);
      }
      const items = await listPocketItems(userId);
      res.setHeader("Cache-Control", "private, no-store");
      return sendJson(res, 200, { items, count: items.length });
    }

    if (req.method === "POST") {
      const body = await readJsonBody(req);
      const parsed = validateBody<{ item: PocketItem }>(res, pocketBodySchema, body);
      if (!parsed) return;
      const auth = await authorizeSovereignWrite(req, parsed.item.userId);
      if (auth.ok === false) {
        return sendError(res, auth.status, auth.message, auth.code);
      }
      await upsertPocketItem(parsed.item);
      return sendJson(res, 200, { ok: true, id: parsed.item.id, via: auth.via });
    }

    if (req.method === "DELETE") {
      const id = String(req.query?.id || req.params?.id || "").trim();
      const userId = String(req.query?.userId || req.headers?.["x-user-id"] || "").trim();
      if (!id || !userId) return sendError(res, 400, "id and userId required", "MISSING_FIELDS");
      const auth = await authorizeSovereignWrite(req, userId);
      if (auth.ok === false) {
        return sendError(res, auth.status, auth.message, auth.code);
      }
      const deleted = await deletePocketItem(id, userId);
      return sendJson(res, 200, { ok: deleted, id });
    }

    return sendError(res, 405, `Method ${req.method} not allowed`, "METHOD_NOT_ALLOWED");
  } catch (error: any) {
    return sendError(res, 500, error?.message || String(error), "SOVEREIGN_POCKET_FAILED");
  }
}
