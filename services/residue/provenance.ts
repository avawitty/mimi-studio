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

/**
 * Pure-JS, synchronous SHA-256 implementation.
 *
 * Used instead of `node:crypto`'s `createHash` so this module can be bundled
 * and executed in the browser (the residue engines run offline client-side).
 * Produces the same lowercase hex digest as `createHash("sha256")`.
 */
function sha256Hex(message: string): string {
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
    0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
    0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
    0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
    0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
    0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  // UTF-8 encode the message.
  const bytes: number[] = [];
  for (let i = 0; i < message.length; i++) {
    let code = message.charCodeAt(i);
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code >= 0xd800 && code <= 0xdbff && i + 1 < message.length) {
      // Surrogate pair.
      const hi = code;
      const lo = message.charCodeAt(++i);
      code = 0x10000 + ((hi - 0xd800) << 10) + (lo - 0xdc00);
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    } else {
      bytes.push(
        0xe0 | (code >> 12),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    }
  }

  const bitLength = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) {
    bytes.push(0x00);
  }
  // Append 64-bit big-endian length. JS bitwise ops are 32-bit; the high word
  // is effectively zero for any realistic input size.
  const hi = Math.floor(bitLength / 0x100000000);
  const lo = bitLength >>> 0;
  bytes.push(
    (hi >>> 24) & 0xff,
    (hi >>> 16) & 0xff,
    (hi >>> 8) & 0xff,
    hi & 0xff,
    (lo >>> 24) & 0xff,
    (lo >>> 16) & 0xff,
    (lo >>> 8) & 0xff,
    lo & 0xff,
  );

  const rotr = (x: number, n: number): number =>
    (x >>> n) | (x << (32 - n));

  const w = new Array<number>(64);
  for (let offset = 0; offset < bytes.length; offset += 64) {
    for (let i = 0; i < 16; i++) {
      const j = offset + i * 4;
      w[i] =
        ((bytes[j] << 24) |
          (bytes[j + 1] << 16) |
          (bytes[j + 2] << 8) |
          bytes[j + 3]) >>>
        0;
    }
    for (let i = 16; i < 64; i++) {
      const s0 =
        rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 =
        rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  const toHex = (x: number): string =>
    (x >>> 0).toString(16).padStart(8, "0");

  return (
    toHex(h0) +
    toHex(h1) +
    toHex(h2) +
    toHex(h3) +
    toHex(h4) +
    toHex(h5) +
    toHex(h6) +
    toHex(h7)
  );
}

export function hashResidueInput(parts: unknown[]): string {
  const payload = JSON.stringify(parts);
  return sha256Hex(payload).slice(0, 32);
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
