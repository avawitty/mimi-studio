import {
  cors,
  readJsonBody,
  requireMethod,
  sendError,
  sendJson,
  validateBody,
} from "./apiUtils.js";
import { createEvidenceAtomSchema } from "./taste/evidenceAtomSchema.js";
import { getServerFirebaseAdmin, verifyMimiSession } from "./serverFirebaseAdmin.js";

function createAtomId(): string {
  return `ev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * POST /api/mimi/evidence
 * Canonical evidence ingestion for Taste Intelligence.
 *
 * This is deliberately additive. It does not mutate Tailor evidenceNodes or
 * Scribe memory atoms. Those stores can be adapted/migrated independently.
 */
export async function handleMimiEvidenceRoute(req: any, res: any) {
  if (cors(req, res)) return;
  if (!requireMethod(req, res, "POST")) return;

  try {
    const decoded = await verifyMimiSession(req.headers || {});
    const body = await readJsonBody(req);
    const input = validateBody(res, createEvidenceAtomSchema, body);
    if (!input) return;

    const { db } = getServerFirebaseAdmin();
    if (!db) {
      return sendError(
        res,
        503,
        "Taste evidence storage is temporarily unavailable.",
        "FIRESTORE_UNAVAILABLE",
      );
    }

    const now = Date.now();
    const id = createAtomId();
    const atom = {
      id,
      userId: decoded.uid,
      projectId: input.projectId,
      contextId: input.contextId,
      kind: input.kind,
      sourceType: input.sourceType,
      originalSource: input.originalSource,
      title: input.title,
      assetUrl: input.assetUrl,
      thumbnailUrl: input.thumbnailUrl,
      sourceMetadata: input.sourceMetadata,
      extractedText: input.extractedText,
      semanticDescription: input.semanticDescription,
      structuredAttributes: [],
      embeddingRef: input.embeddingRef,
      userReaction: "suggested",
      confidence: input.confidence,
      stabilityClass: input.stabilityClass,
      processingState: input.processingState,
      createdAt: now,
      updatedAt: now,
    };

    // Firestore rejects undefined values. JSON round-trip safely removes optional
    // fields while preserving the immutable originalSource value.
    const persisted = JSON.parse(JSON.stringify(atom));
    await db
      .collection("users")
      .doc(decoded.uid)
      .collection("evidenceAtoms")
      .doc(id)
      .set(persisted);

    sendJson(res, 201, { atom: persisted });
  } catch (error: any) {
    const status = Number(error?.status) || 500;
    const code = error?.code || "EVIDENCE_INGEST_FAILED";
    console.error("MIMI // evidence ingest error:", error);
    sendError(res, status, error?.message || String(error), code);
  }
}
