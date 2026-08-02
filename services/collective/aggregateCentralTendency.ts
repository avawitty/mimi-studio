/**
 * Windowed mean / median / mode + summation for collective MMM.
 * Pure functions — no network, no random confidence.
 */

import {
  centralTendencyProfileSchema,
  type CentralTendencyProfile,
  type CollectiveSignal,
} from "../../schemas/collectiveIntelligenceContracts";
import {
  MMM_METHODOLOGY_VERSION,
  MODE_DOMINANCE_SHARE_GAP,
  SPIKE_MEAN_MEDIAN_RATIO,
  contributorBand,
  confidenceLabelFor,
} from "./methodology";

export interface IntensityObservation {
  /** Intensity / frequency for one artifact-day (or normalized unit sample). */
  value: number;
  artifactId: string;
  contributorId: string;
  label: string;
}

function meanOf(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function medianOf(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1]! + sorted[mid]!) / 2;
  }
  return sorted[mid]!;
}

function modeOfLabels(labels: string[]): { label: string; count: number; share: number } {
  if (labels.length === 0) {
    return { label: "insufficient", count: 0, share: 0 };
  }
  const counts = new Map<string, number>();
  for (const label of labels) {
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const [label, count] = ranked[0]!;
  return { label, count, share: count / labels.length };
}

function modalityFromLabels(labels: string[]): CentralTendencyProfile["summation"]["modality"] {
  if (labels.length === 0) return "insufficient";
  const counts = new Map<string, number>();
  for (const label of labels) {
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  const ranked = [...counts.values()].sort((a, b) => b - a);
  if (ranked.length === 1) return "unimodal";
  const top = ranked[0]! / labels.length;
  const second = ranked[1]! / labels.length;
  if (top - second < MODE_DOMINANCE_SHARE_GAP) {
    return ranked.length > 2 ? "multimodal" : "bimodal";
  }
  return "unimodal";
}

function skewHint(mean: number, median: number): CentralTendencyProfile["summation"]["skewHint"] {
  if (median === 0 && mean === 0) return "aligned";
  const denom = Math.max(Math.abs(median), 1e-9);
  const ratio = mean / denom;
  if (ratio >= SPIKE_MEAN_MEDIAN_RATIO) return "mean_above_median";
  if (median / Math.max(Math.abs(mean), 1e-9) >= SPIKE_MEAN_MEDIAN_RATIO) {
    return "median_above_mean";
  }
  return "aligned";
}

/**
 * Build one CentralTendencyProfile from intensity observations in a window.
 * Returns insufficient_evidence interpretation when sample is too small.
 */
export function buildCentralTendencyProfile(input: {
  signalId: string;
  windowStart: number;
  windowEnd: number;
  unit: CentralTendencyProfile["unit"];
  observations: IntensityObservation[];
  sourceTypeDiversity?: number;
  methodologyVersion?: string;
}): CentralTendencyProfile {
  const observations = input.observations.filter((o) => Number.isFinite(o.value));
  const values = observations.map((o) => o.value);
  const labels = observations.map((o) => o.label);
  const artifactIds = new Set(observations.map((o) => o.artifactId));
  const contributorIds = new Set(observations.map((o) => o.contributorId));
  const sampleSize = values.length;
  const uniqueArtifactCount = artifactIds.size;
  const conf = confidenceLabelFor({
    uniqueArtifactCount,
    sourceTypeDiversity: input.sourceTypeDiversity ?? 1,
    sampleSize,
  });

  const mean = meanOf(values);
  const median = medianOf(values);
  const mode = modeOfLabels(labels);
  const modality = modalityFromLabels(labels);
  const skew = skewHint(mean, median);

  let interpretation: CentralTendencyProfile["summation"]["interpretation"] =
    "broadly_shared";
  if (conf === "insufficient" || sampleSize === 0) {
    interpretation = "insufficient_evidence";
  } else if (modality === "bimodal" || modality === "multimodal") {
    interpretation = "contested";
  } else if (skew === "mean_above_median") {
    interpretation = "spike_driven";
  }

  const normalizedModeShare = mode.share;
  const combinedIndex =
    interpretation === "insufficient_evidence"
      ? 0
      : (mean + median + normalizedModeShare) / 3;

  return centralTendencyProfileSchema.parse({
    signalId: input.signalId,
    windowStart: input.windowStart,
    windowEnd: input.windowEnd,
    unit: input.unit,
    mean,
    median,
    mode:
      interpretation === "insufficient_evidence"
        ? { label: "insufficient_evidence", count: 0, share: 0 }
        : mode,
    summation: {
      combinedIndex,
      skewHint: sampleSize === 0 ? "aligned" : skew,
      modality: sampleSize === 0 ? "insufficient" : modality,
      interpretation,
    },
    sampleSize,
    uniqueArtifactCount,
    uniqueContributorBand: contributorBand(contributorIds.size),
    methodologyVersion: input.methodologyVersion ?? MMM_METHODOLOGY_VERSION,
  });
}

/**
 * Eligible signals only — private / non-consent / excluded never enter.
 */
export function observationsFromEligibleSignals(
  signals: CollectiveSignal[],
  intensityBySignalId?: Record<string, number>,
): IntensityObservation[] {
  const out: IntensityObservation[] = [];
  for (const signal of signals) {
    if (!signal.publicContributionAllowed) continue;
    if (signal.anonymizationStatus !== "eligible") continue;
    out.push({
      value: intensityBySignalId?.[signal.id] ?? signal.confidence ?? 1,
      artifactId: signal.sourceArtifactId,
      /** Banded later — never surface this id in public UI. */
      contributorId: `artifact:${signal.sourceArtifactId}`,
      label: signal.canonicalLabel,
    });
  }
  return out;
}

export function groupObservationsByLabel(
  observations: IntensityObservation[],
): Map<string, IntensityObservation[]> {
  const map = new Map<string, IntensityObservation[]>();
  for (const obs of observations) {
    const list = map.get(obs.label) ?? [];
    list.push(obs);
    map.set(obs.label, list);
  }
  return map;
}
