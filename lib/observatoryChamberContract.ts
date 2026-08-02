/**
 * Observatory / Mean Median Mode chamber contract.
 * Shared by UI and offline verify.
 */

export const OBSERVATORY_CHAMBER_MODULE_ID = "observatory" as const;
export const OBSERVATORY_CHAMBER_ROUTE = "/observatory" as const;
export const OBSERVATORY_CHAMBER_MODE = "observatory" as const;

export const MEAN_MEDIAN_MODE_MODULE_ID = "mean-median-mode" as const;
export const MEAN_MEDIAN_MODE_ROUTE = "/mean-median-mode" as const;
export const MEAN_MEDIAN_MODE_MODE = "mean-median-mode" as const;

export const OBSERVATORY_HANDOFF_TARGETS = [
  { view: "proscenium", label: "The Proscenium" },
  { view: "forecast", label: "Forecast" },
  { view: "residue", label: "Residue (per-run M/M/M)" },
  { view: "scry", label: "Scry" },
] as const;

export const OBSERVATORY_COPY = {
  thesis:
    "Where collective cultural signals are observed over time — measured as mean presence, median typicality, and modal motif.",
  mmmThesis:
    "A statistical reading of what people are seeking, expressing, questioning, and beginning to make together.",
  residueDisambiguation:
    "Per-run Mean / Median / Mode analysis lives in Residue. This chamber reads consented collective aggregates only.",
  demonstrationBanner:
    "Demonstration specimens — not live collective data. Publishing to The Proscenium with disclosure is the consent moment for live contribution.",
  emptyBanner:
    "Not enough consented public signals in this window. Stage work on The Proscenium to contribute anonymized structure to Mean Median Mode.",
  mesopicComingSoon:
    "Mesopic Lens (Starry-Eyed · Shadow Fields) holds faint signals below Mean Median Mode thresholds — never as certainty.",
  mesopicThesis:
    "Twilight vision for the collective archive — dim correspondences before they become trends.",
  mesopicRestraint:
    "Starry-Eyed and Shadow Fields stay below promotion thresholds. Mean Median Mode only reads signals that clear central tendency.",
  mesopicDemoBanner:
    "Demonstration faint signals — not live Mesopic aggregates. Weak structure is labeled, never sold as atmosphere.",
  mesopicEmptyBanner:
    "No below-threshold consented signals in this window. Faint structure will appear here before it clears Mean Median Mode.",
} as const;
