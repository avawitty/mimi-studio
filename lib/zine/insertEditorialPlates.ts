import type { ZineContent, ZinePageSpec } from "../../types";
import type { EditorialPlateId } from "../tailor/tailorDefaults";

const CALIBRATION_GRAMMARS = new Set([
  "celestial",
  "screenwrite",
  "sonic",
  "signal-index",
  "chromatic",
  "owner-carousel",
]);

export function isCalibrationPlate(page: ZinePageSpec | undefined): boolean {
  return Boolean(page?.grammar && CALIBRATION_GRAMMARS.has(page.grammar));
}

export interface EditorialPlateOptions {
  /** Plate ids to omit (opt-out). When omitted, all plates with content are included. */
  enabledPlates?: EditorialPlateId[];
}

function plateEnabled(
  options: EditorialPlateOptions | undefined,
  plateId: EditorialPlateId,
): boolean {
  if (!options?.enabledPlates) return true;
  return options.enabledPlates.includes(plateId);
}

/**
 * Prepend editorial calibration plates ahead of generated visual pages.
 */
export function insertEditorialPlates(
  content: ZineContent,
  options?: EditorialPlateOptions,
): ZinePageSpec[] {
  const existing = content.pages || [];
  const withoutCalibration = existing.filter((page) => !isCalibrationPlate(page));
  const plates: ZinePageSpec[] = [];

  const screenwrite = content.screenwrite_excerpt?.trim();
  if (screenwrite && plateEnabled(options, "screenwrite")) {
    plates.push({
      pageNumber: 0,
      headline: "Scene",
      bodyCopy: screenwrite,
      supportingText: "Screenwrite · composition plate",
      imagePrompt: "",
      sectionType: "interlude",
      grammar: "screenwrite",
    });
  }

  const palette = content.chromatic_palette;
  if (
    palette?.colors?.length &&
    plateEnabled(options, "chromatic")
  ) {
    plates.push({
      pageNumber: 0,
      headline: "Chromatic Calibration",
      bodyCopy:
        palette.sourceLabel ||
        `${palette.colors.length} calibrated tones for this issue.`,
      supportingText: palette.accent
        ? `Accent · ${palette.accent}`
        : "Palette plate",
      imagePrompt: "",
      sectionType: "interlude",
      grammar: "chromatic",
      plateData: { palette },
    });
  }

  if (
    plateEnabled(options, "celestial") &&
    (content.celestial_readout || content.celestial_calibration?.trim())
  ) {
    plates.push({
      pageNumber: 0,
      headline: "Celestial Calibration",
      bodyCopy: content.celestial_calibration || "",
      supportingText: content.celestial_readout?.issueMomentSummary || "",
      imagePrompt: "",
      sectionType: "interlude",
      grammar: "celestial",
      plateData: content.celestial_readout
        ? { celestialReadout: content.celestial_readout }
        : undefined,
    });
  }

  const signals = content.semiotic_signals?.filter(Boolean) || [];
  if (signals.length > 0 && plateEnabled(options, "signal-index")) {
    plates.push({
      pageNumber: 0,
      headline: "Signal Index",
      bodyCopy: `${signals.length} motif${signals.length === 1 ? "" : "s"} indexed for this issue.`,
      supportingText: "Semiotic signals · editorial commentary",
      imagePrompt: "",
      sectionType: "signal-index",
      grammar: "signal-index",
      plateData: { signals },
    });
  }

  const sonic =
    content.structure?.sonic_layer?.trim() ||
    (content as { sonic_layer?: string }).sonic_layer?.trim();
  if (sonic && plateEnabled(options, "sonic")) {
    plates.push({
      pageNumber: 0,
      headline: "Sonic Layer",
      bodyCopy: sonic,
      supportingText: "Ambient soundscape · composition plate",
      imagePrompt: "",
      sectionType: "interlude",
      grammar: "sonic",
    });
  }

  const ownerSlides = content.owner_plates?.filter(
    (slide) =>
      (slide.kind === "text" && slide.body?.trim()) ||
      (slide.kind === "image" && slide.imageUrl?.trim()),
  );
  if (ownerSlides?.length && plateEnabled(options, "owner-carousel")) {
    plates.push({
      pageNumber: 0,
      headline: "Add your own",
      bodyCopy: `${ownerSlides.length} owner slide${ownerSlides.length === 1 ? "" : "s"} · your refraction`,
      supportingText: "Owner-authored plate · carousel",
      imagePrompt: "",
      sectionType: "interlude",
      grammar: "owner-carousel",
      plateData: { ownerSlides },
    });
  }

  return [...plates, ...withoutCalibration];
}
