import type { Doll, DollMask } from "../../types";
import { collectIdentityImageReferences } from "./identityPack";
import { pickActiveMask } from "./masks";
import { buildDollPromptContext, buildScribeDollExcerpt } from "./promptContext";
import type { DollCompanionBundle } from "./types";

export function buildDollCompanionBundle(
  doll: Doll,
  masks: DollMask[] = [],
  activeMaskId?: string | null,
): DollCompanionBundle {
  const mask = pickActiveMask(masks, activeMaskId ?? doll.activeMaskId);
  return {
    dollId: doll.id,
    dollName: doll.name,
    promptContext: buildDollPromptContext(doll, mask),
    scribeExcerpt: buildScribeDollExcerpt(doll, mask),
    imageReferences: collectIdentityImageReferences(doll),
    activeMaskId: mask?.id,
    activeMaskRole: mask?.role,
    activeMaskPrompt: mask?.promptTemplate,
  };
}

/** localStorage key helpers shared by Studio + chamber dresser */
export const ACTIVE_DOLL_STORAGE_KEY = "mimi_studio_active_doll_id";
export const ACTIVE_MASK_STORAGE_KEY = "mimi_studio_active_mask_id";
export const STUDIO_DOLL_CHANGED = "mimi:studio-doll-changed";

export function readStoredActiveDollId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_DOLL_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function writeStoredActiveDollId(dollId: string | null): void {
  try {
    if (dollId) localStorage.setItem(ACTIVE_DOLL_STORAGE_KEY, dollId);
    else localStorage.removeItem(ACTIVE_DOLL_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(STUDIO_DOLL_CHANGED));
  } catch {
    /* ignore */
  }
}

export function readStoredActiveMaskId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_MASK_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function writeStoredActiveMaskId(maskId: string | null): void {
  try {
    if (maskId) localStorage.setItem(ACTIVE_MASK_STORAGE_KEY, maskId);
    else localStorage.removeItem(ACTIVE_MASK_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(STUDIO_DOLL_CHANGED));
  } catch {
    /* ignore */
  }
}
