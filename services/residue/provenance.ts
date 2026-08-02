/**
 * Mimi Residue Engine — provenance + Used Context builders.
 * Distinguishes observed evidence from model inference.
 *
 * Hashing must stay browser-safe: ResidueChamber pulls this module into the
 * Vite client bundle, so `node:crypto` cannot be imported here.
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

/** Deterministic 32-hex digest (FNV-1a 32-bit × 4 lanes). Not for security. */
function fingerprintHex32(payload: string): string {
  let h0 = 0x811c9dc5;
  let h1 = 0x811c9dc5 ^ 0x9e3779b9;
  let h2 = 0x811c9dc5 ^ 0x85ebca6b;
  let h3 = 0x811c9dc5 ^ 0xc2b2ae35;
  const prime = 0x01000193;
  for (let i = 0; i < payload.length; i++) {
    const c = payload.charCodeAt(i);
    h0 = Math.imul(h0 ^ c, prime) >>> 0;
    h1 = Math.imul(h1 ^ (c + i), prime) >>> 0;
    h2 = Math.imul(h2 ^ ((c << 1) ^ i), prime) >>> 0;
    h3 = Math.imul(h3 ^ ((c << 2) ^ (i * 3)), prime) >>> 0;
  }
  return [h0, h1, h2, h3].map((h) => h.toString(16).padStart(8, "0")).join("");
}

export function hashResidueInput(parts: unknown[]): string {
  return fingerprintHex32(JSON.stringify(parts));
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
