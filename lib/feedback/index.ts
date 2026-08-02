export type {
  FeedbackAnalyticsPayload,
  FeedbackEvent,
  FeedbackPreferences,
  FeedbackRecipe,
  FeedbackService,
  FeedbackTriggerOptions,
} from "./feedback.types";
export {
  FEEDBACK_EVENTS,
  CONFIRMATION_REQUIRED_EVENTS,
  isFeedbackEvent,
} from "./feedback.events";
export { feedbackRecipes } from "./feedback.recipes";
export {
  createFeedbackService,
  FEEDBACK_DOM_EVENT,
} from "./feedback.service";
export type { CreateFeedbackServiceOptions } from "./feedback.service";
export type { HapticAdapter, HapticIntent } from "./haptics/haptic.adapter";
export { WebHapticAdapter, webHapticPatterns } from "./haptics/web-haptic.adapter";
export { NoopHapticAdapter } from "./haptics/noop-haptic.adapter";
