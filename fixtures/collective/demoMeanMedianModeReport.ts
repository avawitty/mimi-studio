/**
 * Labeled demonstration Mean Median Mode report.
 * Synthetic ids only — not live collective data.
 */

import { meanMedianModeReportSchema } from "../../schemas/collectiveIntelligenceContracts";
import { buildCentralTendencyProfile } from "../../services/collective/aggregateCentralTendency";
import {
  METHODOLOGY_LIMITATIONS_DEFAULT,
  MMM_METHODOLOGY_VERSION,
} from "../../services/collective/methodology";

const windowEnd = Date.UTC(2026, 7, 2, 12, 0, 0);
const windowStart = windowEnd - 7 * 24 * 60 * 60 * 1000;

const motifProfile = buildCentralTendencyProfile({
  signalId: "demo:motif:twilight-archive",
  windowStart,
  windowEnd,
  unit: "normalized_intensity",
  sourceTypeDiversity: 2,
  observations: [
    { value: 0.4, artifactId: "demo-zine-a", contributorId: "demo-c1", label: "twilight archive" },
    { value: 0.5, artifactId: "demo-zine-b", contributorId: "demo-c2", label: "twilight archive" },
    { value: 0.45, artifactId: "demo-zine-c", contributorId: "demo-c3", label: "twilight archive" },
    { value: 0.9, artifactId: "demo-zine-d", contributorId: "demo-c4", label: "spike motif" },
    { value: 0.42, artifactId: "demo-zine-e", contributorId: "demo-c5", label: "twilight archive" },
    { value: 0.48, artifactId: "demo-zine-f", contributorId: "demo-c6", label: "twilight archive" },
    { value: 0.44, artifactId: "demo-zine-g", contributorId: "demo-c7", label: "twilight archive" },
    { value: 0.46, artifactId: "demo-zine-h", contributorId: "demo-c8", label: "twilight archive" },
    { value: 0.41, artifactId: "demo-zine-i", contributorId: "demo-c9", label: "counter-read" },
    { value: 0.43, artifactId: "demo-zine-j", contributorId: "demo-c10", label: "twilight archive" },
  ],
});

const seekingProfile = buildCentralTendencyProfile({
  signalId: "demo:assistance:aesthetic-interpretation",
  windowStart,
  windowEnd,
  unit: "share_of_artifacts",
  sourceTypeDiversity: 1,
  observations: [
    { value: 0.3, artifactId: "demo-zine-a", contributorId: "demo-c1", label: "aesthetic interpretation" },
    { value: 0.3, artifactId: "demo-zine-b", contributorId: "demo-c2", label: "aesthetic interpretation" },
    { value: 0.25, artifactId: "demo-zine-c", contributorId: "demo-c3", label: "naming" },
    { value: 0.3, artifactId: "demo-zine-d", contributorId: "demo-c4", label: "aesthetic interpretation" },
    { value: 0.28, artifactId: "demo-zine-e", contributorId: "demo-c5", label: "ideation" },
    { value: 0.3, artifactId: "demo-zine-f", contributorId: "demo-c6", label: "aesthetic interpretation" },
    { value: 0.3, artifactId: "demo-zine-g", contributorId: "demo-c7", label: "aesthetic interpretation" },
    { value: 0.22, artifactId: "demo-zine-h", contributorId: "demo-c8", label: "research" },
    { value: 0.3, artifactId: "demo-zine-i", contributorId: "demo-c9", label: "aesthetic interpretation" },
    { value: 0.3, artifactId: "demo-zine-j", contributorId: "demo-c10", label: "aesthetic interpretation" },
  ],
});

export const DEMO_MEAN_MEDIAN_MODE_REPORT = meanMedianModeReportSchema.parse({
  runId: "demo-mmm-report-v1",
  status: "demonstration",
  windowStart,
  windowEnd,
  profiles: [motifProfile, seekingProfile],
  presentAtmosphere:
    "Demonstration atmosphere: a broadly shared twilight-archive motif with a modest spike of contested counter-reads — not live collective data.",
  seekingModes: [
    { label: "aesthetic interpretation", share: 0.7, sampleSize: 7 },
    { label: "naming", share: 0.1, sampleSize: 1 },
    { label: "ideation", share: 0.1, sampleSize: 1 },
    { label: "research", share: 0.1, sampleSize: 1 },
  ],
  cycleNotes: [
    {
      signalId: "demo:motif:twilight-archive",
      position: "Coalescing",
      evidence: [
        "Demonstration fixture only — cycle label is curated for the specimen, not inferred from a live corpus.",
      ],
    },
  ],
  methodologyVersion: MMM_METHODOLOGY_VERSION,
  limitations: [...METHODOLOGY_LIMITATIONS_DEFAULT, "This report is a labeled demonstration specimen."],
  whatMayBeMissing: [
    "Live consented Proscenium corpus (not yet aggregated in this environment).",
    "RSS freshness spine and Mesopic weak-signal promotion (later phases).",
    "Source-type diversity beyond demonstration fixtures.",
  ],
  lastUpdated: windowEnd,
  demonstration: true,
  methodology: {
    version: MMM_METHODOLOGY_VERSION,
    windowStart,
    windowEnd,
    sampleSize: motifProfile.sampleSize,
    uniqueArtifactCount: motifProfile.uniqueArtifactCount,
    limitations: [...METHODOLOGY_LIMITATIONS_DEFAULT],
    exclusions: ["private studio", "Tailor memory", "personal Scry"],
    lastUpdated: windowEnd,
  },
});

export function emptyMeanMedianModeReport(now = Date.now()) {
  const start = now - 7 * 24 * 60 * 60 * 1000;
  return meanMedianModeReportSchema.parse({
    runId: `empty-mmm-${now}`,
    status: "empty",
    windowStart: start,
    windowEnd: now,
    profiles: [],
    presentAtmosphere:
      "Not enough consented public signals in this window for a Mean Median Mode reading.",
    seekingModes: [],
    cycleNotes: [],
    methodologyVersion: MMM_METHODOLOGY_VERSION,
    limitations: [...METHODOLOGY_LIMITATIONS_DEFAULT],
    whatMayBeMissing: [
      "Public artifacts staged on The Proscenium with Mean Median Mode contribution enabled.",
      "A larger, more diverse consented corpus.",
    ],
    lastUpdated: now,
    demonstration: false,
    methodology: {
      version: MMM_METHODOLOGY_VERSION,
      windowStart: start,
      windowEnd: now,
      sampleSize: 0,
      uniqueArtifactCount: 0,
      limitations: [...METHODOLOGY_LIMITATIONS_DEFAULT],
      exclusions: ["private studio", "Tailor memory", "personal Scry"],
      lastUpdated: now,
    },
  });
}
