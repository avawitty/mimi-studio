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
    "Live content vector — You.com or Apify web evidence synthesized through Mimi Gateway. Citations only from returned search URLs.",
  contentUnavailableBanner:
    "Content forecast offline or empty — configure AI Gateway / You.com, or sign in with membership credits. No costume trends invented.",
  cultureAwaiting:
    "No observed Mean Median Mode profiles yet. Stage consented work on The Proscenium, then return for cultural trajectories.",
  cultureObserved:
    "Cultural vector reads Observatory Mean Median Mode baselines first, then optional research/RSS evidence — never costume shifts.",
  cultureDemoBanner:
    "Demonstration Observatory baselines — trajectories are derived from labeled specimens, not a live collective corpus.",
  brandScopeNote:
    "Brand OS scope reads your brand intake and searches live cultural evidence for that positioning.",
  personalScopeNote:
    "Sovereign Curator scope reads your season, DNA, GEO, taste vector, or profile intake when present.",
  intakePersonalTitle: "Calibrate your atmospheric read",
  intakePersonalBody:
    "A tiny profile intake — season, keywords, and vibe — so content and cultural vectors search with your coordinates instead of generic trends.",
  intakeBrandTitle: "Calibrate brand forecasting",
  intakeBrandBody:
    "Name the brand and its vibe. Forecast will query live editorial evidence (You.com / Apify) for format and cultural trajectories aligned to that positioning.",
  intakeRequired:
    "Complete intake for this scope to unlock Overview and Content vectors.",
  intakeRecalibrate: "Recalibrate intake",
  residueProjectionNote:
    "From your latest Residue run — interpretive scenarios, not live trend scores. Distinct from the content vector.",
  serverSyncNote: "Server snapshot saved — reload on any device when signed in.",
  driftUncalibrated: "Drift uncalibrated — run GEO Engine or gather more signal.",
  identityRequired: "Identity not established — sign in to read your forecast.",
} as const;
