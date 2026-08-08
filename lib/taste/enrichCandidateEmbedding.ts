import type { TasteCandidateInput, TasteModelSnapshot } from "../tasteModel/contracts.js";
import { embedTextForScoring } from "../../services/embedClient.js";
import {
  candidateTextForEmbedding,
  shouldEnrichCandidateEmbedding,
} from "./candidateEmbeddingText.js";

/**
 * Attach an embedding vector when the snapshot has a centroid but the candidate lacks one.
 */
export async function enrichCandidateForScoring(
  candidate: TasteCandidateInput,
  snapshot: TasteModelSnapshot,
): Promise<TasteCandidateInput> {
  if (!shouldEnrichCandidateEmbedding(candidate, snapshot)) return candidate;

  const text = candidateTextForEmbedding(candidate);
  if (!text) return candidate;

  const embedding = await embedTextForScoring(text);
  if (!embedding) return candidate;

  return { ...candidate, embedding };
}
