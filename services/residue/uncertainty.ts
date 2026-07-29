/**
 * Mimi Residue Engine — uncertainty flags and emotional language guards.
 */

import {
  EMOTIONAL_FORBIDDEN_CLAIM_PATTERNS,
  EMOTIONAL_PREFERRED_FRAMING,
  EMOTIONAL_SAFETY_NOTICE,
} from "./constants";
import type { ClaimStatus, EvidenceRecord, ResidueClaim } from "./validation";

export const UNCERTAINTY_FLAGS = {
  NO_PRIMARY_SOURCES: "no-primary-sources",
  SINGLE_SOURCE_TYPE: "single-source-type",
  MODEL_PROPOSED_WITHOUT_EVIDENCE: "model-proposed-without-evidence",
  COMMUNITY_ONLY: "community-only-evidence",
  RESEARCH_COMMUNITY_DIVERGE: "research-and-community-diverge",
  CAUSAL_CLAIM_WEAK: "causal-claim-weakly-supported",
  MISSING_COUNTERSIGNALS: "missing-countersignals",
  TEMPORAL_GAPS: "temporal-coverage-gaps",
  SENSITIVE_EMOTIONAL_INPUT: "sensitive-emotional-input",
  PARTIAL_PIPELINE: "partial-pipeline-completion",
} as const;

export type UncertaintyFlag =
  (typeof UNCERTAINTY_FLAGS)[keyof typeof UNCERTAINTY_FLAGS];

export function flagsForClaim(input: {
  status: ClaimStatus;
  evidence: EvidenceRecord[];
  counterEvidenceCount?: number;
}): string[] {
  const flags: string[] = [];
  const { status, evidence } = input;

  if (evidence.length === 0) {
    flags.push(UNCERTAINTY_FLAGS.NO_PRIMARY_SOURCES);
    if (status === "model-proposed") {
      flags.push(UNCERTAINTY_FLAGS.MODEL_PROPOSED_WITHOUT_EVIDENCE);
    }
  }

  const layers = new Set(evidence.map((e) => e.evidenceLayer));
  if (layers.size === 1 && layers.has("C")) {
    flags.push(UNCERTAINTY_FLAGS.COMMUNITY_ONLY);
  }
  if (status === "causal-hypothesis" && evidence.every((e) => e.evidenceStrength !== "strong")) {
    flags.push(UNCERTAINTY_FLAGS.CAUSAL_CLAIM_WEAK);
  }
  if ((input.counterEvidenceCount ?? 0) === 0 && status !== "observed") {
    flags.push(UNCERTAINTY_FLAGS.MISSING_COUNTERSIGNALS);
  }

  return unique(flags);
}

export function collectRunUncertaintyFlags(input: {
  claims: ResidueClaim[];
  evidence: EvidenceRecord[];
  sourceTypeCount: number;
  hasCounterSignals: boolean;
  partialPipeline?: boolean;
  emotionalMode?: boolean;
}): string[] {
  const flags: string[] = [];
  if (input.evidence.length === 0) flags.push(UNCERTAINTY_FLAGS.NO_PRIMARY_SOURCES);
  if (input.sourceTypeCount <= 1) flags.push(UNCERTAINTY_FLAGS.SINGLE_SOURCE_TYPE);
  if (!input.hasCounterSignals) flags.push(UNCERTAINTY_FLAGS.MISSING_COUNTERSIGNALS);
  if (input.partialPipeline) flags.push(UNCERTAINTY_FLAGS.PARTIAL_PIPELINE);
  if (input.emotionalMode) flags.push(UNCERTAINTY_FLAGS.SENSITIVE_EMOTIONAL_INPUT);

  const layers = new Set(input.evidence.map((e) => e.evidenceLayer));
  if (layers.has("A") && layers.has("C")) {
    // not necessarily a problem — note when both present without agreement tooling
  }
  if (layers.size === 1 && layers.has("C")) {
    flags.push(UNCERTAINTY_FLAGS.COMMUNITY_ONLY);
  }

  for (const claim of input.claims) {
    flags.push(...claim.uncertaintyFlags);
  }
  return unique(flags);
}

export function containsForbiddenEmotionalLanguage(text: string): boolean {
  return EMOTIONAL_FORBIDDEN_CLAIM_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * Soft-sanitize emotional synthesis text.
 * Replaces clearly forbidden diagnostic framings with preferred reflective language.
 */
export function sanitizeEmotionalStatement(text: string): string {
  if (!containsForbiddenEmotionalLanguage(text)) return text;
  return EMOTIONAL_PREFERRED_FRAMING.hypothesisNotConclusion;
}

export function emotionalSafetyNotice(): string {
  return EMOTIONAL_SAFETY_NOTICE;
}

/** Redact potentially sensitive emotional input from error/telemetry strings. */
export function redactSensitiveText(text: string, maxKeep = 0): string {
  if (!text) return "";
  if (maxKeep <= 0) return "[redacted-emotional-input]";
  const trimmed = text.trim();
  if (trimmed.length <= maxKeep) return trimmed;
  return `${trimmed.slice(0, maxKeep)}…[redacted]`;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
