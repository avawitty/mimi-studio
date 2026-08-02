/**
 * Shared claim collection for product adapters.
 */

import type {
  CulturalResidueResult,
  EmotionalResidueResult,
  ResidueClaim,
} from "../validation";

export type ResidueAdapterSource = CulturalResidueResult | EmotionalResidueResult;

export function collectResidueClaims(result: ResidueAdapterSource): ResidueClaim[] {
  if (result.metadata.mode === "cultural") {
    const c = result as CulturalResidueResult;
    return [
      c.definition,
      ...c.origins,
      ...c.descendants,
      ...c.survivingMeanings,
      ...c.lostMeanings,
      ...c.computationallyIntroducedMeanings,
      ...c.commercialAbsorption,
      ...c.counterSignals,
    ];
  }
  const e = result as EmotionalResidueResult;
  return [
    ...e.neighboringFeelings,
    ...e.commonTriggers,
    ...e.commonInterpretations,
    ...e.alternativeInterpretations,
    ...e.communityPatterns,
    ...e.cognitivePatterns,
    ...e.therapeuticModels,
  ];
}

export function topicOf(result: ResidueAdapterSource): string {
  return result.metadata.mode === "cultural"
    ? (result as CulturalResidueResult).query
    : (result as EmotionalResidueResult).normalizedExperience;
}

export function mapClaimStatusToTasteClaimType(
  status: ResidueClaim["status"],
): "observed" | "inferred" | "speculative" {
  if (status === "observed" || status === "reported" || status === "historical") {
    return "observed";
  }
  if (status === "model-proposed") return "speculative";
  return "inferred";
}
