/**
 * Build Mesopic Lens report from below-threshold consented signals.
 */

import {
  mesopicReportSchema,
  type CollectiveSignal,
  type MesopicFinding,
  type MesopicReport,
} from "../../schemas/collectiveIntelligenceContracts";
import {
  groupObservationsByLabel,
  observationsFromEligibleSignals,
} from "./aggregateCentralTendency";
import {
  METHODOLOGY_LIMITATIONS_DEFAULT,
  MESOPIC_MAX_GROUP_SIZE,
  MMM_METHODOLOGY_VERSION,
  MMM_PROMOTION_MIN_GROUP_SIZE,
  contributorBand,
} from "./methodology";
import { emptyMesopicReport } from "../../fixtures/collective/demoMesopicReport";

const STAR_CATEGORIES = new Set<CollectiveSignal["category"]>([
  "motif",
  "topic",
  "reference",
  "material",
  "silhouette",
  "color",
]);

const SHADOW_CATEGORIES = new Set<CollectiveSignal["category"]>([
  "mood",
  "tension",
  "social_condition",
]);

function mesopicModeForCategory(
  category: CollectiveSignal["category"],
): MesopicFinding["mode"] {
  if (SHADOW_CATEGORIES.has(category)) return "shadow_fields";
  return "starry_eyed";
}

function faintnessReason(sampleSize: number, uniqueArtifacts: number): string {
  return `Only ${sampleSize} consented signal(s) across ${uniqueArtifacts} artifact(s) — below Mean Median Mode promotion (≥${MMM_PROMOTION_MIN_GROUP_SIZE}).`;
}

export function buildMesopicReportFromSignals(
  signals: CollectiveSignal[],
  promotedLabels: Set<string>,
  options?: {
    now?: number;
    windowMs?: number;
    runId?: string;
  },
): MesopicReport {
  const now = options?.now ?? Date.now();
  const windowMs = options?.windowMs ?? 7 * 24 * 60 * 60 * 1000;
  const windowEnd = now;
  const windowStart = now - windowMs;

  const inWindow = signals.filter((s) => {
    const t = s.observedAt ?? s.extractedAt;
    return t >= windowStart && t <= windowEnd;
  });

  const observations = observationsFromEligibleSignals(inWindow);
  if (observations.length === 0) {
    return emptyMesopicReport(now);
  }

  const grouped = groupObservationsByLabel(observations);
  const findings: MesopicFinding[] = [];

  const signalsByLabel = new Map<string, CollectiveSignal[]>();
  for (const signal of inWindow) {
    const list = signalsByLabel.get(signal.canonicalLabel) ?? [];
    list.push(signal);
    signalsByLabel.set(signal.canonicalLabel, list);
  }

  for (const [label, obs] of grouped.entries()) {
    if (promotedLabels.has(label)) continue;
    if (obs.length > MESOPIC_MAX_GROUP_SIZE || obs.length >= MMM_PROMOTION_MIN_GROUP_SIZE) {
      continue;
    }
    if (obs.length === 0) continue;

    const relatedSignals = signalsByLabel.get(label) ?? [];
    const category = relatedSignals[0]?.category ?? "motif";
    const artifactIds = new Set(obs.map((o) => o.artifactId));
    const contributorIds = new Set(obs.map((o) => o.contributorId));
    const mode = mesopicModeForCategory(category);
    const observedAt = Math.max(
      ...relatedSignals.map((s) => s.observedAt ?? s.extractedAt),
      windowStart,
    );

    findings.push({
      id: `live:mesopic:${mode}:${slugLabel(label)}`,
      mode,
      canonicalLabel: label,
      category,
      faintnessReason: faintnessReason(obs.length, artifactIds.size),
      sampleSize: obs.length,
      uniqueContributorBand: contributorBand(contributorIds.size),
      relatedSignalIds: relatedSignals.slice(0, 4).map((s) => s.id),
      evidenceNotes: [
        "Below Mean Median Mode central-tendency thresholds — faint structure, not certainty.",
        mode === "starry_eyed"
          ? "Held in Starry-Eyed until promotion thresholds clear."
          : "Gathering in Shadow Fields — outside the modal center.",
      ],
      observedAt,
      methodologyVersion: MMM_METHODOLOGY_VERSION,
      demonstration: false,
    });
  }

  if (findings.length === 0) {
    return emptyMesopicReport(now);
  }

  return mesopicReportSchema.parse({
    runId: options?.runId ?? `live-mesopic-${now}`,
    status: "success",
    windowStart,
    windowEnd,
    findings: findings.slice(0, 12),
    whatMayBeMissing: [
      "Signals that cleared promotion thresholds appear in Mean Median Mode, not Mesopic.",
      ...METHODOLOGY_LIMITATIONS_DEFAULT.slice(0, 2),
    ],
    lastUpdated: now,
    demonstration: false,
  });
}

function slugLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "signal";
}
