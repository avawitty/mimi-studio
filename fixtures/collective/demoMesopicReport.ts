/**
 * Labeled Mesopic Lens demonstration findings.
 * Below Mean Median Mode promotion thresholds — not certainty.
 */

import { mesopicReportSchema } from "../../schemas/collectiveIntelligenceContracts";
import { MMM_METHODOLOGY_VERSION } from "../../services/collective/methodology";

const windowEnd = Date.UTC(2026, 7, 2, 12, 0, 0);
const windowStart = windowEnd - 7 * 24 * 60 * 60 * 1000;

export const DEMO_MESOPIC_REPORT = mesopicReportSchema.parse({
  runId: "demo-mesopic-report-v1",
  status: "demonstration",
  windowStart,
  windowEnd,
  findings: [
    {
      id: "demo:mesopic:starry:veil-stitch",
      mode: "starry_eyed",
      canonicalLabel: "veil stitch",
      category: "motif",
      faintnessReason:
        "Only three consented artifacts mention this motif — below Mean Median Mode promotion thresholds.",
      sampleSize: 3,
      uniqueContributorBand: "2–4",
      relatedSignalIds: ["demo:motif:twilight-archive"],
      evidenceNotes: [
        "Demonstration specimen — faint constellation, not a declared trend.",
        "Held in Starry-Eyed until central-tendency thresholds clear.",
      ],
      observedAt: windowEnd - 36 * 60 * 60 * 1000,
      methodologyVersion: MMM_METHODOLOGY_VERSION,
      demonstration: true,
    },
    {
      id: "demo:mesopic:shadow:archive-hum",
      mode: "shadow_fields",
      canonicalLabel: "archive hum",
      category: "mood",
      faintnessReason:
        "Appears at the edge of attention — low volume, outside the modal center.",
      sampleSize: 2,
      uniqueContributorBand: "2–4",
      relatedSignalIds: [],
      evidenceNotes: [
        "Demonstration specimen — Shadow Fields gathering, not promoted atmosphere.",
      ],
      observedAt: windowEnd - 20 * 60 * 60 * 1000,
      methodologyVersion: MMM_METHODOLOGY_VERSION,
      demonstration: true,
    },
  ],
  whatMayBeMissing: [
    "Live below-threshold aggregates from consented Proscenium corpus.",
    "Promotion rules that lift Mesopic findings into Mean Median Mode when thresholds clear.",
  ],
  lastUpdated: windowEnd,
  demonstration: true,
});

export function emptyMesopicReport(now = Date.now()) {
  const start = now - 7 * 24 * 60 * 60 * 1000;
  return mesopicReportSchema.parse({
    runId: `empty-mesopic-${now}`,
    status: "empty",
    windowStart: start,
    windowEnd: now,
    findings: [],
    whatMayBeMissing: [
      "Consensed public signals below Mean Median Mode thresholds.",
      "A larger, more diverse faint-signal corpus.",
    ],
    lastUpdated: now,
    demonstration: false,
  });
}
