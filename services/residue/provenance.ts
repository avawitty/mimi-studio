/**
 * Mimi Residue Engine — provenance + Used Context builders.
 * Distinguishes observed evidence from model inference.
 */

import {
  RESIDUE_ENGINE_ID,
  RESIDUE_PROMPT_VERSION,
  RESIDUE_SCHEMA_VERSION,
} from "./constants";
import { layerForSourceType } from "./scoring";
import type {
  EvidenceRecord,
  ResidueClaim,
  ResidueMode,
  ResidueRunMetadata,
  ResidueUsedContextEntry,
  SourceReference,
} from "./validation";

/** Browser-safe digest — avoid `node:crypto` (breaks Vite client builds on CI). */
function fnv1aHex(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  // Expand to 32 hex chars with a second pass over a salt of the first hash.
  const salt = `${input}#${(hash >>> 0).toString(16)}`;
  let hash2 = 0x811c9dc5;
  for (let i = 0; i < salt.length; i++) {
    hash2 ^= salt.charCodeAt(i);
    hash2 = Math.imul(hash2, 0x01000193);
  }
  const a = (hash >>> 0).toString(16).padStart(8, "0");
  const b = (hash2 >>> 0).toString(16).padStart(8, "0");
  const c = ((hash ^ hash2) >>> 0).toString(16).padStart(8, "0");
  const d = ((hash + hash2) >>> 0).toString(16).padStart(8, "0");
  return `${a}${b}${c}${d}`.slice(0, 32);
}

export function hashResidueInput(parts: unknown[]): string {
  return fnv1aHex(JSON.stringify(parts));
}

export function createRunMetadata(input: {
  runId: string;
  mode: ResidueMode;
  inputHash: string;
  sourceCount: number;
  warnings?: string[];
  model?: string;
  createdAt?: string;
  status?: ResidueRunMetadata["status"];
  retention?: ResidueRunMetadata["retention"];
  consentToStore?: boolean;
}): ResidueRunMetadata {
  return {
    runId: input.runId,
    mode: input.mode,
    createdAt: input.createdAt ?? new Date().toISOString(),
    model: input.model,
    promptVersion: RESIDUE_PROMPT_VERSION,
    schemaVersion: RESIDUE_SCHEMA_VERSION,
    inputHash: input.inputHash,
    sourceCount: input.sourceCount,
    warnings: input.warnings ?? [],
    status: input.status,
    retention: input.retention,
    consentToStore: input.consentToStore,
  };
}

export function buildSourceManifest(sources: SourceReference[]): {
  total: number;
  byType: Record<string, number>;
  byLayer: Record<string, number>;
  sources: SourceReference[];
} {
  const byType: Record<string, number> = {};
  const byLayer: Record<string, number> = {};
  for (const source of sources) {
    byType[source.sourceType] = (byType[source.sourceType] ?? 0) + 1;
    const layer = source.evidenceLayer ?? layerForSourceType(source.sourceType);
    byLayer[layer] = (byLayer[layer] ?? 0) + 1;
  }
  return {
    total: sources.length,
    byType,
    byLayer,
    sources,
  };
}

export function buildUsedContext(input: {
  sources: SourceReference[];
  evidence: EvidenceRecord[];
  counterEvidenceIds?: string[];
  memoryAtomIds?: string[];
  userNotes?: string[];
}): ResidueUsedContextEntry[] {
  const entries: ResidueUsedContextEntry[] = [];
  const counterSet = new Set(input.counterEvidenceIds ?? []);

  for (const source of input.sources) {
    entries.push({
      contextId: `ctx_source_${source.sourceId}`,
      sourceId: source.sourceId,
      label: source.title || source.url || source.sourceId,
      excerpt: source.excerpt,
      usage: "background",
      evidenceLayer: source.evidenceLayer ?? layerForSourceType(source.sourceType),
    });
  }

  for (const evidence of input.evidence) {
    entries.push({
      contextId: `ctx_evidence_${evidence.evidenceId}`,
      sourceId: evidence.sourceId,
      label: evidence.claimSupported,
      excerpt: evidence.excerpt,
      usage: counterSet.has(evidence.evidenceId) ? "counter-signal" : "evidence",
      evidenceLayer: evidence.evidenceLayer,
    });
  }

  for (const atomId of input.memoryAtomIds ?? []) {
    entries.push({
      contextId: `ctx_memory_${atomId}`,
      memoryAtomId: atomId,
      label: `Memory atom ${atomId}`,
      usage: "user-context",
    });
  }

  (input.userNotes ?? []).forEach((note, index) => {
    entries.push({
      contextId: `ctx_note_${index}`,
      label: "User note",
      excerpt: note.slice(0, 280),
      usage: "user-context",
    });
  });

  return entries;
}

export function claimProvenanceDisclosure(claim: ResidueClaim): {
  claimId: string;
  status: ResidueClaim["status"];
  isModelProposed: boolean;
  evidenceCount: number;
  counterEvidenceCount: number;
  evidenceLayers: string[];
  disclosure: string;
} {
  const isModelProposed =
    claim.status === "model-proposed" || claim.evidenceIds.length === 0;
  const disclosure = isModelProposed
    ? "Model-proposed or under-supported: do not treat as historically documented fact without evidence."
    : `Supported as ${claim.status} via ${claim.evidenceIds.length} evidence id(s); layers: ${(claim.evidenceLayers ?? []).join(", ") || "unspecified"}.`;

  return {
    claimId: claim.claimId,
    status: claim.status,
    isModelProposed,
    evidenceCount: claim.evidenceIds.length,
    counterEvidenceCount: claim.counterEvidenceIds.length,
    evidenceLayers: claim.evidenceLayers ?? [],
    disclosure,
  };
}

export function engineProvenanceRecord(input: {
  runId: string;
  mode: ResidueMode;
  sourceIds: string[];
  evidenceIds: string[];
  assumptions?: string[];
}) {
  return {
    engineId: RESIDUE_ENGINE_ID,
    generatedAt: new Date().toISOString(),
    runId: input.runId,
    mode: input.mode,
    inputs: input.sourceIds,
    evidence: input.evidenceIds,
    assumptions: input.assumptions ?? [],
    schemaVersion: RESIDUE_SCHEMA_VERSION,
    promptVersion: RESIDUE_PROMPT_VERSION,
  };
}
