import {
  CANON_MODULES,
  type CanonModule,
  type ChamberAtmosphere,
  type StudioFamily,
  type StudioPhase,
} from "./productCanon";

/**
 * Design-system helpers for the Studio OS taxonomy. Canon metadata owns
 * product-family decisions; this module turns those decisions into shell flags.
 */

export type {
  ChamberAtmosphere,
  StudioFamily,
  StudioPhase,
} from "./productCanon";

/** Compatibility alias while existing shell call sites migrate terminology. */
export type ChamberFamily = StudioFamily;
export type CreatorPathStep = StudioPhase;

const LEGACY_FAMILY: Readonly<Record<string, StudioFamily>> = {
  "editorial-home": "publishing",
  oracle: "intelligence",
  archival: "library",
  profile: "identity",
  "quiet-studio": "production",
  briefs: "production",
  "brand-intake": "services",
  "taste-discovery": "identity",
  "latent-constellation": "intelligence",
  "the-lens": "intelligence",
  "obsidian-mirror": "identity",
  nebula: "publishing",
};

const moduleForMode = (mode: string): CanonModule | undefined => {
  const normalized = mode.replace(/^\//, "");
  return (
    CANON_MODULES.find(
      (module) =>
        module.status === "live" &&
        (module.implementedMode === normalized ||
          module.id === normalized ||
          module.canonicalRoute === `/${normalized}`),
    ) ??
    CANON_MODULES.find(
      (module) =>
        module.implementedMode === normalized ||
        module.id === normalized ||
        module.canonicalRoute === `/${normalized}`,
    )
  );
};

const modesWithAtmosphere = (
  atmosphere: ChamberAtmosphere,
  legacyModes: readonly string[] = [],
): Set<string> => {
  const modes = new Set(legacyModes);
  for (const module of CANON_MODULES) {
    if (module.atmosphere.includes(atmosphere) && module.implementedMode) {
      modes.add(module.implementedMode);
    }
  }
  return modes;
};

/** Routes that should read as editorial plates — quieter chrome, less icon density. */
export const PUBLIC_FACE_MODES = modesWithAtmosphere("public-face", [
  "editorial-home",
  "showcase",
  "archival",
]);

/** Public faces that sit on a forced-dark plate (chrome must match). */
export const DARK_PLATE_MODES = modesWithAtmosphere("dark-plate");

/** Canvas-first rooms whose tools belong in sheets or rails. */
export const WORKTABLE_MODES = modesWithAtmosphere("worktable", [
  "tailor",
  "taste-discovery",
  "quiet-studio",
  "brand-intake",
]);

/** Evidence-heavy surfaces where the underarchive may become more explicit. */
export const SIGNAL_DENSE_MODES = modesWithAtmosphere("signal-dense", [
  "oracle",
  "obsidian-mirror",
  "latent-constellation",
  "the-lens",
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
    modes: ["scribe", "pocket", "chamber-map"],
    primaryMode: "scribe",
  },
  {
    step: "understand",
    label: "Understand",
    number: "02",
    note: "Read evidence before interpretation",
    modes: ["scry", "intel-hub", "tailor", "observatory"],
    primaryMode: "scry",
  },
  {
    step: "shape",
    label: "Shape",
    number: "03",
    note: "Find the editorial direction",
    modes: ["the-edit", "forecast", "darkroom", "thimble"],
    primaryMode: "the-edit",
  },
  {
    step: "compose",
    label: "Compose",
    number: "04",
    note: "Build the deliverable",
    modes: ["studio", "moodboard", "house", "private-studio"],
    primaryMode: "studio",
  },
  {
    step: "approve",
    label: "Approve",
    number: "05",
    note: "Accept, repair, or refuse",
    modes: ["tailor", "signature"],
    primaryMode: "tailor",
  },
  {
    step: "publish",
    label: "Publish",
    number: "06",
    note: "Package and release",
    modes: ["the-press", "proscenium", "editorial-home"],
    primaryMode: "the-press",
  },
  {
    step: "preserve",
    label: "Preserve",
    number: "07",
    note: "Keep custody and provenance",
    modes: ["stand", "pocket", "wardrobe", "atelier", "sanctuary", "ward"],
    primaryMode: "stand",
  },
] as const;

/** CSS custom-property names (values defined in index.css). */
export const MIMI_TOKENS = {
  bone: "--mimi-bone",
  field: "--mimi-field",
  worktable: "--mimi-worktable",
  ink: "--mimi-ink",
  olive: "--mimi-olive",
  stone: "--mimi-stone",
  pencil: "--mimi-pencil",
  rule: "--mimi-rule",
  hairline: "--mimi-hairline",
  periwinkle: "--mimi-periwinkle",
  red: "--mimi-red",
  blush: "--mimi-blush",
  cobalt: "--mimi-cobalt",
  cobaltDeep: "--mimi-cobalt-deep",
  cobaltMist: "--mimi-cobalt-mist",
  cobaltHaze: "--mimi-cobalt-haze",
  newsprint: "--mimi-newsprint",
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

export function atmospheresForMode(mode: string): ChamberAtmosphere[] {
  return moduleForMode(mode)?.atmosphere ?? [];
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
  const phase = moduleForMode(mode)?.phase;
  if (phase) {
    return CREATOR_PATH.findIndex((step) => step.step === phase);
  }
  return CREATOR_PATH.findIndex((step) => step.modes.includes(mode));
}

export function chamberFamilyForMode(mode: string): ChamberFamily {
  return moduleForMode(mode)?.family ?? LEGACY_FAMILY[mode] ?? "orientation";
}
