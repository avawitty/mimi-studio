/**
 * Doll Engine public API — Persistent Identity Visualization.
 * Taste Graph remains source of truth; dolls are projections (Mimi Shell species).
 */

export type {
  DollCompanionBundle,
  DollIdentityReferences,
  DollIdentityView,
  DollImageReference,
  ProceduralAccessory,
  ProceduralDollAesthetic,
  ProceduralPattern,
} from "./types";

export {
  MIMI_SHELL_STAPLE,
  MIMI_SHELL_STAPLE_VERSION,
  buildMimiShellCompanionContext,
  buildMimiShellImagePrompt,
  type BuildShellPromptOptions,
  type DollShellView,
} from "./staplePrompt";

export { resolveColorToken, pickPalettePair } from "./colorResolve";
export {
  deriveProceduralAesthetic,
  aestheticToStorageKeys,
} from "./proceduralFromDoll";
export {
  buildDollPromptContext,
  buildScribeDollExcerpt,
} from "./promptContext";
export {
  buildIdentityViewPrompt,
  collectIdentityImageReferences,
  mergeIdentityReference,
  identityPackCompleteness,
} from "./identityPack";
export {
  fetchDollIdentityMedia,
  fetchDollImageReferencesAsMedia,
  resolveIdentityViewUrl,
} from "./mediaRefs";
export { defaultMaskSeedsForDoll, pickActiveMask } from "./masks";
export {
  buildDollCompanionBundle,
  ACTIVE_DOLL_STORAGE_KEY,
  ACTIVE_MASK_STORAGE_KEY,
  STUDIO_DOLL_CHANGED,
  readStoredActiveDollId,
  writeStoredActiveDollId,
  readStoredActiveMaskId,
  writeStoredActiveMaskId,
} from "./companion";
