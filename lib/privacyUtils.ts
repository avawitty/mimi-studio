import type {
  EditorElement,
  UsedContextSnapshot,
  ZineContent,
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
  const sanitizePage = (page: ZinePageSpec): ZinePageSpec => {
    const allowedMedia = new Set(
      [
        page.image_url,
        page.assetVariants?.thumbnailUrl,
        page.assetVariants?.previewUrl,
        page.assetVariants?.masterUrl,
      ].filter((value): value is string => Boolean(value)),
    );
    const elements: EditorElement[] = (page.customLayout?.elements || [])
      .map((element): EditorElement | null => {
        let content = element.content;
        if (element.type === "image") {
          if (
            page.originalMediaUrl &&
            content === page.originalMediaUrl &&
            page.image_url
          ) {
            content = page.image_url;
          }
          if (!allowedMedia.has(content)) return null;
        }
        const style = element.style;
        return {
          id: element.id,
          type: element.type,
          content,
          style: {
            top: style.top,
            left: style.left,
            width: style.width,
            height: style.height,
            zIndex: style.zIndex,
            opacity: style.opacity,
            fontSize: style.fontSize,
            fontFamily: style.fontFamily,
            color: style.color,
            textAlign: style.textAlign,
            fontStyle: style.fontStyle,
            fontWeight: style.fontWeight,
            rotation: style.rotation,
            lineHeight: style.lineHeight,
            objectFit: style.objectFit,
            filter:
              style.filter && !/url\s*\(/i.test(style.filter)
                ? style.filter
                : undefined,
            borderStyle: style.borderStyle,
            borderWidth: style.borderWidth,
            borderColor: style.borderColor,
            borderRadius: style.borderRadius,
            padding: style.padding,
            backgroundColor: style.backgroundColor,
            mixBlendMode: style.mixBlendMode,
          },
          sourceRef:
            element.sourceRef && publicIds.has(element.sourceRef)
              ? element.sourceRef
              : undefined,
        };
      })
      .filter((element): element is EditorElement => Boolean(element));
    const elementIds = new Set(elements.map((element) => element.id));

    return {
      id: page.id,
      pageNumber: page.pageNumber,
      headline: page.headline,
      bodyCopy: page.bodyCopy,
      supportingText: page.supportingText,
      imagePrompt: "",
      image_url: page.image_url,
      altText: page.altText,
      sectionId: page.sectionId,
      sectionType: page.sectionType,
      grammar: page.grammar,
      sourceIds: page.sourceIds?.filter((id) => publicIds.has(id)),
      revision: page.revision,
      assetRevision: page.assetRevision,
      layoutRevision: page.layoutRevision,
      pageType: page.pageType,
      customLayout: page.customLayout
        ? {
            elements,
            readingOrder: page.customLayout.readingOrder?.filter((id) =>
              elementIds.has(id),
            ),
          }
        : undefined,
    };
  };
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
  const content: ZineContent = {
    id: metadata.content.id,
    meta: {
      mode: metadata.content.meta?.mode || "editorial",
      intent: metadata.content.meta?.intent || "",
      timestamp: metadata.content.meta?.timestamp || metadata.timestamp,
      theme: metadata.content.meta?.theme,
      artifactSchemaVersion: metadata.content.meta?.artifactSchemaVersion,
    },
    taste_context: {
      active_archetype:
        metadata.content.taste_context?.active_archetype || "editorial",
      active_palette: [
        ...(metadata.content.taste_context?.active_palette || []),
      ],
    },
    structure: {
      hero_prompt: "",
      pages: structurePages,
      sonic_layer: metadata.content.structure?.sonic_layer,
    },
    visual_guidance: {
      strict_palette: [
        ...(metadata.content.visual_guidance?.strict_palette || []),
      ],
      negative_prompt: "",
      composition_density:
        metadata.content.visual_guidance?.composition_density ?? 0.5,
    },
    title: metadata.content.title,
    headlines: metadata.content.headlines,
    vocal_summary_blurb: metadata.content.vocal_summary_blurb,
    the_reading: metadata.content.the_reading,
    strategic_hypothesis: metadata.content.strategic_hypothesis,
    semiotic_signals: metadata.content.semiotic_signals?.map((signal) => ({
      ...signal,
      sourceIds: signal.sourceIds?.filter((id) => publicIds.has(id)),
    })),
    aesthetic_touchpoints: metadata.content.aesthetic_touchpoints,
    celestial_calibration: metadata.content.celestial_calibration,
    visual_plates: [],
    the_roadmap: metadata.content.the_roadmap,
    originalThought: metadata.content.originalThought,
    poetic_provocation: metadata.content.poetic_provocation,
    oracular_mirror: metadata.content.oracular_mirror,
    poetic_interpretation: metadata.content.poetic_interpretation,
    blueprint: metadata.content.blueprint,
    roadmap: metadata.content.roadmap,
    pages: persistedPages,
    pagesJson: metadata.content.pagesJson
      ? JSON.stringify(persistedPages)
      : undefined,
    hero_image_url: metadata.content.hero_image_url,
    hypothesis_image_url: metadata.content.hypothesis_image_url,
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
