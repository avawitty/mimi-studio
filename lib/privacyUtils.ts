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
  const structurePages = (metadata.content.structure?.pages || persistedPages).map(
    sanitizePage,
  );
  const reading = metadata.reading
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
    : undefined;
  const content: ZineMetadata["content"] = {
    ...metadata.content,
    meta: metadata.content.meta
      ? {
          ...metadata.content.meta,
          originalCoverImageUrl: undefined,
          studioCoverOverlays: undefined,
        }
      : metadata.content.meta,
    structure: metadata.content.structure
      ? {
          ...metadata.content.structure,
          pages: structurePages,
        }
      : metadata.content.structure,
    semiotic_signals: metadata.content.semiotic_signals?.map((signal) => ({
      ...signal,
      sourceIds: signal.sourceIds?.filter((id) => publicIds.has(id)),
    })),
    pages: persistedPages,
    pagesJson: metadata.content.pagesJson
      ? JSON.stringify(persistedPages)
      : undefined,
  };
  const coverSpec: ZineMetadata["coverSpec"] = metadata.coverSpec
    ? {
        ...metadata.coverSpec,
        originalImageUrl: undefined,
        overlays: [],
      }
    : undefined;
  const colophon = metadata.colophon
    ? {
        ...metadata.colophon,
        publicSourceIds: metadata.colophon.publicSourceIds.filter((id) =>
          publicIds.has(id),
        ),
      }
    : undefined;

  return {
    id: metadata.id,
    fragmentsUsed: (metadata.fragmentsUsed || []).filter((id) =>
      publicIds.has(id),
    ),
    usedContextSnapshots:
      publicSnapshots.length > 0 ? publicSnapshots : undefined,
    createdAt: metadata.createdAt,
    theme: metadata.theme,
    aestheticVector: {},
    userId: metadata.userId,
    userHandle: metadata.userHandle,
    userAvatar: metadata.userAvatar,
    title: metadata.title,
    concept: metadata.concept,
    summary: metadata.summary,
    tone: metadata.tone,
    timestamp: metadata.timestamp,
    likes: metadata.likes,
    content,
    coverImageUrl: metadata.coverImageUrl,
    isDeepThinking: metadata.isDeepThinking,
    isLite: metadata.isLite,
    isQuickPreview: metadata.isQuickPreview,
    imageEnhancement: metadata.imageEnhancement,
    imageFilter: metadata.imageFilter,
    isHighFidelity: metadata.isHighFidelity,
    isPublic: metadata.isPublic,
    publishedAt: metadata.publishedAt,
    contributeToMeanMedianMode: metadata.contributeToMeanMedianMode,
    disclosedAt: metadata.disclosedAt,
    disclosureVersion: metadata.disclosureVersion,
    mmmContributionStatus: metadata.mmmContributionStatus,
    mmmWithdrawnAt: metadata.mmmWithdrawnAt,
    isLocked: metadata.isLocked,
    authorship: metadata.authorship,
    originalInput: metadata.originalInput,
    tags: metadata.tags,
    treatmentId: metadata.treatmentId,
    artifactSchemaVersion: metadata.artifactSchemaVersion,
    artifactAuthorship: metadata.artifactAuthorship,
    lifecycleStatus: metadata.lifecycleStatus,
    sourcePacket,
    reading,
    editorialDirection: metadata.editorialDirection,
    issueStructure: metadata.issueStructure,
    coverSpec,
    colophon,
    publication: metadata.publication,
    revision: metadata.revision,
    updatedAt: metadata.updatedAt,
    publicProjectionVersion: 1,
  };
}
