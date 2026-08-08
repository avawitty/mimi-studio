/**
 * Taste Assertion Service
 *
 * Manages directional relationships in the Taste Graph.
 * Assertions are the primary unit of taste knowledge:
 *   "USER LIKES theatrical-restraint"
 *   "USER DISLIKES generic SaaS aesthetics"
 *   "USER PREFERS asymmetry OVER symmetry"
 *
 * CRITICAL: AI-generated assertions (claimType: 'inferred') must NEVER
 * automatically become strong durable memory. Only user-confirmed assertions
 * or assertions with >3 pieces of supporting evidence should reach high confidence.
 *
 * Firestore path: users/{uid}/tasteAssertions/{id}
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
  ClaimType,
  CorrectionState,
  TasteAssertion,
  TasteScope,
} from "../../types";
import type { CreateTasteAssertionInput } from "../../lib/taste/evidenceAtomSchema";
import {
  capAssertionConfidence,
  CORRECTION_CLAIM_TYPE,
  CORRECTION_CONFIDENCE_DELTA,
} from "../../lib/taste/tasteStateLogic";

const uid = () =>
  crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

function assertionsCol(userId: string) {
  return collection(db, "users", userId, "tasteAssertions");
}

function assertionRef(userId: string, assertionId: string) {
  return doc(db, "users", userId, "tasteAssertions", assertionId);
}

// ─── Create ─────────────────────────────────────────────────────────────────

/**
 * Create a new TasteAssertion.
 * Inferred assertions (from AI analysis) are automatically capped at confidence 0.7
 * to prevent weak AI inference from masquerading as confirmed preference.
 */
export async function createTasteAssertion(
  userId: string,
  input: CreateTasteAssertionInput,
): Promise<TasteAssertion> {
  if (!userId || userId === "ghost") {
    throw new Error("Authentication required to create taste assertions.");
  }

  const now = Date.now();
  const id = uid();
  const confidence = capAssertionConfidence(input.claimType, input.confidence);

  const assertion: TasteAssertion = {
    id,
    userId,
    projectId: input.projectId,
    conceptA: input.conceptA,
    relation: input.relation,
    conceptB: input.conceptB,
    context: input.context as TasteScope | undefined,
    claimType: input.claimType,
    confidence,
    userCorrection: undefined,
    evidenceAtomIds: input.evidenceAtomIds,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(assertionRef(userId, id), assertion);
  return assertion;
}

// ─── Read ────────────────────────────────────────────────────────────────────

export async function getTasteAssertion(
  userId: string,
  assertionId: string,
): Promise<TasteAssertion | null> {
  if (!userId || userId === "ghost") return null;
  try {
    const snap = await getDoc(assertionRef(userId, assertionId));
    return snap.exists() ? (snap.data() as TasteAssertion) : null;
  } catch {
    return null;
  }
}

export interface AssertionQueryFilter {
  context?: TasteScope;
  claimType?: ClaimType;
  relation?: TasteAssertion["relation"];
  projectId?: string;
  minConfidence?: number;
  maxResults?: number;
}

/**
 * Get assertions for a user with optional filters.
 * Used by getTasteState() to build the preference summary.
 */
export async function getAssertionsForUser(
  userId: string,
  filter: AssertionQueryFilter = {},
): Promise<TasteAssertion[]> {
  if (!userId || userId === "ghost") return [];

  const constraints: Parameters<typeof query>[1][] = [];

  if (filter.context !== undefined) {
    constraints.push(where("context", "==", filter.context));
  }
  if (filter.claimType !== undefined) {
    constraints.push(where("claimType", "==", filter.claimType));
  }
  if (filter.relation !== undefined) {
    constraints.push(where("relation", "==", filter.relation));
  }
  if (filter.projectId !== undefined) {
    constraints.push(where("projectId", "==", filter.projectId));
  }

  constraints.push(orderBy("updatedAt", "desc"));
  constraints.push(limit(filter.maxResults ?? 100));

  try {
    const q = query(assertionsCol(userId), ...constraints);
    const snap = await getDocs(q);
    let results = snap.docs.map((d) => d.data() as TasteAssertion);

    // Post-filter by confidence (not supported natively without composite index)
    if (filter.minConfidence !== undefined) {
      results = results.filter((a) => a.confidence >= (filter.minConfidence ?? 0));
    }

    return results;
  } catch {
    return [];
  }
}

// ─── Correction ──────────────────────────────────────────────────────────────

/**
 * Apply a user correction to a TasteAssertion.
 * Updates confidence (clamped to [0, 1]) and promotes/demotes claimType.
 */
export async function applyAssertionCorrection(
  userId: string,
  assertionId: string,
  correction: CorrectionState,
  options?: { contextScope?: TasteScope },
): Promise<TasteAssertion> {
  if (!userId || userId === "ghost") {
    throw new Error("Authentication required to apply assertion corrections.");
  }

  const existing = await getTasteAssertion(userId, assertionId);
  if (!existing) {
    throw new Error("Assertion not found.");
  }

  const delta = CORRECTION_CONFIDENCE_DELTA[correction];
  const newConfidence = Math.max(0, Math.min(1, existing.confidence + delta));
  const newClaimType = CORRECTION_CLAIM_TYPE[correction];

  const updates: Partial<TasteAssertion> = {
    confidence: newConfidence,
    claimType: newClaimType,
    userCorrection: correction,
    updatedAt: Date.now(),
  };

  if (correction === "ONLY_HERE" && options?.contextScope) {
    updates.context = options.contextScope;
  }

  await updateDoc(assertionRef(userId, assertionId), updates);
  return { ...existing, ...updates } as TasteAssertion;
}
