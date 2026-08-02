/**
 * Doll Engine — Persistent Identity Visualization
 *
 * Dolls remain Taste Graph projections (not source of truth).
 * This module unifies procedural rendering, AI identity packs,
 * mask role modes, and companion injection across chambers.
 */

export type DollIdentityView = "portrait" | "full_body" | "profile";

export type ProceduralPattern = "ripples" | "grid" | "marble" | "halftone";

export type ProceduralAccessory = "none" | "halo" | "crown";

export interface ProceduralDollAesthetic {
  pattern: ProceduralPattern;
  primaryColor: string;
  secondaryColor: string;
  complexity: number;
  warpSpeed: number;
  warpIntensity: number;
  glossiness: number;
  accessoryMode: ProceduralAccessory;
  /** When true, dresser overrides were saved by the user over derived defaults. */
  userLocked?: boolean;
  updatedAt?: number;
}

export interface DollIdentityReferences {
  portraitUrl?: string;
  fullBodyUrl?: string;
  profileUrl?: string;
  /** Last view successfully generated */
  lastGeneratedView?: DollIdentityView;
  calibratedAt?: number;
}

export interface DollImageReference {
  name: string;
  description: string;
  url: string;
  tags: string[];
}

export interface DollCompanionBundle {
  dollId: string;
  dollName: string;
  promptContext: string;
  scribeExcerpt: string;
  imageReferences: DollImageReference[];
  activeMaskId?: string;
  activeMaskRole?: string;
  activeMaskPrompt?: string;
}
