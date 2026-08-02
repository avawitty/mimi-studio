/**
 * Tropical sun-sign derivation from civil birth date/time.
 *
 * Uses a Meeus-style mean-sun approximation (geocentric ecliptic longitude).
 * Accurate enough for unambiguous sun-sign assignment on modern dates;
 * near-ingress (±1°) is flagged as cusp rather than silently rounded.
 *
 * Mean-sun fallback when ephemeris path is unavailable. Prefer
 * astronomy-engine Sun via compileCelestialReadout when a birth instant resolves.
 */

import type { ZodiacSignId } from "../../schemas/celestialCalibrationContracts";
import type { SunSignComputation } from "../../schemas/celestialCalibrationContracts";

export const ZODIAC_SIGN_ORDER: ZodiacSignId[] = [
  "aries",
  "taurus",
  "gemini",
  "cancer",
  "leo",
  "virgo",
  "libra",
  "scorpio",
  "sagittarius",
  "capricorn",
  "aquarius",
  "pisces",
];

export const ZODIAC_SIGN_LABELS: Record<ZodiacSignId, string> = {
  aries: "Aries",
  taurus: "Taurus",
  gemini: "Gemini",
  cancer: "Cancer",
  leo: "Leo",
  virgo: "Virgo",
  libra: "Libra",
  scorpio: "Scorpio",
  sagittarius: "Sagittarius",
  capricorn: "Capricorn",
  aquarius: "Aquarius",
  pisces: "Pisces",
};

/** Degrees from sign boundary treated as cusp adjacency. */
export const CUSP_THRESHOLD_DEG = 1;

/**
 * Julian Day Number (UTC) for a civil instant.
 * Algorithm from Meeus, Astronomical Algorithms (integer-day + fraction).
 */
export function julianDayUtc(
  year: number,
  month: number,
  day: number,
  hourUtc = 12,
  minute = 0,
  second = 0,
): number {
  let y = year;
  let m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  const dayFraction = (hourUtc + minute / 60 + second / 3600) / 24;
  return (
    Math.floor(365.25 * (y + 4716)) +
    Math.floor(30.6001 * (m + 1)) +
    day +
    dayFraction +
    B -
    1524.5
  );
}

/**
 * Approximate tropical geocentric ecliptic longitude of the Sun (degrees 0–360).
 * Simplified equation-of-center; typical error ≪ 0.02° for 1900–2100 — well
 * inside the 30° sign bands except within minutes of an ingress.
 */
export function approximateSunEclipticLongitudeDeg(jd: number): number {
  const T = (jd - 2451545.0) / 36525;
  // Mean longitude + aberration-ish constant term (Meeus ch. 25, truncated)
  let L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  L0 = ((L0 % 360) + 360) % 360;

  let M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
  M = ((M % 360) + 360) % 360;
  const Mrad = (M * Math.PI) / 180;

  const C =
    (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mrad) +
    (0.019993 - 0.000101 * T) * Math.sin(2 * Mrad) +
    0.000289 * Math.sin(3 * Mrad);

  let lambda = L0 + C;
  // Approximate nutation/aberration offset kept tiny; tropical frame ≈ mean equinox of date for sign work
  lambda = ((lambda % 360) + 360) % 360;
  return lambda;
}

export function signFromEclipticLongitude(longitudeDeg: number): {
  sign: ZodiacSignId;
  degreesIntoSign: number;
} {
  const lon = ((longitudeDeg % 360) + 360) % 360;
  const index = Math.floor(lon / 30) % 12;
  return {
    sign: ZODIAC_SIGN_ORDER[index],
    degreesIntoSign: lon - index * 30,
  };
}

export function parseBirthDateParts(birthDate: string): {
  year: number;
  month: number;
  day: number;
} | null {
  const trimmed = birthDate.trim();
  // Prefer ISO YYYY-MM-DD
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (iso) {
    const year = Number(iso[1]);
    const month = Number(iso[2]);
    const day = Number(iso[3]);
    if (!isValidCivilDate(year, month, day)) return null;
    return { year, month, day };
  }
  // Also accept MM/DD/YYYY
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (us) {
    const month = Number(us[1]);
    const day = Number(us[2]);
    const year = Number(us[3]);
    if (!isValidCivilDate(year, month, day)) return null;
    return { year, month, day };
  }
  return null;
}

export function parseBirthTimeParts(birthTime?: string): {
  hour: number;
  minute: number;
  second: number;
  specified: boolean;
} {
  if (!birthTime || !birthTime.trim()) {
    return { hour: 12, minute: 0, second: 0, specified: false };
  }
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(birthTime.trim());
  if (!m) {
    return { hour: 12, minute: 0, second: 0, specified: false };
  }
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  const second = m[3] ? Number(m[3]) : 0;
  if (hour > 23 || minute > 59 || second > 59) {
    return { hour: 12, minute: 0, second: 0, specified: false };
  }
  return { hour, minute, second, specified: true };
}

function isValidCivilDate(year: number, month: number, day: number): boolean {
  if (year < 1 || year > 9999 || month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }
  const dt = new Date(Date.UTC(year, month - 1, day));
  return (
    dt.getUTCFullYear() === year &&
    dt.getUTCMonth() === month - 1 &&
    dt.getUTCDate() === day
  );
}

export function computeTropicalSunSign(input: {
  birthDate: string;
  birthTime?: string;
  /** Treat civil clock as UTC when no timezone is available. */
  assumeUtc?: boolean;
}): SunSignComputation | null {
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
  const { sign, degreesIntoSign } = signFromEclipticLongitude(lon);

  const distToPrev = degreesIntoSign;
  const distToNext = 30 - degreesIntoSign;
  const onCusp = distToPrev <= CUSP_THRESHOLD_DEG || distToNext <= CUSP_THRESHOLD_DEG;
  const signIndex = ZODIAC_SIGN_ORDER.indexOf(sign);
  let cuspNeighbor: ZodiacSignId | undefined;
  if (onCusp) {
    cuspNeighbor =
      distToPrev <= CUSP_THRESHOLD_DEG
        ? ZODIAC_SIGN_ORDER[(signIndex + 11) % 12]
        : ZODIAC_SIGN_ORDER[(signIndex + 1) % 12];
  }

  const timeNote = time.specified
    ? "Birth time applied as UTC (timezone pipeline not yet wired)."
    : "No birth time — computed at 12:00 UTC; cusp days may flip with local time.";

  return {
    sign,
    method: "tropical_mean_sun",
    eclipticLongitudeDeg: Math.round(lon * 1000) / 1000,
    degreesIntoSign: Math.round(degreesIntoSign * 1000) / 1000,
    onCusp,
    cuspNeighbor,
    confidenceNote: onCusp
      ? `Near ingress with ${ZODIAC_SIGN_LABELS[cuspNeighbor!]}. ${timeNote}`
      : `Tropical Sun clear of cusps. ${timeNote}`,
  };
}
