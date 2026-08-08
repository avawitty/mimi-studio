/**
 * Deterministic contradiction detection.
 */
import type { TasteRefusal } from "../../schemas/tasteIntelligenceContracts.js";
import type {
  NormalizedTasteEvent,
  TasteModelSnapshot,
} from "../tasteModel/contracts.js";

export type ContradictionType =
  | "stated_vs_observed"
  | "persistent_vs_project"
  | "accepted_vs_refusal"
  | "positive_combination_failure"
  | "historic_vs_trajectory"
  | "saved_vs_rejected_interpretation"
  | "high_score_vs_rejection"
  | "inference_vs_correction"
  | "compiler_vs_critic";

export interface TasteContradiction {
  type: ContradictionType;
  involvedObjectIds: string[];
  evidenceForA: string[];
  evidenceForB: string[];
  confidence: number;
  possibleExplanations: string[];
  calibrationQuestion?: string;
  insufficientEvidence: boolean;
}

export interface ContradictionInput {
  snapshot: TasteModelSnapshot;
  events: NormalizedTasteEvent[];
  refusals: TasteRefusal[];
}

export function detectContradictions(
  input: ContradictionInput,
): TasteContradiction[] {
  const results: TasteContradiction[] = [];
  const { snapshot, events, refusals } = input;

  for (const fw of snapshot.featureWeights) {
    if (fw.signedWeight > 0.3) {
      const rejectEvents = events.filter(
        (e) =>
          e.polarity < 0 &&
          e.patternClusterIds.some((id) => fw.featureId.includes(id)),
      );
      if (rejectEvents.length >= 2) {
        results.push({
          type: "stated_vs_observed",
          involvedObjectIds: [fw.featureId],
          evidenceForA: fw.sourceIds,
          evidenceForB: rejectEvents.map((e) => e.id),
          confidence: Math.min(0.85, 0.4 + rejectEvents.length * 0.1),
          possibleExplanations: [
            "The feature may be context-dependent rather than universally preferred.",
            "Recent project scope may differ from persistent taste.",
          ],
          calibrationQuestion: `You describe the work as aligned with "${fw.label}", while recent references suggest rejection. Is "${fw.label}" becoming relevant in a new context, or are you responding to another feature in those references?`,
          insufficientEvidence: false,
        });
      }
    }
  }

  for (const refusal of refusals.filter((r) => r.status === "active")) {
    for (const fw of snapshot.featureWeights) {
      if (
        refusal.featureIds.includes(fw.featureId) &&
        fw.signedWeight > 0.2
      ) {
        results.push({
          type: "accepted_vs_refusal",
          involvedObjectIds: [fw.featureId, refusal.id],
          evidenceForA: fw.sourceIds,
          evidenceForB: refusal.sourceIds,
          confidence: 0.75,
          possibleExplanations: [
            "An explicit refusal may need to supersede passive positive evidence.",
            "The refusal may apply only in combination or specific context.",
          ],
          calibrationQuestion: `You have an active refusal involving "${fw.label}" but the model still weights it positively. Should this refusal apply always, only in combination, or only in certain projects?`,
          insufficientEvidence: false,
        });
      }
    }
  }

  const declining = snapshot.trajectory.decliningFeatureIds;
  const stable = snapshot.trajectory.stableFeatureIds;
  for (const fid of declining) {
    if (stable.includes(fid)) {
      const fw = snapshot.featureWeights.find((f) => f.featureId === fid);
      if (!fw || fw.evidenceMass < 4) {
        results.push({
          type: "historic_vs_trajectory",
          involvedObjectIds: [fid],
          evidenceForA: fw?.sourceIds ?? [],
          evidenceForB: [],
          confidence: 0.3,
          possibleExplanations: [],
          insufficientEvidence: true,
        });
        continue;
      }
      results.push({
        type: "historic_vs_trajectory",
        involvedObjectIds: [fid],
        evidenceForA: fw.sourceIds,
        evidenceForB: declining.map((d) => d),
        confidence: 0.55,
        possibleExplanations: [
          "Long-term core taste may coexist with a temporary decline in use.",
        ],
        calibrationQuestion: `Is "${fw.label}" declining in relevance, or temporarily resting?`,
        insufficientEvidence: false,
      });
    }
  }

  return results.slice(0, 12);
}
