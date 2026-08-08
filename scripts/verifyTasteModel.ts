/**
 * Taste model contract verification.
 * Run: npm run verify:taste-model
 */
import { compileTasteModel } from '../lib/tasteModel/compileTasteModel';
import { normalizeTasteEvent } from '../lib/tasteModel/normalizeTasteEvents';
import { scoreTasteCandidate } from '../lib/tasteModel/scoreTasteCandidate';
import { projectTasteModelToGraph } from '../lib/tasteModel/projectTasteModelToGraph';
import { tasteEventV2Schema } from '../lib/tasteModel/contracts';
import type { NormalizedTasteEvent } from '../lib/tasteModel/contracts';
import type { EvidenceNode, Observation, CreativeLaw, PatternCluster, TasteEvent } from '../types';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const NOW = Date.now();

console.log('verify:taste-model — starting');

// ─── 1. Schema validation ─────────────────────────────────────────────────────
const validEvent = tasteEventV2Schema.parse({
  schemaVersion: 2,
  id: 'evt-1',
  userId: 'u1',
  action: 'accept_cluster',
  target: { type: 'pattern_cluster', id: 'c1' },
  occurredAt: NOW,
  context: { surface: 'tailor', scope: 'project' },
  signal: { polarity: 1, strength: 0.8, explicit: true },
  provenance: {
    evidenceNodeIds: [],
    observationIds: [],
    patternClusterIds: ['c1'],
    creativeLawIds: [],
  },
});
assert(validEvent.id === 'evt-1', 'v2 schema parses');

// ─── 2. Legacy normalization ──────────────────────────────────────────────────
const legacy: TasteEvent = {
  userId: 'u1',
  event_type: 'save',
  input_context: { raw_text: 'editorial' },
  output_context: { generated_archetype: 'minimal' },
  timestamp: NOW,
};
const normalized = normalizeTasteEvent(legacy);
assert(normalized.sourceSchema === 1, 'legacy normalizes');
assert(normalized.action === 'save', 'legacy save maps');

// ─── 3. Deterministic compilation ─────────────────────────────────────────────
const cluster: PatternCluster = {
  id: 'c1',
  userId: 'u1',
  projectId: 'p1',
  name: 'Test pattern',
  description: 'Test',
  category: 'visual',
  observationIds: [],
  supportingEvidenceNodeIds: ['e1'],
  frequency: 2,
  confidence: 0.7,
  possibleInterpretations: [],
  claimType: 'inferred',
  userStatus: 'accepted',
  userWeight: 'medium',
  createdAt: NOW,
  updatedAt: NOW,
};

const event: NormalizedTasteEvent = {
  id: 'e1',
  userId: 'u1',
  projectId: 'p1',
  action: 'accept_cluster',
  targetType: 'pattern_cluster',
  targetId: 'c1',
  occurredAt: NOW,
  surface: 'tailor',
  scope: 'project',
  polarity: 1,
  strength: 0.9,
  explicit: true,
  evidenceNodeIds: ['ev1'],
  observationIds: [],
  patternClusterIds: ['c1'],
  creativeLawIds: [],
  sourceSchema: 2,
};

const input = {
  userId: 'u1',
  projectId: 'p1',
  scope: 'global' as const,
  compiledAt: NOW,
  evidence: [] as EvidenceNode[],
  observations: [] as Observation[],
  clusters: [cluster],
  laws: [] as CreativeLaw[],
  events: [event],
};

const snap1 = compileTasteModel(input);
const snap2 = compileTasteModel(input);
assert(JSON.stringify(snap1) === JSON.stringify(snap2), 'deterministic compilation');

assert(snap1.schemaVersion === 1, 'snapshot schema version');
assert(snap1.modelVersion === 'mimi-taste-model-v1', 'model version');
assert(snap1.featureWeights.length > 0, 'features compiled');

// ─── 4. Graph projection ─────────────────────────────────────────────────────
const projection = projectTasteModelToGraph(snap1);
assert(projection.nodes.length === snap1.featureWeights.length, 'nodes projected');
assert(projection.nodes[0].signedStrength !== undefined, 'signed strength on nodes');

// ─── 5. Candidate scoring ─────────────────────────────────────────────────────
const score = scoreTasteCandidate(
  { id: 'candidate-1', patternClusterIds: ['c1'], tags: ['test pattern'] },
  snap1,
);
assert(score.fitScore >= 0 && score.fitScore <= 100, 'fit score bounded');
assert(score.confidence >= 0 && score.confidence <= 1, 'confidence bounded');
assert(typeof score.verdict === 'string', 'verdict present');
assert(score.explanation !== undefined, 'explanation present');

// ─── 6. Explicit rejection blocks passive views ───────────────────────────────
const rejectEvent: NormalizedTasteEvent = {
  ...event,
  id: 'reject',
  action: 'reject_cluster',
  polarity: -1,
  explicit: true,
  occurredAt: NOW - 1000,
};
const viewEvents: NormalizedTasteEvent[] = Array.from({ length: 10 }, (_, i) => ({
  ...event,
  id: `view-${i}`,
  action: 'view' as const,
  explicit: false,
  polarity: 1 as const,
  strength: 0.5,
  occurredAt: NOW - i * 100,
}));

const rejectedSnap = compileTasteModel({
  ...input,
  clusters: [{ ...cluster, userStatus: 'rejected', claimType: 'user_rejected' }],
  events: [rejectEvent, ...viewEvents],
});
const rejectedFeature = rejectedSnap.featureWeights.find(
  (f) => f.featureId === 'pattern_cluster:c1',
);
assert(rejectedFeature && rejectedFeature.signedWeight < 0, 'rejection holds against views');

// ─── 7. Trajectory computed ───────────────────────────────────────────────────
assert(snap1.trajectory !== undefined, 'trajectory present');
assert(Array.isArray(snap1.trajectory.emergingFeatureIds), 'emerging ids');

// ─── 8. Diagnostics ───────────────────────────────────────────────────────────
assert(snap1.diagnostics.eventCount === 1, 'event count');
assert(snap1.diagnostics.evidenceCount === 0, 'evidence count from input');

console.log('verify:taste-model — all checks passed');
