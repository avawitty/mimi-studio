/**
 * Build a live Mean Median Mode report from consented collective signals.
 * Pure — no network. Demo fixtures use fixtures/collective instead.
 */

import {
  meanMedianModeReportSchema,
  type CollectiveSignal,
  type MeanMedianModeReport,
} from "../../schemas/collectiveIntelligenceContracts";
import {
  buildCentralTendencyProfile,
  groupObservationsByLabel,
  observationsFromEligibleSignals,
} from "./aggregateCentralTendency";
import {
  METHODOLOGY_LIMITATIONS_DEFAULT,
  MMM_METHODOLOGY_VERSION,
} from "./methodology";
import { emptyMeanMedianModeReport } from "../../fixtures/collective/demoMeanMedianModeReport";

const DEFAULT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_PROFILES = 6;
const MIN_GROUP_SIZE = 3;

function atmosphereFromProfiles(
  profiles: MeanMedianModeReport["profiles"],
): string {
  const readable = profiles.filter(
    (p) => p.summation.interpretation !== "insufficient_evidence",
  );
  if (readable.length === 0) {
    return "Consented signals are present but below promotion thresholds for a collective atmosphere readout.";
  }
  const lead = readable[0]!;
  const label = lead.mode.label;
  const interp = lead.summation.interpretation.replace(/_/g, " ");
  return `Present atmosphere centers on “${label}” — ${interp} across ${lead.uniqueArtifactCount} artifacts (${lead.uniqueContributorBand} contributors).`;
}

function seekingModesFromSignals(signals: CollectiveSignal[]) {
  const categories = new Set(["artifact_form", "expressive_mode", "assistance_type"]);
  const counts = new Map<string, number>();
  let total = 0;
  for (const signal of signals) {
    if (!categories.has(signal.category)) continue;
    const label = signal.canonicalLabel;
    counts.set(label, (counts.get(label) ?? 0) + 1);
    total += 1;
  }
  if (total === 0) return [];
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, count]) => ({
      label,
      share: count / total,
      sampleSize: count,
    }));
}

export function buildMeanMedianModeReportFromSignals(
  signals: CollectiveSignal[],
  options?: {
    now?: number;
    windowMs?: number;
    runId?: string;
  },
): MeanMedianModeReport {
  const now = options?.now ?? Date.now();
  const windowMs = options?.windowMs ?? DEFAULT_WINDOW_MS;
  const windowEnd = now;
  const windowStart = now - windowMs;

  const inWindow = signals.filter((s) => {
    const t = s.observedAt ?? s.extractedAt;
    return t >= windowStart && t <= windowEnd;
  });

  const observations = observationsFromEligibleSignals(inWindow);
  const uniqueArtifacts = new Set(observations.map((o) => o.artifactId));

  if (observations.length === 0) {
    return emptyMeanMedianModeReport(now);
  }

  const grouped = groupObservationsByLabel(observations);
  const ranked = [...grouped.entries()]
    .filter(([, obs]) => obs.length >= MIN_GROUP_SIZE)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, MAX_PROFILES);

  const profiles = ranked.map(([label, obs], index) =>
    buildCentralTendencyProfile({
      signalId: `live:motif:${index}:${slugLabel(label)}`,
      windowStart,
      windowEnd,
      unit: "normalized_intensity",
      sourceTypeDiversity: countSourceTypes(inWindow, obs.map((o) => o.artifactId)),
      observations: obs,
    }),
  );

  const promoted = profiles.filter(
    (p) => p.summation.interpretation !== "insufficient_evidence",
  );

  if (promoted.length === 0) {
    const partial = meanMedianModeReportSchema.parse({
      ...emptyMeanMedianModeReport(now),
      status: "partial",
      profiles,
      presentAtmosphere:
        "Consented structure is accumulating — motifs are not yet strong enough for a promoted collective readout.",
      seekingModes: seekingModesFromSignals(inWindow),
      whatMayBeMissing: [
        "More diverse consented artifacts in this window.",
        "Additional contributors staging on The Proscenium with collective contribution enabled.",
      ],
      methodology: {
        version: MMM_METHODOLOGY_VERSION,
        windowStart,
        windowEnd,
        sampleSize: observations.length,
        uniqueArtifactCount: uniqueArtifacts.size,
        limitations: [...METHODOLOGY_LIMITATIONS_DEFAULT],
        exclusions: ["private studio", "Tailor memory", "personal Scry"],
        lastUpdated: now,
      },
    });
    return partial;
  }

  return meanMedianModeReportSchema.parse({
    runId: options?.runId ?? `live-mmm-${now}`,
    status: "success",
    windowStart,
    windowEnd,
    profiles: promoted,
    presentAtmosphere: atmosphereFromProfiles(promoted),
    seekingModes: seekingModesFromSignals(inWindow),
    cycleNotes: [],
    methodologyVersion: MMM_METHODOLOGY_VERSION,
    limitations: [...METHODOLOGY_LIMITATIONS_DEFAULT],
    whatMayBeMissing: [
      "Signals below Mesopic promotion thresholds.",
      "Approved RSS freshness entries for Forecast cross-check.",
    ],
    lastUpdated: now,
    demonstration: false,
    methodology: {
      version: MMM_METHODOLOGY_VERSION,
      windowStart,
      windowEnd,
      sampleSize: observations.length,
      uniqueArtifactCount: uniqueArtifacts.size,
      limitations: [...METHODOLOGY_LIMITATIONS_DEFAULT],
      exclusions: ["private studio", "Tailor memory", "personal Scry"],
      lastUpdated: now,
    },
  });
}

function slugLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "signal";
}

function countSourceTypes(
  signals: CollectiveSignal[],
  artifactIds: string[],
): number {
  const ids = new Set(artifactIds);
  const types = new Set<string>();
  for (const signal of signals) {
    if (ids.has(signal.sourceArtifactId)) {
      types.add(signal.sourceType);
    }
  }
  return types.size || 1;
}
