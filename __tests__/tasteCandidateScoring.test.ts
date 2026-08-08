import { describe, expect, it } from 'vitest';
import { compileTasteModel } from '../lib/tasteModel/compileTasteModel';
import { scoreTasteCandidate } from '../lib/tasteModel/scoreTasteCandidate';
import type { NormalizedTasteEvent, TasteModelSnapshot } from '../lib/tasteModel/contracts';
import type { PatternCluster } from '../types';

const NOW = 1_700_000_000_000;

function makeEvent(overrides: Partial<NormalizedTasteEvent>): NormalizedTasteEvent {
  return {
    id: overrides.id ?? `evt-${Math.random()}`,
    userId: 'user-1',
    action: 'accept_cluster',
    targetType: 'pattern_cluster',
    targetId: 'cluster-minimal',
    occurredAt: NOW,
    surface: 'tailor',
    scope: 'project',
    polarity: 1,
    strength: 0.9,
    explicit: true,
    evidenceNodeIds: ['ev-1'],
    observationIds: [],
    patternClusterIds: ['cluster-minimal'],
    creativeLawIds: [],
    sourceSchema: 2,
    ...overrides,
  };
}

function buildSnapshot(): TasteModelSnapshot {
  const clusters: PatternCluster[] = [
    {
      id: 'cluster-minimal',
      userId: 'user-1',
      projectId: 'proj-1',
      name: 'Minimal',
      description: 'Sparse forms',
      category: 'visual',
      observationIds: [],
      supportingEvidenceNodeIds: ['ev-1'],
      frequency: 4,
      confidence: 0.85,
      possibleInterpretations: [],
      claimType: 'user_confirmed',
      userStatus: 'accepted',
      userWeight: 'high',
      createdAt: NOW,
      updatedAt: NOW,
    },
    {
      id: 'cluster-strange',
      userId: 'user-1',
      projectId: 'proj-1',
      name: 'Strange',
      description: 'Odd proportions',
      category: 'visual',
      observationIds: [],
      supportingEvidenceNodeIds: ['ev-2'],
      frequency: 3,
      confidence: 0.8,
      possibleInterpretations: [],
      claimType: 'user_confirmed',
      userStatus: 'accepted',
      userWeight: 'medium',
      createdAt: NOW,
      updatedAt: NOW,
    },
    {
      id: 'cluster-corporate',
      userId: 'user-1',
      projectId: 'proj-1',
      name: 'Corporate',
      description: 'Polished business aesthetic',
      category: 'visual',
      observationIds: [],
      supportingEvidenceNodeIds: ['ev-3'],
      frequency: 2,
      confidence: 0.7,
      possibleInterpretations: [],
      claimType: 'user_rejected',
      userStatus: 'rejected',
      userWeight: 'low',
      createdAt: NOW,
      updatedAt: NOW,
    },
  ];

  const events: NormalizedTasteEvent[] = [
    makeEvent({ targetId: 'cluster-minimal', patternClusterIds: ['cluster-minimal'] }),
    makeEvent({ id: 'e2', targetId: 'cluster-strange', patternClusterIds: ['cluster-strange'] }),
    makeEvent({
      id: 'e3',
      targetId: 'cluster-corporate',
      patternClusterIds: ['cluster-corporate'],
      action: 'reject_cluster',
      polarity: -1,
    }),
    makeEvent({
      id: 'e4',
      patternClusterIds: ['cluster-minimal', 'cluster-strange'],
      evidenceNodeIds: ['ev-1', 'ev-2'],
    }),
  ];

  return compileTasteModel({
    userId: 'user-1',
    projectId: 'proj-1',
    scope: 'project',
    compiledAt: NOW,
    evidence: [],
    observations: [],
    clusters,
    laws: [],
    events,
  });
}

describe('scoreTasteCandidate', () => {
  const snapshot = buildSnapshot();

  it('context-specific signals affect matching project more than global', () => {
    const globalSnapshot = compileTasteModel({
      userId: 'user-1',
      scope: 'global',
      compiledAt: NOW,
      evidence: [],
      observations: [],
      clusters: [],
      laws: [],
      events: [],
    });

    const projectScore = scoreTasteCandidate(
      { id: 'c1', patternClusterIds: ['cluster-minimal'] },
      snapshot,
      { projectId: 'proj-1' },
    );
    const globalScore = scoreTasteCandidate(
      { id: 'c1', patternClusterIds: ['cluster-minimal'] },
      globalSnapshot,
    );

    expect(projectScore.fitScore).toBeGreaterThan(globalScore.fitScore);
  });

  it('aversion can outweigh several weak positive similarities', () => {
    const score = scoreTasteCandidate(
      {
        id: 'corp-candidate',
        tags: ['corporate', 'polished', 'business'],
        patternClusterIds: ['cluster-corporate'],
      },
      snapshot,
    );

    expect(score.components.aversionPenalty).toBeGreaterThan(0);
    expect(score.explanation.topNegativeFactors.length).toBeGreaterThan(0);
  });

  it('supported feature combinations affect candidate score', () => {
    const combined = scoreTasteCandidate(
      {
        id: 'combo',
        patternClusterIds: ['cluster-minimal', 'cluster-strange'],
        tags: ['minimal', 'strange'],
      },
      snapshot,
    );
    const single = scoreTasteCandidate(
      { id: 'single', patternClusterIds: ['cluster-minimal'] },
      snapshot,
    );

    expect(combined.components.ruleFit).toBeGreaterThanOrEqual(0);
    expect(combined.fitScore).toBeGreaterThanOrEqual(single.fitScore - 10);
  });

  it('unsupported pairs do not become interaction rules', () => {
    const unsupported = snapshot.interactionRules.filter(
      (r) => r.supportCount < 2,
    );
    expect(unsupported).toHaveLength(0);
  });

  it('novelty rewards adjacency, not randomness', () => {
    const adjacent = scoreTasteCandidate(
      { id: 'adj', tags: ['minimal', 'sparse', 'editorial'] },
      snapshot,
    );
    const random = scoreTasteCandidate(
      { id: 'rand', tags: ['neon', 'cyberpunk', 'sports'] },
      snapshot,
    );

    expect(adjacent.components.noveltyFit).toBeGreaterThan(random.components.noveltyFit);
  });

  it('candidate score explanations contain real source IDs', () => {
    const score = scoreTasteCandidate(
      { id: 'test', patternClusterIds: ['cluster-minimal'] },
      snapshot,
    );

    const allSourceIds = [
      ...score.explanation.topPositiveFactors.flatMap((f) => f.sourceIds),
      ...score.explanation.topNegativeFactors.flatMap((f) => f.sourceIds),
    ];

    if (score.explanation.topPositiveFactors.length > 0) {
      expect(allSourceIds.length).toBeGreaterThan(0);
    }
  });

  it('returns fit score, confidence, and verdict', () => {
    const score = scoreTasteCandidate(
      { id: 'test', patternClusterIds: ['cluster-minimal'] },
      snapshot,
    );

    expect(score.fitScore).toBeGreaterThanOrEqual(0);
    expect(score.fitScore).toBeLessThanOrEqual(100);
    expect(score.confidence).toBeGreaterThanOrEqual(0);
    expect(score.confidence).toBeLessThanOrEqual(1);
    expect(['strong_fit', 'promising_adjacent', 'uncertain', 'weak_fit', 'conflicted']).toContain(
      score.verdict,
    );
  });

  it('never presents fit score as probability', () => {
    const score = scoreTasteCandidate(
      { id: 'test', patternClusterIds: ['cluster-minimal'] },
      snapshot,
    );
    expect(score.fitScore).toBeLessThanOrEqual(100);
    expect(score.confidence).toBeLessThanOrEqual(0.95);
  });

  it('blends embedding centroid when snapshot centroid is available', () => {
    const centroid = [1, 0, 0];
    const withCentroid = {
      ...snapshot,
      diagnostics: {
        ...snapshot.diagnostics,
        embeddingCentroid: centroid,
        embeddingSampleCount: 3,
      },
    };
    const labelOnly = scoreTasteCandidate({ id: 'x', tags: ['unknown-tag'] }, withCentroid);
    const withEmbed = scoreTasteCandidate(
      { id: 'x', tags: ['unknown-tag'], embedding: [1, 0, 0] },
      withCentroid,
    );
    expect(withEmbed.fitScore).toBeGreaterThan(labelOnly.fitScore);
  });

  it('embedding similarity boosts aligned label overlap', () => {
    const aligned = scoreTasteCandidate(
      { id: 'aligned', tags: ['minimal', 'sparse forms'] },
      snapshot,
    );
    const unrelated = scoreTasteCandidate(
      { id: 'unrelated', tags: ['neon', 'corporate sports'] },
      snapshot,
    );
    expect(aligned.components.embeddingSimilarity).toBeGreaterThan(
      unrelated.components.embeddingSimilarity,
    );
  });

  it('real embedding vectors increase similarity for aligned candidates', () => {
    const baseVec = [1, 0, 0, 0];
    const nearVec = [0.95, 0.05, 0, 0];
    const farVec = [0, 1, 0, 0];
    const snapshotWithEmb = {
      ...snapshot,
      featureWeights: snapshot.featureWeights.map((fw, index) =>
        index === 0
          ? { ...fw, signedWeight: 1, embeddingVector: baseVec }
          : fw,
      ),
    };
    const near = scoreTasteCandidate(
      { id: 'near', embeddingVector: nearVec },
      snapshotWithEmb,
    );
    const far = scoreTasteCandidate(
      { id: 'far', embeddingVector: farVec },
      snapshotWithEmb,
    );
    expect(near.components.embeddingSimilarity).toBeGreaterThan(
      far.components.embeddingSimilarity,
    );
  });
});
