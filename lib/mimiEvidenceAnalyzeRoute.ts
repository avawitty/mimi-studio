import { z } from "zod";
import {
  cors,
  readJsonBody,
  requireMethod,
  sendError,
  sendJson,
  validateBody,
} from "./apiUtils.js";
import { verifyMimiSession, getServerFirebaseAdmin } from "./serverFirebaseAdmin.js";
import { runEvidenceAtomAnalysis } from "./taste/evidenceAtomAnalysis.js";
import { resolveRouteGatewayKey } from "./mimiFundedText.js";

const analyzeSchema = z.object({
  atomId: z.string().min(1),
});

/**
 * POST /api/mimi/evidence/analyze
 * Trigger interpretation for a pending evidence atom (session auth).
 */
export async function handleMimiEvidenceAnalyzeRoute(req: any, res: any) {
  if (cors(req, res)) return;
  if (!requireMethod(req, res, "POST")) return;

  try {
    const decoded = await verifyMimiSession(req.headers || {});
    const body = await readJsonBody(req);
    const input = validateBody(res, analyzeSchema, body);
    if (!input) return;

    const { db } = getServerFirebaseAdmin();
    if (!db) {
      sendError(res, 503, "Firestore is temporarily unavailable.");
      return;
    }

    const { apiKey, denialReason } = await resolveRouteGatewayKey(req, "vision_analysis");
    if (!apiKey) {
      sendError(
        res,
        403,
        denialReason === "credits_exhausted"
          ? "Mimi membership credits are exhausted."
          : "AI Gateway is required to interpret evidence.",
        denialReason || "missing_gateway_key",
      );
      return;
    }

    await runEvidenceAtomAnalysis(db, decoded.uid, input.atomId, apiKey);

    sendJson(res, 200, { atomId: input.atomId, status: "analyzed" });
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
      error instanceof Error ? error.message : "Evidence analysis failed.",
    );
  }
}
