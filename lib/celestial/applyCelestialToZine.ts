import type { CelestialCalibrationDraft, CelestialReadout } from "../../schemas/celestialCalibrationContracts";
import { ZODIAC_SIGN_LABELS } from "./sunSign";
import {
  ASTRONOMICAL_SEASON_LABELS,
  seasonFromEclipticLongitude,
} from "./seasonalAlignment";
import {
  CELESTIAL_SCOPE_NOTICE,
  compileCelestialReadout,
} from "./compileCelestialReadout";
import { computeNatalChartSlice } from "./ephemeris";

export interface ZineCelestialStamp {
  /** Authoritative timing line shown in the zine reveal. */
  calibration: string;
  /** Natal / profile readout when calibration is enabled. */
  natal: CelestialReadout | null;
  /** Sky at issue composition (generation) time — ephemeris-backed. */
  issueMomentUtc: string;
  issueMomentSummary: string;
  scopeNotice: string;
}

function issueMomentSummary(asOf: Date): string {
  const chart = computeNatalChartSlice({
    utcDate: asOf,
    hasBirthTime: false,
  });
  const sun = chart.bodies.find((body) => body.body === "sun");
  const moon = chart.bodies.find((body) => body.body === "moon");
  const season = sun
    ? ASTRONOMICAL_SEASON_LABELS[seasonFromEclipticLongitude(sun.eclipticLongitudeDeg)]
    : null;
  const bits: string[] = [];
  if (sun) bits.push(`Sun ${ZODIAC_SIGN_LABELS[sun.sign]}`);
  if (moon) bits.push(`Moon ${ZODIAC_SIGN_LABELS[moon.sign]}`);
  if (season) bits.push(season);
  if (chart.aspects.length > 0) {
    bits.push(
      `${chart.aspects.length} major aspect${chart.aspects.length === 1 ? "" : "s"} active`,
    );
  }
  return bits.length > 0
    ? `Issue composed under ${bits.join(" · ")}`
    : "Issue composed under current sky";
}

export function buildZineCelestialStamp(
  draft: CelestialCalibrationDraft | null | undefined,
  asOf: Date = new Date(),
): ZineCelestialStamp {
  const natal = draft?.enabled ? compileCelestialReadout(draft) : null;
  const momentSummary = issueMomentSummary(asOf);

  if (natal?.enabled && natal.sun) {
    const parts = [natal.timingPhrase, momentSummary];
    if (natal.seasonalAlignment?.trim()) parts.push(natal.seasonalAlignment);
    if (draft?.astrologicalLineage?.trim()) {
      parts.push(`Lineage: ${draft.astrologicalLineage.trim()}`);
    }
    return {
      calibration: parts.join(" · "),
      natal,
      issueMomentUtc: asOf.toISOString(),
      issueMomentSummary: momentSummary,
      scopeNotice: CELESTIAL_SCOPE_NOTICE,
    };
  }

  return {
    calibration: momentSummary,
    natal: null,
    issueMomentUtc: asOf.toISOString(),
    issueMomentSummary: momentSummary,
    scopeNotice: CELESTIAL_SCOPE_NOTICE,
  };
}

/** Stamp ephemeris-backed celestial fields onto generated zine content. */
export function applyCelestialToZine<T extends { celestial_calibration?: string; celestial_readout?: ZineCelestialStamp }>(
  content: T,
  draft: CelestialCalibrationDraft | null | undefined,
  asOf: Date = new Date(),
): T {
  const stamp = buildZineCelestialStamp(draft, asOf);
  return {
    ...content,
    celestial_calibration: stamp.calibration,
    celestial_readout: stamp,
  };
}
