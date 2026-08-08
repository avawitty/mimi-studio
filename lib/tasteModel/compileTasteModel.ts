/**
 * Pure deterministic taste model compiler.
 * No LLM calls — all weights from constants and evidence.
 */

import type {
  CompileTasteModelInput,
  NormalizedTasteEvent,
  TasteFeatureTrend,
  TasteFeatureWeight,
  TasteInteractionRelation,
  TasteInteractionRule,
  TasteModelSnapshot,
} from './contracts';
import {
  CLAIM_TYPE_MULTIPLIERS,
  EVENT_BASE_WEIGHTS,
  EVENT_HALF_LIFE_DAYS,
  EXPLICIT_ACTIONS,
  LOW_CONFIDENCE_THRESHOLD,
  MAX_CONFIDENCE,
  MIN_INTERACTION_SOURCE_DIVERSITY,
  MIN_INTERACTION_SUPPORT,
  MIN_TREND_EVIDENCE_MASS,
  MIN_TREND_EVENT_COUNT,
  PROJECT_SHRINKAGE_ALPHA,
  TRAJECTORY_HISTORICAL_WINDOW_DAYS,
  TRAJECTORY_RECENT_WINDOW_DAYS,
  USER_WEIGHT_MULTIPLIERS,
} from './constants';
import type { CreativeLaw, Observation, PatternCluster } from '../../types';

const MS_PER_DAY = 86_400_000;

function stableFeatureId(
  sourceType: TasteFeatureWeight['sourceType'],
  sourceId: string,
): string {
  return `${sourceType}:${sourceId}`;
}

function effectiveEventWeight(event: NormalizedTasteEvent, now: number): number {
  const base = EVENT_BASE_WEIGHTS[event.action] ?? 0.1;
  const halfLife = EVENT_HALF_LIFE_DAYS[event.action] ?? 30;
  const ageDays = Math.max(0, (now - event.occurredAt) / MS_PER_DAY);
  const decay = Math.exp(-Math.LN2 * (ageDays / halfLife));
  const signed = base * event.strength * decay * event.polarity;
  return signed;
}

interface FeatureAccumulator {
  featureId: string;
  label: string;
  category: string;
  sourceType: TasteFeatureWeight['sourceType'];
  signedSum: number;
  evidenceMass: number;
  explicitMass: number;
  implicitMass: number;
  sourceIds: Set<string>;
  evidenceSourceIds: Set<string>;
  contextScopes: Set<string>;
  positiveMass: number;
  negativeMass: number;
  firstSeenAt?: number;
  lastSeenAt?: number;
  recentSignedSum: number;
  historicalSignedSum: number;
  recentMass: number;
  historicalMass: number;
}

function getOrCreateFeature(
  map: Map<string, FeatureAccumulator>,
  featureId: string,
  label: string,
  category: string,
  sourceType: TasteFeatureWeight['sourceType'],
): FeatureAccumulator {
  let acc = map.get(featureId);
  if (!acc) {
    acc = {
      featureId,
      label,
      category,
      sourceType,
      signedSum: 0,
      evidenceMass: 0,
      explicitMass: 0,
      implicitMass: 0,
      sourceIds: new Set(),
      evidenceSourceIds: new Set(),
      contextScopes: new Set(),
      positiveMass: 0,
      negativeMass: 0,
      recentSignedSum: 0,
      historicalSignedSum: 0,
      recentMass: 0,
      historicalMass: 0,
    };
    map.set(featureId, acc);
  }
  return acc;
}

function addToFeature(
  acc: FeatureAccumulator,
  weight: number,
  mass: number,
  event: NormalizedTasteEvent,
  now: number,
): void {
  acc.signedSum += weight;
  acc.evidenceMass += Math.abs(mass);
  if (event.explicit || EXPLICIT_ACTIONS.has(event.action)) {
    acc.explicitMass += Math.abs(mass);
  } else {
    acc.implicitMass += Math.abs(mass);
  }
  if (weight > 0) acc.positiveMass += Math.abs(weight);
  if (weight < 0) acc.negativeMass += Math.abs(weight);

  acc.sourceIds.add(event.targetId);
  for (const eid of event.evidenceNodeIds) acc.evidenceSourceIds.add(eid);
  acc.contextScopes.add(event.scope);

  if (!acc.firstSeenAt || event.occurredAt < acc.firstSeenAt) {
    acc.firstSeenAt = event.occurredAt;
  }
  if (!acc.lastSeenAt || event.occurredAt > acc.lastSeenAt) {
    acc.lastSeenAt = event.occurredAt;
  }

  const ageDays = (now - event.occurredAt) / MS_PER_DAY;
  if (ageDays <= TRAJECTORY_RECENT_WINDOW_DAYS) {
    acc.recentSignedSum += weight;
    acc.recentMass += Math.abs(mass);
  } else if (ageDays <= TRAJECTORY_HISTORICAL_WINDOW_DAYS) {
    acc.historicalSignedSum += weight;
    acc.historicalMass += Math.abs(mass);
  }
}

function computeConfidence(acc: FeatureAccumulator): number {
  const sourceDiversity = Math.min(acc.evidenceSourceIds.size, acc.sourceIds.size);
  const diversityFactor = 1 - Math.exp(-sourceDiversity * 0.5);

  const explicitRatio =
    acc.evidenceMass > 0 ? acc.explicitMass / acc.evidenceMass : 0;
  const explicitBoost = 0.3 + explicitRatio * 0.4;

  const contradiction =
    acc.positiveMass > 0 && acc.negativeMass > 0
      ? Math.min(acc.positiveMass, acc.negativeMass) /
        Math.max(acc.positiveMass, acc.negativeMass)
      : 0;
  const consistencyFactor = 1 - contradiction * 0.5;

  const massFactor = 1 - Math.exp(-acc.evidenceMass * 0.3);

  const raw =
    diversityFactor * 0.35 +
    explicitBoost * 0.25 +
    consistencyFactor * 0.25 +
    massFactor * 0.15;

  return Math.min(MAX_CONFIDENCE, Math.max(0.05, raw));
}

function classifyTrend(acc: FeatureAccumulator): TasteFeatureTrend {
  if (acc.evidenceMass < MIN_TREND_EVIDENCE_MASS) return 'uncertain';
  if (acc.recentMass < MIN_TREND_EVENT_COUNT * 0.1 && acc.historicalMass < MIN_TREND_EVENT_COUNT * 0.1) {
    return 'uncertain';
  }

  const recentNorm = acc.recentMass > 0 ? acc.recentSignedSum / acc.recentMass : 0;
  const histNorm = acc.historicalMass > 0 ? acc.historicalSignedSum / acc.historicalMass : 0;

  if (acc.historicalMass < 0.1 && acc.recentMass >= MIN_TREND_EVIDENCE_MASS) {
    return 'emerging';
  }

  const delta = recentNorm - histNorm;
  if (Math.abs(delta) < 0.1) return 'stable';
  if (delta > 0.15) return 'strengthening';
  if (delta < -0.15) return 'declining';
  return 'uncertain';
}

/** Apply current-state semantics: latest explicit correction wins per target */
function resolveExplicitPolarity(
  events: NormalizedTasteEvent[],
): Map<string, { polarity: -1 | 0 | 1; occurredAt: number }> {
  const latest = new Map<string, { polarity: -1 | 0 | 1; occurredAt: number }>();
  const sorted = [...events].sort((a, b) => a.occurredAt - b.occurredAt);

  for (const event of sorted) {
    if (!event.explicit && !EXPLICIT_ACTIONS.has(event.action)) continue;
    const key = `${event.targetType}:${event.targetId}`;
    latest.set(key, { polarity: event.polarity, occurredAt: event.occurredAt });
  }
  return latest;
}

function seedFeaturesFromGraph(
  featureMap: Map<string, FeatureAccumulator>,
  observations: Observation[],
  clusters: PatternCluster[],
  laws: CreativeLaw[],
  now: number,
): void {
  for (const obs of observations) {
    const fid = stableFeatureId('observation', obs.id);
    const acc = getOrCreateFeature(featureMap, fid, obs.label, obs.category, 'observation');
    const claimMult = CLAIM_TYPE_MULTIPLIERS[obs.claimType] ?? 1;
    const statusMult =
      obs.userStatus === 'accepted' ? 1.2 : obs.userStatus === 'rejected' ? -1.2 : 0.5;
    const w = obs.confidence * claimMult * statusMult * 0.5;
    addToFeature(acc, w, Math.abs(w), {
      id: `seed-obs-${obs.id}`,
      userId: obs.userId,
      action: obs.userStatus === 'rejected' ? 'reject_observation' : 'approve_observation',
      targetType: 'observation',
      targetId: obs.id,
      occurredAt: obs.createdAt,
      surface: 'tailor',
      scope: 'project',
      polarity: w >= 0 ? 1 : -1,
      strength: obs.confidence,
      explicit: obs.userStatus === 'accepted' || obs.userStatus === 'rejected',
      evidenceNodeIds: [obs.evidenceNodeId],
      observationIds: [obs.id],
      patternClusterIds: [],
      creativeLawIds: [],
      sourceSchema: 2,
    }, now);
  }

  for (const cluster of clusters) {
    const fid = stableFeatureId('pattern_cluster', cluster.id);
    const acc = getOrCreateFeature(
      featureMap,
      fid,
      cluster.name,
      cluster.category,
      'pattern_cluster',
    );
    const weightMult = USER_WEIGHT_MULTIPLIERS[cluster.userWeight] ?? 1;
    const claimMult = CLAIM_TYPE_MULTIPLIERS[cluster.claimType] ?? 1;
    const statusMult =
      cluster.userStatus === 'accepted' || cluster.userStatus === 'renamed'
        ? 1.0
        : cluster.userStatus === 'rejected'
          ? -1.0
          : 0.4;
    const w = cluster.confidence * weightMult * claimMult * statusMult;
    addToFeature(acc, w, Math.abs(w), {
      id: `seed-cluster-${cluster.id}`,
      userId: cluster.userId,
      projectId: cluster.projectId,
      action:
        cluster.userStatus === 'rejected'
          ? 'reject_cluster'
          : cluster.userWeight === 'signature'
            ? 'mark_signature'
            : 'accept_cluster',
      targetType: 'pattern_cluster',
      targetId: cluster.id,
      occurredAt: cluster.updatedAt ?? cluster.createdAt,
      surface: 'tailor',
      scope: 'project',
      polarity: w >= 0 ? 1 : -1,
      strength: cluster.confidence,
      explicit:
        cluster.userStatus === 'accepted' ||
        cluster.userStatus === 'rejected' ||
        cluster.userStatus === 'renamed',
      evidenceNodeIds: cluster.supportingEvidenceNodeIds,
      observationIds: cluster.observationIds,
      patternClusterIds: [cluster.id],
      creativeLawIds: [],
      sourceSchema: 2,
    }, now);
  }

  for (const law of laws) {
    const fid = stableFeatureId('creative_law', law.id);
    const acc = getOrCreateFeature(
      featureMap,
      fid,
      law.title,
      'principle',
      'creative_law',
    );
    const statusMult =
      law.userStatus === 'accepted' ? 1.2 : law.userStatus === 'rejected' ? -1.2 : 0.5;
    const w = law.confidence * statusMult;
    addToFeature(acc, w, Math.abs(w), {
      id: `seed-law-${law.id}`,
      userId: law.userId,
      projectId: law.projectId,
      action: law.userStatus === 'rejected' ? 'reject_law' : 'accept_law',
      targetType: 'creative_law',
      targetId: law.id,
      occurredAt: law.updatedAt ?? law.createdAt,
      surface: 'tailor',
      scope: 'project',
      polarity: w >= 0 ? 1 : -1,
      strength: law.confidence,
      explicit: law.userStatus === 'accepted' || law.userStatus === 'rejected',
      evidenceNodeIds: law.supportingEvidenceNodeIds,
      observationIds: [],
      patternClusterIds: law.supportingPatternClusterIds,
      creativeLawIds: [law.id],
      sourceSchema: 2,
    }, now);
  }
}

function inferInteractionRules(
  featureWeights: TasteFeatureWeight[],
  events: NormalizedTasteEvent[],
): TasteInteractionRule[] {
  const rules: TasteInteractionRule[] = [];
  const cooccurrence = new Map<string, { count: number; sources: Set<string>; weight: number; scopes: Set<string> }>();

  const eventFeatures = new Map<string, string[]>();
  for (const event of events) {
    const features: string[] = [];
    for (const cid of event.patternClusterIds) features.push(stableFeatureId('pattern_cluster', cid));
    for (const oid of event.observationIds) features.push(stableFeatureId('observation', oid));
    if (features.length >= 2) {
      eventFeatures.set(event.id, features);
    }
  }

  for (const [eventId, features] of eventFeatures) {
    const event = events.find((e) => e.id === eventId);
    if (!event) continue;
    for (let i = 0; i < features.length; i++) {
      for (let j = i + 1; j < features.length; j++) {
        const key = [features[i], features[j]].sort().join('|');
        const existing = cooccurrence.get(key) ?? { count: 0, sources: new Set(), weight: 0, scopes: new Set() };
        existing.count += 1;
        for (const eid of event.evidenceNodeIds) existing.sources.add(eid);
        existing.weight += event.polarity * event.strength;
        existing.scopes.add(event.scope);
        cooccurrence.set(key, existing);
      }
    }
  }

  const positiveFeatures = new Map(
    featureWeights.filter((f) => f.signedWeight > 0).map((f) => [f.featureId, f]),
  );
  const negativeFeatures = new Map(
    featureWeights.filter((f) => f.signedWeight < 0).map((f) => [f.featureId, f]),
  );

  for (const [key, data] of cooccurrence) {
    if (data.count < MIN_INTERACTION_SUPPORT) continue;
    if (data.sources.size < MIN_INTERACTION_SOURCE_DIVERSITY) continue;

    const [fA, fB] = key.split('|') as [string, string];
    const fwA = featureWeights.find((f) => f.featureId === fA);
    const fwB = featureWeights.find((f) => f.featureId === fB);
    if (!fwA || !fwB) continue;

    let relation: TasteInteractionRelation;
    let signedWeight: number;

    const bothPositive = positiveFeatures.has(fA) && positiveFeatures.has(fB);
    const bothNegative = negativeFeatures.has(fA) && negativeFeatures.has(fB);
    const mixed = (positiveFeatures.has(fA) && negativeFeatures.has(fB)) ||
      (negativeFeatures.has(fA) && positiveFeatures.has(fB));

    if (data.weight < -0.3 && bothPositive) {
      relation = 'rejects_when_combined';
      signedWeight = data.weight;
    } else if (mixed) {
      relation = 'contrasts';
      signedWeight = data.weight * 0.5;
    } else if (data.scopes.size === 1 && data.scopes.has('session')) {
      relation = 'contextual_only';
      signedWeight = data.weight * 0.3;
    } else if (bothPositive && data.weight > 0) {
      relation = 'reinforces';
      signedWeight = data.weight;
    } else {
      continue;
    }

    const confidence = Math.min(
      MAX_CONFIDENCE,
      (data.count / (MIN_INTERACTION_SUPPORT + 2)) * 0.4 +
        (data.sources.size / (MIN_INTERACTION_SOURCE_DIVERSITY + 2)) * 0.3 +
        Math.min(fwA.confidence, fwB.confidence) * 0.3,
    );

    rules.push({
      id: `rule:${fA}:${fB}`,
      featureIds: [fA, fB],
      relation,
      signedWeight,
      supportCount: data.count,
      confidence,
      contextScopes: [...data.scopes],
      sourceIds: [...data.sources],
    });
  }

  return rules;
}

function shrinkTowardGlobal(
  projectFeatures: TasteFeatureWeight[],
  globalSnapshot: TasteModelSnapshot | undefined,
  alpha: number,
): TasteFeatureWeight[] {
  if (!globalSnapshot) return projectFeatures;
  const globalMap = new Map(
    globalSnapshot.featureWeights.map((f) => [f.featureId, f] as const),
  );

  return projectFeatures.map((pf) => {
    const gf = globalMap.get(pf.featureId);
    if (!gf || pf.evidenceMass > 1.0) return pf;
    const blend = alpha;
    return {
      ...pf,
      signedWeight: pf.signedWeight * (1 - blend) + gf.signedWeight * blend,
      confidence: pf.confidence * (1 - blend) + gf.confidence * blend,
    };
  });
}

/**
 * Compile a deterministic taste model snapshot from graph entities and events.
 */
export function compileTasteModel(input: CompileTasteModelInput): TasteModelSnapshot {
  const now = input.compiledAt ?? Date.now();
  const featureMap = new Map<string, FeatureAccumulator>();
  const explicitPolarity = resolveExplicitPolarity(input.events);

  seedFeaturesFromGraph(
    featureMap,
    input.observations,
    input.clusters,
    input.laws,
    now,
  );

  const filteredEvents =
    input.scope === 'global'
      ? input.events.filter((e) => e.scope === 'persistent' || e.scope === 'project')
      : input.events.filter(
          (e) =>
            e.scope === 'project' &&
            (!input.projectId || e.projectId === input.projectId),
        );

  for (const event of filteredEvents) {
    const weight = effectiveEventWeight(event, now);
    if (Math.abs(weight) < 0.001) continue;

    const explicitKey = `${event.targetType}:${event.targetId}`;
    const explicitState = explicitPolarity.get(explicitKey);

    if (!event.explicit && !EXPLICIT_ACTIONS.has(event.action) && explicitState) {
      if (
        explicitState.polarity < 0 &&
        weight > 0
      ) {
        continue;
      }
    }

    let targetFeatures: string[] = [];
    if (event.targetType === 'pattern_cluster') {
      targetFeatures = [stableFeatureId('pattern_cluster', event.targetId)];
    } else if (event.targetType === 'observation') {
      targetFeatures = [stableFeatureId('observation', event.targetId)];
    } else if (event.targetType === 'creative_law') {
      targetFeatures = [stableFeatureId('creative_law', event.targetId)];
    } else {
      for (const cid of event.patternClusterIds) {
        targetFeatures.push(stableFeatureId('pattern_cluster', cid));
      }
      for (const oid of event.observationIds) {
        targetFeatures.push(stableFeatureId('observation', oid));
      }
    }

    for (const fid of targetFeatures) {
      const acc = featureMap.get(fid);
      if (!acc) continue;
      addToFeature(acc, weight, Math.abs(weight), event, now);
    }
  }

  let featureWeights: TasteFeatureWeight[] = [...featureMap.values()].map((acc) => ({
    featureId: acc.featureId,
    label: acc.label,
    category: acc.category,
    sourceType: acc.sourceType,
    signedWeight: acc.signedSum,
    confidence: computeConfidence(acc),
    evidenceMass: acc.evidenceMass,
    explicitMass: acc.explicitMass,
    implicitMass: acc.implicitMass,
    firstSeenAt: acc.firstSeenAt,
    lastSeenAt: acc.lastSeenAt,
    trend: classifyTrend(acc),
    contextScopes: [...acc.contextScopes],
    sourceIds: [...acc.sourceIds],
  }));

  if (input.scope === 'project' && input.globalSnapshot) {
    featureWeights = shrinkTowardGlobal(
      featureWeights,
      input.globalSnapshot,
      PROJECT_SHRINKAGE_ALPHA,
    );
  }

  const interactionRules = inferInteractionRules(featureWeights, filteredEvents);

  const contradictionCount = featureWeights.filter(
    (f) => f.evidenceMass > 0 && f.signedWeight !== 0 &&
      featureWeights.some(
        (other) =>
          other.featureId !== f.featureId &&
          other.category === f.category &&
          Math.sign(other.signedWeight) !== Math.sign(f.signedWeight),
      ),
  ).length;

  const eventTimes = filteredEvents.map((e) => e.occurredAt);
  const explicitCount = filteredEvents.filter(
    (e) => e.explicit || EXPLICIT_ACTIONS.has(e.action),
  ).length;

  const snapshot: TasteModelSnapshot = {
    schemaVersion: 1,
    modelVersion: 'mimi-taste-model-v1',
    id: input.scope === 'global' ? 'global' : `project-${input.projectId}`,
    userId: input.userId,
    projectId: input.projectId,
    tasteGraphId: input.tasteGraph?.id,
    tasteGraphVersion: input.tasteGraph?.version,
    scope: input.scope,
    compiledAt: now,
    featureWeights,
    interactionRules,
    trajectory: {
      emergingFeatureIds: featureWeights.filter((f) => f.trend === 'emerging').map((f) => f.featureId),
      strengtheningFeatureIds: featureWeights.filter((f) => f.trend === 'strengthening').map((f) => f.featureId),
      stableFeatureIds: featureWeights.filter((f) => f.trend === 'stable').map((f) => f.featureId),
      decliningFeatureIds: featureWeights.filter((f) => f.trend === 'declining').map((f) => f.featureId),
    },
    diagnostics: {
      evidenceCount: input.evidence.length,
      eventCount: filteredEvents.length,
      explicitEventCount: explicitCount,
      contradictionCount,
      lowConfidenceFeatureIds: featureWeights
        .filter((f) => f.confidence < LOW_CONFIDENCE_THRESHOLD)
        .map((f) => f.featureId),
      missingDataWarnings: [
        ...(input.evidence.length === 0 ? ['No evidence nodes in scope'] : []),
        ...(input.clusters.length === 0 ? ['No pattern clusters in scope'] : []),
        ...(filteredEvents.length === 0 ? ['No taste learning events in scope'] : []),
      ],
    },
    sourceWindow: {
      oldestEventAt: eventTimes.length ? Math.min(...eventTimes) : undefined,
      newestEventAt: eventTimes.length ? Math.max(...eventTimes) : undefined,
    },
  };

  return snapshot;
}
