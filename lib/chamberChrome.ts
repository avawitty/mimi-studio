import {
  DARK_PLATE_MODES as DESIGN_DARK_PLATE_MODES,
  PUBLIC_FACE_MODES as DESIGN_PUBLIC_FACE_MODES,
  WORKTABLE_MODES,
  chamberFamilyForMode,
  type StudioFamily,
} from "./design-system";

/**
 * Chamber-aware shell helpers. Product family comes from CanonModule metadata;
 * this module owns only chrome density and main-surface behavior.
 */

export type ChamberFamily = StudioFamily;

/** How the global chrome / main pad should treat the surface */
export type FaceKind = "public" | "public-dark" | "worktable" | "void";

/** Quiet public plates — Menu + identity only (no pocket/oracle chrome) */
export const PUBLIC_FACE_MODES = [...DESIGN_PUBLIC_FACE_MODES] as const;

/** Forced-dark public plates — chrome must match (no light-over-dark seam) */
export const DARK_PLATE_MODES = [...DESIGN_DARK_PLATE_MODES] as const;

/** Full-bleed worktables — overflow locked, no page pad */
export const WORKTABLE_OVERFLOW_MODES = [...WORKTABLE_MODES] as const;

const PUBLIC_FACE_SET = new Set<string>(PUBLIC_FACE_MODES);
const DARK_PLATE_SET = new Set<string>(DARK_PLATE_MODES);
const WORKTABLE_OVERFLOW_SET = new Set<string>(WORKTABLE_OVERFLOW_MODES);

export function getChamberFamily(mode: string): ChamberFamily {
  return chamberFamilyForMode(mode);
}

export function isPublicFaceMode(mode: string): boolean {
  return PUBLIC_FACE_SET.has(mode);
}

export function isDarkPlateMode(mode: string): boolean {
  return DARK_PLATE_SET.has(mode);
}

export function getFaceKind(mode: string): FaceKind {
  if (DARK_PLATE_SET.has(mode)) return "public-dark";
  if (PUBLIC_FACE_SET.has(mode)) return "public";
  if (WORKTABLE_OVERFLOW_SET.has(mode)) return "worktable";
  if (mode === "oracle") return "void";
  return "worktable";
}

/** CSS classes for the App `<main>` region by route */
export function mainShellClassName(mode: string): string {
  const base = "flex-1 flex flex-col relative";
  if (WORKTABLE_OVERFLOW_SET.has(mode) || mode === "chamber-map") {
    return `${base} overflow-hidden min-h-0 pb-0 h-full`;
  }
  if (DARK_PLATE_SET.has(mode)) {
    return `${base} overflow-hidden min-h-0 pb-0 h-full bg-[#050506]`;
  }
  if (
    mode === "editorial-home" ||
    mode === "stand" ||
    mode === "signature" ||
    mode === "showcase" ||
    mode === "archival"
  ) {
    return `${base} overflow-y-auto bg-nous-base pb-8 md:pb-0 mimi-page-pad mimi-page-pad--public`;
  }
  return `${base} overflow-y-auto bg-nous-base pb-[max(1.25rem,env(safe-area-inset-bottom))] md:pb-0 mimi-page-pad`;
}

/** data-chrome value for StudioChrome */
export function chromeDataAttr(mode: string): "public-face" | "public-face-dark" | "worktable" {
  if (DARK_PLATE_SET.has(mode)) return "public-face-dark";
  if (PUBLIC_FACE_SET.has(mode)) return "public-face";
  return "worktable";
}
