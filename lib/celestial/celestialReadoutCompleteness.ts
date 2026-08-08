import type { CelestialCalibrationDraft } from "../../schemas/celestialCalibrationContracts";

export interface CelestialReadoutGaps {
  hasBirthDate: boolean;
  hasBirthTime: boolean;
  hasResolvedPlace: boolean;
  missingForFull: string[];
  isNatalComplete: boolean;
}

export function describeCelestialReadoutGaps(
  draft: CelestialCalibrationDraft | null | undefined,
): CelestialReadoutGaps {
  const hasBirthDate = Boolean(draft?.birthDate?.trim());
  const hasBirthTime = Boolean(draft?.birthTime?.trim());
  const hasResolvedPlace =
    draft?.geocodeStatus === "resolved" &&
    typeof draft?.birthLatitude === "number" &&
    typeof draft?.birthLongitude === "number" &&
    Boolean(draft?.birthTimezone?.trim());

  const missingForFull: string[] = [];
  if (!hasBirthDate) missingForFull.push("birth date");
  if (hasBirthDate && !hasBirthTime) {
    missingForFull.push("birth time (for Rising and houses)");
  }
  if (hasBirthDate && hasBirthTime && !hasResolvedPlace) {
    missingForFull.push("resolved birth place (coordinates + timezone)");
  }

  return {
    hasBirthDate,
    hasBirthTime,
    hasResolvedPlace,
    missingForFull,
    isNatalComplete: hasBirthDate,
  };
}

/** User-facing hint when calibration is on but natal chart is incomplete. */
export function celestialNatalCompletionHint(
  draft: CelestialCalibrationDraft | null | undefined,
): string | null {
  if (!draft?.enabled) return null;
  const gaps = describeCelestialReadoutGaps(draft);
  if (gaps.isNatalComplete) return null;
  return "Add your birth date in Celestial Calibration for the full natal readout (Sun, Moon, planets).";
}
