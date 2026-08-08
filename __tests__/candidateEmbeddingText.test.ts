import { describe, expect, it } from "vitest";
import {
  candidateTextForEmbedding,
  shouldEnrichCandidateEmbedding,
  snapshotHasEmbeddingCentroid,
} from "../lib/taste/candidateEmbeddingText";
import type { TasteCandidateInput } from "../lib/tasteModel/contracts";

describe("candidateEmbeddingText", () => {
  it("joins label, tags, and canonical taste fields", () => {
    const candidate: TasteCandidateInput = {
      id: "c1",
      label: "Mineral light",
      tags: ["editorial"],
      canonicalTaste: {
        motifs: ["lace"],
        palette: ["ivory"],
        mood: ["quiet"],
        form: ["grid"],
      },
    };
    expect(candidateTextForEmbedding(candidate)).toContain("Mineral light");
    expect(candidateTextForEmbedding(candidate)).toContain("lace");
    expect(candidateTextForEmbedding(candidate)).toContain("ivory");
  });

  it("returns null when no embeddable text", () => {
    expect(candidateTextForEmbedding({ id: "empty" })).toBeNull();
  });

  it("detects centroid and enrichment need", () => {
    const snapshot = {
      diagnostics: { embeddingCentroid: [0.1, 0.2, 0.3] },
    };
    expect(snapshotHasEmbeddingCentroid(snapshot)).toBe(true);
    expect(
      shouldEnrichCandidateEmbedding({ id: "c1", label: "test" }, snapshot),
    ).toBe(true);
    expect(
      shouldEnrichCandidateEmbedding(
        { id: "c1", label: "test", embedding: [0.1, 0.2] },
        snapshot,
      ),
    ).toBe(false);
  });
});
