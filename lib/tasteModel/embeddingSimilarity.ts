/**
 * Deterministic embedding similarity for taste candidate scoring.
 * Uses real vectors when provided; otherwise hash-embeds labels/tags.
 */
import type { TasteCandidateInput, TasteModelSnapshot } from './contracts';
import { cosineSimilarity, embeddingsCompatible } from '../embeddingMath';
import { embeddingSpacesCompatible } from '../../schemas/embeddingContracts';

const HASH_EMBED_DIM = 48;

function fnv1aHash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function normalizeVector(vec: number[]): number[] {
  const mag = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
  if (mag === 0) return vec;
  return vec.map((v) => v / mag);
}

/** Deterministic bag-of-tokens hash embedding for label/text similarity. */
export function hashEmbed(text: string, dims = HASH_EMBED_DIM): number[] {
  const normalized = text.trim().toLowerCase();
  const vec = new Array<number>(dims).fill(0);
  if (!normalized) return vec;

  const tokens = normalized.split(/[^a-z0-9]+/).filter((t) => t.length > 1);
  for (const token of tokens) {
    const h = fnv1aHash(token);
    const idx = h % dims;
    const sign = (h & 1) === 0 ? 1 : -1;
    vec[idx] += sign;
  }
  return normalizeVector(vec);
}

function collectCandidateText(candidate: TasteCandidateInput): string {
  const parts: string[] = [];
  if (candidate.label) parts.push(candidate.label);
  if (candidate.tags?.length) parts.push(...candidate.tags);
  const ct = candidate.canonicalTaste;
  if (ct) {
    parts.push(
      ...(ct.motifs ?? []),
      ...(ct.palette ?? []),
      ...(ct.mood ?? []),
      ...(ct.form ?? []),
    );
  }
  return parts.join(' ');
}

/** Weighted centroid of positive feature labels in the snapshot. */
export function buildTastePreferenceVector(
  snapshot: TasteModelSnapshot,
  dims = HASH_EMBED_DIM,
): number[] {
  const accum = new Array<number>(dims).fill(0);
  let weightSum = 0;

  for (const fw of snapshot.featureWeights) {
    if (fw.signedWeight <= 0) continue;
    const w = fw.signedWeight * fw.confidence;
    const emb = hashEmbed(fw.label, dims);
    for (let i = 0; i < dims; i++) accum[i] += emb[i] * w;
    weightSum += w;
  }

  if (weightSum <= 0) return accum;
  return normalizeVector(accum.map((v) => v / weightSum));
}

export function buildCandidateEmbeddingVector(
  candidate: TasteCandidateInput,
): number[] | null {
  if (candidate.embeddingVector?.length) {
    return candidate.embeddingVector;
  }
  const text = collectCandidateText(candidate);
  if (!text.trim()) return null;
  return hashEmbed(text);
}

function embeddingVectorsCompatible(
  candidate: TasteCandidateInput,
  candidateVec: number[],
  featureVec: number[],
  featureModel?: string,
  featureDims?: number,
): boolean {
  if (
    candidate.embeddingModel &&
    featureModel &&
    candidate.embeddingDims &&
    featureDims
  ) {
    return embeddingSpacesCompatible(
      { model: candidate.embeddingModel, dims: candidate.embeddingDims },
      { model: featureModel, dims: featureDims },
    );
  }
  return embeddingsCompatible(candidateVec, featureVec);
}

/**
 * Cosine similarity between candidate and taste preference (0–1).
 * Falls back to 0.5 when insufficient signal.
 */
export function computeEmbeddingSimilarity(
  candidate: TasteCandidateInput,
  snapshot: TasteModelSnapshot,
): number {
  const candidateVec = buildCandidateEmbeddingVector(candidate);
  if (!candidateVec?.length) return 0.5;

  if (candidate.embeddingVector?.length) {
    const positiveFeatures = snapshot.featureWeights.filter(
      (fw) => fw.signedWeight > 0 && fw.embeddingVector?.length,
    );
    if (positiveFeatures.length > 0) {
      const weighted = positiveFeatures
        .map((fw) => ({
          vec: fw.embeddingVector!,
          w: fw.signedWeight * fw.confidence,
          model: fw.embeddingModel,
          dims: fw.embeddingDims,
        }))
        .filter((entry) =>
          embeddingVectorsCompatible(
            candidate,
            candidateVec,
            entry.vec,
            entry.model,
            entry.dims,
          ),
        );

      if (weighted.length > 0) {
        const dims = candidateVec.length;
        const centroid = new Array<number>(dims).fill(0);
        let weightSum = 0;
        for (const { vec, w } of weighted) {
          for (let i = 0; i < dims; i++) centroid[i] += vec[i] * w;
          weightSum += w;
        }
        if (weightSum > 0) {
          const pref = normalizeVector(centroid.map((v) => v / weightSum));
          const sim = cosineSimilarity(candidateVec, pref);
          return Math.max(0, Math.min(1, (sim + 1) / 2));
        }
      }
    }
  }

  const prefVec = buildTastePreferenceVector(snapshot);
  const prefMag = Math.sqrt(prefVec.reduce((s, v) => s + v * v, 0));
  if (prefMag === 0) return 0.5;

  const sim = cosineSimilarity(candidateVec, prefVec);
  return Math.max(0, Math.min(1, (sim + 1) / 2));
}
