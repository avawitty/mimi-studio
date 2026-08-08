import type { TasteCandidateInput } from "../tasteModel/contracts.js";

/**
 * Build embeddable text from a taste candidate when no vector is supplied.
 */
export function candidateTextForEmbedding(candidate: TasteCandidateInput): string | null {
  const parts = [
    candidate.label,
    ...(candidate.tags ?? []),
    ...(candidate.canonicalTaste?.motifs ?? []),
    ...(candidate.canonicalTaste?.palette ?? []),
    ...(candidate.canonicalTaste?.mood ?? []),
    ...(candidate.canonicalTaste?.form ?? []),
  ]
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter(Boolean);

  const text = parts.join(" ").trim();
  if (!text) return null;
  return text.slice(0, 8000);
}

export function snapshotHasEmbeddingCentroid(
  snapshot: { diagnostics?: { embeddingCentroid?: number[] } },
): boolean {
  const centroid = snapshot.diagnostics?.embeddingCentroid;
  return Array.isArray(centroid) && centroid.length > 0;
}

export function shouldEnrichCandidateEmbedding(
  candidate: TasteCandidateInput,
  snapshot: { diagnostics?: { embeddingCentroid?: number[] } },
): boolean {
  if (candidate.embedding?.length) return false;
  if (!snapshotHasEmbeddingCentroid(snapshot)) return false;
  return candidateTextForEmbedding(candidate) !== null;
}
