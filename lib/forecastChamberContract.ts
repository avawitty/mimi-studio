/**
 * Forecast chamber contract — shared by UI and offline verify.
 */

export const FORECAST_CHAMBER_MODULE_ID = "forecast" as const;
export const FORECAST_CHAMBER_ROUTE = "/forecast" as const;
export const FORECAST_CHAMBER_MODE = "forecast" as const;

export const FORECAST_HANDOFF_TARGETS = [
  { view: "observatory", label: "The Observatory" },
  { view: "mean-median-mode", label: "Mean Median Mode" },
  { view: "residue", label: "Residue" },
  { view: "geo_engine", label: "GEO Engine" },
] as const;

export const FORECAST_COPY = {
  thesis:
    "Aesthetic meteorology — personal season, drift when calibrated, and content vectors. Observatory’s “what next,” not a second collective readout.",
  contentLiveBanner:
    "Live content vector — You.com evidence synthesized through Mimi Gateway. Citations only from returned search URLs.",
  contentUnavailableBanner:
    "Content forecast offline or empty — configure AI Gateway / You.com, or sign in with membership credits. No costume trends invented.",
  cultureAwaiting:
    "Cultural shifts will draw from Observatory Mean Median Mode motifs. Open The Observatory for the collective atmosphere.",
  brandScopeNote:
    "Brand OS scope reframes the same calibrated profile signals. Dedicated brand-guideline forecasting is not wired yet.",
  personalScopeNote:
    "Sovereign Curator scope reads your season, DNA, GEO, and taste vector when present.",
  driftUncalibrated: "Drift uncalibrated — run GEO Engine or gather more signal.",
  identityRequired: "Identity not established — sign in to read your forecast.",
} as const;
