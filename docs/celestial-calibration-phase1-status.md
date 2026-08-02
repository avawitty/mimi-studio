# Celestial Calibration — Phase 1 Status

**Status:** Vertical slice landed (chamber + tropical Sun + Tailor persist + generation sanitize)  
**Spec:** `docs/celestial-calibration-chamber-spec.md`  
**Verify:** `npm run verify:celestial`

## Shipped

- Zod contracts: `schemas/celestialCalibrationContracts.ts`
- Tropical mean-sun derivation + cusp notes: `lib/celestial/sunSign.ts`
- Astronomical season: `lib/celestial/seasonalAlignment.ts`
- Readout compile + generation timing string: `lib/celestial/compileCelestialReadout.ts`
- Chamber contract: `lib/celestialChamberContract.ts`
- UI: `components/chambers/CelestialCalibrationChamber.tsx` at `/celestial-calibration`
- Canon + nav + App route + `validate:canon`
- `sanitizeProfile` includes enabled celestial timing for zine context

## Explicit non-goals still open

- Rising / houses / aspects / sidereal
- Timezone + geocode pipeline
- Replacing Oracle Latent Space Translation
- Public Stand broadcast of birth data

## Disambiguation

| Thing | Route / home |
| --- | --- |
| Celestial Calibration (personal) | `/celestial-calibration` |
| The Observatory (collective MMM) | `/observatory` |
| Residue per-run M/M/M | `/residue` |
