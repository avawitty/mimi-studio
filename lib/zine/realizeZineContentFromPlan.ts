import type {
  EditorialDirection,
  MediaFile,
  UsedContextSnapshot,
  ZineContent,
  ZineCoverSpec,
  ZineIssuePlan,
  ZineReading,
  ZineSourceAsset,
  ZineSourcePacket,
} from "../../types";
import { resolveIssueMode } from "../zineSpreadLayout";
import {
  applyIssuePlanToAuthoredPages,
} from "./applyZineIssuePlan";
import {
  buildZineIssuePlan,
  type BuildZineIssuePlanInput,
} from "./buildZineIssuePlan";
import { prepareArtifactPages } from "./zineIssuePlanner";

export interface RealizeZineContentInput {
  content: ZineContent;
  artifactId: string;
  originalInput?: string;
  fragmentIds?: string[];
  usedContextSnapshots?: UsedContextSnapshot[];
  attachedAssets?: ZineSourceAsset[];
  existingCoverUrl?: string | null;
  revision?: number;
}

export interface RealizeZineContentResult {
  content: ZineContent;
  issuePlan: ZineIssuePlan;
  /** Cover hero still needs image generation (no supplied cover URL). */
  coverRequiresGeneratedMedia: boolean;
}

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
    visibility: { working: true, export: true, public: false },
  };
}

function coverTreatment(content: ZineContent): ZineCoverSpec["treatment"] {
  const mode = resolveIssueMode(content.meta?.mode);
  if (mode === "oracle") return "dark-plate";
  if (mode === "research") return "dossier";
  return "editorial";
}

export function buildPlanInputFromZineContent(
  input: RealizeZineContentInput,
): BuildZineIssuePlanInput {
  const { content, artifactId, originalInput, fragmentIds, usedContextSnapshots } =
    input;
  const authoredPages = prepareArtifactPages(artifactId, content.pages || []);
  const signals = (content.semiotic_signals || []).map((signal) => ({
    ...signal,
    epistemicStatus: signal.epistemicStatus || "unknown",
    sourceIds: signal.sourceIds ? [...signal.sourceIds] : undefined,
  }));
  const centralObservation =
    content.the_reading ||
    content.oracular_mirror ||
    content.vocal_summary_blurb ||
    "";
  const sourcePacket: ZineSourcePacket = {
    originalInput,
    fragmentIds: [...new Set(fragmentIds || [])],
    usedContextSnapshots: usedContextSnapshots || [],
    attachedAssets: input.attachedAssets || [],
    sourceSummary: content.meta?.intent,
  };
  const reading: ZineReading = {
    oracularMirror: content.oracular_mirror || content.poetic_interpretation,
    centralObservation,
    strategicHypothesis: content.strategic_hypothesis,
    signals,
    exclusions: splitExclusions(content.visual_guidance?.negative_prompt),
    uncertainty: centralObservation
      ? undefined
      : [
          {
            statement: "No approved central observation is stored.",
            reason: "Generation draft has no structured reading.",
          },
        ],
  };
  const direction: EditorialDirection = {
    thesis:
      content.roadmap?.strategicThesis ||
      content.strategic_hypothesis ||
      centralObservation ||
      content.title ||
      "Untitled issue",
    purpose:
      content.meta?.intent ||
      sourcePacket.sourceSummary ||
      "Compose the approved reading into an issue.",
    visualPrinciples: [],
    tonalPrinciples: [],
    exclusions: splitExclusions(content.visual_guidance?.negative_prompt),
    palette:
      content.visual_guidance?.strict_palette?.length > 0
        ? [...content.visual_guidance.strict_palette]
        : [...(content.taste_context?.active_palette || [])],
    compositionDensity: clampUnit(content.visual_guidance?.composition_density, 0.5),
    entropyLevel: content.roadmap
      ? clampUnit(content.roadmap.entropyLevel, 0)
      : undefined,
    intensity: content.roadmap?.intensity,
    approved: false,
    revision: input.revision || 1,
  };
  const coverImageUrl =
    input.existingCoverUrl ||
    content.hero_image_url ||
    content.meta?.originalCoverImageUrl ||
    undefined;
  const cover: ZineCoverSpec = {
    imageUrl: coverImageUrl || undefined,
    originalImageUrl: coverImageUrl || undefined,
    title: content.title || "Untitled",
    overlays: [],
    treatment: coverTreatment(content),
    overlayBaked: false,
  };

  return {
    artifactId,
    revision: input.revision || 1,
    title: content.title || "Untitled",
    sourcePacket,
    reading,
    direction,
    cover,
    authoredPages,
    createdAt: Date.now(),
  };
}

export function planAuthoredPageIdsRequiringMedia(plan: ZineIssuePlan): Set<string> {
  const ids = new Set<string>();
  for (const page of plan.pages) {
    if (page.derived || !page.requiresGeneratedMedia || !page.realizedPageId) {
      continue;
    }
    ids.add(page.realizedPageId);
  }
  return ids;
}

export function planCoverRequiresGeneratedMedia(
  plan: ZineIssuePlan,
  existingCoverUrl?: string | null,
): boolean {
  if (existingCoverUrl) return false;
  const cover = plan.pages.find((page) => page.sectionType === "cover");
  return Boolean(cover?.requiresGeneratedMedia);
}

export function draftZineArtifactId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `draft-${crypto.randomUUID()}`;
  }
  return `draft-${Date.now()}`;
}

export function realizeZineContentFromPlan(
  input: RealizeZineContentInput,
): RealizeZineContentResult {
  const planInput = buildPlanInputFromZineContent(input);
  const issuePlan = buildZineIssuePlan(planInput);
  const alignedPages = applyIssuePlanToAuthoredPages(
    input.artifactId,
    planInput.authoredPages,
    issuePlan,
  );
  const coverRequiresGeneratedMedia = planCoverRequiresGeneratedMedia(
    issuePlan,
    planInput.cover.imageUrl || input.existingCoverUrl,
  );

  return {
    content: {
      ...input.content,
      pages: alignedPages,
    },
    issuePlan,
    coverRequiresGeneratedMedia,
  };
}

export function buildAttachedAssetsFromMedia(media: MediaFile[] | undefined): ZineSourceAsset[] {
  return (media || []).map(sourceAssetFromMedia);
}
