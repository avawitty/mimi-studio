import { collection, doc, getDocs, setDoc } from "firebase/firestore";
import { db } from "../firebaseInit";
import type { TasteAssertion, TasteRelation, TasteScope } from "../../lib/taste/types";

function createAssertionId(): string {
  return `ta_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export interface CreateTasteAssertionInput {
  projectId?: string;
  conceptA: string;
  relation?: TasteRelation;
  conceptB?: string;
  context?: TasteScope;
  confidence?: number;
  evidenceAtomIds: string[];
}

export async function createInferredTasteAssertion(
  userId: string,
  input: CreateTasteAssertionInput,
): Promise<TasteAssertion> {
  if (!userId || userId === "ghost") {
    throw new Error("A signed-in Mimi user is required to create taste assertions.");
  }
  if (!input.conceptA.trim()) throw new Error("Taste assertion requires a concept.");
  if (!input.evidenceAtomIds.length) throw new Error("Taste assertion requires evidence.");

  const now = Date.now();
  const assertion: TasteAssertion = {
    id: createAssertionId(),
    userId,
    projectId: input.projectId,
    conceptA: input.conceptA.trim(),
    relation: input.relation ?? "LIKES",
    conceptB: input.conceptB?.trim() || undefined,
    context: input.context,
    claimType: "inferred",
    confidence: Math.max(0, Math.min(1, input.confidence ?? 0.7)),
    evidenceAtomIds: input.evidenceAtomIds,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(
    doc(db, "users", userId, "tasteAssertions", assertion.id),
    JSON.parse(JSON.stringify(assertion)),
  );
  return assertion;
}

export async function getTasteAssertionsForEvidence(
  userId: string,
  atomId: string,
): Promise<TasteAssertion[]> {
  // Intentionally filter client-side for the first slice to avoid forcing a
  // composite Firestore index before usage patterns are known.
  const snapshot = await getDocs(collection(db, "users", userId, "tasteAssertions"));
  return snapshot.docs
    .map((item) => item.data() as TasteAssertion)
    .filter((assertion) => assertion.evidenceAtomIds.includes(atomId));
}
