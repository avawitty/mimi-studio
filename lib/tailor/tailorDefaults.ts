import type { CelestialCalibrationDraft } from "../../schemas/celestialCalibrationContracts";
import type { TailorLogicDraft, UserProfile } from "../../types";

/** Tailor Algo Firewall ids — all enabled unless listed in `disabledAlgos`. */
export const TAILOR_ALGO_IDS = [
  "zine_gen",
  "scribe_reading",
  "web_scry",
  "visual_plates",
  "vocal_note",
] as const;

export type TailorAlgoId = (typeof TAILOR_ALGO_IDS)[number];

/** Editorial calibration plates — all enabled unless listed in `disabledPlates`. */
export const EDITORIAL_PLATE_IDS = [
  "contact-sheet",
  "screenwrite",
  "chromatic",
  "material-specimen",
  "forecast-drift",
  "celestial",
  "signal-index",
  "used-context",
  "sonic",
  "owner-carousel",
] as const;

export type EditorialPlateId = (typeof EDITORIAL_PLATE_IDS)[number];

export const DEFAULT_CELESTIAL_CALIBRATION: CelestialCalibrationDraft = {
  enabled: true,
  zodiac: "gemini",
  astrologicalLineage: "",
  seasonalAlignment: "",
  zodiacLocked: false,
};

/** Merge saved celestial calibration with opt-out defaults (`enabled` defaults true). */
export function resolveCelestialCalibration(
  saved?: CelestialCalibrationDraft | null,
): CelestialCalibrationDraft {
  return {
    ...DEFAULT_CELESTIAL_CALIBRATION,
    ...(saved || {}),
    enabled: saved?.enabled ?? true,
  };
}

/** Legacy `enabledAlgos` (opt-in list) → `disabledAlgos` (opt-out list). */
export function migrateDisabledAlgos(profile?: Pick<UserProfile, "disabledAlgos" | "enabledAlgos">): string[] {
  if (profile?.disabledAlgos) return [...profile.disabledAlgos];
  const legacyEnabled = profile?.enabledAlgos;
  if (legacyEnabled && legacyEnabled.length > 0) {
    return TAILOR_ALGO_IDS.filter((id) => !legacyEnabled.includes(id));
  }
  return [];
}

export function listEnabledTailorAlgos(
  profile?: Pick<UserProfile, "disabledAlgos" | "enabledAlgos">,
): string[] {
  const disabled = new Set(migrateDisabledAlgos(profile));
  return TAILOR_ALGO_IDS.filter((id) => !disabled.has(id));
}

export function isTailorAlgoEnabled(
  profile: Pick<UserProfile, "disabledAlgos" | "enabledAlgos"> | undefined,
  algoId: string,
): boolean {
  return listEnabledTailorAlgos(profile).includes(algoId);
}

export function toggleTailorAlgoDisabled(
  profile: Pick<UserProfile, "disabledAlgos" | "enabledAlgos"> | undefined,
  algoId: string,
): string[] {
  const disabled = new Set(migrateDisabledAlgos(profile));
  if (disabled.has(algoId)) disabled.delete(algoId);
  else disabled.add(algoId);
  return [...disabled];
}

export function migrateDisabledPlates(
  profile?: Pick<UserProfile, "disabledPlates">,
): string[] {
  return profile?.disabledPlates ? [...profile.disabledPlates] : [];
}

export function listEnabledEditorialPlates(
  profile?: Pick<UserProfile, "disabledPlates" | "tailorDraft">,
): EditorialPlateId[] {
  const disabled = new Set(migrateDisabledPlates(profile));
  const celestial = resolveCelestialCalibration(
    profile?.tailorDraft?.celestialCalibration,
  );
  return EDITORIAL_PLATE_IDS.filter((id) => {
    if (id === "celestial" && !celestial.enabled) return false;
    return !disabled.has(id);
  });
}

export function isEditorialPlateEnabled(
  profile: Pick<UserProfile, "disabledPlates" | "tailorDraft"> | undefined,
  plateId: string,
): boolean {
  return listEnabledEditorialPlates(profile).includes(
    plateId as EditorialPlateId,
  );
}

export function toggleEditorialPlateDisabled(
  profile: Pick<UserProfile, "disabledPlates"> | undefined,
  plateId: string,
): string[] {
  const disabled = new Set(migrateDisabledPlates(profile));
  if (disabled.has(plateId)) disabled.delete(plateId);
  else disabled.add(plateId);
  return [...disabled];
}

/** Keep `disabledPlates` in sync when Celestial chamber excludes/includes zines. */
export function syncCelestialPlateDisabled(
  profile: Pick<UserProfile, "disabledPlates"> | undefined,
  celestialEnabled: boolean,
): string[] {
  const disabled = new Set(migrateDisabledPlates(profile));
  if (celestialEnabled) disabled.delete("celestial");
  else disabled.add("celestial");
  return [...disabled];
}

/** Apply opt-out defaults when hydrating a saved Tailor draft. */
export function normalizeTailorDraft(draft: TailorLogicDraft): TailorLogicDraft {
  return {
    ...draft,
    celestialCalibration: resolveCelestialCalibration(draft.celestialCalibration),
  };
}
