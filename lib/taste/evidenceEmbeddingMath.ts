/**
 * Cosine similarity helpers for taste embedding scoring.
 */
export function averageVectors(vectors: number[][]): number[] | null {
  if (vectors.length === 0) return null;
  const dims = vectors[0]?.length ?? 0;
  if (dims === 0) return null;
  const sum = new Array<number>(dims).fill(0);
  for (const v of vectors) {
    if (v.length !== dims) continue;
    for (let i = 0; i < dims; i++) sum[i] += v[i];
  }
  return sum.map((x) => x / vectors.length);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  const sim = dot / (Math.sqrt(normA) * Math.sqrt(normB));
  return Math.max(0, Math.min(1, (sim + 1) / 2));
}
