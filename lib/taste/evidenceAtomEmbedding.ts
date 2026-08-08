/**
 * Server-side embedding storage for Evidence Atoms.
 * Vectors live in a sibling subcollection; atoms store a stable ref path.
 */
import { embedGatewayText } from "../ai/generate.js";

type AdminDb = any;

export const EVIDENCE_ATOM_EMBEDDING_COLLECTION = "evidenceAtomEmbeddings";

/** Stable Firestore path stored on the atom's embeddingRef field. */
export function evidenceAtomEmbeddingRef(userId: string, atomId: string): string {
  return `users/${userId}/${EVIDENCE_ATOM_EMBEDDING_COLLECTION}/${atomId}`;
}

function embeddingDocRef(db: AdminDb, userId: string, atomId: string) {
  return db
    .collection("users")
    .doc(userId)
    .collection(EVIDENCE_ATOM_EMBEDDING_COLLECTION)
    .doc(atomId);
}

/**
 * Embed semantic text and persist vector for retrieval.
 * Returns embeddingRef path on success.
 */
export async function embedAndStoreEvidenceAtom(
  db: AdminDb,
  userId: string,
  atomId: string,
  text: string,
  apiKey: string,
): Promise<string | undefined> {
  const trimmed = text.trim().slice(0, 8000);
  if (!trimmed || !db || !userId || !atomId) return undefined;

  const result = await embedGatewayText({ value: trimmed, apiKey });
  if (!result.embedding?.length) return undefined;

  const embeddingRef = evidenceAtomEmbeddingRef(userId, atomId);
  const now = Date.now();

  await embeddingDocRef(db, userId, atomId).set({
    atomId,
    model: result.model,
    dims: result.dims,
    embedding: result.embedding,
    sourceText: trimmed.slice(0, 500),
    updatedAt: now,
  });

  return embeddingRef;
}
