/**
 * Taste model evaluation metrics.
 */
import type { TasteEvaluationEvent } from "../../schemas/tasteIntelligenceContracts.js";
import type { TastePairwiseJudgment } from "../../schemas/tasteIntelligenceContracts.js";

export interface PairwiseAccuracyResult {
  accuracy: number;
  total: number;
  correct: number;
}

export function computePairwiseAccuracy(
  predictions: Array<{ predictedLeftPreference: number; actualChoice: TastePairwiseJudgment["choice"] }>,
): PairwiseAccuracyResult {
  let correct = 0;
  for (const p of predictions) {
    const predictedLeft = p.predictedLeftPreference >= 0.5;
    const actualLeft = p.actualChoice === "left" || p.actualChoice === "both";
    const actualRight = p.actualChoice === "right";
    const actualNeither = p.actualChoice === "neither";
    if (p.actualChoice === "skip") continue;
    if (actualNeither) continue;
    if ((predictedLeft && actualLeft) || (!predictedLeft && actualRight)) {
      correct += 1;
    }
  }
  const total = predictions.filter(
    (p) => p.actualChoice !== "skip" && p.actualChoice !== "neither",
  ).length;
  return { accuracy: total > 0 ? correct / total : 0, total, correct };
}

export function computeBrierScore(
  predictions: Array<{ predictedLeftPreference: number; actualLeft: boolean }>,
): number {
  if (predictions.length === 0) return 0;
  const sum = predictions.reduce((s, p) => {
    const actual = p.actualLeft ? 1 : 0;
    return s + (p.predictedLeftPreference - actual) ** 2;
  }, 0);
  return sum / predictions.length;
}

export function computeExpectedCalibrationError(
  buckets: Array<{ confidence: number; accuracy: number; count: number }>,
): number {
  const total = buckets.reduce((s, b) => s + b.count, 0);
  if (total === 0) return 0;
  return buckets.reduce(
    (s, b) => s + (b.count / total) * Math.abs(b.accuracy - b.confidence),
    0,
  );
}

export function computeRefusalViolationRate(
  violations: number,
  totalRecommendations: number,
): number {
  if (totalRecommendations === 0) return 0;
  return violations / totalRecommendations;
}

export function computeRegret(
  chosenScores: number[],
  bestScores: number[],
): number {
  if (chosenScores.length !== bestScores.length) return 0;
  const regrets = chosenScores.map((c, i) => (bestScores[i] ?? c) - c);
  return regrets.reduce((s, r) => s + r, 0) / Math.max(1, regrets.length);
}

export function explanationCoverage(
  explanations: Array<{ sourceIds: string[] }>,
): number {
  if (explanations.length === 0) return 0;
  const withSources = explanations.filter((e) => e.sourceIds.length > 0).length;
  return withSources / explanations.length;
}

export function buildEvaluationEvent(
  input: Omit<TasteEvaluationEvent, "id" | "occurredAt">,
): TasteEvaluationEvent {
  return {
    ...input,
    id: crypto.randomUUID(),
    occurredAt: Date.now(),
  };
}
