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
import {
  cors,
  readJsonBody,
  requireMethod,
  sendError,
  sendJson,
  validateBody,
} from "./apiUtils.js";
import { verifyMimiSession, getServerFirebaseAdmin } from "./serverFirebaseAdmin.js";
import { createEvidenceAtomSchema } from "./taste/evidenceAtomSchema.js";
import {
  buildEvidenceAtomFromInput,
  stripUndefinedForFirestore,
} from "./taste/buildEvidenceAtom.js";
import type { EvidenceAtom } from "../types.js";

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

// ─── In-process rate limiter ──────────────────────────────────────────────────
// Token-bucket: 30 evidence writes per user per minute.
// Blunts burst abuse on a single Node isolate; not a distributed limiter.
type RateBucket = { tokens: number; updatedAt: number };
const evidenceBuckets = new Map<string, RateBucket>();
const EVIDENCE_CAPACITY = 30;
const EVIDENCE_REFILL_PER_MS = EVIDENCE_CAPACITY / 60_000;

function allowEvidenceWrite(userId: string): boolean {
  const now = Date.now();
  const current = evidenceBuckets.get(userId) || { tokens: EVIDENCE_CAPACITY, updatedAt: now };
  const elapsed = Math.max(0, now - current.updatedAt);
  const tokens = Math.min(EVIDENCE_CAPACITY, current.tokens + elapsed * EVIDENCE_REFILL_PER_MS);
  if (tokens < 1) {
    evidenceBuckets.set(userId, { tokens, updatedAt: now });
    return false;
  }
  evidenceBuckets.set(userId, { tokens: tokens - 1, updatedAt: now });
  return true;
}

export async function handleMimiEvidenceRoute(req: any, res: any) {
  if (cors(req, res)) return;
  if (!requireMethod(req, res, "POST")) return;

  try {
    const decoded = await verifyMimiSession(req.headers || {});
    const userId = decoded.uid;

    if (!allowEvidenceWrite(userId)) {
      sendError(res, 429, "Too many evidence submissions. Please wait a moment.", "RATE_LIMITED");
      return;
    }

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
    const atom = buildEvidenceAtomFromInput(userId, input, { id, now });
    const cleanAtom = stripUndefinedForFirestore(atom);

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
