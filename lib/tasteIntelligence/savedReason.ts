/**
 * "Why did I save this?" hypothesis flow.
 */
import type { SavedReasonHypothesis } from "../../schemas/tasteIntelligenceContracts.js";
import type { TasteModelSnapshot } from "../tasteModel/contracts.js";

const REASON_DIMENSIONS = [
  "composition",
  "color logic",
  "materiality",
  "emotional tone",
  "feature relationship",
  "cultural reference",
  "typography",
] as const;

export function proposeSavedReasonHypotheses(
  artifactId: string,
  snapshot: TasteModelSnapshot | null,
  tags: string[] = [],
  maxCount = 4,
): SavedReasonHypothesis[] {
  const now = Date.now();
  const hypotheses: SavedReasonHypothesis[] = [];

  const topFeatures = (snapshot?.featureWeights ?? [])
    .filter((f) => f.signedWeight > 0.15)
    .sort((a, b) => b.signedWeight - a.signedWeight)
    .slice(0, maxCount);

  for (const fw of topFeatures) {
    hypotheses.push({
      id: crypto.randomUUID(),
      artifactId,
      hypothesis: `Saved for ${fw.label} — aligned with your ${fw.category} preferences.`,
      featureIds: [fw.featureId],
      source: "model_proposed",
      confidence: fw.confidence,
      userStatus: "unreviewed",
      createdAt: now,
    });
  }

  for (const dim of REASON_DIMENSIONS) {
    if (hypotheses.length >= maxCount) break;
    if (tags.some((t) => t.toLowerCase().includes(dim.split(" ")[0]!))) {
      hypotheses.push({
        id: crypto.randomUUID(),
        artifactId,
        hypothesis: `Possibly saved for ${dim}.`,
        featureIds: [],
        source: "rule_based",
        confidence: 0.45,
        userStatus: "unreviewed",
        createdAt: now,
      });
    }
  }

  return hypotheses.slice(0, 5);
}

export function applySavedReasonReview(
  hypothesis: SavedReasonHypothesis,
  action: "confirm" | "reject" | "edit" | "skip",
  editedText?: string,
): SavedReasonHypothesis {
  switch (action) {
    case "confirm":
      return { ...hypothesis, userStatus: "confirmed", source: "creator_authored" };
    case "reject":
      return { ...hypothesis, userStatus: "rejected" };
    case "edit":
      return {
        ...hypothesis,
        userStatus: "edited",
        hypothesis: editedText ?? hypothesis.hypothesis,
        source: "creator_authored",
      };
    case "skip":
      return hypothesis;
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}
