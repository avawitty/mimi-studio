import type { ZineContent, ZinePageSpec } from "../../types";
import type { EditorialPlateId } from "../tailor/tailorDefaults";

const CALIBRATION_GRAMMARS = new Set([
  "celestial",
  "screenwrite",
  "sonic",
  "signal-index",
  "chromatic",
  "owner-carousel",
  "used-context",
  "contact-sheet",
  "material-specimen",
  "forecast-drift",
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

  const contactFrames = content.contact_sheet_frames?.filter(
    (frame) => frame.imageUrl?.trim(),
  );
  if (contactFrames?.length && plateEnabled(options, "contact-sheet")) {
    plates.push({
      pageNumber: 0,
      headline: "Contact Sheet",
      bodyCopy: `${contactFrames.length} intake frame${contactFrames.length === 1 ? "" : "s"} · capture evidence`,
      supportingText: "Intake grid · before interpretation",
      imagePrompt: "",
      sectionType: "evidence",
      grammar: "contact-sheet",
      plateData: { contactSheetFrames: contactFrames },
    });
  }

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
  if (palette?.colors?.length && plateEnabled(options, "chromatic")) {
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

  const specimen = content.material_specimen;
  if (
    specimen &&
    plateEnabled(options, "material-specimen") &&
    (specimen.materiality.length > 0 || specimen.silhouettes.length > 0)
  ) {
    plates.push({
      pageNumber: 0,
      headline: "Material Specimen",
      bodyCopy:
        specimen.sourceLabel ||
        `${specimen.materiality.length} material signal${specimen.materiality.length === 1 ? "" : "s"}`,
      supportingText: specimen.eraBias
        ? `Era bias · ${specimen.eraBias}`
        : "Handled materiality",
      imagePrompt: "",
      sectionType: "evidence",
      grammar: "material-specimen",
      plateData: { materialSpecimen: specimen },
    });
  }

  const drift = content.forecast_drift;
  if (
    drift &&
    plateEnabled(options, "forecast-drift") &&
    (drift.oversaturatedClusters.length > 0 ||
      drift.fragileDifferentiators.length > 0 ||
      typeof drift.driftVulnerability === "number")
  ) {
    plates.push({
      pageNumber: 0,
      headline: "Forecast Drift",
      bodyCopy:
        drift.sourceLabel ||
        "Strategic drift vectors from Tailor saturation awareness.",
      supportingText: drift.isDemonstration
        ? "Demonstration data · not live forecast"
        : "Tailor strategic vectors",
      imagePrompt: "",
      sectionType: "evidence",
      grammar: "forecast-drift",
      plateData: { forecastDrift: drift },
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

  const usedAtoms = content.used_context_atoms?.filter(
    (atom) => atom.title?.trim() || atom.content?.trim(),
  );
  if (usedAtoms?.length && plateEnabled(options, "used-context")) {
    plates.push({
      pageNumber: 0,
      headline: "Used Context",
      bodyCopy: `${usedAtoms.length} approved atom${usedAtoms.length === 1 ? "" : "s"} · memory the creator filed before composition.`,
      supportingText: "Provenance plate · not chat history",
      imagePrompt: "",
      sectionType: "colophon",
      grammar: "used-context",
      plateData: { usedContextAtoms: usedAtoms },
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
