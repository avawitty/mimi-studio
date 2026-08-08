/**
 * Correction Service
 *
 * Unified entry point for applying user corrections to Taste Intelligence objects.
 * Handles both assertion-level and atom-level corrections.
 *
 * Corrections are the primary steering mechanism for the taste model.
 * They update confidence, claim type, and user reaction fields
 * and are stored as InteractionEvents for audit and trend analysis.
 *
 * DESIGN PRINCIPLE: Explicit user correction outweighs weak inferred behavior.
 * A single "NOT ME" response has more authority than 5 AI inferences.
 */
import type { CorrectionState, TasteScope } from "../../types";
import { correctionToAtomReaction } from "../../lib/taste/correctionLogic";
import { applyAssertionCorrection } from "./tasteAssertionService";
import { updateEvidenceAtomReaction } from "./evidenceAtomService";
import { recordTasteInteractionEvent } from "./interactionEventService";

export type CorrectionTargetType = "assertion" | "atom";

export type ApplyInlineCorrectionOptions = {
  contextScope?: TasteScope;
};

/**
 * Apply an inline correction from the user.
 */
export async function applyInlineCorrection(
  userId: string,
  targetType: CorrectionTargetType,
  targetId: string,
  correction: CorrectionState,
  options: ApplyInlineCorrectionOptions = {},
): Promise<void> {
  if (!userId || userId === "ghost") {
    throw new Error("Authentication required to apply corrections.");
  }

  if (targetType === "assertion") {
    await applyAssertionCorrection(userId, targetId, correction, options);
  } else {
    const reaction = correctionToAtomReaction(correction);
    await updateEvidenceAtomReaction(userId, targetId, reaction, {
      contextScope: correction === "ONLY_HERE" ? options.contextScope : undefined,
      stabilityClass: correction === "ONLY_HERE" ? "project" : undefined,
    });
  }

  await recordTasteInteractionEvent(userId, {
    targetType,
    targetId,
    correction,
    contextScope: options.contextScope,
  });
}

/**
 * Describe a correction in human-readable language for UI display and logging.
 */
export function describeCorrectionState(correction: CorrectionState): {
  label: string;
  shortLabel: string;
  description: string;
} {
  switch (correction) {
    case "YES":
      return {
        label: "Yes",
        shortLabel: "YES",
        description: "This is accurate — strengthens the interpretation.",
      };
    case "SORT_OF":
      return {
        label: "Sort of",
        shortLabel: "SORT OF",
        description: "Partially true — reduces confidence.",
      };
    case "NOT_ANYMORE":
      return {
        label: "Not anymore",
        shortLabel: "NOT ANYMORE",
        description: "Was true, but no longer — marks a declining trend.",
      };
    case "ONLY_HERE":
      return {
        label: "Only here",
        shortLabel: "ONLY HERE",
        description: "True in this context, not universally — scopes the preference.",
      };
    case "NOT_ME":
      return {
        label: "Not me",
        shortLabel: "NOT ME",
        description: "Doesn't resonate — negates this interpretation.",
      };
    case "MORE_LIKE_THIS":
      return {
        label: "More like this",
        shortLabel: "MORE LIKE THIS",
        description: "Positive signal — show more evidence in this direction.",
      };
  }
}

/**
 * The ordered set of correction states shown in the CorrectionChip UI.
 */
export const CORRECTION_CHIP_OPTIONS: CorrectionState[] = [
  "YES",
  "SORT_OF",
  "NOT_ANYMORE",
  "ONLY_HERE",
  "NOT_ME",
  "MORE_LIKE_THIS",
];

export { atomReactionToCorrection } from "../../lib/taste/correctionLogic";
