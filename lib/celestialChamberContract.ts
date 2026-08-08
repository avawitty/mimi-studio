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
    "Derive tropical Sun, Moon, planets, and — when place + time resolve — rising and Whole Sign houses from your birth data.",
  observatoryDisambiguation:
    "The Observatory reads collective Mean Median Mode. This chamber holds your personal celestial calibration only.",
  symbolicNotice:
    "Birth charts and symbolic inputs are treated as self-expressive context, not scientific evidence.",
  phaseScope:
    "Ephemeris via astronomy-engine. Civil clock uses resolved IANA timezone when a place is geocoded; otherwise time is treated as UTC. Rising + Whole Sign houses require birth time and coordinates. Sidereal frames and quadrant houses stay unsupported.",
  /** @deprecated Use phaseScope */
  phase1Scope:
    "Ephemeris via astronomy-engine. Civil clock uses resolved IANA timezone when a place is geocoded; otherwise time is treated as UTC. Rising + Whole Sign houses require birth time and coordinates. Sidereal frames and quadrant houses stay unsupported.",
  emptyBirthDate:
    "Calibration is on — add a birth date below for your natal Sun, Moon, and planets in every zine. Without it, issues only show the sky at composition time.",
  saveHint:
    "Changes autosave to your profile. Manual save still available if you want confirmation.",
  resolvePlaceHint:
    "Resolve place to attach coordinates + IANA timezone so rising/houses can compute and the Sun uses local civil time.",
} as const;
