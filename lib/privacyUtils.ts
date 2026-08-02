import type {
  UsedContextSnapshot,
  ZineMetadata,
  ZinePageSpec,
  ZineSourcePacket,
} from "../types";

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
  const publicSnapshots = selectPublicUsedContext(
    metadata.sourcePacket?.usedContextSnapshots ||
      metadata.usedContextSnapshots ||
      [],
  );
  const publicAssets = (metadata.sourcePacket?.attachedAssets || [])
    .filter((asset) => asset.visibility?.public === true)
    .map((asset) => ({
      ...asset,
      visibility: asset.visibility ? { ...asset.visibility } : undefined,
    }));
  const publicIds = new Set([
    ...publicSnapshots.map((snapshot) => snapshot.atomId),
    ...publicAssets.map((asset) => asset.id),
  ]);
  const sanitizePage = (page: ZinePageSpec): ZinePageSpec => ({
    ...page,
    sourceIds: page.sourceIds?.filter((id) => publicIds.has(id)),
    threadData: undefined,
    customLayout: page.customLayout
      ? {
          ...page.customLayout,
          elements: page.customLayout.elements.map((element) => ({
            ...element,
            sourceRef:
              element.sourceRef && publicIds.has(element.sourceRef)
                ? element.sourceRef
                : undefined,
            style: { ...element.style },
          })),
        }
      : undefined,
  });
  let persistedPages: ZinePageSpec[] = [];
  if (metadata.content.pages?.length) {
    persistedPages = metadata.content.pages.map(sanitizePage);
  } else if (metadata.content.pagesJson) {
    try {
      const parsed = JSON.parse(metadata.content.pagesJson);
      persistedPages = Array.isArray(parsed)
        ? (parsed as ZinePageSpec[]).map(sanitizePage)
        : [];
    } catch {
      persistedPages = [];
    }
  }
  const sourcePacket: ZineSourcePacket | undefined = metadata.sourcePacket
    ? {
        ...metadata.sourcePacket,
        fragmentIds: (metadata.sourcePacket.fragmentIds || []).filter((id) =>
          publicIds.has(id),
        ),
        usedContextSnapshots: publicSnapshots,
        attachedAssets: publicAssets,
        linkedBoards: [],
      }
    : undefined;

  return {
    ...metadata,
    publicProjectionVersion: 1,
    fragmentsUsed: (metadata.fragmentsUsed || []).filter((id) =>
      publicIds.has(id),
    ),
    usedContextSnapshots:
      publicSnapshots.length > 0 ? publicSnapshots : undefined,
    sourcePacket,
    reading: metadata.reading
      ? {
          ...metadata.reading,
          signals: metadata.reading.signals.map((signal) => ({
            ...signal,
            sourceIds: signal.sourceIds?.filter((id) => publicIds.has(id)),
          })),
          tensions: metadata.reading.tensions?.map((tension) => ({
            ...tension,
            sourceIds: tension.sourceIds?.filter((id) => publicIds.has(id)),
          })),
          uncertainty: metadata.reading.uncertainty?.map((uncertainty) => ({
            ...uncertainty,
            sourceIds: uncertainty.sourceIds?.filter((id) =>
              publicIds.has(id),
            ),
          })),
        }
      : undefined,
    content: {
      ...metadata.content,
      semiotic_signals: metadata.content.semiotic_signals?.map((signal) => ({
        ...signal,
        sourceIds: signal.sourceIds?.filter((id) => publicIds.has(id)),
      })),
      pages: persistedPages,
      pagesJson: metadata.content.pagesJson
        ? JSON.stringify(persistedPages)
        : undefined,
    },
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
