/**
 * Compute material changes between two taste model snapshots.
 */
import type { TasteModelSnapshot } from "../tasteModel/contracts.js";

export interface TasteModelFeatureDelta {
  featureId: string;
  label: string;
  signedStrengthBefore: number;
  signedStrengthAfter: number;
  confidenceBefore: number;
  confidenceAfter: number;
}

export interface TasteModelDelta {
  changedFeatures: TasteModelFeatureDelta[];
  addedInteractionRuleIds: string[];
  removedInteractionRuleIds: string[];
  compiledAtBefore: number;
  compiledAtAfter: number;
}

const MATERIAL_WEIGHT_DELTA = 0.05;
const MATERIAL_CONFIDENCE_DELTA = 0.05;

export function computeModelDelta(
  before: TasteModelSnapshot,
  after: TasteModelSnapshot,
): TasteModelDelta {
  const beforeMap = new Map(
    before.featureWeights.map((f) => [f.featureId, f]),
  );
  const afterMap = new Map(after.featureWeights.map((f) => [f.featureId, f]));

  const changedFeatures: TasteModelFeatureDelta[] = [];
  const allIds = new Set([...beforeMap.keys(), ...afterMap.keys()]);

  for (const featureId of allIds) {
    const prev = beforeMap.get(featureId);
    const next = afterMap.get(featureId);
    if (!prev || !next) continue;

    const weightDelta = Math.abs(next.signedWeight - prev.signedWeight);
    const confidenceDelta = Math.abs(next.confidence - prev.confidence);
    if (
      weightDelta < MATERIAL_WEIGHT_DELTA &&
      confidenceDelta < MATERIAL_CONFIDENCE_DELTA
    ) {
      continue;
    }

    changedFeatures.push({
      featureId,
      label: next.label,
      signedStrengthBefore: prev.signedWeight,
      signedStrengthAfter: next.signedWeight,
      confidenceBefore: prev.confidence,
      confidenceAfter: next.confidence,
    });
  }

  const beforeRules = new Set(before.interactionRules.map((r) => r.id));
  const afterRules = new Set(after.interactionRules.map((r) => r.id));

  return {
    changedFeatures,
    addedInteractionRuleIds: [...afterRules].filter((id) => !beforeRules.has(id)),
    removedInteractionRuleIds: [...beforeRules].filter((id) => !afterRules.has(id)),
    compiledAtBefore: before.compiledAt,
    compiledAtAfter: after.compiledAt,
  };
}
