/**
 * Firestore query helpers for Evidence Atoms.
 * Surfaces index-missing failures instead of silently returning [].
 */

export type EvidenceAtomQueryFailureCode =
  | "INDEX_REQUIRED"
  | "PERMISSION_DENIED"
  | "QUERY_FAILED";

export class EvidenceAtomQueryError extends Error {
  constructor(
    message: string,
    readonly code: EvidenceAtomQueryFailureCode,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "EvidenceAtomQueryError";
  }
}

/** Classify client/admin Firestore query errors for honest UI + ops. */
export function classifyEvidenceAtomQueryError(error: unknown): EvidenceAtomQueryError {
  const code = String((error as { code?: unknown })?.code ?? "");
  const message = error instanceof Error ? error.message : String(error);

  if (code === "failed-precondition" || /index/i.test(message)) {
    return new EvidenceAtomQueryError(
      "Firestore composite index required for this evidence query. Deploy firestore.indexes.json.",
      "INDEX_REQUIRED",
      error,
    );
  }

  if (code === "permission-denied") {
    return new EvidenceAtomQueryError(
      "Permission denied reading evidence atoms.",
      "PERMISSION_DENIED",
      error,
    );
  }

  return new EvidenceAtomQueryError(
    message || "Evidence atom query failed.",
    "QUERY_FAILED",
    error,
  );
}
