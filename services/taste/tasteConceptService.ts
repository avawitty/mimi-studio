/**
 * Taste Concept Service
 *
 * Manages named taste concepts — the vocabulary of the user's taste graph.
 * Concepts are labels like "theatrical restraint", "brutalism", "archival melancholy".
 *
 * They are NOT drawn from a fixed taxonomy — they emerge from the user's evidence
 * and can be confirmed, renamed, or rejected by the user.
 *
 * Each concept supports contextual strength so the same label can have different
 * weights in different domains (editorial vs interface vs fashion).
 *
 * Firestore path: users/{uid}/tasteConcepts/{id}
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
import type { ConceptContext, TasteConcept, TasteScope } from "../../types";

const uid = () =>
  crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

function conceptsCol(userId: string) {
  return collection(db, "users", userId, "tasteConcepts");
}

function conceptRef(userId: string, conceptId: string) {
  return doc(db, "users", userId, "tasteConcepts", conceptId);
}

// ─── Create / Upsert ─────────────────────────────────────────────────────────

export interface UpsertConceptInput {
  label: string;
  description?: string;
  isInferred: boolean;
  confidence: number;
  context?: ConceptContext;
  evidenceAtomId?: string;
  assertionId?: string;
}

/**
 * Create a new TasteConcept or update an existing one by label (case-insensitive).
 * If a concept with the same label already exists for this user, updates it.
 * Returns the concept's ID.
 */
export async function upsertTasteConcept(
  userId: string,
  input: UpsertConceptInput,
): Promise<string> {
  if (!userId || userId === "ghost") {
    throw new Error("Authentication required.");
  }

  // Check for existing concept with same label (case-insensitive)
  const existing = await findConceptByLabel(userId, input.label);

  if (existing) {
    const updates: Partial<TasteConcept> = {
      confidence: Math.max(existing.confidence, input.confidence),
      isInferred: existing.isInferred && input.isInferred, // once confirmed, stays confirmed
      description: input.description ?? existing.description,
      updatedAt: Date.now(),
    };

    if (input.context) {
      const existingContexts = existing.contexts ?? [];
      const existingIdx = existingContexts.findIndex((c) => c.scope === input.context!.scope);
      if (existingIdx >= 0) {
        existingContexts[existingIdx] = input.context;
      } else {
        existingContexts.push(input.context);
      }
      updates.contexts = existingContexts;
    }

    if (input.evidenceAtomId && !existing.evidenceAtomIds.includes(input.evidenceAtomId)) {
      updates.evidenceAtomIds = [...existing.evidenceAtomIds, input.evidenceAtomId];
    }

    if (input.assertionId && !existing.assertionIds.includes(input.assertionId)) {
      updates.assertionIds = [...existing.assertionIds, input.assertionId];
    }

    await updateDoc(conceptRef(userId, existing.id), updates);
    return existing.id;
  }

  // Create new concept
  const now = Date.now();
  const id = uid();

  const concept: TasteConcept = {
    id,
    userId,
    label: input.label,
    labelNormalized: input.label.toLowerCase(),
    description: input.description,
    isInferred: input.isInferred,
    confidence: input.confidence,
    contexts: input.context ? [input.context] : [],
    evidenceAtomIds: input.evidenceAtomId ? [input.evidenceAtomId] : [],
    assertionIds: input.assertionId ? [input.assertionId] : [],
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(conceptRef(userId, id), concept);
  return id;
}

// ─── Read ────────────────────────────────────────────────────────────────────

export async function getTasteConcept(
  userId: string,
  conceptId: string,
): Promise<TasteConcept | null> {
  if (!userId || userId === "ghost") return null;
  try {
    const snap = await getDoc(conceptRef(userId, conceptId));
    return snap.exists() ? (snap.data() as TasteConcept) : null;
  } catch {
    return null;
  }
}

/**
 * Find a concept by label (case-insensitive exact match).
 * Uses the `labelNormalized` field for an efficient Firestore equality query.
 */
export async function findConceptByLabel(
  userId: string,
  label: string,
): Promise<TasteConcept | null> {
  if (!userId || userId === "ghost") return null;
  try {
    const q = query(
      conceptsCol(userId),
      where("labelNormalized", "==", label.toLowerCase()),
      limit(1),
    );
    const snap = await getDocs(q);
    return snap.empty ? null : (snap.docs[0].data() as TasteConcept);
  } catch {
    return null;
  }
}

/**
 * Get all concepts for a user, ordered by confidence descending.
 */
export async function getConceptsForUser(userId: string): Promise<TasteConcept[]> {
  if (!userId || userId === "ghost") return [];
  try {
    const q = query(conceptsCol(userId), orderBy("confidence", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as TasteConcept);
  } catch {
    return [];
  }
}

/**
 * Get concepts that are currently in an exploration state (rising trend in any context).
 */
export async function getExplorationConcepts(userId: string): Promise<TasteConcept[]> {
  const all = await getConceptsForUser(userId);
  return all.filter((c) =>
    c.contexts.some((ctx) => ctx.trend === "rising"),
  );
}

// ─── Update ──────────────────────────────────────────────────────────────────

/**
 * Link an evidence atom to an existing concept.
 */
export async function linkEvidenceToConcept(
  userId: string,
  conceptId: string,
  atomId: string,
): Promise<void> {
  if (!userId || userId === "ghost") return;
  const concept = await getTasteConcept(userId, conceptId);
  if (!concept) return;
  if (concept.evidenceAtomIds.includes(atomId)) return;

  await updateDoc(conceptRef(userId, conceptId), {
    evidenceAtomIds: [...concept.evidenceAtomIds, atomId],
    updatedAt: Date.now(),
  });
}

/**
 * Update the contextual strength of a concept in a given scope.
 */
export async function updateConceptContextStrength(
  userId: string,
  conceptId: string,
  scope: TasteScope,
  strength: number,
  trend: ConceptContext["trend"] = "stable",
): Promise<void> {
  if (!userId || userId === "ghost") return;
  const concept = await getTasteConcept(userId, conceptId);
  if (!concept) return;

  const contexts = concept.contexts ?? [];
  const idx = contexts.findIndex((c) => c.scope === scope);
  const now = Date.now();

  const updated: ConceptContext = {
    scope,
    strength: Math.max(-1, Math.min(1, strength)),
    confidence: concept.confidence,
    trend,
    updatedAt: now,
  };

  if (idx >= 0) {
    contexts[idx] = updated;
  } else {
    contexts.push(updated);
  }

  await updateDoc(conceptRef(userId, conceptId), {
    contexts,
    updatedAt: now,
  });
}
