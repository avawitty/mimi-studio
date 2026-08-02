# Celestial Calibration Chamber — Product and Functional Specification

Status: Phases 1–4 landed (Sun/season → timezone/geocode → ephemeris chart → Oracle readout scoping)  
Recommended route: `/celestial-calibration`  
Aliases: `/celestial`, `/natal`, `/zodiac`  
Recommended navigation: Create → Celestial Calibration  
Not this chamber: **The Observatory** (collective Mean Median Mode)

## Product restatement

The Celestial Calibration Chamber lets a creator record birth data and derive **accurate tropical Sun + seasonal orientation** as reusable creative context.

It is not:

- a fortune-telling product;
- collective cultural statistics (that is The Observatory);
- the poetic zine field `celestial_calibration` alone (atmospheric timing copy);
- the Oracle “Latent Space Translation” metaphor (aesthetic DNA prose).

It is a first-class home for structured `tailorDraft.celestialCalibration`, with honest scope about what can and cannot be computed without inventing natal math.

## Why this deserves its own chamber

Today celestial work is scattered and inaccurate:

| Surface | Reality |
| --- | --- |
| Tailor draft fields | Typed + persisted in extensions; **no live editor** |
| Profile `zodiacSign` / birth fields | Typed; rarely written |
| Zine `celestial_calibration` | LLM poetic timing string; Tailor celestial **omitted** from `sanitizeProfile` |
| Oracle / Sanctuary | “Latent Space Translation” — aesthetic metaphor, not natal math |
| Evidence intake | Correctly labels birth charts as symbolic self-expression |

A dedicated chamber:

- owns the editor and derivation UX;
- computes tropical Sun from birth date (optional time) instead of free-picking costume astrology;
- feeds Tailor + generation when enabled;
- keeps symbolic framing explicit;
- stays namespaced away from Observatory / Residue MMM.

## Core user story

As a creator, I want my birth timing recorded and derived accurately so Studio and Tailor can use it as intentional context — without pretending Mimi casts a full chart yet.

### Supporting stories

As a Tailor user, I want celestial fields editable in one place, not buried dead code.

As an editor, I want zine timing to optionally reflect my calibrated Sun/season when I opt in.

As a privacy-conscious user, I want location/time stored for future rising/houses without inventing rising signs today.

## Accuracy standards (locked)

1. **Tropical Sun** from astronomy-engine ephemeris when a birth instant resolves; Meeus mean-sun remains fallback.  
2. **Cusp honesty** — within 1° of ingress, surface neighbor + confidence note.  
3. **Missing time** — compute at local noon when timezone is known, else 12:00 UTC, and say so.  
4. **Timezone** — civil clock interpreted in resolved IANA zone; without zone, treat as UTC and say so.  
5. **Rising / houses** — only when birth time + coordinates resolve; Whole Sign from Ascendant. Never invent.  
6. **Planets / aspects** — ephemeris-backed major aspects only; list remaining systems as unsupported.  
7. **Symbolic notice** — self-expressive creative context, not science.  
8. **Manual lock** — user may override Sun; method becomes `manual_override`.

## Primary flow

### 1. Open

1. Navigate to Celestial Calibration.
2. Read thesis + Observatory disambiguation + symbolic notice.

### 2. Enter birth data

1. Birth date (required for derivation).
2. Optional birth time (local civil clock).
3. Optional birth location → **Resolve place** (geocode + IANA timezone + coordinates).
4. Toggle **Use in generation**.

### 3. Review readout

1. Derived tropical Sun, Moon/planets, major aspects; Rising + Whole Sign houses when time + place resolve.
2. Accept derived Sun into draft, or lock a manual sign.
3. Edit seasonal alignment and lineage notes.

### 4. Save

1. Persist `tailorDraft.celestialCalibration`.
2. Mirror `birthDate` / `birthTime` / `birthLocation` / `zodiacSign` on profile.
3. Hand off to Tailor, Worktable, Oracle, or Sanctuary.

## Data model

Source of truth: `TailorLogicDraft.celestialCalibration` (also in profile contract `extensions`).

Zod contracts: `schemas/celestialCalibrationContracts.ts`  
Derivation: `lib/celestial/sunSign.ts`, `lib/celestial/seasonalAlignment.ts`  
Readout compile: `lib/celestial/compileCelestialReadout.ts`

## Generation integration

When `celestialCalibration.enabled` and a Sun is available, `sanitizeProfile` includes a compact timing string from `celestialTimingForGeneration`. Zine LLM field `celestial_calibration` may still be poetic; structured context is additive.

## Phased delivery

| Phase | Slice | Status |
| --- | --- | --- |
| **1** | Chamber + tropical Sun + season + Tailor persist + canon/nav + verify + generation sanitize | Shipped |
| **2** | Timezone/geocode (`POST /api/celestial/geocode`); civil clock → UTC | Shipped |
| **3** | Ephemeris-backed planets/aspects/rising via `astronomy-engine`; Whole Sign houses; never invent | Shipped |
| **4** | Oracle Latent Space Translation consumes structured readout (`celestialReadoutForOracle`) | Shipped |

## Risks

| Risk | Mitigation |
| --- | --- |
| Confused with Observatory | Distinct canon id/route/copy; explicit disambiguation |
| Costume astrology | Real longitude math + cusp notes + unsupported list |
| Scope creep into full chart | Phase gates; no rising without coords + ephemeris |
| Privacy of birth data | Same profile/Tailor persistence; no public Stand broadcast |

## Non-goals (current)

- Full natal wheel UI / Placidus houses
- Sidereal zodiac
- Transit forecasts
- Replacing Oracle chat (Latent Space Translation only)
- Changing Observatory / Residue MMM
- Public Stand broadcast of birth data
