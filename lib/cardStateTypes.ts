import type { ReactNode } from "react";

/** Shared interaction states for editorial card surfaces. */
export type MimiCardState =
  | "idle"
  | "hover"
  | "focus"
  | "pressed"
  | "selected"
  | "loading"
  | "success"
  | "error"
  | "disabled"
  | "archived";

/** Semantic card-state families — behavioral contract, not one visual shape. */
export type MimiCardKind =
  | "invocation"
  | "artifact"
  | "reading"
  | "calibration"
  | "proposal"
  | "action"
  | "workspace"
  | "document"
  | "status";

/** Coverage honesty for data-backed card states. */
export type CoverageState =
  | "live"
  | "derived"
  | "demonstration"
  | "awaiting-connection"
  | "empty"
  | "unavailable"
  | "failed";

/** Prompt models must stay coherent across display, field, and submit. */
export type PromptMode = "question" | "opener" | "assignment";

export interface PromptContract {
  mode: PromptMode;
  displayPrompt: string;
  fieldPlaceholder: string;
  starterValue?: string;
  submitLabel: string;
}

export interface MimiCardStateProps {
  kind: MimiCardKind;
  state?: MimiCardState;
  eyebrow?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  metadata?: ReactNode;
  provenance?: ReactNode;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
  children: ReactNode;
}

export type MimiAtmosphereTheme = {
  field: string;
  surface: string;
  surfaceRaised: string;
  ink: string;
  quietInk: string;
  rule: string;
  accent: string;
  accentInk: string;
  glow: string;
  imageFilter?: string;
  grainOpacity: number;
};
