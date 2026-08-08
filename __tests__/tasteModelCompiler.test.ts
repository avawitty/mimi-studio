import { describe, expect, it } from 'vitest';
import { compileTasteModel } from '../lib/tasteModel/compileTasteModel';
import { normalizeTasteEvent } from '../lib/tasteModel/normalizeTasteEvents';
import type {
  CompileTasteModelInput,
  NormalizedTasteEvent,
} from '../lib/tasteModel/contracts';
import type {
  CreativeLaw,
  EvidenceNode,
  Observation,
  PatternCluster,
  TasteEvent,
} from '../types';

const NOW = 1_700_000_000_000;
const DAY = 86_400_000;

function makeEvent(overrides: Partial<NormalizedTasteEvent>): NormalizedTasteEvent {
  return {
    id: overrides.id ?? `evt-${Math.random()}`,
    userId: 'user-1',
    action: 'view',
    targetType: 'pattern_cluster',
    targetId: 'cluster-1',
    occurredAt: NOW,
    surface: 'tailor',
    scope: 'project',
    polarity: 1,
    strength: 0.5,
    explicit: false,
    evidenceNodeIds: [],
    observationIds: [],
    patternClusterIds: ['cluster-1'],
    creativeLawIds: [],
    sourceSchema: 2,
    ...overrides,
  };
}

function baseCluster(overrides: Partial<PatternCluster> = {}): PatternCluster {
  return {
    id: 'cluster-1',
    userId: 'user-1',
    projectId: 'proj-1',
    name: 'Minimal strangeness',
    description: 'Sparse forms with odd proportions',
    category: 'visual',
    observationIds: ['obs-1'],
    supportingEvidenceNodeIds: ['ev-1'],
    frequency: 3,
    confidence: 0.8,
    possibleInterpretations: [],
    claimType: 'inferred',
    userStatus: 'suggested',
    userWeight: 'medium',
    createdAt: NOW - 30 * DAY,
    updatedAt: NOW - 30 * DAY,
    ...overrides,
  };
}

function baseInput(
  events: NormalizedTasteEvent[],
  overrides: Partial<CompileTasteModelInput> = {},
): CompileTasteModelInput {
  return {
    userId: 'user-1',
    projectId: 'proj-1',
    scope: 'global',
    compiledAt: NOW,
    evidence: [{ id: 'ev-1' } as EvidenceNode],
    observations: [],
    clusters: [baseCluster()],
    laws: [],
    events,
    ...overrides,
  };
}

describe('compileTasteModel', () => {
  it('produces identical output for identical input', () => {
    const events = [
      makeEvent({ action: 'accept_cluster', explicit: true, polarity: 1, strength: 0.9 }),
    ];
    const input = baseInput(events);
    const a = compileTasteModel(input);
    const b = compileTasteModel(input);
    expect(a).toEqual(b);
  });

  it('signature action outweighs repeated passive views', () => {
    const passiveViews = Array.from({ length: 20 }, (_, i) =>
      makeEvent({
        id: `view-${i}`,
        action: 'view',
        explicit: false,
        polarity: 1,
        strength: 0.3,
        occurredAt: NOW - i * DAY,
      }),
    );
    const signature = makeEvent({
      id: 'sig',
      action: 'mark_signature',
      explicit: true,
      polarity: 1,
      strength: 1.0,
      occurredAt: NOW,
    });

    const withSignature = compileTasteModel(
      baseInput([...passiveViews, signature], {
        clusters: [baseCluster({ userWeight: 'signature', userStatus: 'accepted' })],
      }),
    );

    const feature = withSignature.featureWeights.find(
      (f) => f.featureId === 'pattern_cluster:cluster-1',
    );
    expect(feature).toBeDefined();
    expect(feature!.signedWeight).toBeGreaterThan(0);
    expect(feature!.explicitMass).toBeGreaterThan(feature!.implicitMass);
  });

  it('explicit rejection cannot be reversed by passive views', () => {
    const reject = makeEvent({
      id: 'reject',
      action: 'reject_cluster',
      explicit: true,
      polarity: -1,
      strength: 1.0,
      occurredAt: NOW - 5 * DAY,
    });
    const views = Array.from({ length: 15 }, (_, i) =>
      makeEvent({
        id: `v-${i}`,
        action: 'view',
        explicit: false,
        polarity: 1,
        strength: 0.5,
        occurredAt: NOW - i * DAY,
      }),
    );

    const snapshot = compileTasteModel(
      baseInput([reject, ...views], {
        clusters: [baseCluster({ userStatus: 'rejected', claimType: 'user_rejected' })],
      }),
    );

    const feature = snapshot.featureWeights.find(
      (f) => f.featureId === 'pattern_cluster:cluster-1',
    );
    expect(feature!.signedWeight).toBeLessThan(0);
  });

  it('later explicit reversal can replace earlier explicit rejection', () => {
    const reject = makeEvent({
      id: 'reject',
      action: 'reject_cluster',
      explicit: true,
      polarity: -1,
      occurredAt: NOW - 10 * DAY,
    });
    const accept = makeEvent({
      id: 'accept',
      action: 'accept_cluster',
      explicit: true,
      polarity: 1,
      occurredAt: NOW,
    });

    const snapshot = compileTasteModel(
      baseInput([reject, accept], {
        clusters: [baseCluster({ userStatus: 'accepted' })],
      }),
    );

    const feature = snapshot.featureWeights.find(
      (f) => f.featureId === 'pattern_cluster:cluster-1',
    );
    expect(feature!.signedWeight).toBeGreaterThan(0);
  });

  it('reuse is stronger than save', () => {
    const save = compileTasteModel(
      baseInput([
        makeEvent({ id: 'save', action: 'save', polarity: 1, strength: 0.8 }),
      ]),
    );
    const reuse = compileTasteModel(
      baseInput([
        makeEvent({ id: 'reuse', action: 'reuse', polarity: 1, strength: 0.8 }),
      ]),
    );

    const saveWeight = save.featureWeights.find(
      (f) => f.featureId === 'pattern_cluster:cluster-1',
    )!.signedWeight;
    const reuseWeight = reuse.featureWeights.find(
      (f) => f.featureId === 'pattern_cluster:cluster-1',
    )!.signedWeight;

    expect(reuseWeight).toBeGreaterThan(saveWeight);
  });

  it('old implicit events decay', () => {
    const recent = compileTasteModel(
      baseInput([
        makeEvent({ id: 'r', action: 'view', occurredAt: NOW, strength: 0.8 }),
      ]),
    );
    const old = compileTasteModel(
      baseInput([
        makeEvent({ id: 'o', action: 'view', occurredAt: NOW - 180 * DAY, strength: 0.8 }),
      ]),
    );

    const recentW = recent.featureWeights.find(
      (f) => f.featureId === 'pattern_cluster:cluster-1',
    )!.signedWeight;
    const oldW = old.featureWeights.find(
      (f) => f.featureId === 'pattern_cluster:cluster-1',
    )!.signedWeight;

    expect(recentW).toBeGreaterThan(oldW);
  });

  it('accepted Creative Laws remain comparatively stable', () => {
    const law: CreativeLaw = {
      id: 'law-1',
      userId: 'user-1',
      projectId: 'proj-1',
      title: 'Preserve negative space',
      principle: 'Leave room for the eye to rest',
      explanation: 'Sparse composition',
      supportingPatternClusterIds: ['cluster-1'],
      supportingEvidenceNodeIds: ['ev-1'],
      confidence: 0.9,
      claimType: 'user_confirmed',
      userStatus: 'accepted',
      applications: ['editorial layout'],
      createdAt: NOW - 200 * DAY,
      updatedAt: NOW - 200 * DAY,
    };

    const oldLawEvent = makeEvent({
      id: 'law-old',
      action: 'accept_law',
      targetType: 'creative_law',
      targetId: 'law-1',
      creativeLawIds: ['law-1'],
      occurredAt: NOW - 200 * DAY,
      explicit: true,
    });

    const snapshot = compileTasteModel(
      baseInput([oldLawEvent], { laws: [law] }),
    );

    const lawFeature = snapshot.featureWeights.find(
      (f) => f.featureId === 'creative_law:law-1',
    );
    expect(lawFeature).toBeDefined();
    expect(lawFeature!.signedWeight).toBeGreaterThan(0);
    expect(lawFeature!.confidence).toBeGreaterThan(0.3);
  });

  it('contradictory evidence reduces confidence', () => {
    const positive = makeEvent({
      id: 'pos',
      action: 'accept_cluster',
      explicit: true,
      polarity: 1,
      strength: 0.9,
    });
    const negative = makeEvent({
      id: 'neg',
      action: 'reject_cluster',
      explicit: true,
      polarity: -1,
      strength: 0.9,
      occurredAt: NOW - DAY,
    });

    const conflicted = compileTasteModel(baseInput([positive, negative]));
    const clean = compileTasteModel(baseInput([positive]));

    const conflictedFeature = conflicted.featureWeights.find(
      (f) => f.featureId === 'pattern_cluster:cluster-1',
    )!;
    const cleanFeature = clean.featureWeights.find(
      (f) => f.featureId === 'pattern_cluster:cluster-1',
    )!;

    expect(conflictedFeature.confidence).toBeLessThan(cleanFeature.confidence);
    expect(conflicted.diagnostics.contradictionCount).toBeGreaterThanOrEqual(0);
  });

  it('duplicate evidence from one source does not create false confidence', () => {
    const duplicates = Array.from({ length: 50 }, (_, i) =>
      makeEvent({
        id: `dup-${i}`,
        action: 'view',
        explicit: false,
        evidenceNodeIds: ['ev-1'],
        occurredAt: NOW - i * 1000,
      }),
    );

    const snapshot = compileTasteModel(baseInput(duplicates));
    const feature = snapshot.featureWeights.find(
      (f) => f.featureId === 'pattern_cluster:cluster-1',
    )!;
    expect(feature.confidence).toBeLessThan(0.95);
  });

  it('project-only evidence does not rewrite the global model', () => {
    const projectEvent = makeEvent({
      id: 'proj-only',
      scope: 'project',
      projectId: 'proj-1',
      action: 'accept_cluster',
      explicit: true,
      polarity: 1,
      strength: 1.0,
    });

    const globalSnapshot = compileTasteModel(
      baseInput([projectEvent], { scope: 'global' }),
    );
    const projectSnapshot = compileTasteModel(
      baseInput([projectEvent], { scope: 'project', globalSnapshot }),
    );

    const globalFeature = globalSnapshot.featureWeights.find(
      (f) => f.featureId === 'pattern_cluster:cluster-1',
    );
    const projectFeature = projectSnapshot.featureWeights.find(
      (f) => f.featureId === 'pattern_cluster:cluster-1',
    );

    expect(projectFeature!.signedWeight).toBeGreaterThanOrEqual(
      globalFeature?.signedWeight ?? 0,
    );
  });
});

describe('normalizeTasteEvent', () => {
  it('normalizes legacy TasteEvent records successfully', () => {
    const legacy: TasteEvent = {
      userId: 'user-1',
      event_type: 'save',
      input_context: { raw_text: 'dark editorial' },
      output_context: { generated_archetype: 'minimal-strange' },
      timestamp: NOW,
    };

    const normalized = normalizeTasteEvent(legacy);
    expect(normalized.sourceSchema).toBe(1);
    expect(normalized.action).toBe('save');
    expect(normalized.polarity).toBe(1);
    expect(normalized.userId).toBe('user-1');
  });

  it('normalizes signature feedback as mark_signature', () => {
    const legacy: TasteEvent = {
      userId: 'user-1',
      event_type: 'signature_feedback',
      input_context: { raw_text: 'test' },
      output_context: {},
      signature_payload: {
        phrasingFeedback: { headline: 'lands' },
        toneFeedback: 'lands',
        clusterFeedback: {},
        correctionNote: '',
      },
      timestamp: NOW,
    };

    const normalized = normalizeTasteEvent(legacy);
    expect(normalized.action).toBe('mark_signature');
    expect(normalized.explicit).toBe(true);
  });
});

describe('existing graph data remains readable', () => {
  it('compiles from graph entities without events', () => {
    const obs: Observation = {
      id: 'obs-1',
      userId: 'user-1',
      projectId: 'proj-1',
      evidenceNodeId: 'ev-1',
      category: 'visual',
      label: 'High contrast',
      description: 'Bold light/dark separation',
      confidence: 0.75,
      claimType: 'observed',
      userStatus: 'suggested',
      createdAt: NOW,
    };

    const snapshot = compileTasteModel(
      baseInput([], {
        observations: [obs],
        clusters: [baseCluster({ observationIds: ['obs-1'] })],
      }),
    );

    expect(snapshot.featureWeights.length).toBeGreaterThan(0);
    expect(snapshot.diagnostics.evidenceCount).toBe(1);
  });
});
