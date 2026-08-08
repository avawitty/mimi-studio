import type { UserCurationStatus } from "../../types";
import type { CreateTasteAssertionInput } from "./evidenceAtomSchema";
import { capAssertionConfidence } from "./tasteStateLogic";

export type CurationAssertionTarget = "pattern_cluster" | "creative_law";

export function curationAssertionId(
  targetType: CurationAssertionTarget,
  targetId: string,
): string {
  return `tailor_${targetType}_${targetId}`;
}

export function buildAssertionInputFromCuration(input: {
  userId: string;
  projectId: string;
  targetType: CurationAssertionTarget;
  targetId: string;
  action: UserCurationStatus;
  label: string;
  confidence: number;
}): CreateTasteAssertionInput | null {
  const { action, label, confidence, projectId } = input;
  const trimmed = label.trim();
  if (!trimmed) return null;

  if (action === "suggested" || action === "merged" || action === "split") {
    return null;
  }

  if (action === "rejected" || action === "hidden") {
    return {
      conceptA: trimmed,
      relation: "DISLIKES",
      claimType: "user_rejected",
      confidence: capAssertionConfidence("user_rejected", Math.max(confidence, 0.75)),
      projectId,
      context: "project",
      evidenceAtomIds: [],
    };
  }

  return {
    conceptA: trimmed,
    relation: "LIKES",
    claimType: action === "renamed" ? "user_confirmed" : "user_confirmed",
    confidence: capAssertionConfidence("user_confirmed", confidence),
    projectId,
    context: "project",
    evidenceAtomIds: [],
  };
}
