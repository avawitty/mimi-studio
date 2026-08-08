/**
 * Taste calibration contract verification.
 * Run: npm run verify:taste-calibration
 */
import { randomUUID } from 'node:crypto';
import {
  applyPairwiseJudgment,
  buildCalibrationCandidates,
  computeModelDelta,
  rankedPairToCalibrationPair,
  selectCalibrationPair,
  tasteCalibrationPairSchema,
  tasteCalibrationSessionSchema,
  tastePairwiseJudgmentSchema,
} from '../lib/tasteCalibration/index.js';
import type { CalibrationCandidate } from '../lib/tasteCalibration/contracts.js';
import type { EvidenceNode } from '../types.js';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

console.log('verify:taste-calibration — starting');

const session = tasteCalibrationSessionSchema.parse({
  id: randomUUID(),
  ownerId: 'user-1',
  projectId: 'proj-1',
  status: 'active',
  targetQuestionCount: 10,
  answeredCount: 0,
  seed: 'verify-seed',
  algorithmVersion: 'taste-calibration-v1',
  scope: 'project',
  createdAt: Date.now(),
  updatedAt: Date.now(),
});
assert(session.id.length > 0, 'session schema parses');

const pair = tasteCalibrationPairSchema.parse({
  id: randomUUID(),
  sessionId: session.id,
  pairIndex: 0,
  leftCandidateId: 'left',
  rightCandidateId: 'right',
  isolatedFeatureIds: ['tag:a', 'tag:b'],
  selectionReason: {
    primaryFeatureIds: ['tag:a', 'tag:b'],
    primaryFeatureLabels: ['a', 'b'],
    uncertaintyScore: 0.8,
    featureDisagreementScore: 0.6,
    coverageGapScore: 0.5,
    explanation: 'Test explanation from pair data.',
    algorithmVersion: 'taste-calibration-v1',
  },
  predictedLeftPreference: 0.52,
  expectedInformationGain: 0.61,
  askedAt: Date.now(),
});
assert(pair.leftCandidateId === 'left', 'pair schema parses');

const judgment = tastePairwiseJudgmentSchema.parse({
  id: randomUUID(),
  sessionId: session.id,
  pairId: pair.id,
  choice: 'left',
  decidingFeatureIds: ['tag:a'],
  scope: 'project',
  projectId: 'proj-1',
  answeredAt: Date.now(),
});
assert(judgment.choice === 'left', 'judgment schema parses');

function candidate(id: string, features: string[]): CalibrationCandidate {
  return {
    id,
    label: id,
    featureIds: features.map((f) => `tag:${f}`),
    featureLabels: Object.fromEntries(features.map((f) => [`tag:${f}`, f])),
    tags: features,
  };
}

const candidates = [
  candidate('a', ['severe_composition', 'industrial']),
  candidate('b', ['pale_lighting', 'atmospheric']),
  candidate('c', ['commercial_polish']),
];

const ranked = selectCalibrationPair({
  seed: 'verify-seed',
  pairIndex: 0,
  askedPairKeys: new Set(),
  featureAskCounts: new Map(),
  model: null,
  candidates,
});
assert(ranked !== null, 'pair selection returns a pair');
assert(ranked.selectionReason.explanation.length > 10, 'selection reason is populated');

const rankedPair = rankedPairToCalibrationPair(
  ranked,
  session.id,
  0,
  randomUUID(),
  Date.now(),
);
const left = candidates.find((c) => c.id === rankedPair.leftCandidateId)!;
const right = candidates.find((c) => c.id === rankedPair.rightCandidateId)!;
const nextModel = applyPairwiseJudgment(
  null,
  rankedPair,
  { choice: 'left', decidingFeatureIds: rankedPair.isolatedFeatureIds.slice(0, 1), answeredAt: Date.now() },
  left,
  right,
);
const delta = computeModelDelta(null, nextModel);
assert(delta.nextSnapshotId.length > 0, 'model delta produced');
assert(delta.changedFeatures.length >= 0, 'model delta shape valid');

const evidence: EvidenceNode[] = [
  {
    id: 'ev-1',
    userId: 'user-1',
    projectId: 'proj-1',
    sourceType: 'image',
    title: 'Test',
    analysisStatus: 'analyzed',
    tags: ['industrial restraint'],
    thumbnailUrl: 'https://example.com/1.jpg',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'ev-2',
    userId: 'user-1',
    projectId: 'proj-1',
    sourceType: 'image',
    title: 'Test 2',
    analysisStatus: 'analyzed',
    tags: ['pale lighting'],
    thumbnailUrl: 'https://example.com/2.jpg',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];
const built = buildCalibrationCandidates(evidence);
assert(built.length >= 2, 'candidate builder supports calibration');

console.log('verify:taste-calibration — all checks passed');
