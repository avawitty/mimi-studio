/**
 * Celestial Calibration chamber contract.
 * Shared by UI and offline verify — keeps routes, copy, and handoffs aligned.
 *
 * Distinct from The Observatory (collective Mean Median Mode).
 */

export const CELESTIAL_CHAMBER_MODULE_ID = "celestial-calibration" as const;
export const CELESTIAL_CHAMBER_ROUTE = "/celestial-calibration" as const;
export const CELESTIAL_CHAMBER_MODE = "celestial-calibration" as const;

/** Short alias segment → same chamber. */
export const CELESTIAL_CHAMBER_ALIASES = ["celestial", "natal", "zodiac"] as const;

export const CELESTIAL_HANDOFF_TARGETS = [
  { view: "tailor", label: "Tailor" },
  { view: "studio", label: "Worktable" },
  { view: "oracle", label: "Oracle" },
  { view: "sanctuary", label: "Sanctuary" },
] as const;

export const CELESTIAL_CHAMBER_COPY = {
  thesis:
    "Derive tropical Sun and seasonal orientation from your birth data — accurate enough to feed Tailor and generation, honest about what Phase 1 cannot yet compute.",
  observatoryDisambiguation:
    "The Observatory reads collective Mean Median Mode. This chamber holds your personal celestial calibration only.",
  symbolicNotice:
    "Birth charts and symbolic inputs are treated as self-expressive context, not scientific evidence.",
  phase1Scope:
    "Phase 1 computes tropical Sun sign from birth date (optional time as UTC) and astronomical season. Rising, houses, and aspects remain unsupported until timezone + ephemeris land.",
  emptyBirthDate:
    "Enter a birth date to derive your tropical Sun. Without a date, calibration stays inactive for generation.",
  saveHint:
    "Saving writes Tailor celestialCalibration and mirrors birth fields on your profile.",
} as const;
