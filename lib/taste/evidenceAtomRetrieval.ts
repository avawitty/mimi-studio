/**
 * Semantic retrieval for Evidence Atoms via embeddingRef vectors.
 * Server-side (Firebase Admin) + pure ranking helpers for tests.
 */
import type { EvidenceAtom, TasteScope } from "../../types";
import { embedGatewayText } from "../ai/generate.js";
import { cosineSimilarity, embeddingsCompatible } from "../embeddingMath.js";
import { classifyEvidenceAtomQueryError } from "./evidenceAtomQuery.js";
import { EVIDENCE_ATOM_EMBEDDING_COLLECTION } from "./evidenceAtomEmbedding.js";

export const EVIDENCE_SEMANTIC_CANDIDATE_CAP = 200;
export const MIN_EVIDENCE_SEMANTIC_SCORE = 0.18;

export type EvidenceAtomRankResult = {
  atom: EvidenceAtom;
  score: number;
};

type AdminDb = {
  collection: (path: string) => any;
};

type SearchOptions = {
  context?: TasteScope;
  projectId?: string;
  maxResults?: number;
  candidateCap?: number;
  minScore?: number;
};

function atomMatchesScope(atom: EvidenceAtom, context?: TasteScope): boolean {
  if (!context) return true;
  if (!atom.contextScope || atom.contextScope === "global") return true;
  return atom.contextScope === context;
}

function atomMatchesProject(atom: EvidenceAtom, projectId?: string): boolean {
  if (!projectId) return true;
  if (atom.projectId === projectId) return true;
  const meta = atom.sourceMetadata as { tailorProjectId?: string };
  return meta.tailorProjectId === projectId;
}

/** Text used when ranking atoms without stored vectors (keyword fallback). */
export function evidenceAtomSearchText(atom: EvidenceAtom): string {
  if (atom.userReaction === "rejected") return "";
  return (atom.semanticDescription || atom.originalSource || "").trim();
}

/** Pure cosine rank — used by tests and server search. */
export function rankEvidenceAtomsByEmbedding(
  queryEmbedding: number[],
  atoms: EvidenceAtom[],
  embeddings: Map<string, number[]>,
  options: { minScore?: number; maxResults?: number } = {},
): EvidenceAtomRankResult[] {
  const minScore = options.minScore ?? MIN_EVIDENCE_SEMANTIC_SCORE;
  const maxResults = options.maxResults ?? 12;
  const ranked: EvidenceAtomRankResult[] = [];

  for (const atom of atoms) {
    if (atom.userReaction === "rejected" || !atom.embeddingRef) continue;
    const vector = embeddings.get(atom.id);
    if (!vector || !embeddingsCompatible(queryEmbedding, vector)) continue;
    const score = cosineSimilarity(queryEmbedding, vector);
    if (score < minScore) continue;
    ranked.push({ atom, score });
  }

  return ranked
    .sort((a, b) => b.score - a.score || b.atom.updatedAt - a.atom.updatedAt)
    .slice(0, maxResults);
}

export async function loadEvidenceAtomEmbedding(
  db: AdminDb,
  userId: string,
  atomId: string,
): Promise<number[] | null> {
  try {
    const snap = await db
      .collection("users")
      .doc(userId)
      .collection(EVIDENCE_ATOM_EMBEDDING_COLLECTION)
      .doc(atomId)
      .get();
    if (!snap.exists) return null;
    const data = snap.data() as { embedding?: number[] };
    return Array.isArray(data.embedding) && data.embedding.length ? data.embedding : null;
  } catch {
    return null;
  }
}

async function loadCandidateAtoms(
  db: AdminDb,
  userId: string,
  options: SearchOptions,
): Promise<EvidenceAtom[]> {
  const cap = options.candidateCap ?? EVIDENCE_SEMANTIC_CANDIDATE_CAP;
  try {
    let queryRef = db
      .collection("users")
      .doc(userId)
      .collection("evidenceAtoms");

    if (options.projectId) {
      queryRef = queryRef
        .where("projectId", "==", options.projectId)
        .where("tasteImpact", "==", true)
        .orderBy("createdAt", "desc")
        .limit(cap);
    } else {
      queryRef = queryRef.orderBy("createdAt", "desc").limit(cap);
    }

    const snap = await queryRef.get();
    return snap.docs
      .map((d: { data: () => unknown }) => d.data() as EvidenceAtom)
      .filter((atom: EvidenceAtom) => atom.tasteImpact !== false)
      .filter((atom: EvidenceAtom) => Boolean(atom.embeddingRef))
      .filter((atom: EvidenceAtom) => atomMatchesScope(atom, options.context))
      .filter((atom: EvidenceAtom) => atomMatchesProject(atom, options.projectId));
  } catch (error) {
    const classified = classifyEvidenceAtomQueryError(error);
    console.warn("MIMI // Semantic retrieval candidate query failed:", classified.code);
    throw classified;
  }
}

/**
 * Semantic search over a user's embedded evidence atoms.
 * Returns [] when query or apiKey is missing, or when no vectors match.
 */
export async function searchEvidenceAtomsSemantic(
  db: AdminDb,
  userId: string,
  queryText: string,
  apiKey: string,
  options: SearchOptions = {},
): Promise<EvidenceAtomRankResult[]> {
  const trimmed = queryText.trim().slice(0, 8000);
  if (!trimmed || !apiKey || !db || !userId || userId === "ghost") return [];

  const candidates = await loadCandidateAtoms(db, userId, options);
  if (!candidates.length) return [];

  const embedResult = await embedGatewayText({ value: trimmed, apiKey });
  if (!embedResult.embedding?.length) return [];

  const embeddings = new Map<string, number[]>();
  await Promise.all(
    candidates.map(async (atom) => {
      const vector = await loadEvidenceAtomEmbedding(db, userId, atom.id);
      if (vector) embeddings.set(atom.id, vector);
    }),
  );

  return rankEvidenceAtomsByEmbedding(embedResult.embedding, candidates, embeddings, {
    minScore: options.minScore,
    maxResults: options.maxResults,
  });
}
