import { useMemo } from "react";
import {
  CANON_MODULE_BY_ID,
  CANON_MODULE_BY_ROUTE,
  type CanonModule,
} from "../lib/productCanon";
import {
  type ChamberFamily,
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
  /** Coarse atmosphere family for overlays */
  family: ChamberFamily;
  /** Matching CanonModule when registered */
  module: CanonModule | null;
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
    null
  );
}

/**
 * Derive chamber-aware shell flags from the active view mode.
 * Single source for public-face / dark-plate / overlay family so chrome cannot drift.
 */
export function useChamber(viewMode: string): ChamberContext {
  return useMemo(() => {
    const family = chamberFamilyForMode(viewMode);
    const isPublicFace = isPublicFaceMode(viewMode);
    const isDarkPlate = isDarkPlateMode(viewMode);
    const pathIndex = creatorPathIndexForMode(viewMode);
    const path = pathIndex >= 0 ? CREATOR_PATH[pathIndex] : null;

    return {
      viewMode,
      family,
      module: resolveModule(viewMode),
      isPublicFace,
      isDarkPlate,
      isWorktable: isWorktableMode(viewMode),
      quietChrome: isPublicFace,
      signalDense: isSignalDenseMode(viewMode) || family === "reflect",
      pathIndex,
      pathStep: path?.step ?? null,
      pathLabel: path?.label ?? null,
    };
  }, [viewMode]);
}
