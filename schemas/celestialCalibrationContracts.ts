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
  "ephemeris_sun",
  "manual_override",
  "unset",
]);

export const celestialBodyIdSchema = z.enum([
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
  "ascendant",
]);

export const aspectKindSchema = z.enum([
  "conjunction",
  "sextile",
  "square",
  "trine",
  "opposition",
]);

export const geocodeStatusSchema = z.enum([
  "unset",
  "resolved",
  "manual",
  "failed",
]);

export const celestialCalibrationDraftSchema = z.object({
  enabled: z.boolean(),
  zodiac: zodiacSignSchema.optional(),
  birthDate: z.string().optional(),
  birthTime: z.string().optional(),
  birthLocation: z.string().optional(),
  /** IANA timezone resolved from geocode or set manually. */
  birthTimezone: z.string().optional(),
  birthLatitude: z.number().min(-90).max(90).optional(),
  birthLongitude: z.number().min(-180).max(180).optional(),
  geocodeLabel: z.string().optional(),
  geocodeStatus: geocodeStatusSchema.optional(),
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

export const natalBodyPositionSchema = z.object({
  body: celestialBodyIdSchema,
  eclipticLongitudeDeg: z.number().min(0).lt(360),
  sign: zodiacSignSchema,
  degreesIntoSign: z.number().min(0).lt(30),
  retrograde: z.boolean().optional(),
});

export const natalAspectSchema = z.object({
  a: celestialBodyIdSchema,
  b: celestialBodyIdSchema,
  kind: aspectKindSchema,
  orbDeg: z.number().min(0),
  exactAngleDeg: z.number(),
});

export const natalHouseCuspSchema = z.object({
  house: z.number().int().min(1).max(12),
  sign: zodiacSignSchema,
  cuspLongitudeDeg: z.number().min(0).lt(360),
});

export const natalChartSliceSchema = z.object({
  ephemeris: z.literal("astronomy-engine"),
  asOfUtc: z.string(),
  bodies: z.array(natalBodyPositionSchema),
  aspects: z.array(natalAspectSchema),
  rising: natalBodyPositionSchema.nullable(),
  houses: z.array(natalHouseCuspSchema).nullable(),
  houseSystemNote: z.string().optional(),
  summary: z.string(),
});

export const placeSuggestionSchema = z.object({
  query: z.string(),
  label: z.string(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  countryCode: z.string().optional(),
});

export const placeResolutionSchema = z.object({
  query: z.string(),
  label: z.string(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timezone: z.string(),
  countryCode: z.string().optional(),
});

export const celestialReadoutSchema = z.object({
  enabled: z.boolean(),
  sun: sunSignComputationSchema.nullable(),
  astronomicalSeason: astronomicalSeasonSchema.nullable(),
  seasonalAlignment: z.string(),
  timingPhrase: z.string(),
  scopeNotice: z.string(),
  unsupported: z.array(z.string()),
  birthTimezone: z.string().nullable(),
  birthCoordinates: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
      label: z.string().optional(),
    })
    .nullable(),
  utcInstant: z.string().nullable(),
  chart: natalChartSliceSchema.nullable(),
});

export type CelestialCalibrationDraft = z.infer<typeof celestialCalibrationDraftSchema>;
export type SunSignComputation = z.infer<typeof sunSignComputationSchema>;
export type CelestialReadout = z.infer<typeof celestialReadoutSchema>;
export type ZodiacSignId = z.infer<typeof zodiacSignSchema>;
export type AstronomicalSeason = z.infer<typeof astronomicalSeasonSchema>;
export type CelestialBodyId = z.infer<typeof celestialBodyIdSchema>;
export type AspectKind = z.infer<typeof aspectKindSchema>;
export type NatalBodyPosition = z.infer<typeof natalBodyPositionSchema>;
export type NatalAspect = z.infer<typeof natalAspectSchema>;
export type NatalHouseCusp = z.infer<typeof natalHouseCuspSchema>;
export type NatalChartSlice = z.infer<typeof natalChartSliceSchema>;
export type PlaceSuggestion = z.infer<typeof placeSuggestionSchema>;
export type PlaceResolution = z.infer<typeof placeResolutionSchema>;
