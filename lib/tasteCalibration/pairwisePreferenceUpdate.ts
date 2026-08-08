import type {
  TasteFeatureWeight,
  TasteModelSnapshot,
} from '../tasteModel/contracts';
import type {
  CalibrationCandidate,
  CalibrationChoice,
  TasteCalibrationPair,
  TasteModelDelta,
  TastePairwiseJudgment,
} from './contracts';
import {
  CALIBRATION_ALGORITHM_VERSION,
  LOW_CONFIDENCE_THRESHOLD,
  PAIRWISE_UPDATE,
} from './constants';
import { getRemainingUncertaintyFeatureIds } from './selectCalibrationPair';

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function getOrCreateFeature(
  weights: Map<string, TasteFeatureWeight>,
  featureId: string,
  label: string,
): TasteFeatureWeight {
  const existing = weights.get(featureId);
  if (existing) return existing;

  const created: TasteFeatureWeight = {
    featureId,
    label,
    category: 'calibration',
    sourceType: 'tag',
    signedWeight: 0,
    confidence: 0.15,
    evidenceMass: 0,
    explicitMass: 0,
    implicitMass: 0,
    trend: 'uncertain',
    contextScopes: ['session'],
    sourceIds: [],
  };
  weights.set(featureId, created);
  return created;
}

function candidateUtility(
  candidate: CalibrationCandidate,
  weights: Map<string, TasteFeatureWeight>,
): number {
  let utility = 0;
  for (const featureId of candidate.featureIds) {
    const fw = weights.get(featureId);
    if (!fw) continue;
    utility += fw.signedWeight * Math.max(fw.confidence, 0.2);
  }
  return utility;
}

export function predictLeftPreference(
  left: CalibrationCandidate,
  right: CalibrationCandidate,
  model: TasteModelSnapshot | null,
): number {
  const weights = new Map<string, TasteFeatureWeight>();
  for (const fw of model?.featureWeights ?? []) {
    weights.set(fw.featureId, { ...fw });
  }

  const leftUtility = candidateUtility(left, weights);
  const rightUtility = candidateUtility(right, weights);
  const diff = (leftUtility - rightUtility) / PAIRWISE_UPDATE.temperature;
  return sigmoid(diff);
}

function applyFeatureUpdate(
  weights: Map<string, TasteFeatureWeight>,
  featureId: string,
  label: string,
  delta: number,
  evidenceMass: number,
  explicit: boolean,
): void {
  const fw = getOrCreateFeature(weights, featureId, label);
  const shrinkage = PAIRWISE_UPDATE.sparseShrinkageAlpha;
  const prior = fw.signedWeight;
  fw.signedWeight = prior * (1 - shrinkage) + (prior + delta) * shrinkage;
  fw.evidenceMass += evidenceMass;
  if (explicit) fw.explicitMass += evidenceMass;
  else fw.implicitMass += evidenceMass;
  fw.confidence = Math.min(
    PAIRWISE_UPDATE.maxCalibrationConfidence,
    fw.confidence + PAIRWISE_UPDATE.confidenceBoost * (explicit ? 1 : 0.3),
  );
  fw.lastSeenAt = Date.now();
  if (!fw.firstSeenAt) fw.firstSeenAt = fw.lastSeenAt;
}

function featureLabel(
  featureId: string,
  left: CalibrationCandidate,
  right: CalibrationCandidate,
): string {
  return (
    left.featureLabels[featureId] ??
    right.featureLabels[featureId] ??
    featureId.replace('tag:', '').replace(/_/g, ' ')
  );
}

function featureMultiplier(
  featureId: string,
  decidingFeatureIds: string[],
  pairFeatureIds: string[],
): number {
  if (decidingFeatureIds.length === 0) return 1;
  if (decidingFeatureIds.includes(featureId)) {
    return PAIRWISE_UPDATE.decidingFeatureMultiplier;
  }
  if (pairFeatureIds.includes(featureId)) return 0.6;
  return 1;
}

export function applyPairwiseJudgment(
  baseModel: TasteModelSnapshot | null,
  pair: TasteCalibrationPair,
  judgment: Pick<
    TastePairwiseJudgment,
    'choice' | 'decidingFeatureIds' | 'answeredAt'
  >,
  left: CalibrationCandidate,
  right: CalibrationCandidate,
): TasteModelSnapshot {
  const now = judgment.answeredAt;
  const weights = new Map<string, TasteFeatureWeight>();
  for (const fw of baseModel?.featureWeights ?? []) {
    weights.set(fw.featureId, { ...fw });
  }

  const lr = PAIRWISE_UPDATE.explicitLearningRate;
  const { choice, decidingFeatureIds } = judgment;

  if (choice === 'skip') {
    return compileSnapshotFromWeights(baseModel, weights, now);
  }

  const leftOnly = pair.isolatedFeatureIds.filter((id) => left.featureIds.includes(id));
  const rightOnly = pair.isolatedFeatureIds.filter((id) => right.featureIds.includes(id));
  const shared = pair.isolatedFeatureIds.filter(
    (id) => left.featureIds.includes(id) && right.featureIds.includes(id),
  );

  const applyDelta = (
    featureId: string,
    delta: number,
    mass: number,
  ): void => {
    const multiplier = featureMultiplier(
      featureId,
      decidingFeatureIds,
      pair.isolatedFeatureIds,
    );
    applyFeatureUpdate(
      weights,
      featureId,
      featureLabel(featureId, left, right),
      delta * lr * multiplier,
      mass,
      true,
    );
  };

  switch (choice) {
    case 'left':
      for (const id of leftOnly) applyDelta(id, 0.4, PAIRWISE_UPDATE.explicitEvidenceMass);
      for (const id of rightOnly) applyDelta(id, -0.3, PAIRWISE_UPDATE.explicitEvidenceMass);
      break;
    case 'right':
      for (const id of rightOnly) applyDelta(id, 0.4, PAIRWISE_UPDATE.explicitEvidenceMass);
      for (const id of leftOnly) applyDelta(id, -0.3, PAIRWISE_UPDATE.explicitEvidenceMass);
      break;
    case 'both':
      for (const id of [...leftOnly, ...rightOnly, ...shared]) {
        applyDelta(id, 0.15, PAIRWISE_UPDATE.bothEvidenceMass);
      }
      break;
    case 'neither':
      for (const id of [...leftOnly, ...rightOnly, ...shared]) {
        applyDelta(id, -0.35, PAIRWISE_UPDATE.neitherEvidenceMass);
      }
      break;
    default: {
      const _exhaustive: never = choice;
      return _exhaustive;
    }
  }

  return compileSnapshotFromWeights(baseModel, weights, now);
}

function compileSnapshotFromWeights(
  baseModel: TasteModelSnapshot | null,
  weights: Map<string, TasteFeatureWeight>,
  compiledAt: number,
): TasteModelSnapshot {
  const featureWeights = [...weights.values()].sort((a, b) =>
    a.featureId.localeCompare(b.featureId),
  );

  const lowConfidenceFeatureIds = featureWeights
    .filter((f) => f.confidence < LOW_CONFIDENCE_THRESHOLD)
    .map((f) => f.featureId);

  return {
    schemaVersion: 1,
    modelVersion: 'mimi-taste-model-v1',
    id: `calibration-${compiledAt}`,
    userId: baseModel?.userId ?? 'unknown',
    projectId: baseModel?.projectId,
    scope: baseModel?.scope ?? 'project',
    compiledAt,
    featureWeights,
    interactionRules: baseModel?.interactionRules ?? [],
    trajectory: baseModel?.trajectory ?? {
      emergingFeatureIds: [],
      strengtheningFeatureIds: [],
      stableFeatureIds: [],
      decliningFeatureIds: [],
    },
    diagnostics: {
      evidenceCount: baseModel?.diagnostics.evidenceCount ?? 0,
      eventCount: (baseModel?.diagnostics.eventCount ?? 0) + 1,
      explicitEventCount: (baseModel?.diagnostics.explicitEventCount ?? 0) + 1,
      contradictionCount: baseModel?.diagnostics.contradictionCount ?? 0,
      lowConfidenceFeatureIds,
      missingDataWarnings: baseModel?.diagnostics.missingDataWarnings ?? [],
    },
    sourceWindow: baseModel?.sourceWindow ?? {},
  };
}

export function computeModelDelta(
  previous: TasteModelSnapshot | null,
  next: TasteModelSnapshot,
): TasteModelDelta {
  const prevMap = new Map(
    (previous?.featureWeights ?? []).map((f) => [f.featureId, f]),
  );
  const changedFeatures: TasteModelDelta['changedFeatures'] = [];

  for (const nf of next.featureWeights) {
    const pf = prevMap.get(nf.featureId);
    const previousWeight = pf?.signedWeight ?? 0;
    const previousConfidence = pf?.confidence ?? 0;
    const weightDelta = nf.signedWeight - previousWeight;
    const confidenceDelta = nf.confidence - previousConfidence;

    if (
      Math.abs(weightDelta) >= PAIRWISE_UPDATE.materialWeightDelta ||
      Math.abs(confidenceDelta) >= PAIRWISE_UPDATE.materialConfidenceDelta
    ) {
      changedFeatures.push({
        featureId: nf.featureId,
        label: nf.label,
        previousWeight,
        nextWeight: nf.signedWeight,
        delta: weightDelta,
        previousConfidence,
        nextConfidence: nf.confidence,
      });
    }
  }

  changedFeatures.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  return {
    previousSnapshotId: previous?.id,
    nextSnapshotId: next.id,
    changedFeatures,
    changedRules: [],
    remainingUncertaintyFeatureIds: getRemainingUncertaintyFeatureIds(next),
  };
}

export function passiveViewWouldBeWeaker(
  explicitDelta: number,
  passiveDelta: number,
): boolean {
  return Math.abs(explicitDelta) > Math.abs(passiveDelta);
}

export const CALIBRATION_ALGO_VERSION = CALIBRATION_ALGORITHM_VERSION;
