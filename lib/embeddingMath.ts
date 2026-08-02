/**
 * Shared vector math for Mimi embeddings (Scry, Taste Graph, Threads, clusters).
 *
 * Different providers return different widths (e.g. Gemini text-embedding-004 ≈ 768,
 * OpenAI text-embedding-3-small = 1536). Comparing mismatched vectors must return 0
 * rather than NaN / garbage cosine scores.
 */

/** Cosine similarity in [-1, 1]. Returns 0 when either vector is empty or dims differ. */
export function cosineSimilarity(vecA: number[] | undefined | null, vecB: number[] | undefined | null): number {
  if (!vecA?.length || !vecB?.length || vecA.length !== vecB.length) return 0;

  let dotProduct = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < vecA.length; i++) {
    const a = vecA[i];
    const b = vecB[i];
    dotProduct += a * b;
    magA += a * a;
    magB += b * b;
  }

  magA = Math.sqrt(magA);
  magB = Math.sqrt(magB);
  if (magA === 0 || magB === 0) return 0;
  return dotProduct / (magA * magB);
}

/** True when both vectors exist and share the same dimensionality. */
export function embeddingsCompatible(
  vecA: number[] | undefined | null,
  vecB: number[] | undefined | null,
): boolean {
  return Boolean(vecA?.length && vecB?.length && vecA.length === vecB.length);
}

/** Mean vector (center of gravity). Skips empty / mismatched-width members. */
export function meanEmbedding(embeddings: number[][]): number[] {
  const usable = embeddings.filter((v) => Array.isArray(v) && v.length > 0);
  if (!usable.length) return [];

  const dimensions = usable[0].length;
  const sameWidth = usable.filter((v) => v.length === dimensions);
  if (!sameWidth.length) return [];

  const center = new Array(dimensions).fill(0);
  for (const vec of sameWidth) {
    for (let i = 0; i < dimensions; i++) {
      center[i] += vec[i];
    }
  }
  for (let i = 0; i < dimensions; i++) {
    center[i] /= sameWidth.length;
  }
  return center;
}
