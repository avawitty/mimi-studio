import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebaseInit";
import type { EvidenceAtom } from "../../lib/taste/types";
import {
  createEvidenceAtomSchema,
  type CreateEvidenceAtomInput,
} from "../../lib/taste/evidenceAtomSchema";

const evidenceCollection = (userId: string) =>
  collection(db, "users", userId, "evidenceAtoms");

const evidenceRef = (userId: string, atomId: string) =>
  doc(db, "users", userId, "evidenceAtoms", atomId);

function createAtomId(): string {
  return `ev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function createEvidenceAtom(
  userId: string,
  input: CreateEvidenceAtomInput,
): Promise<EvidenceAtom> {
  if (!userId || userId === "ghost") {
    throw new Error("A signed-in Mimi user is required to create evidence.");
  }

  const parsed = createEvidenceAtomSchema.parse(input);
  const now = Date.now();
  const id = createAtomId();

  const atom: EvidenceAtom = {
    id,
    userId,
    projectId: parsed.projectId,
    contextId: parsed.contextId,
    kind: parsed.kind,
    sourceType: parsed.sourceType as EvidenceAtom["sourceType"],
    originalSource: parsed.originalSource,
    title: parsed.title,
    assetUrl: parsed.assetUrl,
    thumbnailUrl: parsed.thumbnailUrl,
    sourceMetadata: parsed.sourceMetadata,
    extractedText: parsed.extractedText,
    semanticDescription: parsed.semanticDescription,
    structuredAttributes: [],
    embeddingRef: parsed.embeddingRef,
    userReaction: "suggested",
    confidence: parsed.confidence,
    stabilityClass: parsed.stabilityClass,
    processingState: parsed.processingState,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(evidenceRef(userId, id), atom);
  return atom;
}

export async function getEvidenceAtom(
  userId: string,
  atomId: string,
): Promise<EvidenceAtom | null> {
  const snapshot = await getDoc(evidenceRef(userId, atomId));
  return snapshot.exists() ? (snapshot.data() as EvidenceAtom) : null;
}

export async function updateEvidenceAtom(
  userId: string,
  atomId: string,
  patch: Partial<Omit<EvidenceAtom, "id" | "userId" | "createdAt">>,
): Promise<void> {
  await updateDoc(evidenceRef(userId, atomId), {
    ...patch,
    updatedAt: Date.now(),
  });
}

export async function listRecentEvidenceAtoms(
  userId: string,
  count = 40,
): Promise<EvidenceAtom[]> {
  const snapshot = await getDocs(
    query(evidenceCollection(userId), orderBy("createdAt", "desc"), limit(count)),
  );
  return snapshot.docs.map((item) => item.data() as EvidenceAtom);
}
