import type {
  MediaFile,
  UserProfile,
  UsedContextSnapshot,
  ZineContent,
} from "../../types";
import {
  applyContactSheetToZine,
  applyForecastDriftToZine,
  applyMaterialSpecimenToZine,
  backfillUsedContextAtoms,
} from "./applyEditorialStamps";
import { refreshEditorialPlatesInContent } from "./enhanceZineGenerationLayout";

export interface EnrichEditorialPlateInput {
  artifactId: string;
  profile?: Pick<UserProfile, "disabledPlates" | "tailorDraft"> | null;
  usedContextSnapshots?: UsedContextSnapshot[] | null;
  intakeArtifacts?: MediaFile[] | null;
  /** When false, only backfill stamp fields without rebuilding plate pages. */
  refreshPlates?: boolean;
}

/**
 * Backfill editorial plate stamp fields from metadata/profile, then rebuild
 * calibration pages — so legacy zines gain new plates without full regen.
 */
export function enrichEditorialPlateContent(
  content: ZineContent,
  input: EnrichEditorialPlateInput,
): ZineContent {
  let next = backfillUsedContextAtoms(content, input.usedContextSnapshots);
  next = applyContactSheetToZine(next, input.intakeArtifacts);
  next = applyMaterialSpecimenToZine(next, input.profile);
  next = applyForecastDriftToZine(next, input.profile);
  if (input.refreshPlates === false) return next;
  return refreshEditorialPlatesInContent(
    next,
    input.artifactId,
    input.profile,
  );
}
