import { UsedContextSnapshot } from "../types";

/** Redact internal user IDs for display surfaces. */
export function truncateUid(
  uid: string | null | undefined,
  visible = 4,
): string {
  if (!uid) return "—";
  if (uid.length <= visible * 2) return `${uid.slice(0, visible)}…`;
  return `${uid.slice(0, visible)}…${uid.slice(-visible)}`;
}

/** Strip full atom body text from export manifests; keep provenance metadata only. */
export function sanitizeUsedContextForExport(
  snapshots: UsedContextSnapshot[],
): UsedContextSnapshot[] {
  return snapshots.map(({ atomId, title, source }) => ({
    atomId,
    title: title || "Fragment",
    source,
    content: "",
  }));
}
