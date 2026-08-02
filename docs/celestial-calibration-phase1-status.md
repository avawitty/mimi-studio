# Celestial Calibration — Status

**Status:** Phase 2–4 follow-ups landed (timezone/geocode + ephemeris chart + Oracle readout scoping)  
**Spec:** `docs/celestial-calibration-chamber-spec.md`  
**Verify:** `npm run verify:celestial`

## Shipped

### Phase 1
- Zod contracts: `schemas/celestialCalibrationContracts.ts`
- Tropical mean-sun derivation + cusp notes: `lib/celestial/sunSign.ts` (fallback)
- Astronomical season: `lib/celestial/seasonalAlignment.ts`
- Readout compile + generation timing string: `lib/celestial/compileCelestialReadout.ts`
- Chamber contract: `lib/celestialChamberContract.ts`
- UI: `components/chambers/CelestialCalibrationChamber.tsx` at `/celestial-calibration`
- Canon + nav + App route + `validate:canon`
- `sanitizeProfile` includes enabled celestial timing for zine context

### Phase 2 — Timezone + geocode
- Place resolve API: `POST /api/celestial/geocode` (Nominatim + `tz-lookup`)
- Draft fields: `birthTimezone`, `birthLatitude`, `birthLongitude`, `geocodeLabel`, `geocodeStatus`
- Civil clock → UTC via IANA zone: `lib/celestial/timezone.ts`, `resolveBirthInstant.ts`
- Chamber “Resolve place” control

### Phase 3 — Ephemeris planets / aspects / rising
- Vendor: `astronomy-engine` (documented; no invented positions)
- Bodies + major aspects: `lib/celestial/ephemeris.ts`, `aspects.ts`
- Ascendant + Whole Sign houses when time + coordinates resolve: `risingHouses.ts`
- Readout surfaces chart slice; unsupported list shrinks when rising computes

### Phase 4 — Oracle Latent Space Translation
- `generateCelestialReading` consumes `celestialReadoutForOracle(structured)` instead of dumping the whole profile
- Prompt forbids fabricating rising/houses/aspects absent from the readout JSON

## Still open / non-goals

- Sidereal / Vedic frames
- Placidus / Koch / other quadrant house systems
- Transit forecasts
- Public Stand broadcast of birth data
- Replacing Oracle chat (only Latent Space Translation is scoped)

## Disambiguation

| Thing | Route / home |
| --- | --- |
| Celestial Calibration (personal) | `/celestial-calibration` |
| The Observatory (collective MMM) | `/observatory` |
| Residue per-run M/M/M | `/residue` |
