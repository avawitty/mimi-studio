/**
 * Deterministic seeded pair selection for Calibration Lab active learning.
 */
import type { TasteCalibrationPair } from "../../schemas/tasteIntelligenceContracts.js";
import type { TasteModelSnapshot } from "../tasteModel/contracts.js";
import { PAIR_SELECTION_WEIGHTS } from "./constants.js";

export interface CalibrationCandidate {
  id: string;
  label?: string;
  featureIds: string[];
  predictedUtility: number;
  sourceIds: string[];
}

export interface PairSelectionInput {
  seed: string;
  snapshot: TasteModelSnapshot;
  candidates: CalibrationCandidate[];
  askedPairKeys: Set<string>;
  fatigueCount: number;
  uncertainFeatureIds: string[];
  contradictionFeatureIds: string[];
  emergingFeatureIds: string[];
  projectFeatureIds?: string[];
}

export interface ScoredPair {
  left: CalibrationCandidate;
  right: CalibrationCandidate;
  isolatedFeatureIds: string[];
  selectionReason: TasteCalibrationPair["selectionReason"];
  predictedLeftPreference: number;
  expectedInformationGain: number;
  priority: number;
}

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function featureDisagreement(
  left: CalibrationCandidate,
  right: CalibrationCandidate,
  snapshot: TasteModelSnapshot,
): number {
  const weightMap = new Map(
    snapshot.featureWeights.map((f) => [f.featureId, f.signedWeight]),
  );
  let disagreement = 0;
  const all = new Set([...left.featureIds, ...right.featureIds]);
  for (const fid of all) {
    const wl = left.featureIds.includes(fid) ? weightMap.get(fid) ?? 0 : 0;
    const wr = right.featureIds.includes(fid) ? weightMap.get(fid) ?? 0 : 0;
    disagreement += Math.abs(wl - wr);
  }
  return Math.min(1, disagreement / Math.max(1, all.size));
}

function coverageGap(
  left: CalibrationCandidate,
  right: CalibrationCandidate,
  uncertainFeatureIds: string[],
): number {
  const tested = new Set([...left.featureIds, ...right.featureIds]);
  const gaps = uncertainFeatureIds.filter((id) => tested.has(id));
  if (uncertainFeatureIds.length === 0) return 0;
  return gaps.length / uncertainFeatureIds.length;
}

function isolateFeatures(
  left: CalibrationCandidate,
  right: CalibrationCandidate,
): string[] {
  const leftOnly = left.featureIds.filter((f) => !right.featureIds.includes(f));
  const rightOnly = right.featureIds.filter((f) => !left.featureIds.includes(f));
  return [...new Set([...leftOnly, ...rightOnly])].slice(0, 6);
}

function inferReason(
  uncertainty: number,
  disagreement: number,
  gap: number,
  contradictionValue: number,
  trajectoryValue: number,
): TasteCalibrationPair["selectionReason"] {
  const scores: Array<[TasteCalibrationPair["selectionReason"], number]> = [
    ["high_uncertainty", uncertainty],
    ["feature_disagreement", disagreement],
    ["coverage_gap", gap],
    ["contradiction", contradictionValue],
    ["trajectory_check", trajectoryValue],
  ];
  scores.sort((a, b) => b[1] - a[1]);
  return scores[0]?.[0] ?? "exploration";
}

export function scoreCalibrationPairs(
  input: PairSelectionInput,
): ScoredPair[] {
  const {
    snapshot,
    candidates,
    askedPairKeys,
    fatigueCount,
    uncertainFeatureIds,
    contradictionFeatureIds,
    emergingFeatureIds,
    projectFeatureIds,
  } = input;

  if (candidates.length < 2) return [];

  const scored: ScoredPair[] = [];
  for (let i = 0; i < candidates.length; i += 1) {
    for (let j = i + 1; j < candidates.length; j += 1) {
      const left = candidates[i]!;
      const right = candidates[j]!;
      const key = pairKey(left.id, right.id);
      if (askedPairKeys.has(key)) continue;

      const utilityDelta = left.predictedUtility - right.predictedUtility;
      const predictedLeftPreference = sigmoid(utilityDelta / 0.35);
      const uncertainty =
        1 - Math.abs(predictedLeftPreference - 0.5) * 2;
      const disagreement = featureDisagreement(left, right, snapshot);
      const gap = coverageGap(left, right, uncertainFeatureIds);
      const isolated = isolateFeatures(left, right);
      const contradictionValue = isolated.some((f) =>
        contradictionFeatureIds.includes(f),
      )
        ? 1
        : 0;
      const trajectoryValue = isolated.some((f) =>
        emergingFeatureIds.includes(f),
      )
        ? 0.8
        : 0;
      const novelty =
        projectFeatureIds &&
        isolated.some((f) => projectFeatureIds.includes(f))
          ? 0.6
          : 0.2;
      const repetitionPenalty = askedPairKeys.has(key) ? 1 : 0;
      const fatiguePenalty = Math.min(1, fatigueCount / 20);

      const priority =
        uncertainty * PAIR_SELECTION_WEIGHTS.uncertainty +
        disagreement * PAIR_SELECTION_WEIGHTS.featureDisagreement +
        gap * PAIR_SELECTION_WEIGHTS.coverageGap +
        contradictionValue * PAIR_SELECTION_WEIGHTS.contradictionValue +
        trajectoryValue * PAIR_SELECTION_WEIGHTS.trajectoryValue +
        novelty * PAIR_SELECTION_WEIGHTS.calibratedNovelty -
        repetitionPenalty * PAIR_SELECTION_WEIGHTS.repetitionPenalty -
        fatiguePenalty * PAIR_SELECTION_WEIGHTS.fatiguePenalty;

      const expectedInformationGain = Math.min(
        1,
        uncertainty * 0.5 + gap * 0.3 + disagreement * 0.2,
      );

      scored.push({
        left,
        right,
        isolatedFeatureIds: isolated,
        selectionReason: inferReason(
          uncertainty,
          disagreement,
          gap,
          contradictionValue,
          trajectoryValue,
        ),
        predictedLeftPreference,
        expectedInformationGain,
        priority,
      });
    }
  }

  scored.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    const ha = hashSeed(`${input.seed}:${a.left.id}:${a.right.id}`);
    const hb = hashSeed(`${input.seed}:${b.left.id}:${b.right.id}`);
    return ha - hb;
  });

  return scored;
}

export function selectNextCalibrationPair(
  input: PairSelectionInput,
): ScoredPair | null {
  const scored = scoreCalibrationPairs(input);
  return scored[0] ?? null;
}
