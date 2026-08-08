/**
 * Taste-aware hybrid search reranking for Scry and Shadow Memory.
 */
import type { TasteRefusal, TasteSaturationState } from "../../schemas/tasteIntelligenceContracts.js";
import type { TasteModelSnapshot } from "../tasteModel/contracts.js";
import { computeRefusalPenalty } from "./refusals.js";
import { saturationPenalty } from "./saturation.js";
import { SEARCH_BLEND_WEIGHTS } from "./constants.js";

export interface TasteSearchCandidate {
  id: string;
  lane: "archive" | "shadow_memory" | "web" | "reading" | "approved_memory";
  embeddingScore: number;
  lexicalScore: number;
  memoryMatchScore: number;
  graphProximityScore: number;
  projectRelevanceScore: number;
  recencyScore: number;
  featureIds: string[];
  evidenceIds: string[];
  label?: string;
}

export interface TasteSearchMatchReason {
  semanticSimilarity: number;
  linkedFeatureIds: string[];
  linkedCreativeLawIds: string[];
  contextFit: number;
  trajectoryFit: number;
  contradiction?: string;
  sourceLane: TasteSearchCandidate["lane"];
  provenanceIds: string[];
}

export interface TasteSearchResult {
  candidate: TasteSearchCandidate;
  finalScore: number;
  whyMatched: TasteSearchMatchReason;
}

export interface TasteSearchInput {
  snapshot: TasteModelSnapshot | null;
  refusals: TasteRefusal[];
  saturationStates: TasteSaturationState[];
  candidates: TasteSearchCandidate[];
  projectFeatureIds?: string[];
}

export function rerankTasteSearchResults(
  input: TasteSearchInput,
): TasteSearchResult[] {
  const { snapshot, refusals, saturationStates, candidates, projectFeatureIds } =
    input;

  const saturationMap = new Map(
    saturationStates.map((s) => [s.featureId, s]),
  );

  const results: TasteSearchResult[] = candidates.map((candidate) => {
    let preferenceBoost = 0;
    let trajectoryFit = 0;
    const linkedFeatureIds: string[] = [];

    if (snapshot) {
      for (const fid of candidate.featureIds) {
        const fw = snapshot.featureWeights.find((f) => f.featureId === fid);
        if (fw) {
          preferenceBoost += fw.signedWeight * fw.confidence * 0.1;
          linkedFeatureIds.push(fid);
          if (snapshot.trajectory.emergingFeatureIds.includes(fid)) {
            trajectoryFit += 0.15;
          }
        }
      }
    }

    const refusal = computeRefusalPenalty(
      refusals,
      { id: candidate.id, featureIds: candidate.featureIds },
      "persistent",
    );

    let satPenalty = 0;
    for (const fid of candidate.featureIds) {
      const state = saturationMap.get(fid);
      if (state) satPenalty += saturationPenalty(state);
    }

    const projectBoost =
      projectFeatureIds &&
      candidate.featureIds.some((f) => projectFeatureIds.includes(f))
        ? 0.12
        : 0;

    const base =
      candidate.embeddingScore * SEARCH_BLEND_WEIGHTS.embedding +
      candidate.lexicalScore * SEARCH_BLEND_WEIGHTS.lexical +
      candidate.memoryMatchScore * SEARCH_BLEND_WEIGHTS.memory +
      candidate.graphProximityScore * SEARCH_BLEND_WEIGHTS.graphProximity +
      candidate.projectRelevanceScore * SEARCH_BLEND_WEIGHTS.projectRelevance +
      preferenceBoost * SEARCH_BLEND_WEIGHTS.preference +
      trajectoryFit * SEARCH_BLEND_WEIGHTS.trajectory +
      candidate.recencyScore * SEARCH_BLEND_WEIGHTS.recency +
      projectBoost;

    const finalScore = Math.max(
      0,
      base -
        refusal.penalty * SEARCH_BLEND_WEIGHTS.refusalPenalty -
        satPenalty,
    );

    return {
      candidate,
      finalScore,
      whyMatched: {
        semanticSimilarity: candidate.embeddingScore,
        linkedFeatureIds,
        linkedCreativeLawIds: [] as string[],
        contextFit: candidate.projectRelevanceScore,
        trajectoryFit,
        sourceLane: candidate.lane,
        provenanceIds: candidate.evidenceIds,
        ...(refusal.matchedRefusalIds.length > 0
          ? { contradiction: "Conflicts with active refusal rules." }
          : {}),
      },
    };
  });

  results.sort((a, b) => b.finalScore - a.finalScore);
  return results;
}

export interface EmbeddingCompatibilityState {
  compatible: boolean;
  currentModel?: string;
  indexedModel?: string;
  reindexRequired: boolean;
  message: string;
}

export function checkEmbeddingCompatibility(
  currentModel: string | null,
  indexedModel: string | null,
): EmbeddingCompatibilityState {
  if (!indexedModel) {
    return {
      compatible: false,
      currentModel: currentModel ?? undefined,
      indexedModel: undefined,
      reindexRequired: true,
      message: "Shadow Memory index is empty. Reindex required before semantic search.",
    };
  }
  if (!currentModel || currentModel !== indexedModel) {
    return {
      compatible: false,
      currentModel: currentModel ?? undefined,
      indexedModel,
      reindexRequired: true,
      message: `Embedding model mismatch (current: ${currentModel ?? "unknown"}, indexed: ${indexedModel}). Reindex in progress or required.`,
    };
  }
  return {
    compatible: true,
    currentModel,
    indexedModel,
    reindexRequired: false,
    message: "Embeddings compatible.",
  };
}
