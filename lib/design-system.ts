/**
 * Design-system helpers for House Style v2 + Signal Underarchive.
 * CSS variables live in index.css — this module is the TS contract for
 * chamber-aware shell chrome (public face, dark plates, surveillance nod).
 */

export type ChamberFamily =
  | "create"
  | "reflect"
  | "refine"
  | "signature"
  | "observe"
  | "system";

export type CreatorPathStep = "collect" | "shape" | "create" | "publish";

/** Routes that should read as editorial plates — quieter chrome, less icon density */
export const PUBLIC_FACE_MODES = new Set([
  "editorial-home",
  "stand",
  "signature",
  "showcase",
  "archival",
  "mimi-rip",
  "scry",
]);

/** Public faces that sit on a forced-dark plate (chrome must match) */
export const DARK_PLATE_MODES = new Set(["mimi-rip", "scry"]);

/** Worktable chambers — canvas-first, tools in sheets */
export const WORKTABLE_MODES = new Set([
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
]);

/** Dense signal surfaces — surveillance overlay may intensify here */
export const SIGNAL_DENSE_MODES = new Set([
  "oracle",
  "geo_engine",
  "thimble",
  "obsidian-mirror",
  "latent-constellation",
  "the-lens",
  "residue",
  "intel-hub",
  "forecast",
  "mimi-dolls",
]);

export const CREATOR_PATH: ReadonlyArray<{
  step: CreatorPathStep;
  label: string;
  number: string;
  note: string;
  modes: readonly string[];
  primaryMode: string;
}> = [
  {
    step: "collect",
    label: "Collect",
    number: "01",
    note: "Bring in source material",
    modes: ["scribe", "darkroom"],
    primaryMode: "scribe",
  },
  {
    step: "shape",
    label: "Shape",
    number: "02",
    note: "Find the editorial angle",
    modes: ["pocket", "wardrobe", "the-edit", "tailor", "moodboard"],
    primaryMode: "the-edit",
  },
  {
    step: "create",
    label: "Create",
    number: "03",
    note: "Develop the issue",
    modes: ["studio", "briefs", "quiet-studio", "private-studio"],
    primaryMode: "studio",
  },
  {
    step: "publish",
    label: "Publish",
    number: "04",
    note: "Prepare the release",
    modes: ["the-press", "editorial-home", "stand", "signature"],
    primaryMode: "the-press",
  },
] as const;

/** CSS custom-property names (values defined in index.css) */
export const MIMI_TOKENS = {
  field: "--mimi-field",
  worktable: "--mimi-worktable",
  ink: "--mimi-ink",
  olive: "--mimi-olive",
  stone: "--mimi-stone",
  hairline: "--mimi-hairline",
  cobalt: "--mimi-cobalt",
  cobaltDeep: "--mimi-cobalt-deep",
  cobaltMist: "--mimi-cobalt-mist",
  cobaltHaze: "--mimi-cobalt-haze",
  gilt: "--mimi-gilt",
  manilaTab: "--mimi-manila-tab",
  manilaBody: "--mimi-manila-body",
  manilaEdge: "--mimi-manila-edge",
  manilaSheet: "--mimi-manila-sheet",
  manilaInk: "--mimi-manila-ink",
  grainOpacity: "--mimi-grain-opacity",
} as const;

export type MimiTokenKey = keyof typeof MIMI_TOKENS;

export function cssVar(token: MimiTokenKey, fallback?: string): string {
  const name = MIMI_TOKENS[token];
  return fallback ? `var(${name}, ${fallback})` : `var(${name})`;
}

export function isPublicFaceMode(mode: string): boolean {
  return PUBLIC_FACE_MODES.has(mode);
}

export function isDarkPlateMode(mode: string): boolean {
  return DARK_PLATE_MODES.has(mode);
}

export function isWorktableMode(mode: string): boolean {
  return WORKTABLE_MODES.has(mode);
}

export function isSignalDenseMode(mode: string): boolean {
  return SIGNAL_DENSE_MODES.has(mode);
}

export function creatorPathIndexForMode(mode: string): number {
  const idx = CREATOR_PATH.findIndex((step) => step.modes.includes(mode));
  return idx >= 0 ? idx : -1;
}

/**
 * Coarse chamber family for surveillance overlays and shell atmosphere.
 * Prefer `useChamber()` at call sites; this pure helper is for tests / SSR.
 */
export function chamberFamilyForMode(mode: string): ChamberFamily {
  if (
    ["studio", "moodboard", "darkroom", "private-studio", "quiet-studio"].includes(
      mode,
    )
  ) {
    return "create";
  }
  if (
    [
      "oracle",
      "geo_engine",
      "thimble",
      "archival",
      "threads",
      "latent-constellation",
      "the-lens",
      "forecast",
      "obsidian-mirror",
    ].includes(mode)
  ) {
    return "reflect";
  }
  if (
    [
      "tailor",
      "celestial-calibration",
      "loom",
      "action-board",
      "the-edit",
      "the-press",
      "wardrobe",
      "mimi-drop",
    ].includes(mode)
  ) {
    return "refine";
  }
  if (
    [
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
      "residue",
      "intel-hub",
    ].includes(mode)
  ) {
    return "signature";
  }
  if (
    ["nebula", "proscenium", "observatory", "mean-median-mode", "stand"].includes(
      mode,
    )
  ) {
    return "observe";
  }
  return "system";
}
