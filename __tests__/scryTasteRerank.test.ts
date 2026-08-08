import { describe, expect, it } from "vitest";
import { createEmptyScryRun, type ResearchResult } from "../schemas/scryContracts";
import type { TasteModelSnapshot } from "../lib/tasteModel/contracts";
import {
  applyTasteRerankToScryRun,
  blendCentroidIntoEmbeddingScore,
  extractFeatureIdsFromText,
  lexicalOverlapScore,
  mergeTasteRankedHits,
  researchResultToTasteCandidate,
  scryRunHasTasteRanking,
} from "../lib/scry/tasteScryRerank";

function testSnapshot(): TasteModelSnapshot {
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
    featureWeights: [
      {
        featureId: "good",
        label: "good",
        category: "visual",
        sourceType: "observation",
        signedWeight: 0.8,
        confidence: 0.9,
        evidenceMass: 1,
        explicitMass: 1,
        implicitMass: 0,
        trend: "stable",
        contextScopes: ["persistent"],
        sourceIds: [],
      },
      {
        featureId: "bad",
        label: "bad",
        category: "visual",
        sourceType: "observation",
        signedWeight: -0.7,
        confidence: 0.8,
        evidenceMass: 1,
        explicitMass: 1,
        implicitMass: 0,
        trend: "stable",
        contextScopes: ["persistent"],
        sourceIds: [],
      },
    ],
    interactionRules: [],
    trajectory: {
      emergingFeatureIds: ["good"],
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
    },
    stale: false,
  };
}

describe("scry taste rerank bridge", () => {
  it("derives lexical overlap from query tokens", () => {
    expect(lexicalOverlapScore("neon rebellion", "Neon rebellion against greige")).toBeGreaterThan(
      0.4,
    );
    expect(lexicalOverlapScore("", "anything")).toBe(0);
  });

  it("blends query centroid similarity into embedding score", () => {
    const snapshot = testSnapshot();
    snapshot.diagnostics.embeddingCentroid = [1, 0, 0];
    const boosted = blendCentroidIntoEmbeddingScore(0.2, snapshot, [1, 0, 0]);
    expect(boosted).toBeGreaterThan(0.2);
    expect(blendCentroidIntoEmbeddingScore(0.5, snapshot, undefined)).toBe(0.5);
  });

  it("maps archive hits to taste candidates with feature ids", () => {
    const snapshot = testSnapshot();
    const hit: ResearchResult = {
      id: "a1",
      title: "good aesthetic specimen",
      snippet: "mineral light",
      sourceLane: "personalMemory",
    };
    const candidate = researchResultToTasteCandidate(hit, "good aesthetic", snapshot);
    expect(candidate.lane).toBe("archive");
    expect(candidate.featureIds).toContain("good");
    expect(candidate.embeddingScore).toBeGreaterThan(0);
  });

  it("reranks within lanes and attaches whyMatched", () => {
    const snapshot = testSnapshot();
    const run = {
      ...createEmptyScryRun("good aesthetic"),
      sources: {
        personalMemory: [
          {
            id: "low",
            title: "unrelated archive note",
            snippet: "office memo",
            sourceLane: "personalMemory" as const,
          },
          {
            id: "high",
            title: "good aesthetic specimen",
            snippet: "good mineral light",
            sourceLane: "personalMemory" as const,
            similarity: 0.42,
          },
        ],
        web: [] as ResearchResult[],
        shadowMemory: [] as ResearchResult[],
      },
    };

    const ranked = applyTasteRerankToScryRun(run, { snapshot, refusals: [] });
    expect(ranked.sources.personalMemory[0]?.id).toBe("high");
    expect(ranked.sources.personalMemory[0]?.whyMatched?.linkedFeatureIds).toContain(
      "good",
    );
    expect(typeof ranked.sources.personalMemory[0]?.tasteScore).toBe("number");
    expect(scryRunHasTasteRanking(ranked)).toBe(true);
  });

  it("merges hits by taste score when present", () => {
    const run = {
      ...createEmptyScryRun("test"),
      sources: {
        personalMemory: [
          {
            id: "a",
            title: "A",
            sourceLane: "personalMemory" as const,
            tasteScore: 0.2,
          },
        ],
        web: [
          {
            id: "b",
            title: "B",
            sourceLane: "web" as const,
            tasteScore: 0.9,
          },
        ],
        shadowMemory: [] as ResearchResult[],
      },
    };
    const merged = mergeTasteRankedHits(run);
    expect(merged[0]?.id).toBe("b");
  });

  it("extracts feature ids from snapshot labels in text", () => {
    const snapshot = testSnapshot();
    const ids = extractFeatureIdsFromText(snapshot, "This has good vibes");
    expect(ids).toContain("good");
  });
});
