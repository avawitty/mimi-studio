import type { MotionRecipeName } from "../motion/motion.variants";
import type { HapticIntent } from "./haptics/haptic.adapter";

export type FeedbackEvent =
  | "navigation.enter"
  | "navigation.back"
  | "selection.changed"
  | "source.captured"
  | "source.imported"
  | "analysis.started"
  | "analysis.completed"
  | "proposal.created"
  | "proposal.approved"
  | "proposal.rejected"
  | "artifact.saved"
  | "artifact.published"
  | "action.failed";

export type FeedbackPreferences = {
  /** system = follow OS prefers-reduced-motion via MotionConfig */
  reducedMotion: "system" | "reduce" | "full";
  haptics: "system" | "off";
};

export type FeedbackRecipe = {
  motion: MotionRecipeName | null;
  haptic: HapticIntent | null;
};

export type FeedbackTriggerOptions = {
  sourceElement?: HTMLElement | null;
  destinationElement?: HTMLElement | null;
  /** When false, skip haptic even if the recipe has one (e.g. optimistic press). */
  confirmed?: boolean;
};

export type FeedbackAnalyticsPayload = {
  event: FeedbackEvent;
  motion: MotionRecipeName | null;
  haptic: HapticIntent | null;
  at: number;
};

export interface FeedbackService {
  trigger(event: FeedbackEvent, options?: FeedbackTriggerOptions): void;
  getRecipe(event: FeedbackEvent): FeedbackRecipe;
  setPreferences(partial: Partial<FeedbackPreferences>): void;
  getPreferences(): FeedbackPreferences;
  subscribe(listener: (payload: FeedbackAnalyticsPayload) => void): () => void;
}
