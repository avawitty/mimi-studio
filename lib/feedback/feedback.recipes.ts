import type { FeedbackEvent, FeedbackRecipe } from "./feedback.types";

/**
 * Semantic event → motion + haptic matrix.
 * Loading / proposal creation intentionally omit haptics.
 */
export const feedbackRecipes: Record<FeedbackEvent, FeedbackRecipe> = {
  "navigation.enter": {
    motion: "softReveal",
    haptic: null,
  },
  "navigation.back": {
    motion: "dismiss",
    haptic: null,
  },
  "selection.changed": {
    motion: "selectionTick",
    haptic: "selection",
  },
  "source.captured": {
    motion: "gatherIntoPocket",
    haptic: "lightImpact",
  },
  "source.imported": {
    motion: "gatherIntoPocket",
    haptic: "softSuccess",
  },
  "analysis.started": {
    motion: "readingPulse",
    haptic: null,
  },
  "analysis.completed": {
    motion: "softReveal",
    haptic: "softSuccess",
  },
  "proposal.created": {
    motion: "provisionalReveal",
    haptic: null,
  },
  "proposal.approved": {
    motion: "commitAndSettle",
    haptic: "success",
  },
  "proposal.rejected": {
    motion: "dismiss",
    haptic: "selection",
  },
  "artifact.saved": {
    motion: "settleIntoRegistry",
    haptic: "success",
  },
  "artifact.published": {
    motion: "settleIntoRegistry",
    haptic: "success",
  },
  "action.failed": {
    motion: "containedError",
    haptic: "warning",
  },
};
