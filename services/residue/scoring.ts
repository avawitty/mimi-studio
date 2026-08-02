/**
 * Mimi Residue Engine — confidence and source-quality scoring.
 * Scores are synthesis confidence / coverage — never diagnostic likelihood.
 */

import {
  EVIDENCE_STRENGTH_WEIGHT,
  LAYER_QUALITY_WEIGHT,
  SOURCE_TYPE_TO_LAYER,
  type EvidenceLayer,
} from "./constants";
import type {
  ConfidenceSummary,
  EvidenceRecord,
  EvidenceStrength,
  ResidueClaim,
  SourceReference,
  SourceType,
} from "./validation";

export function layerForSourceType(sourceType: SourceType): EvidenceLayer {
  return SOURCE_TYPE_TO_LAYER[sourceType] ?? "D";
}

export function sourceQualityScore(
  sourceType: SourceType,
  evidenceStrength: EvidenceStrength = "moderate",
): number {
  const layer = layerForSourceType(sourceType);
  const layerWeight = LAYER_QUALITY_WEIGHT[layer];
  const strengthWeight = EVIDENCE_STRENGTH_WEIGHT[evidenceStrength] ?? 0.4;
  return clamp01(layerWeight * strengthWeight);
}

export function strongestEvidenceLayer(
  layers: EvidenceLayer[],
): EvidenceLayer {
  if (layers.includes("A")) return "A";
  if (layers.includes("B")) return "B";
  if (layers.includes("C")) return "C";
  return "D";
}

export function evidenceCoverageScore(evidence: EvidenceRecord[]): number {
  if (evidence.length === 0) return 0;
  const avgRelevance =
    evidence.reduce((sum, e) => sum + e.relevanceScore, 0) / evidence.length;
  const strengthAvg =
    evidence.reduce(
      (sum, e) => sum + (EVIDENCE_STRENGTH_WEIGHT[e.evidenceStrength] ?? 0.4),
      0,
    ) / evidence.length;
  const volumeFactor = clamp01(Math.log10(evidence.length + 1) / Math.log10(12));
  return clamp01(0.45 * avgRelevance + 0.35 * strengthAvg + 0.2 * volumeFactor);
}

export function sourceDiversityScore(sources: SourceReference[]): number {
  if (sources.length === 0) return 0;
  const types = new Set(sources.map((s) => s.sourceType));
  const layers = new Set(sources.map((s) => s.evidenceLayer ?? layerForSourceType(s.sourceType)));
  const typeScore = clamp01(types.size / 6);
  const layerScore = clamp01(layers.size / 4);
  return clamp01(0.6 * typeScore + 0.4 * layerScore);
}

export function counterSignalCoverageScore(
  claims: ResidueClaim[],
  counterClaims: ResidueClaim[],
): number {
  if (claims.length === 0) return 0;
  if (counterClaims.length === 0) return 0.15;
  const ratio = counterClaims.length / Math.max(claims.length, 1);
  return clamp01(0.35 + Math.min(ratio, 1) * 0.65);
}

export function claimConfidenceFromEvidence(
  evidence: EvidenceRecord[],
  status: ResidueClaim["status"],
): number {
  if (status === "model-proposed" && evidence.length === 0) return 0.2;
  if (evidence.length === 0) return 0.15;
  const base =
    evidence.reduce(
      (sum, e) =>
        sum + e.sourceQualityScore * e.relevanceScore * (EVIDENCE_STRENGTH_WEIGHT[e.evidenceStrength] ?? 0.4),
      0,
    ) / evidence.length;
  const statusPenalty =
    status === "causal-hypothesis" ? 0.85 :
    status === "model-proposed" ? 0.7 :
    status === "interpretive" ? 0.9 :
    1;
  return clamp01(base * statusPenalty);
}

export function buildConfidenceSummary(input: {
  evidence: EvidenceRecord[];
  sources: SourceReference[];
  primaryClaims: ResidueClaim[];
  counterClaims: ResidueClaim[];
  summary?: string;
}): ConfidenceSummary {
  const layers = input.evidence.map((e) => e.evidenceLayer);
  for (const s of input.sources) {
    layers.push(s.evidenceLayer ?? layerForSourceType(s.sourceType));
  }
  const evidenceCoverage = evidenceCoverageScore(input.evidence);
  const sourceDiversity = sourceDiversityScore(input.sources);
  const counterSignalCoverage = counterSignalCoverageScore(
    input.primaryClaims,
    input.counterClaims,
  );
  const strongest = strongestEvidenceLayer(layers);
  const overallConfidence = clamp01(
    0.4 * evidenceCoverage +
      0.25 * sourceDiversity +
      0.2 * counterSignalCoverage +
      0.15 * LAYER_QUALITY_WEIGHT[strongest],
  );

  const summary =
    input.summary ??
    defaultConfidenceNarrative({
      overallConfidence,
      evidenceCoverage,
      sourceDiversity,
      counterSignalCoverage,
      strongest,
      evidenceCount: input.evidence.length,
      sourceCount: input.sources.length,
    });

  return {
    overallConfidence,
    evidenceCoverage,
    sourceDiversity,
    counterSignalCoverage,
    strongestEvidenceLayer: strongest,
    summary,
  };
}

function defaultConfidenceNarrative(args: {
  overallConfidence: number;
  evidenceCoverage: number;
  sourceDiversity: number;
  counterSignalCoverage: number;
  strongest: EvidenceLayer;
  evidenceCount: number;
  sourceCount: number;
}): string {
  return [
    `Synthesis confidence ${args.overallConfidence.toFixed(2)} (not a diagnostic likelihood).`,
    `Evidence coverage ${args.evidenceCoverage.toFixed(2)} across ${args.evidenceCount} evidence records from ${args.sourceCount} sources.`,
    `Source diversity ${args.sourceDiversity.toFixed(2)}; strongest evidence layer ${args.strongest}.`,
    `Counter-signal coverage ${args.counterSignalCoverage.toFixed(2)}.`,
  ].join(" ");
}

export function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

/** Literal statistics helpers for quantitative Mean / Median / Mode paths. */
export function literalMean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function literalMedian(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

export function literalMode(values: Array<string | number>): {
  value: string | number;
  frequency: number;
} | null {
  if (values.length === 0) return null;
  const counts = new Map<string, { value: string | number; frequency: number }>();
  for (const v of values) {
    const key = String(v);
    const prev = counts.get(key);
    if (prev) prev.frequency += 1;
    else counts.set(key, { value: v, frequency: 1 });
  }
  let best: { value: string | number; frequency: number } | null = null;
  for (const entry of counts.values()) {
    if (!best || entry.frequency > best.frequency) best = entry;
  }
  return best;
}
