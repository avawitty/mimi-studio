/**
 * Normalized generated-artifact input for post-generation Taste Critic.
 */
import type { ZineContent, ZineMetadata } from "../../types.js";

export const GENERATED_ARTIFACT_MEDIA = [
  "editorial",
  "image",
  "writing",
  "ui",
  "brand",
  "fashion",
  "product",
] as const;

export type GeneratedArtifactMedium = (typeof GENERATED_ARTIFACT_MEDIA)[number];

export interface GeneratedArtifactPage {
  text?: string;
  imageRef?: string;
  layoutMetadata?: Record<string, unknown>;
}

export interface GeneratedArtifactForTasteCritique {
  id: string;
  medium: GeneratedArtifactMedium;
  text?: string;
  imageRefs?: string[];
  pages?: GeneratedArtifactPage[];
  generationMetadata?: Record<string, unknown>;
  /** Provenance only — must not be treated as generated output. */
  sourcePromptTags?: string[];
}

export function isCritiquableArtifact(
  artifact: GeneratedArtifactForTasteCritique,
): boolean {
  const pageText = (artifact.pages ?? [])
    .map((p) => p.text ?? "")
    .join(" ")
    .trim();
  const hasText = Boolean(artifact.text?.trim() || pageText);
  const hasImages = (artifact.imageRefs?.length ?? 0) > 0;
  const hasPages = (artifact.pages?.length ?? 0) > 0;
  return Boolean(artifact.id) && (hasText || hasImages || hasPages);
}

export function zineMetadataToGeneratedArtifact(
  zine: Pick<
    ZineMetadata,
    "id" | "title" | "content" | "coverImageUrl" | "tags" | "theme"
  >,
  sourcePromptTags?: string[],
): GeneratedArtifactForTasteCritique {
  const content = zine.content as ZineContent | undefined;
  const pages = content?.pages ?? [];

  const pageEntries: GeneratedArtifactPage[] = pages.map((page) => ({
    text: [page.headline, page.bodyCopy, page.supportingText]
      .filter(Boolean)
      .join("\n"),
    imageRef: page.image_url ?? page.originalMediaUrl,
    layoutMetadata: {
      pageNumber: page.pageNumber,
      sectionType: page.sectionType,
      grammar: page.grammar,
      plateMediaOrigin: page.plateMediaOrigin,
    },
  }));

  const imageRefs = [
    zine.coverImageUrl,
    content?.hero_image_url,
    ...pages.map((p) => p.image_url ?? p.originalMediaUrl),
  ].filter((url): url is string => Boolean(url));

  const aggregateText = [
    zine.title,
    content?.designBrief,
    content?.taste_context?.last_audit_summary,
    ...pages.flatMap((p) => [p.headline, p.bodyCopy, p.supportingText]),
  ]
    .filter(Boolean)
    .join("\n");

  return {
    id: zine.id,
    medium: "editorial",
    text: aggregateText || undefined,
    imageRefs: [...new Set(imageRefs)],
    pages: pageEntries.length > 0 ? pageEntries : undefined,
    generationMetadata: {
      theme: zine.theme,
      tastePalette: content?.taste_context?.active_palette,
      tasteArchetype: content?.taste_context?.active_archetype,
      mode: content?.meta?.mode,
      intent: content?.meta?.intent,
    },
    sourcePromptTags: sourcePromptTags?.length ? sourcePromptTags : undefined,
  };
}
