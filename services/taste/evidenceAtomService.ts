/**
 * Evidence Atom Service
 *
 * Manages the canonical evidence units for Taste Intelligence.
 * Evidence Atoms are the source-of-truth for collected material —
 * images, URLs, text, notes — that inform how the user's taste model evolves.
 *
 * Firestore path: users/{uid}/evidenceAtoms/{id}
 *
 * INVARIANT: originalSource is written once at creation and NEVER overwritten.
 * AI interpretations are stored in separate fields (semanticDescription,
 * observationIds) to preserve the distinction between source and inference.
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebaseInit";
import type {
  AnalysisStatus,
  EvidenceAtom,
  StabilityClass,
  TasteScope,
  UserCurationStatus,
} from "../../types";
import type { CreateEvidenceAtomInput } from "../../lib/taste/evidenceAtomSchema";
import {
  classifyEvidenceAtomQueryError,
} from "../../lib/taste/evidenceAtomQuery";
import { buildEvidenceAtomFromInput } from "../../lib/taste/buildEvidenceAtom";
import { sanitizeFirestoreData } from "../firebaseUtils";
import { scheduleEvidenceAtomAnalysis } from "./scheduleEvidenceAtomAnalysis";

const uid = () =>
  crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

function evidenceAtomsCol(userId: string) {
  return collection(db, "users", userId, "evidenceAtoms");
}

function evidenceAtomRef(userId: string, atomId: string) {
  return doc(db, "users", userId, "evidenceAtoms", atomId);
}

// ─── Create ─────────────────────────────────────────────────────────────────

export interface EvidenceAtomCreateResult {
  id: string;
  atom: EvidenceAtom;
}

/**
 * Create a new Evidence Atom for a user.
 * Sets processingState to 'pending' — the caller should trigger extraction
 * separately (e.g. via POST /api/mimi/analyze-image or the text embedding pipeline).
 */
export async function createEvidenceAtom(
  userId: string,
  input: CreateEvidenceAtomInput,
): Promise<EvidenceAtomCreateResult> {
  if (!userId || userId === "ghost") {
    throw new Error("Authentication required to create evidence atoms.");
  }

  const now = Date.now();
  const id = uid();
  const ref = evidenceAtomRef(userId, id);
  const atom = buildEvidenceAtomFromInput(userId, input, { id, now });

  await setDoc(ref, sanitizeFirestoreData(atom));
  scheduleEvidenceAtomAnalysis(id);
  return { id, atom };
}

// ─── Read ────────────────────────────────────────────────────────────────────

/**
 * Get a single Evidence Atom by ID.
 */
export async function getEvidenceAtom(
  userId: string,
  atomId: string,
): Promise<EvidenceAtom | null> {
  if (!userId || userId === "ghost") return null;
  try {
    const snap = await getDoc(evidenceAtomRef(userId, atomId));
    return snap.exists() ? (snap.data() as EvidenceAtom) : null;
  } catch {
    return null;
  }
}

export interface EvidenceAtomQueryFilter {
  kind?: EvidenceAtom["kind"];
  processingState?: AnalysisStatus;
  tasteImpact?: boolean;
  contextScope?: TasteScope;
  projectId?: string;
  maxResults?: number;
}

/**
 * Query evidence atoms for a user with optional filters.
 * Returns atoms ordered by createdAt descending (most recent first).
 */
export async function queryEvidenceAtoms(
  userId: string,
  filter: EvidenceAtomQueryFilter = {},
): Promise<EvidenceAtom[]> {
  if (!userId || userId === "ghost") return [];

  // Build constraints — equality filters must precede ordering to work with
  // Firestore composite indexes. Simple queries (single where + orderBy) work
  // without an explicit index; multi-filter queries may require index creation.
  const constraints: Parameters<typeof query>[1][] = [];

  if (filter.kind !== undefined) {
    constraints.push(where("kind", "==", filter.kind));
  }
  if (filter.processingState !== undefined) {
    constraints.push(where("processingState", "==", filter.processingState));
  }
  if (filter.tasteImpact !== undefined) {
    constraints.push(where("tasteImpact", "==", filter.tasteImpact));
  }
  if (filter.contextScope !== undefined) {
    constraints.push(where("contextScope", "==", filter.contextScope));
  }
  if (filter.projectId !== undefined) {
    constraints.push(where("projectId", "==", filter.projectId));
  }

  constraints.push(orderBy("createdAt", "desc"));
  constraints.push(limit(filter.maxResults ?? 50));

  try {
    const q = query(evidenceAtomsCol(userId), ...constraints);
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as EvidenceAtom);
  } catch (error) {
    const classified = classifyEvidenceAtomQueryError(error);
    console.warn("MIMI // Evidence atom query failed:", classified.code, classified.message);
    throw classified;
  }
}

// ─── Update ──────────────────────────────────────────────────────────────────

/**
 * Update the AI-generated interpretation fields on an Evidence Atom.
 * Never touches originalSource.
 */
export async function updateEvidenceAtomInterpretation(
  userId: string,
  atomId: string,
  updates: {
    semanticDescription?: string;
    extractedText?: string;
    observationIds?: string[];
    embeddingRef?: string;
    processingState?: AnalysisStatus;
    confidence?: number;
    stabilityClass?: StabilityClass;
  },
): Promise<void> {
  if (!userId || userId === "ghost") return;
  try {
    await updateDoc(evidenceAtomRef(userId, atomId), {
      ...updates,
      updatedAt: Date.now(),
    });
  } catch (e) {
    console.warn("MIMI // EvidenceAtom interpretation update failed:", e);
  }
}

/**
 * Update the user's reaction to an Evidence Atom.
 * This is the primary correction entry point for atom-level feedback.
 */
export async function updateEvidenceAtomReaction(
  userId: string,
  atomId: string,
  reaction: UserCurationStatus,
  options?: {
    stabilityClass?: StabilityClass;
    contextScope?: TasteScope;
  },
): Promise<void> {
  if (!userId || userId === "ghost") {
    throw new Error("Authentication required to update evidence atom reactions.");
  }
  await updateDoc(evidenceAtomRef(userId, atomId), {
    userReaction: reaction,
    ...(options?.stabilityClass ? { stabilityClass: options.stabilityClass } : {}),
    ...(options?.contextScope ? { contextScope: options.contextScope } : {}),
    updatedAt: Date.now(),
  });
}

/**
 * Mark an Evidence Atom as processed with a semantic description.
 * Called after AI extraction completes.
 */
export async function markEvidenceAtomAnalyzed(
  userId: string,
  atomId: string,
  semanticDescription: string,
  extractedText?: string,
  embeddingRef?: string,
): Promise<void> {
  await updateEvidenceAtomInterpretation(userId, atomId, {
    semanticDescription,
    extractedText,
    embeddingRef,
    processingState: "analyzed",
  });
}

