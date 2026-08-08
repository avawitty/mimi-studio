import type {
  UserProfile,
  UsedContextSnapshot,
  ZineContent,
  ZineOwnerPlateSlide,
} from "../../types";
import { buildChromaticPlatePalette } from "./chromaticPlatePalette";
import {
  buildContactSheetFrames,
  buildForecastDriftFromProfile,
  buildMaterialSpecimenFromProfile,
  buildUsedContextAtoms,
} from "./buildPlateStampData";

function cloneSlides(slides: ZineOwnerPlateSlide[]): ZineOwnerPlateSlide[] {
  return slides.map((slide) => ({ ...slide }));
}

/** Stamp chromatic palette from Tailor + issue guidance onto zine content. */
export function applyChromaticPaletteToZine<T extends ZineContent>(
  content: T,
  profile?: Pick<UserProfile, "tailorDraft"> | null,
): T {
  const palette = buildChromaticPlatePalette(content, profile?.tailorDraft);
  if (!palette) return content;
  return { ...content, chromatic_palette: palette };
}

/** Copy profile owner plate templates when the issue has none yet. */
export function applyOwnerPlatesToZine<T extends ZineContent>(
  content: T,
  profile?: Pick<UserProfile, "ownerPlateTemplates"> | null,
): T {
  if (content.owner_plates?.length) return content;
  const templates = profile?.ownerPlateTemplates;
  if (!templates?.length) return content;
  return { ...content, owner_plates: cloneSlides(templates) };
}

/** Stamp approved Used Context atoms from generation opts. */
export function applyUsedContextToZine<T extends ZineContent>(
  content: T,
  entries?: Parameters<typeof buildUsedContextAtoms>[0],
): T {
  if (content.used_context_atoms?.length) return content;
  const atoms = buildUsedContextAtoms(entries);
  if (!atoms.length) return content;
  return { ...content, used_context_atoms: atoms };
}

/** Stamp intake image frames from studio media for the contact-sheet plate. */
export function applyContactSheetToZine<T extends ZineContent>(
  content: T,
  media?: Parameters<typeof buildContactSheetFrames>[0],
): T {
  if (content.contact_sheet_frames?.length) return content;
  const frames = buildContactSheetFrames(media);
  if (!frames.length) return content;
  return { ...content, contact_sheet_frames: frames };
}

/** Stamp Tailor materiality for the material-specimen plate. */
export function applyMaterialSpecimenToZine<T extends ZineContent>(
  content: T,
  profile?: Pick<UserProfile, "tailorDraft"> | null,
): T {
  if (content.material_specimen) return content;
  const specimen = buildMaterialSpecimenFromProfile(profile);
  if (!specimen) return content;
  return { ...content, material_specimen: specimen };
}

/** Stamp strategic drift vectors for the forecast-drift plate. */
export function applyForecastDriftToZine<T extends ZineContent>(
  content: T,
  profile?: Pick<UserProfile, "tailorDraft"> | null,
): T {
  if (content.forecast_drift) return content;
  const drift = buildForecastDriftFromProfile(profile);
  if (!drift) return content;
  return { ...content, forecast_drift: drift };
}

/** Backfill used-context atoms from metadata snapshots when content lacks them. */
export function backfillUsedContextAtoms<T extends ZineContent>(
  content: T,
  snapshots?: UsedContextSnapshot[] | null,
): T {
  if (content.used_context_atoms?.length || !snapshots?.length) return content;
  return { ...content, used_context_atoms: snapshots.map((snap) => ({ ...snap })) };
}
