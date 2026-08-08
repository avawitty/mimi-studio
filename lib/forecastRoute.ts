import { z } from "zod";
import {
  cors,
  readJsonBody,
  requireMethod,
  sendError,
  sendJson,
  validateBody,
} from "./apiUtils.js";
import { verifyMimiSession } from "./serverFirebaseAdmin.js";
import { handleForecastCompose } from "./forecast/serverComposeForecast.js";

const composeBodySchema = z.object({
  scope: z.enum(["personal", "brand"]),
  refreshEvidence: z.boolean().optional(),
});

/**
 * POST /api/forecast — compose ForecastReport server-side, persist snapshot, return residue artifact.
 */
export async function handleForecastRoute(req: any, res: any) {
  if (cors(req, res)) return;
  if (!requireMethod(req, res, "POST")) return;

  try {
    const decoded = await verifyMimiSession(req.headers || {});
    const body = await readJsonBody(req);
    const input = validateBody(res, composeBodySchema, body);
    if (!input) return;

    const snapshot = await handleForecastCompose({
      uid: decoded.uid,
      scope: input.scope,
    });

    sendJson(res, 200, {
      snapshot,
      persisted: true,
    });
  } catch (error) {
    const code = String((error as { code?: unknown })?.code || "");
    const status = Number((error as { status?: unknown })?.status) || 500;
    const authCodes = new Set([
      "MISSING_MIMI_SESSION",
      "INVALID_MIMI_SESSION",
      "FIREBASE_ADMIN_UNAVAILABLE",
    ]);

    sendError(
      res,
      authCodes.has(code) ? 401 : status,
      error instanceof Error ? error.message : "Forecast compose failed.",
      code || undefined,
    );
  }
}
