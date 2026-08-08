import { describe, expect, it, vi, beforeEach } from "vitest";
import { enrichCandidateForScoring } from "../lib/taste/enrichCandidateEmbedding";
import type { TasteModelSnapshot } from "../lib/tasteModel/contracts";

vi.mock("../services/embedClient", () => ({
  embedTextForScoring: vi.fn(async (text: string) =>
    text.includes("neon") ? [0.5, 0.5, 0.5] : null,
  ),
}));

function snapshotWithCentroid(): TasteModelSnapshot {
  return {
    schemaVersion: 1,
    modelVersion: "mimi-taste-model-v1",
    id: "snap-1",
    userId: "u1",
    scope: "global",
    compiledAt: Date.now(),
    sourceWindow: {
      oldestEventAt: Date.now() - 86_400_000,
      newestEventAt: Date.now(),
    },
    featureWeights: [],
    interactionRules: [],
    trajectory: {
      emergingFeatureIds: [],
      strengtheningFeatureIds: [],
      stableFeatureIds: [],
      decliningFeatureIds: [],
    },
    diagnostics: {
      evidenceCount: 1,
      eventCount: 1,
      explicitEventCount: 1,
      contradictionCount: 0,
      lowConfidenceFeatureIds: [],
      missingDataWarnings: [],
      embeddingCentroid: [0.2, 0.2, 0.2],
      embeddingSampleCount: 3,
    },
    stale: false,
  };
}

describe("enrichCandidateForScoring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("attaches embedding when centroid exists and embed succeeds", async () => {
    const enriched = await enrichCandidateForScoring(
      { id: "c1", label: "neon rebellion" },
      snapshotWithCentroid(),
    );
    expect(enriched.embedding).toEqual([0.5, 0.5, 0.5]);
  });

  it("returns original candidate when embed fails", async () => {
    const candidate = { id: "c1", label: "muted greige" };
    const enriched = await enrichCandidateForScoring(candidate, snapshotWithCentroid());
    expect(enriched).toEqual(candidate);
    expect(enriched.embedding).toBeUndefined();
  });
});
