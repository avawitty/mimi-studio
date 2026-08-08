import type {
  AnalysisStatus,
  EvidenceAtom,
  StabilityClass,
  TasteScope,
} from "../../types";
import type { CreateEvidenceAtomInput } from "./evidenceAtomSchema";

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export type BuildEvidenceAtomOptions = {
  id?: string;
  now?: number;
};

/**
 * Build a Firestore-ready EvidenceAtom from validated input.
 * Shared by the API route (Admin SDK) and client evidenceAtomService.
 */
export function buildEvidenceAtomFromInput(
  userId: string,
  input: CreateEvidenceAtomInput,
  options: BuildEvidenceAtomOptions = {},
): EvidenceAtom {
  const now = options.now ?? Date.now();
  const id = options.id ?? uid();

  return {
    id,
    userId,
    projectId: input.projectId,
    contextScope: input.contextScope as TasteScope | undefined,
    kind: input.kind,
    sourceType: input.sourceType,
    originalSource: input.originalSource,
    assetUrl: input.assetUrl,
    thumbnailUrl: input.thumbnailUrl,
    sourceMetadata: input.sourceMetadata ?? {},
    extractedText: undefined,
    semanticDescription: undefined,
    observationIds: [],
    embeddingRef: undefined,
    ingestSource: input.ingestSource,
    tasteImpact: input.tasteImpact,
    userReaction: "suggested",
    confidence: 0,
    stabilityClass: input.stabilityClass as StabilityClass,
    processingState: "pending" satisfies AnalysisStatus,
    createdAt: now,
    updatedAt: now,
  };
}

/** Strip undefined values — Firestore Admin SDK does not omit them automatically. */
export function stripUndefinedForFirestore<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
