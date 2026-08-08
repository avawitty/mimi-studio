/**
 * Mesopic Lens chamber contract.
 * Personal twilight readings — profile × celestial calibration × web grounding.
 * Distinct from Observatory Mesopic Lens (collective weak signals).
 */

export const MESOPIC_LENS_MODULE_ID = "mesopic-lens" as const;
export const MESOPIC_LENS_ROUTE = "/mesopic-lens" as const;
export const MESOPIC_LENS_MODE = "mesopic-lens" as const;

export const MESOPIC_LENS_ALIASES = [
  "obsidian-mirror",
  "twilight-lens",
  "mesopic",
] as const;

export const MESOPIC_LENS_HANDOFF_TARGETS = [
  { view: "celestial-calibration", label: "Celestial Calibration" },
  { view: "scry", label: "Scry" },
  { view: "scribe", label: "Scribe" },
  { view: "tailor", label: "Tailor" },
] as const;

export const MESOPIC_LENS_COPY = {
  thesis:
    "Twilight vision for personal questions — profile taste, celestial calibration, and live web signals woven into one grounded reading.",
  subtitle: "Obsidian Mirror",
  mesopicNote:
    "Mesopic vision sits between day and night: enough light to orient, not enough to pretend certainty.",
  celestialHint:
    "Celestial calibration enriches readings when enabled in Tailor. Symbolic context only — never fabricated positions.",
  webGroundingNote:
    "Live web signals ground the reading. When search returns nothing, the reading says so.",
  curiosityNote:
    "Your questions are logged as curiosity records for pattern reports — not approved Taste Graph memory unless you save elsewhere.",
  emptyQuestion: "Ask something you are turning over in the twilight.",
  observatoryDisambiguation:
    "The Observatory Mesopic Lens reads collective faint signals. This chamber holds your personal questions only.",
} as const;
