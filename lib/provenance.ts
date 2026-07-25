import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../services/firebaseInit";

export type ProvenanceChamber =
  | "darkroom"
  | "pocket"
  | "studio"
  | "scry"
  | "research"
  | "build-brief";

export interface ProvenanceTransfer {
  from: ProvenanceChamber;
  to: ProvenanceChamber;
  at: number;
  actor?: string;
  note?: string;
}

export interface ProvenanceRecord {
  artifactId: string;
  originChamber: ProvenanceChamber;
  originMetadata: Record<string, unknown>;
  creatorTags: string[];
  transformationHistory: ProvenanceTransfer[];
  createdAt: number;
  updatedAt: number;
}

export interface ProvenanceSeed {
  artifactId: string;
  originChamber: ProvenanceChamber;
  originMetadata?: Record<string, unknown>;
  creatorTags?: string[];
  actor?: string;
}

function provenanceRef(userId: string, artifactId: string) {
  return doc(db, "users", userId, "provenance", artifactId);
}

export function createProvenanceSeed(
  artifactId: string,
  originChamber: ProvenanceChamber,
  originMetadata: Record<string, unknown> = {},
  creatorTags: string[] = [],
): ProvenanceRecord {
  const now = Date.now();
  return {
    artifactId,
    originChamber,
    originMetadata,
    creatorTags,
    transformationHistory: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function attachProvenanceToPayload<T extends Record<string, unknown>>(
  payload: T,
  record: ProvenanceRecord,
): T & { provenance: ProvenanceRecord } {
  return { ...payload, provenance: record };
}

export async function saveProvenanceRecord(
  userId: string,
  record: ProvenanceRecord,
): Promise<void> {
  if (!userId || userId === "ghost") return;
  await setDoc(provenanceRef(userId, record.artifactId), record, { merge: true });
}

export async function getProvenanceRecord(
  userId: string,
  artifactId: string,
): Promise<ProvenanceRecord | null> {
  if (!userId || userId === "ghost") return null;
  try {
    const snap = await getDoc(provenanceRef(userId, artifactId));
    return snap.exists() ? (snap.data() as ProvenanceRecord) : null;
  } catch {
    return null;
  }
}

export async function recordProvenanceOrigin(
  userId: string,
  seed: ProvenanceSeed,
): Promise<ProvenanceRecord> {
  const record = createProvenanceSeed(
    seed.artifactId,
    seed.originChamber,
    seed.originMetadata ?? {},
    seed.creatorTags ?? [],
  );
  await saveProvenanceRecord(userId, record);
  return record;
}

export async function recordProvenanceTransfer(
  userId: string,
  artifactId: string,
  transfer: Omit<ProvenanceTransfer, "at"> & { at?: number },
): Promise<ProvenanceRecord | null> {
  if (!userId || userId === "ghost") return null;

  const existing = await getProvenanceRecord(userId, artifactId);
  const now = Date.now();
  const entry: ProvenanceTransfer = {
    ...transfer,
    at: transfer.at ?? now,
  };

  const record: ProvenanceRecord = existing
    ? {
        ...existing,
        transformationHistory: [...existing.transformationHistory, entry],
        updatedAt: now,
      }
    : {
        artifactId,
        originChamber: transfer.from,
        originMetadata: {},
        creatorTags: [],
        transformationHistory: [entry],
        createdAt: now,
        updatedAt: now,
      };

  await saveProvenanceRecord(userId, record);
  return record;
}

export async function carryProvenanceOnTransfer(
  userId: string,
  sourceArtifactId: string,
  targetArtifactId: string,
  transfer: Omit<ProvenanceTransfer, "at"> & { at?: number },
  targetMetadata?: Record<string, unknown>,
): Promise<ProvenanceRecord | null> {
  const source = await getProvenanceRecord(userId, sourceArtifactId);
  const now = Date.now();

  const entry: ProvenanceTransfer = { ...transfer, at: transfer.at ?? now };

  const record: ProvenanceRecord = source
    ? {
        ...source,
        artifactId: targetArtifactId,
        originMetadata: {
          ...source.originMetadata,
          ...(targetMetadata ?? {}),
          carriedFrom: sourceArtifactId,
        },
        transformationHistory: [...source.transformationHistory, entry],
        updatedAt: now,
      }
    : {
        ...createProvenanceSeed(targetArtifactId, transfer.from, {
          ...(targetMetadata ?? {}),
          carriedFrom: sourceArtifactId,
        }),
        transformationHistory: [entry],
      };

  await saveProvenanceRecord(userId, record);
  return record;
}
