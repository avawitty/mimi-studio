import type { ZineContent, ZinePageSpec } from "../../types";
import { buildDefaultSpreadElements } from "../zineSpreadLayout";
import { prepareArtifactPages } from "./zineIssuePlanner";

export interface EnhanceZineLayoutInput {
  content: ZineContent;
  artifactId: string;
}

function seedSpreadLayout(page: ZinePageSpec): ZinePageSpec {
  if (page.customLayout?.elements?.length) return page;

  const elements = buildDefaultSpreadElements(page, {
    imageUrl: page.image_url,
  });
  if (elements.length === 0) return page;

  return {
    ...page,
    customLayout: {
      elements,
      readingOrder: elements.map((element) => element.id),
    },
  };
}

/**
 * Post-process raw model output into authored pages with stable IDs and
 * default spread layouts — without running the editorial issue-plan pipeline.
 */
export function enhanceZineGenerationLayout(
  input: EnhanceZineLayoutInput,
): ZineContent {
  const prepared = prepareArtifactPages(
    input.artifactId,
    input.content.pages || [],
  ).map((page, index) =>
    seedSpreadLayout({
      ...page,
      pageNumber: index + 1,
    }),
  );

  const pagesJson = JSON.stringify(prepared);

  return {
    ...input.content,
    pages: prepared,
    structure: {
      ...input.content.structure,
      pages: prepared,
    },
    pagesJson,
  };
}

export function draftZineArtifactId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `draft-${crypto.randomUUID()}`;
  }
  return `draft-${Date.now()}`;
}
