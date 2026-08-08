import { describe, expect, it } from 'vitest';
import { buildCalibrationCandidates } from '../lib/tasteCalibration/candidateFromEvidence';
import {
  applyPairwiseJudgment,
  computeModelDelta,
  passiveViewWouldBeWeaker,
  predictLeftPreference,
} from '../lib/tasteCalibration/pairwisePreferenceUpdate';
import {
  rankedPairToCalibrationPair,
  selectCalibrationPair,
} from '../lib/tasteCalibration/selectCalibrationPair';
import { createSeededRandom, stablePairKey } from '../lib/tasteCalibration/seededRandom';
import type { CalibrationCandidate } from '../lib/tasteCalibration/contracts';
import type { TasteModelSnapshot } from '../lib/tasteModel/contracts';
import type { EvidenceNode } from '../types';

function candidate(
  id: string,
  features: string[],
  overrides: Partial<CalibrationCandidate> = {},
): CalibrationCandidate {
  const featureLabels = Object.fromEntries(features.map((f) => [`tag:${f}`, f]));
  return {
    id,
    label: id,
    featureIds: features.map((f) => `tag:${f}`),
    featureLabels,
    tags: features,
    ...overrides,
  };
}

function baseModel(
  weights: Array<{ id: string; label: string; signedWeight: number; confidence: number }>,
): TasteModelSnapshot {
  return {
    schemaVersion: 1,
    modelVersion: 'mimi-taste-model-v1',
    id: 'base',
    userId: 'u1',
    scope: 'project',
    compiledAt: Date.now(),
    featureWeights: weights.map((w) => ({
      featureId: w.id,
      label: w.label,
      category: 'visual',
      sourceType: 'tag',
      signedWeight: w.signedWeight,
      confidence: w.confidence,
      evidenceMass: 1,
      explicitMass: 0,
      implicitMass: 1,
      trend: 'uncertain',
      contextScopes: ['project'],
      sourceIds: [] as string[],
    })),
    interactionRules: [],
    trajectory: {
      emergingFeatureIds: [],
      strengtheningFeatureIds: [],
      stableFeatureIds: [],
      decliningFeatureIds: [],
    },
    diagnostics: {
      evidenceCount: 1,
      eventCount: 1,
      explicitEventCount: 0,
      contradictionCount: 0,
      lowConfidenceFeatureIds: weights.filter((w) => w.confidence < 0.4).map((w) => w.id),
      missingDataWarnings: [],
    },
    sourceWindow: {},
  };
}

describe('selectCalibrationPair', () => {
  const candidates = [
    candidate('a', ['severe_composition', 'industrial']),
    candidate('b', ['pale_lighting', 'atmospheric']),
    candidate('c', ['commercial_polish', 'sleek']),
    candidate('d', ['industrial', 'raw_texture']),
  ];

  it('is deterministic with the same seed', () => {
    const ctx = {
      seed: 'test-seed',
      pairIndex: 0,
      askedPairKeys: new Set<string>(),
      featureAskCounts: new Map<string, number>(),
      model: baseModel([
        { id: 'tag:severe_composition', label: 'severe composition', signedWeight: 0.2, confidence: 0.3 },
        { id: 'tag:pale_lighting', label: 'pale lighting', signedWeight: 0.1, confidence: 0.25 },
      ]),
      candidates,
    };
    const first = selectCalibrationPair(ctx);
    const second = selectCalibrationPair(ctx);
    expect(first?.left.id).toBe(second?.left.id);
    expect(first?.right.id).toBe(second?.right.id);
  });

  it('prefers high-uncertainty pairs over high-confidence pairs', () => {
    const uncertain = selectCalibrationPair({
      seed: 'uncertain',
      pairIndex: 0,
      askedPairKeys: new Set(),
      featureAskCounts: new Map(),
      model: baseModel([
        { id: 'tag:severe_composition', label: 'severe composition', signedWeight: 0.05, confidence: 0.2 },
        { id: 'tag:pale_lighting', label: 'pale lighting', signedWeight: -0.05, confidence: 0.2 },
        { id: 'tag:commercial_polish', label: 'commercial polish', signedWeight: 0.9, confidence: 0.92 },
      ]),
      candidates,
    });

    const confident = selectCalibrationPair({
      seed: 'uncertain',
      pairIndex: 0,
      askedPairKeys: new Set(),
      featureAskCounts: new Map(),
      model: baseModel([
        { id: 'tag:commercial_polish', label: 'commercial polish', signedWeight: 0.9, confidence: 0.95 },
        { id: 'tag:sleek', label: 'sleek', signedWeight: 0.85, confidence: 0.93 },
      ]),
      candidates: [candidate('c', ['commercial_polish', 'sleek']), candidate('d', ['commercial_polish'])],
    });

    expect(uncertain?.priority ?? 0).toBeGreaterThan(confident?.priority ?? 0);
  });

  it('penalizes duplicate pairs', () => {
    const left = candidates[0];
    const right = candidates[1];
    const key = stablePairKey(left.id, right.id);
    const withoutDup = selectCalibrationPair({
      seed: 'dup',
      pairIndex: 0,
      askedPairKeys: new Set(),
      featureAskCounts: new Map(),
      model: null,
      candidates,
    });
    const withDup = selectCalibrationPair({
      seed: 'dup',
      pairIndex: 1,
      askedPairKeys: new Set([key]),
      featureAskCounts: new Map(),
      model: null,
      candidates,
    });
    expect(withoutDup?.left.id).not.toBe(withDup?.left.id);
  });

  it('ranks feature disagreement higher when features diverge', () => {
    const divergent = selectCalibrationPair({
      seed: 'disagree',
      pairIndex: 0,
      askedPairKeys: new Set(),
      featureAskCounts: new Map(),
      model: null,
      candidates: [candidate('x', ['a', 'b']), candidate('y', ['c', 'd'])],
    });
    const similar = selectCalibrationPair({
      seed: 'disagree',
      pairIndex: 0,
      askedPairKeys: new Set(),
      featureAskCounts: new Map(),
      model: null,
      candidates: [candidate('x', ['a', 'b']), candidate('y', ['a', 'b', 'c'])],
    });
    expect(divergent?.selectionReason.featureDisagreementScore ?? 0).toBeGreaterThan(
      similar?.selectionReason.featureDisagreementScore ?? 0,
    );
  });
});

describe('pairwisePreferenceUpdate', () => {
  const left = candidate('left', ['industrial_restraint']);
  const right = candidate('right', ['commercial_polish']);
  const pair = rankedPairToCalibrationPair(
    {
      left,
      right,
      priority: 1,
      predictedLeftPreference: 0.5,
      expectedInformationGain: 0.5,
      isolatedFeatureIds: ['tag:industrial_restraint', 'tag:commercial_polish'],
      selectionReason: {
        primaryFeatureIds: [],
        primaryFeatureLabels: [],
        uncertaintyScore: 0.8,
        featureDisagreementScore: 0.5,
        coverageGapScore: 0.5,
        explanation: 'test',
        algorithmVersion: 'taste-calibration-v1',
      },
    },
    'session',
    0,
    'pair-1',
    Date.now(),
  );

  it('skip causes no taste update', () => {
    const before = baseModel([]);
    const after = applyPairwiseJudgment(before, pair, {
      choice: 'skip',
      decidingFeatureIds: [],
      answeredAt: Date.now(),
    }, left, right);
    expect(after.featureWeights).toHaveLength(before.featureWeights.length);
  });

  it('neither generates negative evidence', () => {
    const after = applyPairwiseJudgment(null, pair, {
      choice: 'neither',
      decidingFeatureIds: [],
      answeredAt: Date.now(),
    }, left, right);
    const industrial = after.featureWeights.find((f) => f.featureId === 'tag:industrial_restraint');
    expect(industrial?.signedWeight ?? 0).toBeLessThan(0);
  });

  it('both does not create arbitrary preference winner', () => {
    const after = applyPairwiseJudgment(null, pair, {
      choice: 'both',
      decidingFeatureIds: [],
      answeredAt: Date.now(),
    }, left, right);
    const industrial = after.featureWeights.find((f) => f.featureId === 'tag:industrial_restraint');
    const commercial = after.featureWeights.find((f) => f.featureId === 'tag:commercial_polish');
    expect(industrial?.signedWeight ?? 0).toBeGreaterThan(0);
    expect(commercial?.signedWeight ?? 0).toBeGreaterThan(0);
    expect(Math.abs((industrial?.signedWeight ?? 0) - (commercial?.signedWeight ?? 0))).toBeLessThan(0.2);
  });

  it('left/right update in the correct direction', () => {
    const leftAfter = applyPairwiseJudgment(null, pair, {
      choice: 'left',
      decidingFeatureIds: [],
      answeredAt: Date.now(),
    }, left, right);
    const rightAfter = applyPairwiseJudgment(null, pair, {
      choice: 'right',
      decidingFeatureIds: [],
      answeredAt: Date.now(),
    }, left, right);
    const leftIndustrial = leftAfter.featureWeights.find((f) => f.featureId === 'tag:industrial_restraint');
    const rightIndustrial = rightAfter.featureWeights.find((f) => f.featureId === 'tag:industrial_restraint');
    expect(leftIndustrial?.signedWeight ?? 0).toBeGreaterThan(rightIndustrial?.signedWeight ?? 0);
  });

  it('decidingFeatureIds receive stronger update', () => {
    const focused = applyPairwiseJudgment(null, pair, {
      choice: 'left',
      decidingFeatureIds: ['tag:industrial_restraint'],
      answeredAt: Date.now(),
    }, left, right);
    const otherFeature = applyPairwiseJudgment(null, pair, {
      choice: 'left',
      decidingFeatureIds: ['tag:commercial_polish'],
      answeredAt: Date.now(),
    }, left, right);
    const focusedWeight = focused.featureWeights.find((f) => f.featureId === 'tag:industrial_restraint')?.signedWeight ?? 0;
    const otherWeight = otherFeature.featureWeights.find((f) => f.featureId === 'tag:industrial_restraint')?.signedWeight ?? 0;
    expect(focusedWeight).toBeGreaterThan(otherWeight);
  });

  it('explicit pair judgment outranks passive views', () => {
    const explicit = 0.35;
    const passive = explicit * 0.08;
    expect(passiveViewWouldBeWeaker(explicit, passive)).toBe(true);
  });

  it('sparse calibration shrinks toward base model', () => {
    const model = baseModel([
      { id: 'tag:industrial_restraint', label: 'industrial restraint', signedWeight: 0.8, confidence: 0.7 },
    ]);
    const after = applyPairwiseJudgment(model, pair, {
      choice: 'left',
      decidingFeatureIds: ['tag:industrial_restraint'],
      answeredAt: Date.now(),
    }, left, right);
    const updated = after.featureWeights.find((f) => f.featureId === 'tag:industrial_restraint');
    expect(updated?.signedWeight ?? 0).toBeLessThan(0.95);
    expect(updated?.signedWeight ?? 0).toBeGreaterThan(0.8);
  });

  it('ModelDelta reports only changed features', () => {
    const before = baseModel([
      { id: 'tag:industrial_restraint', label: 'industrial restraint', signedWeight: 0.1, confidence: 0.2 },
      { id: 'tag:stable', label: 'stable', signedWeight: 0.5, confidence: 0.8 },
    ]);
    const after = applyPairwiseJudgment(before, pair, {
      choice: 'left',
      decidingFeatureIds: ['tag:industrial_restraint'],
      answeredAt: Date.now(),
    }, left, right);
    const delta = computeModelDelta(before, after);
    expect(delta.changedFeatures.every((f) => f.featureId !== 'tag:stable')).toBe(true);
    expect(delta.changedFeatures.length).toBeGreaterThan(0);
  });
});

describe('seededRandom', () => {
  it('createSeededRandom is deterministic', () => {
    const a = createSeededRandom('abc');
    const b = createSeededRandom('abc');
    expect(a()).toBe(b());
    expect(a()).toBe(b());
  });
});

describe('buildCalibrationCandidates', () => {
  it('extracts feature tags from evidence', () => {
    const evidence: EvidenceNode[] = [
      {
        id: 'ev-1',
        userId: 'u1',
        projectId: 'p1',
        sourceType: 'image',
        title: 'Reference',
        analysisStatus: 'analyzed',
        tags: ['industrial restraint'],
        thumbnailUrl: 'https://example.com/a.jpg',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];
    const candidates = buildCalibrationCandidates(evidence);
    expect(candidates[0]?.featureIds).toContain('tag:industrial_restraint');
  });
});

describe('predictLeftPreference', () => {
  it('returns near 0.5 when utilities are balanced', () => {
    const left = candidate('l', ['a']);
    const right = candidate('r', ['b']);
    const model = baseModel([
      { id: 'tag:a', label: 'a', signedWeight: 0.3, confidence: 0.5 },
      { id: 'tag:b', label: 'b', signedWeight: 0.3, confidence: 0.5 },
    ]);
    const p = predictLeftPreference(left, right, model);
    expect(p).toBeGreaterThan(0.4);
    expect(p).toBeLessThan(0.6);
  });
});
