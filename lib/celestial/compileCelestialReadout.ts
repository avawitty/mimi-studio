import type {
  CelestialCalibrationDraft,
  CelestialReadout,
} from "../../schemas/celestialCalibrationContracts";
import {
  ASTRONOMICAL_SEASON_LABELS,
  computeAstronomicalSeason,
  defaultSeasonalAlignmentPhrase,
} from "./seasonalAlignment";
import {
  computeTropicalSunSign,
  ZODIAC_SIGN_LABELS,
} from "./sunSign";

export const CELESTIAL_SCOPE_NOTICE =
  "Symbolic self-expressive context for creative calibration — not medical, diagnostic, or predictive science.";

export const CELESTIAL_UNSUPPORTED_PHASE1 = [
  "Rising / Ascendant (needs birth time + timezone + coordinates)",
  "Houses and house systems",
  "Planetary aspects and transits",
  "Sidereal / Vedic zodiac frames",
  "Live ephemeris vendor integration",
] as const;

export function compileCelestialReadout(
  draft: CelestialCalibrationDraft | null | undefined,
): CelestialReadout {
  const enabled = Boolean(draft?.enabled);
  const birthDate = draft?.birthDate?.trim() || "";
  const birthTime = draft?.birthTime?.trim() || undefined;

  const computed = birthDate
    ? computeTropicalSunSign({ birthDate, birthTime })
    : null;

  const sun =
    draft?.zodiacLocked && draft.zodiac
      ? {
          sign: draft.zodiac,
          method: "manual_override" as const,
          onCusp: false,
          confidenceNote:
            "Sun sign locked manually — not recomputed from birth date.",
        }
      : computed;

  const season = birthDate
    ? computeAstronomicalSeason({ birthDate, birthTime })
    : null;

  const seasonalAlignment =
    draft?.seasonalAlignment?.trim() ||
    defaultSeasonalAlignmentPhrase(season);

  const seasonBit = season
    ? ASTRONOMICAL_SEASON_LABELS[season]
    : "Season unset";
  const cuspBit =
    sun?.onCusp && sun.cuspNeighbor
      ? ` · cusp toward ${ZODIAC_SIGN_LABELS[sun.cuspNeighbor]}`
      : "";
  const derivedPhrase = sun
    ? `Tropical Sun in ${ZODIAC_SIGN_LABELS[sun.sign]}${cuspBit} · ${seasonBit}`
    : null;

  let timingPhrase = "Celestial calibration inactive — enter a birth date.";
  if (enabled && derivedPhrase) {
    timingPhrase = derivedPhrase;
  } else if (enabled && !sun) {
    timingPhrase = "Enabled — enter a birth date to derive tropical Sun.";
  } else if (!enabled && derivedPhrase) {
    timingPhrase = `${derivedPhrase} · not used in generation yet`;
  }

  return {
    enabled,
    sun,
    astronomicalSeason: season,
    seasonalAlignment,
    timingPhrase,
    scopeNotice: CELESTIAL_SCOPE_NOTICE,
    unsupported: [...CELESTIAL_UNSUPPORTED_PHASE1],
  };
}

/** Compact string for zine / generation context when calibration is enabled. */
export function celestialTimingForGeneration(
  draft: CelestialCalibrationDraft | null | undefined,
): string | null {
  if (!draft?.enabled) return null;
  const readout = compileCelestialReadout(draft);
  if (!readout.sun) return null;
  const lineage = draft.astrologicalLineage?.trim();
  const parts = [readout.timingPhrase];
  if (readout.seasonalAlignment) parts.push(readout.seasonalAlignment);
  if (lineage) parts.push(`Lineage note: ${lineage}`);
  return parts.join(" · ");
}
