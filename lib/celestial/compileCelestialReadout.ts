import type {
  CelestialCalibrationDraft,
  CelestialReadout,
  SunSignComputation,
} from "../../schemas/celestialCalibrationContracts";
import {
  ASTRONOMICAL_SEASON_LABELS,
  computeAstronomicalSeason,
  defaultSeasonalAlignmentPhrase,
  seasonFromEclipticLongitude,
} from "./seasonalAlignment";
import {
  computeTropicalSunSign,
  CUSP_THRESHOLD_DEG,
  signFromEclipticLongitude,
  ZODIAC_SIGN_LABELS,
  ZODIAC_SIGN_ORDER,
} from "./sunSign";
import { computeNatalChartSlice } from "./ephemeris";
import { resolveBirthInstant } from "./resolveBirthInstant";

export const CELESTIAL_SCOPE_NOTICE =
  "Symbolic self-expressive context for creative calibration — not medical, diagnostic, or predictive science.";

export function unsupportedForDraft(
  draft: CelestialCalibrationDraft | null | undefined,
  hasRising: boolean,
): string[] {
  const items: string[] = [];
  const hasTime = Boolean(draft?.birthTime?.trim());
  const hasCoords =
    typeof draft?.birthLatitude === "number" &&
    typeof draft?.birthLongitude === "number";
  const hasTz = Boolean(draft?.birthTimezone?.trim());

  if (!hasRising) {
    if (!hasTime) items.push("Rising / Ascendant (needs birth time)");
    else if (!hasCoords || !hasTz) {
      items.push("Rising / Ascendant (needs resolved place → timezone + coordinates)");
    } else {
      items.push("Rising / Ascendant (could not compute for this instant)");
    }
  }
  if (!hasRising) {
    items.push("Houses (Whole Sign requires Ascendant)");
  }
  items.push("Sidereal / Vedic zodiac frames");
  items.push("Placidus / Koch / other quadrant house systems");
  items.push("Transit forecasts");
  return items;
}

function sunFromEphemerisLongitude(
  lon: number,
  instantNote: string,
): SunSignComputation {
  const { sign, degreesIntoSign } = signFromEclipticLongitude(lon);
  const distToPrev = degreesIntoSign;
  const distToNext = 30 - degreesIntoSign;
  const onCusp =
    distToPrev <= CUSP_THRESHOLD_DEG || distToNext <= CUSP_THRESHOLD_DEG;
  const signIndex = ZODIAC_SIGN_ORDER.indexOf(sign);
  let cuspNeighbor: SunSignComputation["cuspNeighbor"];
  if (onCusp) {
    cuspNeighbor =
      distToPrev <= CUSP_THRESHOLD_DEG
        ? ZODIAC_SIGN_ORDER[(signIndex + 11) % 12]
        : ZODIAC_SIGN_ORDER[(signIndex + 1) % 12];
  }
  return {
    sign,
    method: "ephemeris_sun",
    eclipticLongitudeDeg: Math.round(lon * 1000) / 1000,
    degreesIntoSign: Math.round(degreesIntoSign * 1000) / 1000,
    onCusp,
    cuspNeighbor,
    confidenceNote: onCusp
      ? `Near ingress with ${ZODIAC_SIGN_LABELS[cuspNeighbor!]}. ${instantNote}`
      : `Ephemeris Sun clear of cusps. ${instantNote}`,
  };
}

export function compileCelestialReadout(
  draft: CelestialCalibrationDraft | null | undefined,
): CelestialReadout {
  const enabled = Boolean(draft?.enabled);
  const birthDate = draft?.birthDate?.trim() || "";
  const birthTime = draft?.birthTime?.trim() || undefined;
  const instant = resolveBirthInstant(draft);

  let computed: SunSignComputation | null = null;
  let chart: CelestialReadout["chart"] = null;

  if (instant) {
    chart = computeNatalChartSlice({
      utcDate: instant.utcDate,
      latitude: draft?.birthLatitude,
      longitude: draft?.birthLongitude,
      hasBirthTime: instant.hasBirthTime,
    });
    const sunBody = chart.bodies.find((b) => b.body === "sun");
    if (sunBody) {
      computed = sunFromEphemerisLongitude(
        sunBody.eclipticLongitudeDeg,
        instant.note,
      );
    }
  } else if (birthDate) {
    // Date parse failed for zoned path — keep mean-sun fallback.
    computed = computeTropicalSunSign({ birthDate, birthTime });
  }

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

  const sunLon =
    chart?.bodies.find((b) => b.body === "sun")?.eclipticLongitudeDeg ??
    sun?.eclipticLongitudeDeg;
  const season =
    typeof sunLon === "number"
      ? seasonFromEclipticLongitude(sunLon)
      : birthDate
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
  const risingBit =
    chart?.rising != null
      ? ` · Rising ${ZODIAC_SIGN_LABELS[chart.rising.sign]}`
      : "";
  const derivedPhrase = sun
    ? `Tropical Sun in ${ZODIAC_SIGN_LABELS[sun.sign]}${cuspBit}${risingBit} · ${seasonBit}`
    : null;

  let timingPhrase = "Celestial calibration inactive — enter a birth date.";
  if (enabled && derivedPhrase) {
    timingPhrase = derivedPhrase;
  } else if (enabled && !sun) {
    timingPhrase = "Enabled — enter a birth date to derive tropical Sun.";
  } else if (!enabled && derivedPhrase) {
    timingPhrase = `${derivedPhrase} · not used in generation yet`;
  }

  const hasCoords =
    typeof draft?.birthLatitude === "number" &&
    typeof draft?.birthLongitude === "number";

  return {
    enabled,
    sun,
    astronomicalSeason: season,
    seasonalAlignment,
    timingPhrase,
    scopeNotice: CELESTIAL_SCOPE_NOTICE,
    unsupported: unsupportedForDraft(draft, Boolean(chart?.rising)),
    birthTimezone: instant?.timezone ?? draft?.birthTimezone?.trim() ?? null,
    birthCoordinates: hasCoords
      ? {
          latitude: draft!.birthLatitude!,
          longitude: draft!.birthLongitude!,
          label: draft?.geocodeLabel || draft?.birthLocation,
        }
      : null,
    utcInstant: instant?.utcDate.toISOString() ?? null,
    chart,
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
  if (readout.chart?.summary) parts.push(readout.chart.summary);
  if (readout.seasonalAlignment) parts.push(readout.seasonalAlignment);
  if (lineage) parts.push(`Lineage note: ${lineage}`);
  return parts.join(" · ");
}

/** Structured payload for Oracle Latent Space Translation prompts. */
export function celestialReadoutForOracle(
  draft: CelestialCalibrationDraft | null | undefined,
): Record<string, unknown> {
  const readout = compileCelestialReadout(draft);
  if (!readout.enabled) {
    return {
      enabled: false,
      timingPhrase: readout.timingPhrase,
      scopeNotice: readout.scopeNotice,
      sun: null,
      rising: null,
      astronomicalSeason: null,
      seasonalAlignment: null,
      bodies: [],
      aspects: [],
      houseSystemNote: null,
      birthTimezone: null,
      hasCoordinates: false,
      utcInstant: null,
      unsupported: readout.unsupported,
      lineage: null,
    };
  }
  const topAspects = (readout.chart?.aspects ?? []).slice(0, 8).map((a) => ({
    a: a.a,
    b: a.b,
    kind: a.kind,
    orbDeg: a.orbDeg,
  }));
  const bodies = (readout.chart?.bodies ?? []).map((b) => ({
    body: b.body,
    sign: b.sign,
    degreesIntoSign: b.degreesIntoSign,
    retrograde: b.retrograde ?? false,
  }));
  return {
    enabled: readout.enabled,
    timingPhrase: readout.timingPhrase,
    sun: readout.sun
      ? {
          sign: readout.sun.sign,
          method: readout.sun.method,
          degreesIntoSign: readout.sun.degreesIntoSign,
          onCusp: readout.sun.onCusp,
          confidenceNote: readout.sun.confidenceNote,
        }
      : null,
    rising: readout.chart?.rising
      ? {
          sign: readout.chart.rising.sign,
          degreesIntoSign: readout.chart.rising.degreesIntoSign,
        }
      : null,
    astronomicalSeason: readout.astronomicalSeason,
    seasonalAlignment: readout.seasonalAlignment,
    bodies,
    aspects: topAspects,
    houseSystemNote: readout.chart?.houseSystemNote ?? null,
    birthTimezone: readout.birthTimezone,
    hasCoordinates: Boolean(readout.birthCoordinates),
    utcInstant: readout.utcInstant,
    scopeNotice: readout.scopeNotice,
    unsupported: readout.unsupported,
    lineage: draft?.astrologicalLineage?.trim() || null,
  };
}
