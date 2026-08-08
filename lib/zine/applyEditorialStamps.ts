import type { UserProfile, ZineContent, ZineOwnerPlateSlide } from "../../types";
import { buildChromaticPlatePalette } from "./chromaticPlatePalette";

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
