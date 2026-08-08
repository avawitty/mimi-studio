import type {
  TasteCandidateInput,
  TasteCandidateScore,
  TasteModelSnapshot,
} from './contracts';
import { cosineSimilarity } from '../taste/evidenceEmbeddingMath';
import {
  NOVELTY_SWEET_SPOT_MAX,
  NOVELTY_SWEET_SPOT_MIN,
  SATURATION_THRESHOLD,
  SCORE_COEFFICIENTS,
  VERDICT_THRESHOLDS,
} from './constants';
import { computeEmbeddingSimilarity } from './embeddingSimilarity';

export interface ScoreContext {
  projectId?: string;
  surface?: string;
}

function extractCandidateFeatures(candidate: TasteCandidateInput): Set<string> {
  const features = new Set<string>();
  for (const fid of candidate.featureIds ?? []) features.add(fid);
  for (const pid of candidate.patternClusterIds ?? []) {
    features.add(`pattern_cluster:${pid}`);
  }
  for (const oid of candidate.observationIds ?? []) {
    features.add(`observation:${oid}`);
  }
  for (const lid of candidate.creativeLawIds ?? []) {
    features.add(`creative_law:${lid}`);
  }
  for (const tag of candidate.tags ?? []) {
    features.add(`tag:${tag.toLowerCase()}`);
  }
  if (candidate.canonicalTaste) {
    for (const m of candidate.canonicalTaste.motifs ?? []) features.add(`tag:${m.toLowerCase()}`);
    for (const p of candidate.canonicalTaste.palette ?? []) features.add(`tag:${p.toLowerCase()}`);
    for (const m of candidate.canonicalTaste.mood ?? []) features.add(`tag:${m.toLowerCase()}`);
    for (const f of candidate.canonicalTaste.form ?? []) features.add(`tag:${f.toLowerCase()}`);
  }
  return features;
}

function semanticAffinity(
  candidateFeatures: Set<string>,
  snapshot: TasteModelSnapshot,
): { score: number; positives: Array<{ label: string; contribution: number; sourceIds: string[] }>; negatives: Array<{ label: string; contribution: number; sourceIds: string[] }> } {
  const positives: Array<{ label: string; contribution: number; sourceIds: string[] }> = [];
  const negatives: Array<{ label: string; contribution: number; sourceIds: string[] }> = [];
  let totalPositive = 0;
  let totalNegative = 0;

  for (const fw of snapshot.featureWeights) {
    const matches =
      candidateFeatures.has(fw.featureId) ||
      candidateFeatures.has(`tag:${fw.label.toLowerCase()}`);

    if (!matches) continue;

    const contribution = fw.signedWeight * fw.confidence;
    if (contribution > 0) {
      totalPositive += contribution;
      positives.push({ label: fw.label, contribution, sourceIds: fw.sourceIds });
    } else if (contribution < 0) {
      totalNegative += Math.abs(contribution);
      negatives.push({ label: fw.label, contribution: Math.abs(contribution), sourceIds: fw.sourceIds });
    }
  }

  const raw = totalPositive - totalNegative;
  const normalized = Math.max(0, Math.min(1, (raw + 2) / 4));
  return { score: normalized, positives, negatives };
}

function blendSemanticAffinity(
  labelScore: number,
  candidate: TasteCandidateInput,
  snapshot: TasteModelSnapshot,
): number {
  const centroid = snapshot.diagnostics.embeddingCentroid;
  const candidateEmb = candidate.embedding;
  if (!centroid || !candidateEmb || centroid.length !== candidateEmb.length) {
    return labelScore;
  }
  const vectorScore = cosineSimilarity(candidateEmb, centroid);
  return labelScore * 0.55 + vectorScore * 0.45;
}

function ruleFit(
  candidateFeatures: Set<string>,
  snapshot: TasteModelSnapshot,
): number {
  if (snapshot.interactionRules.length === 0) return 0.5;

  let fit = 0.5;
  let ruleCount = 0;

  for (const rule of snapshot.interactionRules) {
    const hasA = candidateFeatures.has(rule.featureIds[0]);
    const hasB = candidateFeatures.has(rule.featureIds[1]);
    if (!hasA || !hasB) continue;

    ruleCount += 1;
    switch (rule.relation) {
      case 'reinforces':
        fit += rule.signedWeight * rule.confidence * 0.15;
        break;
      case 'rejects_when_combined':
        fit -= Math.abs(rule.signedWeight) * rule.confidence * 0.25;
        break;
      case 'contrasts':
        fit -= Math.abs(rule.signedWeight) * rule.confidence * 0.1;
        break;
      case 'contextual_only':
        fit += rule.signedWeight * rule.confidence * 0.05;
        break;
      default: {
        const _exhaustive: never = rule.relation;
        void _exhaustive;
      }
    }
  }

  if (ruleCount === 0) return 0.5;
  return Math.max(0, Math.min(1, fit));
}

function contextFit(snapshot: TasteModelSnapshot, context?: ScoreContext): number {
  if (!context?.projectId) return 0.7;
  if (snapshot.scope === 'project' && snapshot.projectId === context.projectId) return 1.0;
  if (snapshot.scope === 'global') return 0.6;
  return 0.4;
}

function trajectoryFit(
  candidateFeatures: Set<string>,
  snapshot: TasteModelSnapshot,
): number {
  const { trajectory } = snapshot;
  let score = 0.5;
  let matched = 0;

  for (const fid of candidateFeatures) {
    if (trajectory.strengtheningFeatureIds.includes(fid)) {
      score += 0.15;
      matched += 1;
    } else if (trajectory.emergingFeatureIds.includes(fid)) {
      score += 0.1;
      matched += 1;
    } else if (trajectory.decliningFeatureIds.includes(fid)) {
      score -= 0.1;
      matched += 1;
    }
  }

  if (matched === 0) return 0.5;
  return Math.max(0, Math.min(1, score));
}

function noveltyFit(
  candidateFeatures: Set<string>,
  snapshot: TasteModelSnapshot,
): number {
  const knownFeatures = new Set(snapshot.featureWeights.map((f) => f.featureId));
  const knownLabels = new Set(
    snapshot.featureWeights.map((f) => f.label.toLowerCase()),
  );

  let overlap = 0;
  let total = 0;
  for (const cf of candidateFeatures) {
    total += 1;
    if (knownFeatures.has(cf)) {
      overlap += 1;
      continue;
    }
    const tagLabel = cf.startsWith('tag:') ? cf.slice(4) : cf;
    const labelMatch = [...knownLabels].some(
      (label) => label.includes(tagLabel) || tagLabel.includes(label),
    );
    if (labelMatch) overlap += 1;
  }

  if (total === 0) return 0.3;

  const overlapRatio = overlap / total;
  if (overlapRatio >= NOVELTY_SWEET_SPOT_MIN && overlapRatio <= NOVELTY_SWEET_SPOT_MAX) {
    return 0.8;
  }
  if (overlapRatio > NOVELTY_SWEET_SPOT_MAX) return 0.3;
  if (overlapRatio < NOVELTY_SWEET_SPOT_MIN) return 0.2;
  return 0.5;
}

function saturationPenalty(snapshot: TasteModelSnapshot): number {
  const maxWeight = Math.max(
    ...snapshot.featureWeights.map((f) => Math.abs(f.signedWeight)),
    0,
  );
  if (maxWeight > SATURATION_THRESHOLD) {
    return Math.min(1, (maxWeight - SATURATION_THRESHOLD) / (1 - SATURATION_THRESHOLD));
  }
  return 0;
}

function aversionPenalty(
  candidateFeatures: Set<string>,
  snapshot: TasteModelSnapshot,
): number {
  let penalty = 0;
  for (const fw of snapshot.featureWeights) {
    if (fw.signedWeight >= 0) continue;
    const matches =
      candidateFeatures.has(fw.featureId) ||
      candidateFeatures.has(`tag:${fw.label.toLowerCase()}`);
    if (matches) {
      penalty += Math.abs(fw.signedWeight) * fw.confidence;
    }
  }
  return Math.min(1, penalty / 2);
}

function computeConfidence(
  snapshot: TasteModelSnapshot,
  candidateFeatures: Set<string>,
  matchedCount: number,
): number {
  const modelConfidence =
    snapshot.featureWeights.length > 0
      ? snapshot.featureWeights.reduce((s, f) => s + f.confidence, 0) /
        snapshot.featureWeights.length
      : 0.1;

  const matchRatio =
    candidateFeatures.size > 0 ? matchedCount / candidateFeatures.size : 0;

  const eventFactor = Math.min(
    1,
    snapshot.diagnostics.eventCount / 10,
  );

  return Math.min(
    0.95,
    modelConfidence * 0.4 + matchRatio * 0.3 + eventFactor * 0.3,
  );
}

function classifyVerdict(
  fitScore: number,
  confidence: number,
  hasContradictions: boolean,
): TasteCandidateScore['verdict'] {
  if (hasContradictions && fitScore < VERDICT_THRESHOLDS.promising_adjacent) {
    return 'conflicted';
  }
  if (confidence < 0.25) return 'uncertain';
  if (fitScore >= VERDICT_THRESHOLDS.strong_fit) return 'strong_fit';
  if (fitScore >= VERDICT_THRESHOLDS.promising_adjacent) return 'promising_adjacent';
  if (fitScore >= VERDICT_THRESHOLDS.uncertain) return 'uncertain';
  return 'weak_fit';
}

/**
 * Score a candidate against a compiled taste model snapshot.
 * Returns fit score (0-100, not a probability), confidence, and explanation.
 */
export function scoreTasteCandidate(
  candidate: TasteCandidateInput,
  snapshot: TasteModelSnapshot,
  context?: ScoreContext,
): TasteCandidateScore {
  const candidateFeatures = extractCandidateFeatures(candidate);

  const affinity = semanticAffinity(candidateFeatures, snapshot);
  const semanticScore = blendSemanticAffinity(affinity.score, candidate, snapshot);
  const embedding = computeEmbeddingSimilarity(
    {
      ...candidate,
      embeddingVector: candidate.embeddingVector ?? candidate.embedding,
    },
    snapshot,
  );
  const rule = ruleFit(candidateFeatures, snapshot);
  const ctx = contextFit(snapshot, context);
  const traj = trajectoryFit(candidateFeatures, snapshot);
  const novelty = noveltyFit(candidateFeatures, snapshot);
  const saturation = saturationPenalty(snapshot);
  const aversion = aversionPenalty(candidateFeatures, snapshot);

  const coeffs = SCORE_COEFFICIENTS;
  const rawFit =
    semanticScore * coeffs.semanticAffinity +
    embedding * coeffs.embeddingSimilarity +
    rule * coeffs.ruleFit +
    ctx * coeffs.contextFit +
    traj * coeffs.trajectoryFit +
    novelty * coeffs.noveltyFit -
    aversion * coeffs.aversionPenalty -
    saturation * coeffs.saturationPenalty;

  const fitScore = Math.round(Math.max(0, Math.min(100, rawFit * 100)));

  const matchedCount = affinity.positives.length + affinity.negatives.length;
  const confidence = computeConfidence(snapshot, candidateFeatures, matchedCount);

  const contradictions: string[] = [];
  if (affinity.positives.length > 0 && affinity.negatives.length > 0) {
    contradictions.push(
      `Mixed signals: ${affinity.positives.length} positive and ${affinity.negatives.length} negative factors overlap this candidate.`,
    );
  }

  const unknowns: string[] = [];
  if (candidateFeatures.size === 0) {
    unknowns.push('Candidate has no identifiable taste features or tags.');
  }
  if (snapshot.diagnostics.eventCount < 3) {
    unknowns.push('Limited taste learning events — confidence is constrained.');
  }
  if (matchedCount === 0) {
    unknowns.push('No features in the model match this candidate.');
  }

  const verdict = classifyVerdict(
    fitScore,
    confidence,
    contradictions.length > 0,
  );

  return {
    fitScore,
    confidence,
    verdict,
    components: {
      semanticAffinity: affinity.score,
      embeddingSimilarity: embedding,
      ruleFit: rule,
      contextFit: ctx,
      trajectoryFit: traj,
      noveltyFit: novelty,
      aversionPenalty: aversion,
      saturationPenalty: saturation,
    },
    explanation: {
      topPositiveFactors: affinity.positives
        .sort((a, b) => b.contribution - a.contribution)
        .slice(0, 5),
      topNegativeFactors: affinity.negatives
        .sort((a, b) => b.contribution - a.contribution)
        .slice(0, 5),
      contradictions,
      unknowns,
    },
  };
}
