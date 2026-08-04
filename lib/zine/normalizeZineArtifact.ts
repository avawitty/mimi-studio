import type {
  ContextVisibility,
  EditorElement,
  MediaFile,
  MimiZineArtifact,
  SemioticSignal,
  ZineCoverOverlayLayer,
  ZineCoverSpec,
  ZineMetadata,
  ZineSourceAsset,
  ZineSourcePacket,
  UsedContextSnapshot,
} from "../../types";
import { resolveIssueMode } from "../zineSpreadLayout";
import {
  hydrateLegacyZineMetadata,
  inferLegacyLifecycleStatus,
  lifecycleAtLeast,
} from "./zineMigrations";
import {
  buildDefaultIssueStructure,
  prepareArtifactPages,
} from "./zineIssuePlanner";
import {
  MIMI_ZINE_ARTIFACT_SCHEMA_VERSION,
  parseMimiZineArtifact,
} from "./zineArtifactSchema";

const LEGACY_CONTEXT_VISIBILITY: ContextVisibility = {
  working: true,
  export: true,
  public: false,
};

function clampUnit(value: number | undefined, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(1, Math.max(0, value as number));
}

function splitExclusions(value: string | undefined): string[] {
  if (!value?.trim()) return [];
  return value
    .split(/[,;\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function mediaTypeToSourceType(
  type: MediaFile["type"],
): ZineSourceAsset["type"] {
  switch (type) {
    case "image":
      return "image";
    case "audio":
      return "voice";
    case "link":
      return "link";
    case "file":
      return "document";
    case "video":
      return "document";
    default: {
      const exhaustive: never = type;
      return exhaustive;
    }
  }
}

function sourceAssetFromMedia(media: MediaFile, index: number): ZineSourceAsset {
  return {
    id: media.id || `source-asset-${index + 1}`,
    type: mediaTypeToSourceType(media.type),
    title: media.name,
    uri: media.url || undefined,
    excerpt: media.transcription,
    source: media.type,
    rights: "unknown",
    visibility: { ...LEGACY_CONTEXT_VISIBILITY },
  };
}

function normalizeSourcePacket(metadata: ZineMetadata): ZineSourcePacket {
  const stored = metadata.sourcePacket;
  const fallbackSnapshots: UsedContextSnapshot[] = (metadata.fragmentsUsed || []).map(
    (atomId) => ({
      atomId,
      title: "Fragment",
      content: "",
    }),
  );
  const snapshots: UsedContextSnapshot[] =
    stored?.usedContextSnapshots ||
    metadata.usedContextSnapshots ||
    fallbackSnapshots;
  const usedContextSnapshots = snapshots.map((snapshot) => ({
    ...snapshot,
    visibility: snapshot.visibility
      ? { ...snapshot.visibility }
      : { ...LEGACY_CONTEXT_VISIBILITY },
  }));

  return {
    originalInput: stored?.originalInput || metadata.originalInput,
    fragmentIds: [
      ...new Set(stored?.fragmentIds || metadata.fragmentsUsed || []),
    ],
    usedContextSnapshots,
    attachedAssets:
      stored?.attachedAssets?.map((asset) => ({
        ...asset,
        visibility: asset.visibility
          ? { ...asset.visibility }
          : { ...LEGACY_CONTEXT_VISIBILITY },
      })) ||
      (metadata.artifacts || []).map(sourceAssetFromMedia),
    linkedBoards: stored?.linkedBoards?.map((board) => ({ ...board })),
    sourceSummary: stored?.sourceSummary || metadata.summary,
  };
}

function normalizeSignals(signals: SemioticSignal[] | undefined): SemioticSignal[] {
  return (signals || []).map((signal) => ({
    ...signal,
    epistemicStatus: signal.epistemicStatus || "unknown",
    sourceIds: signal.sourceIds ? [...signal.sourceIds] : undefined,
  }));
}

function coverTreatment(metadata: ZineMetadata): ZineCoverSpec["treatment"] {
  const mode = resolveIssueMode(metadata.content.meta?.mode);
  if (mode === "oracle") return "dark-plate";
  if (mode === "research") return "dossier";
  if (metadata.isLite || metadata.isQuickPreview) return "minimal";
  return "editorial";
}

function overlayToEditorElement(layer: ZineCoverOverlayLayer): EditorElement {
  switch (layer.kind) {
    case "text":
      return {
        id: layer.id,
        type: "text",
        content: layer.text,
        style: {
          top: layer.y,
          left: layer.x,
          width: Math.max(12, 92 - layer.x),
          zIndex: 20,
          fontSize: Math.max(0.65, layer.fontSize / 16),
          fontFamily: "Cormorant Garamond",
          color: layer.color,
          fontStyle: "italic",
          fontWeight: "600",
          lineHeight: 1.05,
        },
      };
    case "image":
      return {
        id: layer.id,
        type: "image",
        content: layer.url,
        style: {
          top: layer.y,
          left: layer.x,
          width: layer.width,
          zIndex: 10,
          opacity: layer.opacity,
          objectFit: "contain",
        },
      };
    default: {
      const exhaustive: never = layer;
      return exhaustive;
    }
  }
}

function normalizeCover(metadata: ZineMetadata): ZineCoverSpec {
  if (metadata.coverSpec) {
    return {
      ...metadata.coverSpec,
      overlays: metadata.coverSpec.overlays.map((overlay) => ({
        ...overlay,
        style: { ...overlay.style },
      })),
    };
  }

  const overlays = (metadata.content.meta.studioCoverOverlays || []).map(
    overlayToEditorElement,
  );
  const originalImageUrl =
    metadata.content.meta.originalCoverImageUrl ||
    metadata.coverImageUrl ||
    metadata.content.hero_image_url ||
    undefined;
  const imageUrl =
    metadata.coverImageUrl || metadata.content.hero_image_url || undefined;
  const overlayBaked = Boolean(
    overlays.length > 0 &&
      imageUrl &&
      (imageUrl.startsWith("data:image") || imageUrl !== originalImageUrl),
  );

  return {
    imageUrl,
    originalImageUrl,
    title: metadata.title || metadata.content.title || "Untitled",
    overlays,
    treatment: coverTreatment(metadata),
    bakedImageUrl: overlayBaked ? imageUrl : undefined,
    overlayBaked,
    covers:
      metadata.coverSpec?.covers ||
      metadata.content.meta.studioCoverVariants ||
      undefined,
  };
}

export function normalizeZineArtifact(
  metadata: ZineMetadata,
): MimiZineArtifact {
  const hydrated = hydrateLegacyZineMetadata(metadata);
  const createdAt = hydrated.createdAt || hydrated.timestamp || Date.now();
  const updatedAt = hydrated.updatedAt || hydrated.timestamp || createdAt;
  const mode = resolveIssueMode(hydrated.content.meta?.mode);
  const pages = prepareArtifactPages(
    hydrated.id,
    hydrated.content.pages || hydrated.content.structure?.pages || [],
  );
  const status = inferLegacyLifecycleStatus(hydrated, pages);
  const signals = normalizeSignals(
    hydrated.reading?.signals || hydrated.content.semiotic_signals,
  );
  const centralObservation =
    hydrated.reading?.centralObservation ||
    hydrated.content.the_reading ||
    hydrated.content.oracular_mirror ||
    hydrated.content.vocal_summary_blurb ||
    hydrated.summary ||
    "";
  const directionApproved = lifecycleAtLeast(status, "direction-approved");
  const sourcePacket = normalizeSourcePacket(hydrated);
  const issueStructure = buildDefaultIssueStructure({
    artifactId: hydrated.id,
    pages,
    hasOpening: Boolean(hydrated.originalInput || hydrated.content.meta?.intent),
    hasReading: Boolean(centralObservation),
    hasSignals: signals.length > 0,
    hasRoadmap: Boolean(
      hydrated.content.roadmap || hydrated.content.the_roadmap,
    ),
    hasDebris: Boolean(hydrated.originalInput || hydrated.content.originalThought),
    existing: hydrated.issueStructure,
  });
  const publicSourceIds = sourcePacket.usedContextSnapshots
    .filter((snapshot) => snapshot.visibility?.public)
    .map((snapshot) => snapshot.atomId);
  const revision = Math.max(1, hydrated.revision || 1);

  const artifact: MimiZineArtifact = {
    schemaVersion: MIMI_ZINE_ARTIFACT_SCHEMA_VERSION,
    identity: {
      id: hydrated.id,
      title: hydrated.title || hydrated.content.title || "Untitled",
      mode,
      tone: hydrated.tone,
      theme:
        hydrated.theme ||
        hydrated.content.meta?.theme ||
        hydrated.content.taste_context?.active_archetype,
    },
    authorship:
      hydrated.artifactAuthorship || {
        ownerUid: hydrated.userId || "ghost",
        creatorHandle: hydrated.userHandle || "Ghost",
        displayName: hydrated.authorship,
        generatedBy: { system: "mimi" },
        editorialCompileOwnerUid: hydrated.editorialCompileOwnerUid,
        editorialCompileOwnerHandle: hydrated.editorialCompileOwnerHandle,
      },
    status,
    sourcePacket,
    reading:
      hydrated.reading || {
        oracularMirror:
          hydrated.content.oracular_mirror ||
          hydrated.content.poetic_interpretation,
        centralObservation,
        strategicHypothesis: hydrated.content.strategic_hypothesis,
        signals,
        exclusions: splitExclusions(
          hydrated.content.visual_guidance?.negative_prompt,
        ),
        uncertainty: centralObservation
          ? undefined
          : [
              {
                statement: "No approved central observation is stored.",
                reason: "Legacy artifact has no structured reading.",
              },
            ],
        approvedAt: directionApproved ? updatedAt : undefined,
        approvedBy: directionApproved ? hydrated.userId : undefined,
      },
    direction:
      hydrated.editorialDirection || {
        thesis:
          hydrated.content.roadmap?.strategicThesis ||
          hydrated.content.strategic_hypothesis ||
          centralObservation,
        purpose:
          hydrated.content.meta?.intent ||
          hydrated.summary ||
          "Compose the approved reading into an issue.",
        visualPrinciples: [],
        tonalPrinciples: hydrated.tone ? [hydrated.tone] : [],
        exclusions: splitExclusions(
          hydrated.content.visual_guidance?.negative_prompt,
        ),
        palette:
          hydrated.content.visual_guidance?.strict_palette?.length > 0
            ? [...hydrated.content.visual_guidance.strict_palette]
            : [...(hydrated.content.taste_context?.active_palette || [])],
        compositionDensity: clampUnit(
          hydrated.content.visual_guidance?.composition_density,
          0.5,
        ),
        entropyLevel: hydrated.content.roadmap
          ? clampUnit(hydrated.content.roadmap.entropyLevel, 0)
          : undefined,
        intensity: hydrated.content.roadmap?.intensity,
        approved: directionApproved,
        revision,
      },
    issueStructure,
    pages,
    cover: normalizeCover(hydrated),
    colophon:
      hydrated.colophon || {
        creatorHandle: hydrated.userHandle || "Ghost",
        generatedBy: "mimi",
        generatedAt: createdAt,
        publicSourceIds,
        sourceCount:
          sourcePacket.usedContextSnapshots.length +
          sourcePacket.attachedAssets.length,
      },
    publication:
      hydrated.publication || {
        visibility: hydrated.isPublic ? "public" : "private",
        publishedAt: hydrated.publishedAt,
        revision,
      },
    exportState: hydrated.exportState || {},
    revisions: (hydrated.revisions || []).map((entry) => ({
      ...entry,
      changedPageIds: [...entry.changedPageIds],
    })),
    revision,
    createdAt,
    updatedAt,
  };

  return parseMimiZineArtifact(artifact);
}
