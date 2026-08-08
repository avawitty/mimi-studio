import type { ZineContent, ZinePageSpec } from "../../types";
import type { UserProfile } from "../../types";
import { listEnabledEditorialPlates } from "../tailor/tailorDefaults";
import { buildDefaultSpreadElements } from "../zineSpreadLayout";
import {
  insertEditorialPlates,
  isCalibrationPlate,
  type EditorialPlateOptions,
} from "./insertEditorialPlates";
import { prepareArtifactPages } from "./zineIssuePlanner";

export interface EnhanceZineLayoutInput {
  content: ZineContent;
  artifactId: string;
  plateOptions?: EditorialPlateOptions;
}

export function editorialPlateOptionsFromProfile(
  profile?: Pick<UserProfile, "disabledPlates" | "tailorDraft"> | null,
): EditorialPlateOptions {
  return {
    enabledPlates: listEnabledEditorialPlates(profile ?? undefined),
  };
}

/** Rebuild calibration plates after owner edits without losing visual pages. */
export function refreshEditorialPlatesInContent(
  content: ZineContent,
  artifactId: string,
  profile?: Pick<UserProfile, "disabledPlates" | "tailorDraft"> | null,
): ZineContent {
  return enhanceZineGenerationLayout({
    content,
    artifactId,
    plateOptions: editorialPlateOptionsFromProfile(profile),
  });
}

function seedSpreadLayout(page: ZinePageSpec): ZinePageSpec {
  if (isCalibrationPlate(page)) return page;
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
  const withPlates = insertEditorialPlates(
    input.content,
    input.plateOptions,
  );
  const prepared = prepareArtifactPages(
    input.artifactId,
    withPlates || [],
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
