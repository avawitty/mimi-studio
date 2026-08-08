import { describe, expect, it } from "vitest";
import { averageVectors, cosineSimilarity } from "../lib/taste/evidenceEmbeddingMath";

describe("evidenceEmbeddingMath", () => {
  it("computes cosine similarity for identical vectors", () => {
    const v = [1, 0, 0];
    expect(cosineSimilarity(v, v)).toBeCloseTo(1, 5);
  });

  it("averages embedding vectors", () => {
    const avg = averageVectors([
      [1, 0],
      [0, 1],
    ]);
    expect(avg).toEqual([0.5, 0.5]);
  });
});
