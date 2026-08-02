/**
 * Ephemeris-backed natal positions via astronomy-engine (VSOP87 / ELP).
 * Never invents positions when the birth instant cannot be resolved.
 */

import type {
  CelestialBodyId,
  NatalBodyPosition,
  NatalChartSlice,
} from "../../schemas/celestialCalibrationContracts";
import { Astronomy } from "./astronomyEngine";

type Body = (typeof Astronomy.Body)[keyof typeof Astronomy.Body];
import { CELESTIAL_BODY_LABELS } from "./bodyLabels";
import { signFromEclipticLongitude, ZODIAC_SIGN_LABELS } from "./sunSign";
import { computeMajorAspects } from "./aspects";
import { computeRisingAndWholeSignHouses } from "./risingHouses";

export { CELESTIAL_BODY_LABELS };

const BODY_ORDER: CelestialBodyId[] = [
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto",
];

const BODY_TO_ENGINE: Record<Exclude<CelestialBodyId, "sun" | "ascendant">, Body> = {
  moon: Astronomy.Body.Moon,
  mercury: Astronomy.Body.Mercury,
  venus: Astronomy.Body.Venus,
  mars: Astronomy.Body.Mars,
  jupiter: Astronomy.Body.Jupiter,
  saturn: Astronomy.Body.Saturn,
  uranus: Astronomy.Body.Uranus,
  neptune: Astronomy.Body.Neptune,
  pluto: Astronomy.Body.Pluto,
};

function longitudeForBody(body: CelestialBodyId, date: Date): number {
  if (body === "sun") {
    return Astronomy.SunPosition(date).elon;
  }
  if (body === "ascendant") {
    throw new Error("Ascendant longitude is computed via risingHouses, not ephemeris body path.");
  }
  return Astronomy.EclipticLongitude(BODY_TO_ENGINE[body], date);
}

function isRetrograde(body: CelestialBodyId, date: Date): boolean | undefined {
  if (body === "sun" || body === "moon" || body === "ascendant") return undefined;
  const engineBody = BODY_TO_ENGINE[body];
  const lon0 = Astronomy.EclipticLongitude(engineBody, date);
  const later = new Date(date.getTime() + 24 * 60 * 60 * 1000);
  const lon1 = Astronomy.EclipticLongitude(engineBody, later);
  let delta = lon1 - lon0;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return delta < 0;
}

export function computeNatalBodies(utcDate: Date): NatalBodyPosition[] {
  return BODY_ORDER.map((body) => {
    const lon = ((longitudeForBody(body, utcDate) % 360) + 360) % 360;
    const { sign, degreesIntoSign } = signFromEclipticLongitude(lon);
    return {
      body,
      eclipticLongitudeDeg: Math.round(lon * 1000) / 1000,
      sign,
      degreesIntoSign: Math.round(degreesIntoSign * 1000) / 1000,
      retrograde: isRetrograde(body, utcDate),
    };
  });
}

export function computeNatalChartSlice(input: {
  utcDate: Date;
  latitude?: number;
  longitude?: number;
  hasBirthTime: boolean;
}): NatalChartSlice {
  const bodies = computeNatalBodies(input.utcDate);
  const aspects = computeMajorAspects(bodies);

  let rising = null;
  let houses: NatalChartSlice["houses"] = null;
  let houseSystemNote: string | undefined;

  if (
    input.hasBirthTime &&
    typeof input.latitude === "number" &&
    typeof input.longitude === "number" &&
    Number.isFinite(input.latitude) &&
    Number.isFinite(input.longitude)
  ) {
    const risingSlice = computeRisingAndWholeSignHouses({
      utcDate: input.utcDate,
      latitude: input.latitude,
      longitude: input.longitude,
    });
    rising = risingSlice.rising;
    houses = risingSlice.houses;
    houseSystemNote = risingSlice.houseSystemNote;
  }

  return {
    ephemeris: "astronomy-engine",
    asOfUtc: input.utcDate.toISOString(),
    bodies,
    aspects,
    rising,
    houses,
    houseSystemNote,
    summary: summarizeChart({ bodies, rising, aspects }),
  };
}

function summarizeChart(input: {
  bodies: NatalBodyPosition[];
  rising: NatalBodyPosition | null;
  aspects: NatalChartSlice["aspects"];
}): string {
  const sun = input.bodies.find((b) => b.body === "sun");
  const moon = input.bodies.find((b) => b.body === "moon");
  const bits: string[] = [];
  if (sun) bits.push(`Sun ${ZODIAC_SIGN_LABELS[sun.sign]}`);
  if (moon) bits.push(`Moon ${ZODIAC_SIGN_LABELS[moon.sign]}`);
  if (input.rising) bits.push(`Rising ${ZODIAC_SIGN_LABELS[input.rising.sign]}`);
  if (input.aspects.length > 0) {
    bits.push(`${input.aspects.length} major aspect${input.aspects.length === 1 ? "" : "s"}`);
  }
  return bits.join(" · ");
}
