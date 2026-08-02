import type { UsedContextSnapshot, ZineMetadata } from "../types";

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
  return snapshots
    .filter((snapshot) => snapshot.visibility?.export !== false)
    .map(({ atomId, title, source, capturedAt, visibility }) => ({
      atomId,
      title: title || "Fragment",
      source,
      capturedAt,
      visibility,
      content: "",
    }));
}

/** Public viewers receive only sources explicitly approved for public display. */
export function selectPublicUsedContext(
  snapshots: UsedContextSnapshot[],
): UsedContextSnapshot[] {
  return snapshots
    .filter((snapshot) => snapshot.visibility?.public === true)
    .map((snapshot) => ({
      ...snapshot,
      visibility: snapshot.visibility
        ? { ...snapshot.visibility }
        : undefined,
    }));
}

/**
 * Defense-in-depth for public archive responses. Legacy snapshots without a
 * visibility declaration remain private.
 */
export function sanitizeZineForPublicView(
  metadata: ZineMetadata,
): ZineMetadata {
  const snapshots = selectPublicUsedContext(
    metadata.sourcePacket?.usedContextSnapshots ||
      metadata.usedContextSnapshots ||
      [],
  );
  const publicIds = new Set(snapshots.map((snapshot) => snapshot.atomId));
  const sourcePacket = metadata.sourcePacket
    ? {
        ...metadata.sourcePacket,
        fragmentIds: metadata.sourcePacket.fragmentIds.filter((id) =>
          publicIds.has(id),
        ),
        usedContextSnapshots: snapshots,
        attachedAssets: metadata.sourcePacket.attachedAssets
          .filter((asset) => asset.visibility?.public === true)
          .map((asset) => ({
            ...asset,
            visibility: asset.visibility
              ? { ...asset.visibility }
              : undefined,
          })),
        linkedBoards: [],
      }
    : undefined;

  return {
    ...metadata,
    fragmentsUsed: (metadata.fragmentsUsed || []).filter((id) =>
      publicIds.has(id),
    ),
    usedContextSnapshots: snapshots.length > 0 ? snapshots : undefined,
    sourcePacket,
    colophon: metadata.colophon
      ? {
          ...metadata.colophon,
          publicSourceIds: metadata.colophon.publicSourceIds.filter((id) =>
            publicIds.has(id),
          ),
        }
      : undefined,
  };
}
