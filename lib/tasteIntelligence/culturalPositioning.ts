/**
 * Cultural positioning from aggregate collective signals only.
 */
import type { CulturalPositioningReport } from "../../schemas/tasteIntelligenceContracts.js";
import type { TasteModelSnapshot } from "../tasteModel/contracts.js";

const MIN_CONTRIBUTOR_BAND = 5;
const METHODOLOGY_VERSION = "cultural-positioning-v1";

export interface AggregateSignal {
  signal: string;
  contributorBand: number;
  windowCount: number;
}

export interface CulturalPositioningInput {
  ownerId: string;
  snapshot: TasteModelSnapshot;
  aggregateSignals: AggregateSignal[];
  windowStart: number;
  windowEnd: number;
}

export function buildCulturalPositioningReport(
  input: CulturalPositioningInput,
): CulturalPositioningReport | null {
  const eligible = input.aggregateSignals.filter(
    (s) => s.contributorBand >= MIN_CONTRIBUTOR_BAND,
  );
  if (eligible.length === 0) {
    return null;
  }

  const personalFeatures = new Set(
    input.snapshot.featureWeights.map((f) => f.label.toLowerCase()),
  );

  const widelyCirculating = eligible
    .filter((s) => s.windowCount >= 50)
    .map((s) => s.signal)
    .slice(0, 10);

  const emerging = eligible
    .filter((s) => s.windowCount >= 10 && s.windowCount < 50)
    .map((s) => s.signal)
    .slice(0, 8);

  const saturated = eligible
    .filter((s) => s.windowCount >= 100)
    .map((s) => s.signal)
    .slice(0, 6);

  const deeplyPersonal = input.snapshot.featureWeights
    .filter(
      (f) =>
        f.signedWeight > 0.35 &&
        !widelyCirculating.some((w) =>
          w.toLowerCase().includes(f.label.toLowerCase()),
        ),
    )
    .map((f) => f.label)
    .slice(0, 8);

  const unusualCombinations = input.snapshot.interactionRules
    .filter((r) => r.relation === "contrasts" && r.confidence > 0.5)
    .map((r) => r.featureIds.join(" + "))
    .slice(0, 6);

  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    ownerId: input.ownerId,
    sourceSnapshotId: input.snapshot.id,
    collectiveWindowStart: input.windowStart,
    collectiveWindowEnd: input.windowEnd,
    deeplyPersonalSignals: deeplyPersonal,
    widelyCirculatingSignals: widelyCirculating,
    emergingCulturalSignals: emerging,
    saturatedSignals: saturated,
    unusualCombinations,
    possibleInfluenceLines: [],
    contradictions: [],
    sampleSizeBand: `${eligible.length} aggregate signals`,
    methodologyVersion: METHODOLOGY_VERSION,
    limitations: [
      "Uses consented aggregate signals only — no identifiable individuals.",
      "Popularity is not converted into a quality score.",
      personalFeatures.size < 3
        ? "Insufficient personal evidence for strong positioning claims."
        : "Personal and collective signals are kept distinct.",
    ],
    createdAt: now,
  };
}
