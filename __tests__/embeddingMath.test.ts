import { describe, expect, it } from "vitest";
import { cosineSimilarity, embeddingsCompatible, meanEmbedding } from "../lib/embeddingMath";

describe("embeddingMath", () => {
  it("returns 1 for identical vectors", () => {
    expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1);
  });

  it("returns 0 for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it("returns 0 on dimension mismatch (gateway vs gemini widths)", () => {
    const geminiish = Array(768).fill(0.01);
    const openaiish = Array(1536).fill(0.01);
    expect(embeddingsCompatible(geminiish, openaiish)).toBe(false);
    expect(cosineSimilarity(geminiish, openaiish)).toBe(0);
  });

  it("returns 0 for empty or missing vectors", () => {
    expect(cosineSimilarity([], [1])).toBe(0);
    expect(cosineSimilarity(null, [1])).toBe(0);
    expect(cosineSimilarity([0, 0], [0, 0])).toBe(0);
  });

  it("computes mean embedding and skips mismatched widths", () => {
    const mean = meanEmbedding([
      [2, 0],
      [0, 2],
      [1, 2, 3], // ignored
    ]);
    expect(mean).toEqual([1, 1]);
  });
});
