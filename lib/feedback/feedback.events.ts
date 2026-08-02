import type { FeedbackEvent } from "./feedback.types";

/** Exhaustive list — used for runtime guards and tests. */
export const FEEDBACK_EVENTS = [
  "navigation.enter",
  "navigation.back",
  "selection.changed",
  "source.captured",
  "source.imported",
  "analysis.started",
  "analysis.completed",
  "proposal.created",
  "proposal.approved",
  "proposal.rejected",
  "artifact.saved",
  "artifact.published",
  "action.failed",
] as const satisfies readonly FeedbackEvent[];

export function isFeedbackEvent(value: string): value is FeedbackEvent {
  return (FEEDBACK_EVENTS as readonly string[]).includes(value);
}

/**
 * Events whose haptic means "persisted / committed".
 * Callers must pass `confirmed: true` only after the mutation succeeds.
 */
export const CONFIRMATION_REQUIRED_EVENTS = new Set<FeedbackEvent>([
  "source.captured",
  "source.imported",
  "proposal.approved",
  "artifact.saved",
  "artifact.published",
]);
