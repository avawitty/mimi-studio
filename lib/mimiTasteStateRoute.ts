import { z } from "zod";
import {
  cors,
  requireMethod,
  sendError,
  sendJson,
} from "./apiUtils.js";
import { verifyMimiSession, getServerFirebaseAdmin } from "./serverFirebaseAdmin.js";
import { getServerTasteState } from "./taste/serverTasteState.js";
import { getServerAiGatewayKey } from "./aiGatewayCompat.js";
import type { TasteScope } from "../types.js";

const querySchema = z.object({
  context: z
    .enum([
      "global",
      "project",
      "brand",
      "fashion",
      "interface",
      "editorial",
      "experimental",
    ])
    .optional(),
  q: z.string().trim().min(1).max(8000).optional(),
});

/**
 * GET /api/mimi/taste-state
 * Returns computed TasteState for the signed-in user (server-side).
 */
export async function handleMimiTasteStateRoute(req: any, res: any) {
  if (cors(req, res)) return;
  if (!requireMethod(req, res, "GET")) return;

  try {
    const decoded = await verifyMimiSession(req.headers || {});
    const parsed = querySchema.safeParse(req.query || {});
    if (!parsed.success) {
      sendError(res, 400, parsed.error.issues[0]?.message || "Invalid query.");
      return;
    }

    const { db } = getServerFirebaseAdmin();
    if (!db) {
      sendError(res, 503, "Firestore is temporarily unavailable.");
      return;
    }

    const context = parsed.data.context as TasteScope | undefined;
    const state = await getServerTasteState(db, decoded.uid, context, {
      queryText: parsed.data.q,
      apiKey: getServerAiGatewayKey(),
    });

    sendJson(res, 200, { state });
  } catch (error) {
    const code = String((error as { code?: unknown })?.code || "");
    const isAuth = new Set([
      "MISSING_MIMI_SESSION",
      "INVALID_MIMI_SESSION",
      "FIREBASE_ADMIN_UNAVAILABLE",
    ]).has(code);

    sendError(
      res,
      isAuth ? 401 : 500,
      error instanceof Error ? error.message : "Taste state unavailable.",
    );
  }
}
