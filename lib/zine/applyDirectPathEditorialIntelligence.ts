import type { MediaFile, UsedContextSnapshot, ZineContent, ZineIssuePlan } from "../../types";
import {
  buildAttachedAssetsFromMedia,
  realizeZineContentFromPlan,
} from "./realizeZineContentFromPlan";
import { seedSpreadLayoutsOnPages } from "./enhanceZineGenerationLayout";

export interface ApplyDirectPathEditorialIntelligenceInput {
  content: ZineContent;
  artifactId: string;
  originalInput?: string;
  fragmentIds?: string[];
  usedContextSnapshots?: UsedContextSnapshot[];
  media?: MediaFile[];
  existingCoverUrl?: string | null;
}

export interface ApplyDirectPathEditorialIntelligenceResult {
  content: ZineContent;
  issuePlan: ZineIssuePlan;
  coverRequiresGeneratedMedia: boolean;
}

/**
 * Runs the deterministic editorial compiler behind the direct Studio path:
 * earned-page rules, structural compression, plan evaluation, and page alignment.
 * Proof UI stays hidden; issuePlan + rationale power Press readiness and export.
 */
export function applyDirectPathEditorialIntelligence(
  input: ApplyDirectPathEditorialIntelligenceInput,
): ApplyDirectPathEditorialIntelligenceResult {
  const realized = realizeZineContentFromPlan({
    content: input.content,
    artifactId: input.artifactId,
    originalInput: input.originalInput,
    fragmentIds: input.fragmentIds,
    usedContextSnapshots: input.usedContextSnapshots,
    attachedAssets: buildAttachedAssetsFromMedia(input.media),
    existingCoverUrl: input.existingCoverUrl,
  });

  const alignedPages = seedSpreadLayoutsOnPages(realized.content.pages || []);
  const pagesJson = JSON.stringify(alignedPages);

  return {
    content: {
      ...realized.content,
      pages: alignedPages,
      structure: {
        ...realized.content.structure,
        pages: alignedPages,
      },
      pagesJson,
    },
    issuePlan: realized.issuePlan,
    coverRequiresGeneratedMedia: realized.coverRequiresGeneratedMedia,
  };
}
