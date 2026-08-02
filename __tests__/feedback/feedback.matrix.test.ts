import { describe, expect, it } from "vitest";

import {
  feedbackRecipes,
  type FeedbackEvent,
  type FeedbackRecipe,
} from "../../lib/feedback";
import { motionVariantRecipes } from "../../lib/motion";

/** Living matrix — keep in sync when adding FeedbackEvents. */
const EXPECTED_MATRIX: Record<FeedbackEvent, FeedbackRecipe> = {
  "navigation.enter": { motion: "softReveal", haptic: null },
  "navigation.back": { motion: "dismiss", haptic: null },
  "selection.changed": { motion: "selectionTick", haptic: "selection" },
  "source.captured": { motion: "gatherIntoPocket", haptic: "lightImpact" },
  "source.imported": { motion: "gatherIntoPocket", haptic: "softSuccess" },
  "analysis.started": { motion: "readingPulse", haptic: null },
  "analysis.completed": { motion: "softReveal", haptic: "softSuccess" },
  "proposal.created": { motion: "provisionalReveal", haptic: null },
  "proposal.approved": { motion: "commitAndSettle", haptic: "success" },
  "proposal.rejected": { motion: "dismiss", haptic: "selection" },
  "artifact.saved": { motion: "settleIntoRegistry", haptic: "success" },
  "artifact.published": { motion: "settleIntoRegistry", haptic: "success" },
  "action.failed": { motion: "containedError", haptic: "warning" },
};

describe("semantic event → motion/haptic matrix", () => {
  it("matches the product feedback contract", () => {
    expect(feedbackRecipes).toEqual(EXPECTED_MATRIX);
  });

  it("references only registered motion recipes", () => {
    for (const recipe of Object.values(feedbackRecipes)) {
      if (recipe.motion == null) continue;
      expect(motionVariantRecipes).toHaveProperty(recipe.motion);
    }
  });
});
