/**
 * Celestial Calibration contracts — personal tropical timing context.
 * Distinct from The Observatory (collective Mean Median Mode).
 */

import { z } from "zod";

export const zodiacSignSchema = z.enum([
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
]);

export const astronomicalSeasonSchema = z.enum([
  "spring",
  "summer",
  "autumn",
  "winter",
]);

export const sunSignDerivationMethodSchema = z.enum([
  "tropical_mean_sun",
  "manual_override",
  "unset",
]);

export const celestialCalibrationDraftSchema = z.object({
  enabled: z.boolean(),
  zodiac: zodiacSignSchema.optional(),
  birthDate: z.string().optional(),
  birthTime: z.string().optional(),
  birthLocation: z.string().optional(),
  astrologicalLineage: z.string().optional(),
  seasonalAlignment: z.string().optional(),
  /** When true, chamber keeps a user-chosen sun sign instead of recomputing. */
  zodiacLocked: z.boolean().optional(),
});

export const sunSignComputationSchema = z.object({
  sign: zodiacSignSchema,
  method: sunSignDerivationMethodSchema,
  eclipticLongitudeDeg: z.number().min(0).lt(360).optional(),
  degreesIntoSign: z.number().min(0).lt(30).optional(),
  onCusp: z.boolean(),
  cuspNeighbor: zodiacSignSchema.optional(),
  confidenceNote: z.string(),
});

export const celestialReadoutSchema = z.object({
  enabled: z.boolean(),
  sun: sunSignComputationSchema.nullable(),
  astronomicalSeason: astronomicalSeasonSchema.nullable(),
  seasonalAlignment: z.string(),
  timingPhrase: z.string(),
  scopeNotice: z.string(),
  unsupported: z.array(z.string()),
});

export type CelestialCalibrationDraft = z.infer<typeof celestialCalibrationDraftSchema>;
export type SunSignComputation = z.infer<typeof sunSignComputationSchema>;
export type CelestialReadout = z.infer<typeof celestialReadoutSchema>;
export type ZodiacSignId = z.infer<typeof zodiacSignSchema>;
export type AstronomicalSeason = z.infer<typeof astronomicalSeasonSchema>;
