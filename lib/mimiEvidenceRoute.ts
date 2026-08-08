/**
 * POST /api/mimi/evidence
 *
 * Creates a new Evidence Atom for the authenticated user.
 *
 * This is the canonical ingestion endpoint for taste-relevant material:
 * images, URLs, text snippets, notes, screenshots, film references, etc.
 *
 * The endpoint:
 *   1. Verifies the Mimi session (Firebase Admin)
 *   2. Validates the request body (Zod)
 *   3. Writes the EvidenceAtom to Firestore users/{uid}/evidenceAtoms/{id}
 *   4. Returns the created atom ID and initial state
 *
 * Processing (embeddings, AI analysis) happens asynchronously via separate
 * POST /api/mimi/analyze-image or POST /api/mimi/embed calls.
 */
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
import type { EvidenceAtom, StabilityClass, TasteScope } from "../types.js";

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const createEvidenceAtomSchema = z.object({
  kind: z.enum(["image", "url", "text", "note", "screenshot", "film", "product", "brand", "generated", "rejection"]),
  sourceType: z.enum([
    "image", "book", "artwork", "website", "screenshot", "note",
    "quote", "fashion", "object", "music", "film", "architecture", "product", "moodboard",
  ]),
  originalSource: z.string().min(1).max(10_000),
  assetUrl: z.string().url().optional(),
  thumbnailUrl: z.string().url().optional(),
  projectId: z.string().optional(),
  contextScope: z.enum([
    "global", "project", "brand", "fashion", "interface", "editorial", "experimental",
  ]).optional(),
  sourceMetadata: z.record(z.string(), z.unknown()).optional(),
  ingestSource: z
    .enum(["tailor", "scribe", "pocket", "darkroom", "api", "direct"])
    .default("direct"),
  tasteImpact: z.boolean().default(true),
  stabilityClass: z
    .enum(["stable", "recurring", "fascination", "project", "temporary", "declared"])
    .default("temporary"),
});

export async function handleMimiEvidenceRoute(req: any, res: any) {
  if (cors(req, res)) return;
  if (!requireMethod(req, res, "POST")) return;

  try {
    const decoded = await verifyMimiSession(req.headers || {});
    const userId = decoded.uid;

    const body = await readJsonBody(req);
    const input = validateBody(res, createEvidenceAtomSchema, body);
    if (!input) return;

    const { db } = getServerFirebaseAdmin();
    if (!db) {
      sendError(res, 503, "Firestore is temporarily unavailable.");
      return;
    }

    const now = Date.now();
    const id = uid();

    const atom: EvidenceAtom = {
      id,
      userId,
      projectId: input.projectId,
      contextScope: input.contextScope as TasteScope | undefined,
      kind: input.kind,
      sourceType: input.sourceType,
      originalSource: input.originalSource, // NEVER overwrite
      assetUrl: input.assetUrl,
      thumbnailUrl: input.thumbnailUrl,
      sourceMetadata: input.sourceMetadata ?? {},
      extractedText: undefined,
      semanticDescription: undefined,
      observationIds: [],
      embeddingRef: undefined,
      ingestSource: input.ingestSource,
      tasteImpact: input.tasteImpact,
      userReaction: "suggested",
      confidence: 0,
      stabilityClass: input.stabilityClass as StabilityClass,
      processingState: "pending",
      createdAt: now,
      updatedAt: now,
    };

    // Remove undefined fields — Firestore Admin SDK does not strip them
    const cleanAtom = JSON.parse(JSON.stringify(atom)) as EvidenceAtom;

    await db
      .collection("users")
      .doc(userId)
      .collection("evidenceAtoms")
      .doc(id)
      .set(cleanAtom);

    sendJson(res, 201, {
      id,
      processingState: "pending",
      createdAt: now,
    });
  } catch (error) {
    const status = Number((error as { status?: unknown })?.status);
    const code = String((error as { code?: unknown })?.code || "EVIDENCE_CREATE_FAILED");
    const isAuth = new Set([
      "MISSING_MIMI_SESSION",
      "INVALID_MIMI_SESSION",
      "FIREBASE_ADMIN_UNAVAILABLE",
    ]).has(code);

    const responseStatus = isAuth
      ? Number.isFinite(status) && status >= 400 && status < 600
        ? status
        : 401
      : 500;

    console.error("MIMI // Evidence atom create failed:", {
      code,
      message: error instanceof Error ? error.message : String(error),
    });

    sendError(
      res,
      responseStatus,
      isAuth
        ? (error instanceof Error ? error.message : "Authentication required.")
        : "Evidence could not be saved. Please try again.",
    );
  }
}
