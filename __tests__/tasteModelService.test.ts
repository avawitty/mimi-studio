import { describe, expect, it } from 'vitest';
import { compileTasteModel } from '../lib/tasteModel/compileTasteModel';
import {
  buildStableTasteEventDedupeKey,
  buildTasteEventDedupeKey,
  dedupeTasteEventsForCompile,
} from '../lib/tasteModel/normalizeTasteEvents';
import type { NormalizedTasteEvent } from '../lib/tasteModel/contracts';
import type { PatternCluster } from '../types';
import {
  buildTasteLearningEventV2,
  resolveTasteEventDedupeKey,
} from '../services/tasteModelService';

const NOW = 1_700_000_000_000;

function makeEvent(overrides: Partial<NormalizedTasteEvent>): NormalizedTasteEvent {
  return {
    id: overrides.id ?? `evt-${Math.random()}`,
    userId: 'user-1',
    action: 'accept_cluster',
    targetType: 'pattern_cluster',
    targetId: 'cluster-a',
    occurredAt: NOW,
    surface: 'tailor',
    scope: 'project',
    projectId: 'proj-a',
    polarity: 1,
    strength: 0.9,
    explicit: true,
    evidenceNodeIds: [],
    observationIds: [],
    patternClusterIds: ['cluster-a'],
    creativeLawIds: [],
    sourceSchema: 2,
    ...overrides,
  };
}

function baseCluster(
  id: string,
  projectId: string,
  overrides: Partial<PatternCluster> = {},
): PatternCluster {
  return {
    id,
    userId: 'user-1',
    projectId,
    name: `Pattern ${id}`,
    description: 'Test pattern',
    category: 'visual',
    observationIds: [],
    supportingEvidenceNodeIds: [`ev-${id}`],
    frequency: 2,
    confidence: 0.8,
    possibleInterpretations: [],
    claimType: 'inferred',
    userStatus: 'accepted',
    userWeight: 'medium',
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

describe('taste event idempotency', () => {
  it('uses stable dedupe key as Firestore document identity for curation', () => {
    const input = {
      userId: 'user-1',
      projectId: 'proj-a',
      action: 'accept_cluster' as const,
      targetType: 'pattern_cluster' as const,
      targetId: 'cluster-a',
      surface: 'tailor',
      explicit: true,
    };

    const first = buildTasteLearningEventV2(input);
    const second = buildTasteLearningEventV2(input);

    expect(first.id).toBe(first.dedupeKey);
    expect(second.id).toBe(second.dedupeKey);
    expect(first.dedupeKey).toBe(second.dedupeKey);
    expect(first.dedupeKey).toBe(
      buildStableTasteEventDedupeKey(
        'user-1',
        'accept_cluster',
        'pattern_cluster',
        'cluster-a',
      ),
    );
  });

  it('replaying the same curation action cannot increase compiled weight twice', () => {
    const dedupeKey = buildStableTasteEventDedupeKey(
      'user-1',
      'accept_cluster',
      'pattern_cluster',
      'cluster-a',
    );

    const singleEvent = makeEvent({ id: dedupeKey, dedupeKey });
    const singleCompile = compileTasteModel({
      userId: 'user-1',
      projectId: 'proj-a',
      scope: 'project',
      evidence: [],
      observations: [],
      clusters: [baseCluster('cluster-a', 'proj-a')],
      laws: [],
      events: [singleEvent],
      compiledAt: NOW,
    });

    const replayedCompile = compileTasteModel({
      userId: 'user-1',
      projectId: 'proj-a',
      scope: 'project',
      evidence: [],
      observations: [],
      clusters: [baseCluster('cluster-a', 'proj-a')],
      laws: [],
      events: dedupeTasteEventsForCompile([singleEvent, { ...singleEvent }]),
      compiledAt: NOW,
    });

    const singleWeight = singleCompile.featureWeights.find(
      (f) => f.featureId === 'pattern_cluster:cluster-a',
    )!.signedWeight;

    const replayedWeight = replayedCompile.featureWeights.find(
      (f) => f.featureId === 'pattern_cluster:cluster-a',
    )!.signedWeight;

    expect(replayedWeight).toBe(singleWeight);
  });

  it('passive view events remain time-bucketed for dedupe', () => {
    const bucketA = resolveTasteEventDedupeKey(
      {
        userId: 'user-1',
        action: 'view',
        targetType: 'pattern_cluster',
        targetId: 'cluster-a',
        explicit: false,
      },
      1_700_000_000_000,
    );
    const bucketB = resolveTasteEventDedupeKey(
      {
        userId: 'user-1',
        action: 'view',
        targetType: 'pattern_cluster',
        targetId: 'cluster-a',
        explicit: false,
      },
      1_700_000_120_000,
    );

    expect(bucketA).not.toBe(bucketB);
    expect(bucketA).toBe(
      buildTasteEventDedupeKey(
        'user-1',
        'view',
        'pattern_cluster',
        'cluster-a',
        Math.floor(1_700_000_000_000 / 60_000),
      ),
    );
  });
});

describe('global vs project compilation isolation', () => {
  it('recompiling project A cannot remove project B or global learning', () => {
    const globalEvent = makeEvent({
      id: 'global-evt',
      projectId: undefined,
      scope: 'persistent',
      targetId: 'cluster-global',
      patternClusterIds: ['cluster-global'],
    });
    const projectAEvent = makeEvent({
      id: 'proj-a-evt',
      projectId: 'proj-a',
      targetId: 'cluster-a',
      patternClusterIds: ['cluster-a'],
    });
    const projectBEvent = makeEvent({
      id: 'proj-b-evt',
      projectId: 'proj-b',
      targetId: 'cluster-b',
      patternClusterIds: ['cluster-b'],
    });

    const allEvents = [globalEvent, projectAEvent, projectBEvent];

    const globalSnapshot = compileTasteModel({
      userId: 'user-1',
      scope: 'global',
      evidence: [],
      observations: [],
      clusters: [
        baseCluster('cluster-global', 'proj-global'),
        baseCluster('cluster-a', 'proj-a'),
        baseCluster('cluster-b', 'proj-b'),
      ],
      laws: [],
      events: allEvents,
      compiledAt: NOW,
    });

    const projectAOnlyEvents = allEvents.filter((e) => e.projectId === 'proj-a');
    const projectASnapshot = compileTasteModel({
      userId: 'user-1',
      projectId: 'proj-a',
      scope: 'project',
      evidence: [],
      observations: [],
      clusters: [baseCluster('cluster-a', 'proj-a')],
      laws: [],
      events: projectAOnlyEvents,
      globalSnapshot,
      compiledAt: NOW,
    });

    const globalFeatureIds = new Set(
      globalSnapshot.featureWeights.map((f) => f.featureId),
    );
    const projectAFeatureIds = new Set(
      projectASnapshot.featureWeights.map((f) => f.featureId),
    );

    expect(globalFeatureIds.has('pattern_cluster:cluster-global')).toBe(true);
    expect(globalFeatureIds.has('pattern_cluster:cluster-b')).toBe(true);
    expect(projectAFeatureIds.has('pattern_cluster:cluster-a')).toBe(true);
    expect(projectAFeatureIds.has('pattern_cluster:cluster-b')).toBe(false);
    expect(projectAFeatureIds.has('pattern_cluster:cluster-global')).toBe(false);
  });
});
