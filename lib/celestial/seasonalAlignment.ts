/**
 * Astronomical season from tropical solar longitude (not aesthetic seasons).
 */

import type { AstronomicalSeason } from "../../schemas/celestialCalibrationContracts";
import {
  approximateSunEclipticLongitudeDeg,
  julianDayUtc,
  parseBirthDateParts,
  parseBirthTimeParts,
} from "./sunSign";

export const ASTRONOMICAL_SEASON_LABELS: Record<AstronomicalSeason, string> = {
  spring: "Spring",
  summer: "Summer",
  autumn: "Autumn",
  winter: "Winter",
};

/** Season from tropical solar longitude (0° = vernal equinox). */
export function seasonFromEclipticLongitude(longitudeDeg: number): AstronomicalSeason {
  const lon = ((longitudeDeg % 360) + 360) % 360;
  if (lon < 90) return "spring";
  if (lon < 180) return "summer";
  if (lon < 270) return "autumn";
  return "winter";
}

export function computeAstronomicalSeason(input: {
  birthDate: string;
  birthTime?: string;
}): AstronomicalSeason | null {
  const parts = parseBirthDateParts(input.birthDate);
  if (!parts) return null;
  const time = parseBirthTimeParts(input.birthTime);
  const jd = julianDayUtc(
    parts.year,
    parts.month,
    parts.day,
    time.hour,
    time.minute,
    time.second,
  );
  const lon = approximateSunEclipticLongitudeDeg(jd);
  return seasonFromEclipticLongitude(lon);
}

export function defaultSeasonalAlignmentPhrase(season: AstronomicalSeason | null): string {
  if (!season) return "";
  switch (season) {
    case "spring":
      return "Vernal orientation — emergence, green shoot, open aperture.";
    case "summer":
      return "Solstitial heat — saturation, long light, high contrast.";
    case "autumn":
      return "Autumnal turn — harvest, archive, tapering light.";
    case "winter":
      return "Hibernal stillness — compression, interior, slow burn.";
    default: {
      const _exhaustive: never = season;
      return _exhaustive;
    }
  }
}
