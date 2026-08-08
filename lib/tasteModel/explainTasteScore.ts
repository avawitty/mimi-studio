import type { TasteCandidateScore, TasteFeatureWeight, TasteModelSnapshot } from './contracts';

export interface FeatureExplanation {
  featureId: string;
  label: string;
  signedStrength: number;
  confidenceLabel: string;
  confidence: number;
  trend: string;
  scopeLabel: string;
  supportingEvidence: string[];
  topContradiction?: string;
  linkedObservations: string[];
  linkedLaws: string[];
  lastUpdate?: number;
  evidenceCount: number;
}

function confidenceLabel(confidence: number): string {
  if (confidence >= 0.75) return 'High';
  if (confidence >= 0.5) return 'Moderate';
  if (confidence >= 0.25) return 'Limited';
  return 'Very limited';
}

function trendLabel(trend: string): string {
  switch (trend) {
    case 'emerging':
      return 'This appears to be emerging in your recent references.';
    case 'strengthening':
      return 'This appears to be strengthening over time.';
    case 'stable':
      return 'This signal has been relatively stable.';
    case 'declining':
      return 'This signal appears to be declining in recent evidence.';
    default:
      return 'Trend is uncertain — more evidence would help.';
  }
}

/**
 * Build a human-readable explanation for a single feature in the model.
 */
export function explainFeature(
  feature: TasteFeatureWeight,
  snapshot: TasteModelSnapshot,
): FeatureExplanation {
  const contradictions = snapshot.featureWeights.filter(
    (other) =>
      other.featureId !== feature.featureId &&
      other.category === feature.category &&
      Math.sign(other.signedWeight) !== Math.sign(feature.signedWeight) &&
      other.confidence > 0.3,
  );

  const linkedObservations = feature.sourceIds.filter((id) =>
    feature.featureId.startsWith('observation:'),
  );
  const linkedLaws = feature.sourceIds.filter((id) =>
    feature.featureId.startsWith('creative_law:'),
  );

  const scopeLabel =
    feature.contextScopes.includes('persistent')
      ? 'Persistent taste'
      : feature.contextScopes.includes('project')
        ? 'Project-specific'
        : 'Session context';

  return {
    featureId: feature.featureId,
    label: feature.label,
    signedStrength: feature.signedWeight,
    confidenceLabel: confidenceLabel(feature.confidence),
    confidence: feature.confidence,
    trend: trendLabel(feature.trend),
    scopeLabel,
    supportingEvidence: feature.sourceIds.slice(0, 6),
    topContradiction: contradictions[0]
      ? `Contradicted by "${contradictions[0].label}" (${contradictions[0].signedWeight > 0 ? 'positive' : 'negative'})`
      : undefined,
    linkedObservations,
    linkedLaws,
    lastUpdate: feature.lastSeenAt,
    evidenceCount: feature.sourceIds.length,
  };
}

/**
 * Build a summary explanation for a candidate score.
 */
export function explainCandidateScore(score: TasteCandidateScore): string {
  const parts: string[] = [];

  if (score.explanation.topPositiveFactors.length > 0) {
    const top = score.explanation.topPositiveFactors[0];
    parts.push(
      `Mimi has observed alignment with "${top.label}" (supported by ${top.sourceIds.length} reference${top.sourceIds.length === 1 ? '' : 's'}).`,
    );
  }

  if (score.explanation.topNegativeFactors.length > 0) {
    const top = score.explanation.topNegativeFactors[0];
    parts.push(
      `Aversion signal from "${top.label}" reduces the fit.`,
    );
  }

  if (score.confidence < 0.35) {
    parts.push('Confidence is limited because taste evidence is still sparse.');
  }

  if (score.explanation.contradictions.length > 0) {
    parts.push(score.explanation.contradictions[0]);
  }

  if (parts.length === 0) {
    return 'Not enough evidence to explain this estimate yet.';
  }

  return parts.join(' ');
}

/**
 * Format signed strength for display.
 */
export function formatSignedStrength(weight: number): string {
  const abs = Math.abs(weight);
  const direction = weight > 0 ? 'affinity' : weight < 0 ? 'aversion' : 'neutral';
  const magnitude = abs >= 1 ? 'strong' : abs >= 0.5 ? 'moderate' : 'mild';
  return `${magnitude} ${direction}`;
}
