import { useMemo } from "react";
import {
  CANON_MODULE_BY_ID,
  CANON_MODULE_BY_ROUTE,
  CANON_MODULES,
  type ChamberAtmosphere,
  type CanonModule,
  type StudioFamily,
} from "../lib/productCanon";
import {
  type CreatorPathStep,
  CREATOR_PATH,
  chamberFamilyForMode,
  creatorPathIndexForMode,
  isDarkPlateMode,
  isPublicFaceMode,
  isSignalDenseMode,
  isWorktableMode,
} from "../lib/design-system";

export interface ChamberContext {
  /** Canonicalized view mode (route segment) */
  viewMode: string;
  /** User-facing screen family for reusable layout anatomy. */
  family: StudioFamily;
  /** Matching CanonModule when registered */
  module: CanonModule | null;
  atmosphere: ChamberAtmosphere[];
  isPublicFace: boolean;
  isDarkPlate: boolean;
  isWorktable: boolean;
  /** Quiet chrome: Menu + identity only (no pocket/oracle) */
  quietChrome: boolean;
  /** Oracle / dolls / reflect — denser Signal Underarchive language OK */
  signalDense: boolean;
  /** Index into CREATOR_PATH, or -1 when outside the core loop */
  pathIndex: number;
  pathStep: CreatorPathStep | null;
  pathLabel: string | null;
}

function resolveModule(viewMode: string): CanonModule | null {
  return (
    CANON_MODULE_BY_ID[viewMode] ??
    CANON_MODULE_BY_ROUTE[viewMode] ??
    CANON_MODULE_BY_ROUTE[`/${viewMode}`] ??
    CANON_MODULES.find(
      (module) =>
        module.status === "live" && module.implementedMode === viewMode,
    ) ??
    null
  );
}

/**
 * Derive chamber-aware shell flags from the active view mode.
 * Single source for public-face / dark-plate / overlay family so chrome cannot drift.
 */
export function useChamber(viewMode: string): ChamberContext {
  return useMemo(() => {
    const module = resolveModule(viewMode);
    const family = module?.family ?? chamberFamilyForMode(viewMode);
    const atmosphere = module?.atmosphere ?? [];
    const isPublicFace =
      atmosphere.includes("public-face") || isPublicFaceMode(viewMode);
    const isDarkPlate =
      atmosphere.includes("dark-plate") || isDarkPlateMode(viewMode);
    const pathIndex = creatorPathIndexForMode(viewMode);
    const path = pathIndex >= 0 ? CREATOR_PATH[pathIndex] : null;

    return {
      viewMode,
      family,
      module,
      atmosphere,
      isPublicFace,
      isDarkPlate,
      isWorktable:
        atmosphere.includes("worktable") || isWorktableMode(viewMode),
      quietChrome: isPublicFace,
      signalDense:
        atmosphere.includes("signal-dense") || isSignalDenseMode(viewMode),
      pathIndex,
      pathStep: module?.phase ?? path?.step ?? null,
      pathLabel: path?.label ?? null,
    };
  }, [viewMode]);
}
