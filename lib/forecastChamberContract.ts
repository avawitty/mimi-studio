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
  simulatedBanner:
    "Demonstration synthesis — research providers are simulated until a live gateway path lands. Not live market telemetry.",
  cultureAwaiting:
    "Cultural shifts will draw from Observatory Mean Median Mode motifs. Open The Observatory for the collective atmosphere.",
  brandScopeNote:
    "Brand OS scope reframes the same calibrated profile signals. Dedicated brand-guideline forecasting is not wired yet.",
  personalScopeNote:
    "Sovereign Curator scope reads your season, DNA, GEO, and taste vector when present.",
  driftUncalibrated: "GEO drift uncalibrated — run GEO Engine or gather more signal.",
  identityRequired: "Identity not established — sign in to read your forecast.",
} as const;
