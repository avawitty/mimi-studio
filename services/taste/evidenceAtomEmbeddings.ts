import { collection, doc, getDocs, limit, query } from "firebase/firestore";
import { db } from "../firebaseInit";

export const EVIDENCE_ATOM_EMBEDDINGS_COLLECTION = "evidenceAtomEmbeddings";

export type EvidenceAtomEmbeddingDoc = {
  vector: number[];
  model: string;
  dims: number;
  updatedAt: number;
};

export function evidenceAtomEmbeddingRef(userId: string, atomId: string) {
  return doc(db, "users", userId, EVIDENCE_ATOM_EMBEDDINGS_COLLECTION, atomId);
}

export function evidenceAtomEmbeddingsCol(userId: string) {
  return collection(db, "users", userId, EVIDENCE_ATOM_EMBEDDINGS_COLLECTION);
}

/** Load recent embedding vectors for taste centroid computation (client). */
export async function loadRecentEvidenceEmbeddings(
  userId: string,
  maxResults = 32,
): Promise<number[][]> {
  if (!userId || userId === "ghost") return [];
  try {
    const snap = await getDocs(
      query(evidenceAtomEmbeddingsCol(userId), limit(maxResults)),
    );
    return snap.docs
      .map((d) => (d.data() as EvidenceAtomEmbeddingDoc).vector)
      .filter((v): v is number[] => Array.isArray(v) && v.length > 0);
  } catch {
    return [];
  }
}
