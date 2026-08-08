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
import { searchEvidenceAtomsSemantic } from "./taste/evidenceAtomRetrieval.js";
import { resolveRouteGatewayKey } from "./mimiFundedText.js";

const searchSchema = z.object({
  query: z.string().trim().min(1).max(8000),
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
  projectId: z.string().trim().min(1).max(120).optional(),
  maxResults: z.number().int().min(1).max(24).optional(),
});

/**
 * POST /api/mimi/evidence/search
 * Semantic search over embedded evidence atoms (session auth).
 */
export async function handleMimiEvidenceSearchRoute(req: any, res: any) {
  if (cors(req, res)) return;
  if (!requireMethod(req, res, "POST")) return;

  try {
    const decoded = await verifyMimiSession(req.headers || {});
    const body = await readJsonBody(req);
    const input = validateBody(res, searchSchema, body);
    if (!input) return;

    const { db } = getServerFirebaseAdmin();
    if (!db) {
      sendError(res, 503, "Firestore is temporarily unavailable.");
      return;
    }

    const { apiKey, denialReason } = await resolveRouteGatewayKey(req, "embedding");
    if (!apiKey) {
      sendError(
        res,
        403,
        denialReason === "credits_exhausted"
          ? "Mimi membership credits are exhausted."
          : "AI Gateway is required for semantic evidence search.",
        denialReason || "missing_gateway_key",
      );
      return;
    }

    const results = await searchEvidenceAtomsSemantic(
      db,
      decoded.uid,
      input.query,
      apiKey,
      {
        context: input.context,
        projectId: input.projectId,
        maxResults: input.maxResults,
      },
    );

    sendJson(res, 200, {
      results: results.map((entry) => ({
        atom: entry.atom,
        score: entry.score,
      })),
    });
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
      error instanceof Error ? error.message : "Evidence search failed.",
    );
  }
}
