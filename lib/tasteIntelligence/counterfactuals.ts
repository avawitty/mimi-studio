/**
 * Deterministic counterfactual explanations via actual re-scoring.
 */
import type {
  TasteCounterfactual,
} from "../../schemas/tasteIntelligenceContracts.js";
import type { TasteCandidateInput, TasteModelSnapshot } from "../tasteModel/contracts.js";
import { scoreTasteCandidate, type ScoreContext } from "../tasteModel/scoreTasteCandidate.js";
import type { TasteRefusal } from "../../schemas/tasteIntelligenceContracts.js";
import { computeRefusalPenalty } from "./refusals.js";
import { VERDICT_THRESHOLDS } from "../tasteModel/constants.js";

export interface CounterfactualInput {
  snapshot: TasteModelSnapshot;
  candidate: TasteCandidateInput;
  refusals?: TasteRefusal[];
  targetVerdict: TasteCounterfactual["targetVerdict"];
  scoreContext?: ScoreContext;
}

function verdictFromScore(score: number): TasteCounterfactual["targetVerdict"] {
  if (score >= VERDICT_THRESHOLDS.strong_fit) return "strong_fit";
  if (score >= VERDICT_THRESHOLDS.promising_adjacent) return "promising_adjacent";
  return "weak_fit";
}

function targetScoreThreshold(
  verdict: TasteCounterfactual["targetVerdict"],
): number {
  switch (verdict) {
    case "strong_fit":
      return VERDICT_THRESHOLDS.strong_fit;
    case "promising_adjacent":
      return VERDICT_THRESHOLDS.promising_adjacent;
    case "weak_fit":
      return VERDICT_THRESHOLDS.weak_fit;
    default: {
      const _exhaustive: never = verdict;
      return _exhaustive;
    }
  }
}

function cloneCandidate(
  candidate: TasteCandidateInput,
  patch: Partial<TasteCandidateInput>,
): TasteCandidateInput {
  return {
    ...candidate,
    ...patch,
    featureIds: patch.featureIds ?? candidate.featureIds,
    tags: patch.tags ?? candidate.tags,
  };
}

export function generateCounterfactual(
  input: CounterfactualInput,
): TasteCounterfactual {
  const { snapshot, candidate, refusals = [], scoreContext } = input;
  const base = scoreTasteCandidate(candidate, snapshot, scoreContext);
  const currentScore = base.fitScore;
  const threshold = targetScoreThreshold(input.targetVerdict);

  const modifications: TasteCounterfactual["modifications"] = [];
  const unresolvedUnknowns: string[] = [];
  let working = cloneCandidate(candidate, {});
  let workingScore = currentScore;

  const featureIds = [
    ...(candidate.featureIds ?? []),
    ...(candidate.patternClusterIds?.map((id) => `pattern_cluster:${id}`) ?? []),
  ];

  const negativeFeatures = snapshot.featureWeights
    .filter((f) => f.signedWeight < 0 && featureIds.includes(f.featureId))
    .sort((a, b) => a.signedWeight - b.signedWeight);

  for (const neg of negativeFeatures) {
    if (workingScore >= threshold) break;
    const nextFeatures = (working.featureIds ?? []).filter(
      (f) => f !== neg.featureId,
    );
    const modified = cloneCandidate(working, { featureIds: nextFeatures });
    const refusalCheck = computeRefusalPenalty(refusals, modified, "persistent");
    if (refusalCheck.penalty > 2) continue;
    const scored = scoreTasteCandidate(modified, snapshot, scoreContext);
    modifications.push({
      operation: "remove",
      featureId: neg.featureId,
      rationale: `Removing negative feature "${neg.label}" improves fit.`,
      scoreBefore: workingScore,
      scoreAfter: scored.fitScore,
      sourceIds: neg.sourceIds,
    });
    working = modified;
    workingScore = scored.fitScore;
  }

  const positiveCandidates = snapshot.featureWeights
    .filter((f) => f.signedWeight > 0.2 && !featureIds.includes(f.featureId))
    .sort((a, b) => b.signedWeight - a.signedWeight)
    .slice(0, 5);

  for (const pos of positiveCandidates) {
    if (workingScore >= threshold) break;
    const nextFeatures = [...(working.featureIds ?? []), pos.featureId];
    const modified = cloneCandidate(working, { featureIds: nextFeatures });
    const scored = scoreTasteCandidate(modified, snapshot, scoreContext);
    if (scored.fitScore <= workingScore) continue;
    modifications.push({
      operation: "add",
      featureId: pos.featureId,
      rationale: `Adding "${pos.label}" strengthens alignment.`,
      scoreBefore: workingScore,
      scoreAfter: scored.fitScore,
      sourceIds: pos.sourceIds,
    });
    working = modified;
    workingScore = scored.fitScore;
  }

  if (workingScore < threshold && modifications.length === 0) {
    unresolvedUnknowns.push(
      "No single-feature modification reached the target verdict.",
    );
  }

  const confidence = Math.min(
    1,
    0.35 +
      modifications.length * 0.12 +
      (workingScore >= threshold ? 0.25 : 0),
  );

  return {
    candidateId: candidate.id,
    currentScore,
    targetVerdict: input.targetVerdict,
    modifications,
    resultingScore: workingScore,
    confidence,
    unresolvedUnknowns,
  };
}

export { verdictFromScore };
