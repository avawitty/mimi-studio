import type {
  TasteFeatureWeight,
  TasteModelSnapshot,
} from '../tasteModel/contracts';
import type {
  CalibrationCandidate,
  CalibrationSelectionReason,
  TasteCalibrationPair,
} from './contracts';
import {
  CALIBRATION_ALGORITHM_VERSION,
  HIGH_CONFIDENCE_THRESHOLD,
  LOW_CONFIDENCE_THRESHOLD,
  MAX_ISOLATED_FEATURES,
  MAX_SHARED_FEATURE_RATIO,
  MIN_FEATURE_DISAGREEMENT,
  MIN_PAIR_PRIORITY,
  PAIR_SELECTION_COEFFICIENTS,
  PAIR_SELECTION_PENALTIES,
} from './constants';
import { createSeededRandom, stablePairKey } from './seededRandom';
import { predictLeftPreference } from './pairwisePreferenceUpdate';

export interface PairSelectionContext {
  seed: string;
  pairIndex: number;
  askedPairKeys: Set<string>;
  featureAskCounts: Map<string, number>;
  model: TasteModelSnapshot | null;
  candidates: CalibrationCandidate[];
}

export interface RankedPair {
  left: CalibrationCandidate;
  right: CalibrationCandidate;
  priority: number;
  predictedLeftPreference: number;
  expectedInformationGain: number;
  isolatedFeatureIds: string[];
  selectionReason: CalibrationSelectionReason;
}

function jaccardDistance(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const id of a) {
    if (b.has(id)) intersection += 1;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : 1 - intersection / union;
}

function getFeatureWeight(
  model: TasteModelSnapshot | null,
  featureId: string,
): TasteFeatureWeight | undefined {
  return model?.featureWeights.find((f) => f.featureId === featureId);
}

function computeUncertaintyScore(predictedLeft: number): number {
  return 1 - Math.abs(predictedLeft - 0.5) * 2;
}

function computeCoverageGap(
  featureIds: string[],
  model: TasteModelSnapshot | null,
): number {
  if (featureIds.length === 0) return 0.5;
  let gap = 0;
  for (const id of featureIds) {
    const fw = getFeatureWeight(model, id);
    const conf = fw?.confidence ?? 0.15;
    gap += 1 - conf;
  }
  return gap / featureIds.length;
}

function computeContradictionValue(
  leftFeatures: Set<string>,
  rightFeatures: Set<string>,
  model: TasteModelSnapshot | null,
): number {
  let value = 0;
  let count = 0;
  for (const id of new Set([...leftFeatures, ...rightFeatures])) {
    const fw = getFeatureWeight(model, id);
    if (!fw) continue;
    const inLeft = leftFeatures.has(id);
    const inRight = rightFeatures.has(id);
    if (inLeft !== inRight && Math.abs(fw.signedWeight) > 0.2) {
      value += Math.min(fw.confidence, 0.8);
      count += 1;
    }
  }
  return count === 0 ? 0 : value / count;
}

function computeTrajectoryValue(
  featureIds: string[],
  model: TasteModelSnapshot | null,
): number {
  if (!model) return 0.3;
  const emerging = new Set(model.trajectory.emergingFeatureIds);
  const strengthening = new Set(model.trajectory.strengtheningFeatureIds);
  let score = 0;
  for (const id of featureIds) {
    if (emerging.has(id)) score += 1;
    else if (strengthening.has(id)) score += 0.6;
  }
  return featureIds.length === 0 ? 0 : score / featureIds.length;
}

function isolateFeatures(
  left: CalibrationCandidate,
  right: CalibrationCandidate,
): string[] {
  const leftSet = new Set(left.featureIds);
  const rightSet = new Set(right.featureIds);
  const isolated: string[] = [];
  for (const id of left.featureIds) {
    if (!rightSet.has(id)) isolated.push(id);
  }
  for (const id of right.featureIds) {
    if (!leftSet.has(id)) isolated.push(id);
  }
  return [...new Set(isolated)].slice(0, MAX_ISOLATED_FEATURES);
}

function buildExplanation(
  isolatedFeatureIds: string[],
  left: CalibrationCandidate,
  right: CalibrationCandidate,
  uncertaintyScore: number,
): string {
  const labels = isolatedFeatureIds
    .map((id) => left.featureLabels[id] ?? right.featureLabels[id] ?? id.replace('tag:', ''))
    .filter(Boolean);

  if (labels.length >= 2) {
    return `Mimi is uncertain whether your preference is driven more by ${labels[0]} or ${labels[1]}. These references separate those signals.`;
  }
  if (labels.length === 1) {
    return `Mimi needs clearer evidence about ${labels[0]}. These references isolate that signal from the rest of your taste profile.`;
  }
  if (uncertaintyScore > 0.7) {
    return 'Mimi is uncertain which of these references better matches your current taste boundary. This comparison should sharpen that edge.';
  }
  return 'These references differ in ways that should help Mimi refine your taste model.';
}

function rankPair(
  left: CalibrationCandidate,
  right: CalibrationCandidate,
  ctx: PairSelectionContext,
): RankedPair | null {
  if (left.id === right.id) return null;

  const pairKey = stablePairKey(left.id, right.id);
  if (ctx.askedPairKeys.has(pairKey)) return null;

  const leftSet = new Set(left.featureIds);
  const rightSet = new Set(right.featureIds);
  const featureDisagreement = jaccardDistance(leftSet, rightSet);
  if (featureDisagreement < MIN_FEATURE_DISAGREEMENT && left.featureIds.length > 2) {
    return null;
  }

  const shared = [...leftSet].filter((id) => rightSet.has(id)).length;
  const sharedRatio =
    Math.max(leftSet.size, rightSet.size) === 0
      ? 0
      : shared / Math.max(leftSet.size, rightSet.size);

  const isolatedFeatureIds = isolateFeatures(left, right);
  const predictedLeftPreference = predictLeftPreference(
    left,
    right,
    ctx.model,
  );

  const uncertaintyScore = computeUncertaintyScore(predictedLeftPreference);
  const coverageGapScore = computeCoverageGap(
    [...leftSet, ...rightSet],
    ctx.model,
  );
  const contradictionValue = computeContradictionValue(leftSet, rightSet, ctx.model);
  const trajectoryValue = computeTrajectoryValue(
    isolatedFeatureIds,
    ctx.model,
  );

  const noveltySeed = `${ctx.seed}:${pairKey}:${ctx.pairIndex}`;
  const rng = createSeededRandom(noveltySeed);
  const calibratedNovelty = 0.5 + rng() * 0.5;

  let priority =
    uncertaintyScore * PAIR_SELECTION_COEFFICIENTS.uncertainty +
    featureDisagreement * PAIR_SELECTION_COEFFICIENTS.featureDisagreement +
    coverageGapScore * PAIR_SELECTION_COEFFICIENTS.coverageGap +
    contradictionValue * PAIR_SELECTION_COEFFICIENTS.contradictionValue +
    trajectoryValue * PAIR_SELECTION_COEFFICIENTS.trajectoryValue +
    calibratedNovelty * PAIR_SELECTION_COEFFICIENTS.calibratedNovelty;

  if (sharedRatio > MAX_SHARED_FEATURE_RATIO) {
    priority -= PAIR_SELECTION_PENALTIES.nearDuplicatePair;
  }

  let fatiguePenalty = 0;
  for (const id of isolatedFeatureIds) {
    const count = ctx.featureAskCounts.get(id) ?? 0;
    fatiguePenalty += count * PAIR_SELECTION_PENALTIES.featureFatiguePerUse;
  }
  priority -= fatiguePenalty;

  let highConfidencePenalty = 0;
  for (const id of isolatedFeatureIds) {
    const fw = getFeatureWeight(ctx.model, id);
    if (fw && fw.confidence >= HIGH_CONFIDENCE_THRESHOLD) {
      highConfidencePenalty += PAIR_SELECTION_PENALTIES.highConfidenceSignal;
    }
  }
  priority -= highConfidencePenalty;

  const uncontrolledDims = Math.max(0, isolatedFeatureIds.length - MAX_ISOLATED_FEATURES);
  priority -= uncontrolledDims * PAIR_SELECTION_PENALTIES.maxUncontrolledDimensions;

  if (priority < MIN_PAIR_PRIORITY) return null;

  const primaryFeatureIds = isolatedFeatureIds.slice(0, 2);
  const primaryFeatureLabels = primaryFeatureIds.map(
    (id) => left.featureLabels[id] ?? right.featureLabels[id] ?? id.replace('tag:', ''),
  );

  const selectionReason: CalibrationSelectionReason = {
    primaryFeatureIds,
    primaryFeatureLabels,
    uncertaintyScore,
    featureDisagreementScore: featureDisagreement,
    coverageGapScore,
    explanation: buildExplanation(
      isolatedFeatureIds,
      left,
      right,
      uncertaintyScore,
    ),
    algorithmVersion: CALIBRATION_ALGORITHM_VERSION,
  };

  const expectedInformationGain =
    uncertaintyScore * 0.5 +
    featureDisagreement * 0.25 +
    coverageGapScore * 0.25;

  return {
    left,
    right,
    priority,
    predictedLeftPreference,
    expectedInformationGain,
    isolatedFeatureIds,
    selectionReason,
  };
}

export function selectCalibrationPair(
  ctx: PairSelectionContext,
): RankedPair | null {
  const { candidates } = ctx;
  if (candidates.length < 2) return null;

  const ranked: RankedPair[] = [];
  for (let i = 0; i < candidates.length; i += 1) {
    for (let j = i + 1; j < candidates.length; j += 1) {
      const result = rankPair(candidates[i], candidates[j], ctx);
      if (result) ranked.push(result);
    }
  }

  if (ranked.length === 0) return null;

  ranked.sort((a, b) => b.priority - a.priority);

  const tieBreakRng = createSeededRandom(`${ctx.seed}:select:${ctx.pairIndex}`);
  const topTier = ranked.filter(
    (r) => r.priority >= ranked[0].priority - 0.05,
  );
  const index = Math.floor(tieBreakRng() * topTier.length);
  return topTier[index] ?? ranked[0];
}

export function rankedPairToCalibrationPair(
  ranked: RankedPair,
  sessionId: string,
  pairIndex: number,
  pairId: string,
  askedAt: number,
): TasteCalibrationPair {
  return {
    id: pairId,
    sessionId,
    pairIndex,
    leftCandidateId: ranked.left.id,
    rightCandidateId: ranked.right.id,
    isolatedFeatureIds: ranked.isolatedFeatureIds,
    selectionReason: ranked.selectionReason,
    predictedLeftPreference: ranked.predictedLeftPreference,
    expectedInformationGain: ranked.expectedInformationGain,
    askedAt,
  };
}

export function getRemainingUncertaintyFeatureIds(
  model: TasteModelSnapshot | null,
  limit = 3,
): string[] {
  if (!model) return [];
  return model.featureWeights
    .filter((f) => f.confidence < LOW_CONFIDENCE_THRESHOLD)
    .sort((a, b) => a.confidence - b.confidence)
    .slice(0, limit)
    .map((f) => f.featureId);
}
