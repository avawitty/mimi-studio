/**
 * Chamber-aware shell helpers — Psychic Oracle Spy / editorial archive.
 *
 * Classifies routes into meta-chambers (overlay + atmosphere) and face kinds
 * (chrome density + main pad). Keeps App shell and StudioChrome in sync.
 */

export type ChamberFamily =
  | "create"
  | "reflect"
  | "refine"
  | "signature"
  | "observe"
  | "system";

/** How the global chrome / main pad should treat the surface */
export type FaceKind = "public" | "public-dark" | "worktable" | "void";

/** Quiet public plates — Menu + identity only (no pocket/oracle chrome) */
export const PUBLIC_FACE_MODES = [
  "editorial-home",
  "stand",
  "signature",
  "showcase",
  "archival",
  "mimi-rip",
  "scry",
] as const;

/** Forced-dark public plates — chrome must match (no light-over-dark seam) */
export const DARK_PLATE_MODES = ["mimi-rip", "scry"] as const;

/** Full-bleed worktables — overflow locked, no page pad */
export const WORKTABLE_OVERFLOW_MODES = [
  "studio",
  "taste-graph",
  "taste-discovery",
  "the-edit",
  "tailor",
  "moodboard",
  "darkroom",
  "private-studio",
  "quiet-studio",
  "brand-intake",
] as const;

const PUBLIC_FACE_SET = new Set<string>(PUBLIC_FACE_MODES);
const DARK_PLATE_SET = new Set<string>(DARK_PLATE_MODES);
const WORKTABLE_OVERFLOW_SET = new Set<string>(WORKTABLE_OVERFLOW_MODES);

const CREATE_MODES = new Set([
  "studio",
  "moodboard",
  "darkroom",
  "private-studio",
  "quiet-studio",
  "briefs",
]);

const REFLECT_MODES = new Set([
  "oracle",
  "geo_engine",
  "thimble",
  "archival",
  "threads",
  "latent-constellation",
  "the-lens",
  "residue",
  "intel-hub",
  "forecast",
  "scry",
]);

const REFINE_MODES = new Set([
  "tailor",
  "celestial-calibration",
  "loom",
  "action-board",
  "the-edit",
  "the-press",
  "wardrobe",
  "mimi-drop",
]);

const SIGNATURE_MODES = new Set([
  "signature",
  "ward",
  "profile",
  "taste-graph",
  "pocket",
  "scribe",
  "mimi-dolls",
  "mimi-rip",
  "atelier",
  "house",
]);

const OBSERVE_MODES = new Set([
  "nebula",
  "proscenium",
  "observatory",
  "mean-median-mode",
]);

export function getChamberFamily(mode: string): ChamberFamily {
  if (CREATE_MODES.has(mode)) return "create";
  if (REFLECT_MODES.has(mode)) return "reflect";
  if (REFINE_MODES.has(mode)) return "refine";
  if (SIGNATURE_MODES.has(mode)) return "signature";
  if (OBSERVE_MODES.has(mode)) return "observe";
  return "system";
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
  if (WORKTABLE_OVERFLOW_SET.has(mode)) {
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
