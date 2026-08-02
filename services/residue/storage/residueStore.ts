/**
 * Firestore persistence for Residue runs and related records.
 * Deleting an artifact must not delete the underlying run unless explicitly requested.
 */

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  where,
  type Firestore,
} from "firebase/firestore";
import { RESIDUE_COLLECTION, RESIDUE_PROMPT_VERSION, RESIDUE_SCHEMA_VERSION } from "../constants";
import {
  residueRunDocumentSchema,
  type CulturalResidueResult,
  type EmotionalResidueResult,
  type ResidueMode,
  type ResidueRunDocument,
  type RetentionPolicy,
} from "../validation";

export type ResidueResultDocument = CulturalResidueResult | EmotionalResidueResult;

function runsCol(db: Firestore, uid: string) {
  return collection(db, "users", uid, RESIDUE_COLLECTION.runs);
}

function artifactsCol(db: Firestore, uid: string) {
  return collection(db, "users", uid, RESIDUE_COLLECTION.artifacts);
}

function memoryProposalsCol(db: Firestore, uid: string) {
  return collection(db, "users", uid, RESIDUE_COLLECTION.memoryProposals);
}

export function buildResidueRunDocument(input: {
  runId: string;
  ownerUid: string;
  mode: ResidueMode;
  status: ResidueRunDocument["status"];
  retention: RetentionPolicy;
  consentToStore: boolean;
  inputHash: string;
  queryOrExperience: string;
  sourceCount: number;
  warnings?: string[];
  confidenceSummary?: ResidueRunDocument["confidenceSummary"];
  sensitive?: boolean;
  errorSummary?: string;
  createdAt?: string;
  updatedAt?: string;
}): ResidueRunDocument {
  const now = new Date().toISOString();
  return residueRunDocumentSchema.parse({
    runId: input.runId,
    ownerUid: input.ownerUid,
    mode: input.mode,
    status: input.status,
    retention: input.retention,
    consentToStore: input.consentToStore,
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
    inputHash: input.inputHash,
    schemaVersion: RESIDUE_SCHEMA_VERSION,
    promptVersion: RESIDUE_PROMPT_VERSION,
    queryOrExperience: input.sensitive
      ? "[redacted-emotional-input]"
      : input.queryOrExperience,
    sourceCount: input.sourceCount,
    warnings: input.warnings ?? [],
    confidenceSummary: input.confidenceSummary,
    sensitive: input.sensitive ?? input.mode === "emotional",
    errorSummary: input.errorSummary,
  });
}

export async function saveResidueRun(
  db: Firestore,
  docData: ResidueRunDocument,
): Promise<ResidueRunDocument> {
  if (!docData.ownerUid || docData.ownerUid === "ghost") {
    throw new Error("Cannot persist residue run without an authenticated owner.");
  }
  if (docData.retention === "temporary" && !docData.consentToStore) {
    // Explicit temporary mode: caller may keep in-memory only.
    return docData;
  }
  const parsed = residueRunDocumentSchema.parse(docData);
  await setDoc(doc(runsCol(db, parsed.ownerUid), parsed.runId), parsed, { merge: true });
  return parsed;
}

export async function getResidueRun(
  db: Firestore,
  ownerUid: string,
  runId: string,
): Promise<ResidueRunDocument | null> {
  if (!ownerUid || ownerUid === "ghost") return null;
  const snap = await getDoc(doc(runsCol(db, ownerUid), runId));
  if (!snap.exists()) return null;
  return residueRunDocumentSchema.parse(snap.data());
}

export async function listResidueRuns(
  db: Firestore,
  ownerUid: string,
  opts?: { mode?: ResidueMode; limit?: number },
): Promise<ResidueRunDocument[]> {
  if (!ownerUid || ownerUid === "ghost") return [];
  const base = runsCol(db, ownerUid);
  const q = opts?.mode
    ? query(base, where("mode", "==", opts.mode), orderBy("createdAt", "desc"))
    : query(base, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  const docs = snap.docs.map((d) => residueRunDocumentSchema.parse(d.data()));
  return typeof opts?.limit === "number" ? docs.slice(0, opts.limit) : docs;
}

export async function deleteResidueRun(
  db: Firestore,
  ownerUid: string,
  runId: string,
  opts?: { deleteArtifacts?: boolean },
): Promise<void> {
  if (!ownerUid || ownerUid === "ghost") return;
  await deleteDoc(doc(runsCol(db, ownerUid), runId));
  if (opts?.deleteArtifacts) {
    const arts = await getDocs(query(artifactsCol(db, ownerUid), where("runId", "==", runId)));
    await Promise.all(arts.docs.map((d) => deleteDoc(d.ref)));
  }
}

export async function saveResidueArtifact(
  db: Firestore,
  ownerUid: string,
  artifact: {
    artifactId: string;
    runId: string;
    kind: string;
    payload: unknown;
    createdAt?: string;
  },
): Promise<void> {
  if (!ownerUid || ownerUid === "ghost") return;
  await setDoc(
    doc(artifactsCol(db, ownerUid), artifact.artifactId),
    {
      ...artifact,
      createdAt: artifact.createdAt ?? new Date().toISOString(),
    },
    { merge: true },
  );
}

/**
 * Delete an artifact without deleting its research run.
 */
export async function deleteResidueArtifact(
  db: Firestore,
  ownerUid: string,
  artifactId: string,
): Promise<void> {
  if (!ownerUid || ownerUid === "ghost") return;
  await deleteDoc(doc(artifactsCol(db, ownerUid), artifactId));
}

export async function saveMemoryAtomProposal(
  db: Firestore,
  ownerUid: string,
  proposal: {
    proposalId: string;
    runId: string;
    atomicClaim: string;
    claimStatus: string;
    confidence: number;
    approvalState: "proposed";
    provenance: Record<string, unknown>;
    applicableModules?: string[];
    createdAt?: string;
  },
): Promise<void> {
  if (!ownerUid || ownerUid === "ghost") return;
  await setDoc(
    doc(memoryProposalsCol(db, ownerUid), proposal.proposalId),
    {
      ...proposal,
      approvalState: "proposed",
      createdAt: proposal.createdAt ?? new Date().toISOString(),
    },
    { merge: true },
  );
}

/** In-memory store for unit verification without Firebase. */
export function createMemoryResidueStore() {
  const runs = new Map<string, ResidueRunDocument>();
  const artifacts = new Map<string, { artifactId: string; runId: string; kind: string; payload: unknown }>();
  const proposals = new Map<string, { proposalId: string; runId: string; approvalState: string }>();

  return {
    async saveRun(docData: ResidueRunDocument) {
      const parsed = residueRunDocumentSchema.parse(docData);
      if (parsed.retention === "temporary" && !parsed.consentToStore) {
        return parsed;
      }
      runs.set(`${parsed.ownerUid}:${parsed.runId}`, parsed);
      return parsed;
    },
    async getRun(ownerUid: string, runId: string) {
      return runs.get(`${ownerUid}:${runId}`) ?? null;
    },
    async listRuns(ownerUid: string, mode?: ResidueMode) {
      return [...runs.values()].filter(
        (r) => r.ownerUid === ownerUid && (!mode || r.mode === mode),
      );
    },
    async deleteRun(ownerUid: string, runId: string, deleteArtifacts = false) {
      runs.delete(`${ownerUid}:${runId}`);
      if (deleteArtifacts) {
        for (const [key, art] of artifacts) {
          if (art.runId === runId) artifacts.delete(key);
        }
      }
    },
    async saveArtifact(ownerUid: string, artifact: { artifactId: string; runId: string; kind: string; payload: unknown }) {
      artifacts.set(`${ownerUid}:${artifact.artifactId}`, artifact);
    },
    async deleteArtifact(ownerUid: string, artifactId: string) {
      artifacts.delete(`${ownerUid}:${artifactId}`);
    },
    async saveProposal(ownerUid: string, proposal: { proposalId: string; runId: string; approvalState: string }) {
      proposals.set(`${ownerUid}:${proposal.proposalId}`, proposal);
    },
    _debug: { runs, artifacts, proposals },
  };
}
