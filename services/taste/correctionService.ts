import { doc, runTransaction } from "firebase/firestore";
import { db } from "../firebaseInit";
import type {
  CorrectionState,
  EvidenceAtom,
  StabilityClass,
  TasteAssertion,
} from "../../lib/taste/types";
import type { ClaimType, UserCurationStatus } from "../../types";

export interface CorrectionEffect {
  userReaction: UserCurationStatus;
  confidenceMultiplier: number;
  claimType: ClaimType;
  stabilityClass?: StabilityClass;
}

export function effectForCorrection(correction: CorrectionState): CorrectionEffect {
  switch (correction) {
    case "YES":
      return { userReaction: "accepted", confidenceMultiplier: 1.15, claimType: "user_confirmed" };
    case "SORT_OF":
      return { userReaction: "accepted", confidenceMultiplier: 0.6, claimType: "user_confirmed" };
    case "NOT_ANYMORE":
      return {
        // The old interpretation may have been true. Mark it as historically
        // confirmed but weak/currently inactive instead of turning it into a dislike.
        userReaction: "accepted",
        confidenceMultiplier: 0.35,
        claimType: "user_confirmed",
        stabilityClass: "temporary",
      };
    case "ONLY_HERE":
      return {
        userReaction: "accepted",
        confidenceMultiplier: 0.8,
        claimType: "user_confirmed",
        stabilityClass: "project",
      };
    case "NOT_ME":
      return { userReaction: "rejected", confidenceMultiplier: 0.1, claimType: "user_rejected" };
    case "MORE_LIKE_THIS":
      return { userReaction: "accepted", confidenceMultiplier: 1.3, claimType: "user_confirmed" };
  }
}

function clampConfidence(value: number): number {
  return Math.max(0, Math.min(1, Number(value.toFixed(3))));
}

export async function applyInlineCorrection(
  userId: string,
  atomId: string,
  correction: CorrectionState,
  assertionId?: string,
): Promise<void> {
  if (!userId || userId === "ghost") {
    throw new Error("A signed-in Mimi user is required to correct taste evidence.");
  }

  const effect = effectForCorrection(correction);
  const atomRef = doc(db, "users", userId, "evidenceAtoms", atomId);
  const assertionRef = assertionId
    ? doc(db, "users", userId, "tasteAssertions", assertionId)
    : null;

  await runTransaction(db, async (transaction) => {
    // Firestore transactions require all reads to happen before any writes.
    const atomSnapshot = await transaction.get(atomRef);
    if (!atomSnapshot.exists()) throw new Error("Evidence atom not found.");
    const assertionSnapshot = assertionRef ? await transaction.get(assertionRef) : null;

    const atom = atomSnapshot.data() as EvidenceAtom;
    const assertion = assertionSnapshot?.exists()
      ? (assertionSnapshot.data() as TasteAssertion)
      : null;
    const now = Date.now();

    transaction.update(atomRef, {
      correction,
      userReaction: effect.userReaction,
      confidence: clampConfidence(atom.confidence * effect.confidenceMultiplier),
      ...(effect.stabilityClass ? { stabilityClass: effect.stabilityClass } : {}),
      updatedAt: now,
    });

    if (!assertionRef || !assertion) return;

    const contextualPatch =
      correction === "ONLY_HERE" && !assertion.context
        ? { context: atom.projectId ? `project:${atom.projectId}` : "project" }
        : {};

    transaction.update(assertionRef, {
      correction,
      claimType: effect.claimType,
      confidence: clampConfidence(assertion.confidence * effect.confidenceMultiplier),
      ...contextualPatch,
      updatedAt: now,
    });
  });
}
