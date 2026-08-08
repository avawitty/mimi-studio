import type { ClaimType, CorrectionState, TasteAssertion, TasteScope } from "../../types";

/** AI-generated assertions cannot masquerade as confirmed preference above this ceiling. */
export const INFERRED_ASSERTION_CONFIDENCE_CEILING = 0.7;

export function capAssertionConfidence(claimType: ClaimType, confidence: number): number {
  const maxConfidence =
    claimType === "inferred" || claimType === "speculative"
      ? INFERRED_ASSERTION_CONFIDENCE_CEILING
      : 1.0;
  return Math.min(confidence, maxConfidence);
}

export const STABLE_ASSERTION_THRESHOLD = 0.65;
export const EMERGING_ASSERTION_THRESHOLD = 0.35;

const ONE_DAY_MS = 86_400_000;
const ONE_WEEK_MS = 7 * ONE_DAY_MS;
const ONE_MONTH_MS = 30 * ONE_DAY_MS;

function recencyFactor(updatedAt: number): number {
  const ageMs = Date.now() - updatedAt;
  if (ageMs < ONE_DAY_MS) return 1.0;
  if (ageMs < ONE_WEEK_MS) return 0.85;
  if (ageMs < ONE_MONTH_MS) return 0.65;
  return 0.4;
}

function confirmationBoost(claimType: TasteAssertion["claimType"]): number {
  switch (claimType) {
    case "user_confirmed":
      return 1.3;
    case "observed":
      return 1.1;
    case "inferred":
      return 0.8;
    case "speculative":
      return 0.6;
    case "user_rejected":
      return 0.0;
    default: {
      const _exhaustive: never = claimType;
      return _exhaustive;
    }
  }
}

function contextRelevanceFactor(
  assertionContext: TasteScope | undefined,
  requestedContext: TasteScope | undefined,
): number {
  if (!assertionContext || assertionContext === "global") return 1.0;
  if (!requestedContext) return 1.0;
  if (assertionContext === requestedContext) return 1.2;
  return 0.7;
}

export function scoreAssertion(assertion: TasteAssertion, context?: TasteScope): number {
  return (
    assertion.confidence *
    recencyFactor(assertion.updatedAt) *
    confirmationBoost(assertion.claimType) *
    contextRelevanceFactor(assertion.context, context)
  );
}

export type PartitionedAssertions = {
  stablePreferences: TasteAssertion[];
  emergingPreferences: TasteAssertion[];
  negativePreferences: TasteAssertion[];
};

const POSITIVE_RELATIONS = new Set<TasteAssertion["relation"]>([
  "LIKES",
  "PREFERS_OVER",
  "ASSOCIATES",
  "LIKES_ONLY_IN",
]);

export function partitionAssertions(
  assertions: TasteAssertion[],
  context?: TasteScope,
  maxAssertions = 20,
): PartitionedAssertions {
  const scored = assertions
    .filter((a) => a.claimType !== "user_rejected")
    .map((assertion) => ({ assertion, score: scoreAssertion(assertion, context) }))
    .sort((a, b) => b.score - a.score);

  const stablePreferences: TasteAssertion[] = [];
  const emergingPreferences: TasteAssertion[] = [];
  const negativePreferences: TasteAssertion[] = [];

  for (const { assertion, score } of scored) {
    if (assertion.relation === "DISLIKES") {
      negativePreferences.push(assertion);
      continue;
    }
    if (!POSITIVE_RELATIONS.has(assertion.relation)) continue;

    if (score >= STABLE_ASSERTION_THRESHOLD) {
      if (stablePreferences.length < maxAssertions) stablePreferences.push(assertion);
    } else if (score >= EMERGING_ASSERTION_THRESHOLD) {
      if (emergingPreferences.length < maxAssertions) emergingPreferences.push(assertion);
    }
  }

  return {
    stablePreferences,
    emergingPreferences,
    negativePreferences: negativePreferences.slice(0, maxAssertions),
  };
}

export const CORRECTION_CONFIDENCE_DELTA: Record<CorrectionState, number> = {
  YES: +0.25,
  SORT_OF: -0.20,
  NOT_ANYMORE: -0.35,
  ONLY_HERE: -0.15,
  NOT_ME: -0.50,
  MORE_LIKE_THIS: +0.15,
};

export const CORRECTION_CLAIM_TYPE: Record<CorrectionState, ClaimType> = {
  YES: "user_confirmed",
  SORT_OF: "user_confirmed",
  NOT_ANYMORE: "user_confirmed",
  ONLY_HERE: "user_confirmed",
  NOT_ME: "user_rejected",
  MORE_LIKE_THIS: "user_confirmed",
};
