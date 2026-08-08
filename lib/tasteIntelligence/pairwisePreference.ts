/**
 * Explainable pairwise preference layer (Bradley-Terry style updates).
 */
import type { CalibrationChoice } from "../../schemas/tasteIntelligenceContracts.js";
import type { TasteModelSnapshot } from "../tasteModel/contracts.js";
import {
  CALIBRATION_SHRINKAGE_ALPHA,
  MIN_JUDGMENTS_FOR_FULL_CALIBRATION,
  PAIRWISE_TEMPERATURE,
} from "./constants.js";

export interface CalibrationDelta {
  featureId: string;
  signedDelta: number;
  confidence: number;
  sourceJudgmentIds: string[];
}

export interface PairwiseUpdateInput {
  snapshot: TasteModelSnapshot;
  choice: CalibrationChoice;
  leftFeatureIds: string[];
  rightFeatureIds: string[];
  decidingFeatureIds: string[];
  judgmentId: string;
  existingDeltas: Record<string, CalibrationDelta>;
  judgmentCount: number;
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function shrinkageFactor(judgmentCount: number): number {
  if (judgmentCount >= MIN_JUDGMENTS_FOR_FULL_CALIBRATION) return 1;
  const t = judgmentCount / MIN_JUDGMENTS_FOR_FULL_CALIBRATION;
  return t * (1 - CALIBRATION_SHRINKAGE_ALPHA) + CALIBRATION_SHRINKAGE_ALPHA * t;
}

export function predictPairwisePreference(
  leftUtility: number,
  rightUtility: number,
): number {
  return sigmoid((leftUtility - rightUtility) / PAIRWISE_TEMPERATURE);
}

export function utilityFromSnapshot(
  snapshot: TasteModelSnapshot,
  featureIds: string[],
): number {
  const weights = new Map(
    snapshot.featureWeights.map((f) => [f.featureId, f]),
  );
  let sum = 0;
  let mass = 0;
  for (const fid of featureIds) {
    const fw = weights.get(fid);
    if (!fw) continue;
    sum += fw.signedWeight * fw.confidence;
    mass += fw.confidence;
  }
  return mass > 0 ? sum / mass : 0;
}

export function applyPairwiseJudgment(
  input: PairwiseUpdateInput,
): Record<string, CalibrationDelta> {
  const { choice, judgmentId, existingDeltas, judgmentCount } = input;
  if (choice === "skip") return existingDeltas;

  const shrink = shrinkageFactor(judgmentCount);
  const next = { ...existingDeltas };
  const learningRate = 0.15 * shrink;

  const targetLeft =
    choice === "left" ? 1 : choice === "right" ? 0 : choice === "both" ? 0.75 : 0.25;

  const leftUtility = utilityFromSnapshot(input.snapshot, input.leftFeatureIds);
  const rightUtility = utilityFromSnapshot(input.snapshot, input.rightFeatureIds);
  const predicted = predictPairwisePreference(leftUtility, rightUtility);
  const error = targetLeft - predicted;

  const affected =
    choice === "neither"
      ? [...new Set([...input.leftFeatureIds, ...input.rightFeatureIds])]
      : input.decidingFeatureIds.length > 0
        ? input.decidingFeatureIds
        : choice === "left"
          ? input.leftFeatureIds
          : choice === "right"
            ? input.rightFeatureIds
            : [...new Set([...input.leftFeatureIds, ...input.rightFeatureIds])];

  for (const featureId of affected) {
    const prior = next[featureId] ?? {
      featureId,
      signedDelta: 0,
      confidence: 0.2,
      sourceJudgmentIds: [],
    };
    const direction =
      choice === "left" && input.leftFeatureIds.includes(featureId)
        ? 1
        : choice === "right" && input.rightFeatureIds.includes(featureId)
          ? 1
          : choice === "both"
            ? 0.5
            : choice === "neither"
              ? -0.6
              : 0;
    const signedDelta = prior.signedDelta + direction * learningRate * error;
    const confidence = Math.min(
      1,
      prior.confidence + Math.abs(error) * 0.08 * shrink,
    );
    next[featureId] = {
      featureId,
      signedDelta,
      confidence,
      sourceJudgmentIds: [...prior.sourceJudgmentIds, judgmentId],
    };
  }

  return next;
}
