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

export interface BackfillEvidenceAtomEmbeddingsResult {
  scanned: number;
  embedded: number;
  skipped: number;
  failed: number;
}

/**
 * Backfill embeddingRef for analyzed atoms that predate embedding storage.
 * Requires funded gateway key — intended for server/admin maintenance paths.
 */
export async function backfillEvidenceAtomEmbeddings(
  db: AdminDb,
  userId: string,
  apiKey: string,
  options: { projectId?: string; limit?: number } = {},
): Promise<BackfillEvidenceAtomEmbeddingsResult> {
  const result: BackfillEvidenceAtomEmbeddingsResult = {
    scanned: 0,
    embedded: 0,
    skipped: 0,
    failed: 0,
  };

  if (!db || !userId || !apiKey) return result;

  const cap = options.limit ?? 50;
  let queryRef = db
    .collection("users")
    .doc(userId)
    .collection("evidenceAtoms")
    .where("processingState", "==", "analyzed")
    .orderBy("createdAt", "desc")
    .limit(cap);

  if (options.projectId) {
    queryRef = db
      .collection("users")
      .doc(userId)
      .collection("evidenceAtoms")
      .where("projectId", "==", options.projectId)
      .where("tasteImpact", "==", true)
      .orderBy("createdAt", "desc")
      .limit(cap);
  }

  const snap = await queryRef.get();
  for (const docSnap of snap.docs) {
    result.scanned += 1;
    const atom = docSnap.data() as {
      id?: string;
      embeddingRef?: string;
      semanticDescription?: string;
      originalSource?: string;
    };
    const atomId = atom.id || docSnap.id;

    if (atom.embeddingRef) {
      result.skipped += 1;
      continue;
    }

    const text = (atom.semanticDescription || atom.originalSource || "").trim();
    if (!text) {
      result.skipped += 1;
      continue;
    }

    try {
      const embeddingRef = await embedAndStoreEvidenceAtom(db, userId, atomId, text, apiKey);
      if (!embeddingRef) {
        result.failed += 1;
        continue;
      }
      await db
        .collection("users")
        .doc(userId)
        .collection("evidenceAtoms")
        .doc(atomId)
        .update({ embeddingRef, updatedAt: Date.now() });
      result.embedded += 1;
    } catch {
      result.failed += 1;
    }
  }

  return result;
}
