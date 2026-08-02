import { CONFIRMATION_REQUIRED_EVENTS } from "./feedback.events";
import { feedbackRecipes } from "./feedback.recipes";
import type {
  FeedbackAnalyticsPayload,
  FeedbackEvent,
  FeedbackPreferences,
  FeedbackRecipe,
  FeedbackService,
  FeedbackTriggerOptions,
} from "./feedback.types";
import type { HapticAdapter } from "./haptics/haptic.adapter";
import { NoopHapticAdapter } from "./haptics/noop-haptic.adapter";
import { WebHapticAdapter } from "./haptics/web-haptic.adapter";

export const FEEDBACK_DOM_EVENT = "mimi:feedback";

const DEFAULT_PREFERENCES: FeedbackPreferences = {
  reducedMotion: "system",
  haptics: "system",
};

export type CreateFeedbackServiceOptions = {
  hapticAdapter?: HapticAdapter;
  preferences?: Partial<FeedbackPreferences>;
  /** Optional analytics sink (wired later). */
  onAnalytics?: (payload: FeedbackAnalyticsPayload) => void;
};

export function createFeedbackService(
  options: CreateFeedbackServiceOptions = {},
): FeedbackService {
  let preferences: FeedbackPreferences = {
    ...DEFAULT_PREFERENCES,
    ...options.preferences,
  };
  const hapticAdapter = options.hapticAdapter ?? new WebHapticAdapter();
  const noop = new NoopHapticAdapter();
  const listeners = new Set<(payload: FeedbackAnalyticsPayload) => void>();

  const resolveHapticAdapter = (): HapticAdapter => {
    if (preferences.haptics === "off") return noop;
    return hapticAdapter;
  };

  const service: FeedbackService = {
    getRecipe(event: FeedbackEvent): FeedbackRecipe {
      return feedbackRecipes[event];
    },

    getPreferences(): FeedbackPreferences {
      return { ...preferences };
    },

    setPreferences(partial: Partial<FeedbackPreferences>): void {
      preferences = { ...preferences, ...partial };
    },

    subscribe(listener): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    trigger(event: FeedbackEvent, triggerOptions: FeedbackTriggerOptions = {}): void {
      const recipe = feedbackRecipes[event];
      const requiresConfirmation = CONFIRMATION_REQUIRED_EVENTS.has(event);
      const confirmed = triggerOptions.confirmed !== false;

      // Success/persist haptics only after confirmed mutations.
      const allowHaptic =
        recipe.haptic != null &&
        (!requiresConfirmation || confirmed) &&
        // Explicit confirmed: false blocks haptic even for non-persist events.
        triggerOptions.confirmed !== false;

      let hapticFired = false;
      if (allowHaptic && recipe.haptic) {
        hapticFired = resolveHapticAdapter().trigger(recipe.haptic);
      }

      const payload: FeedbackAnalyticsPayload = {
        event,
        motion: recipe.motion,
        haptic: allowHaptic ? recipe.haptic : null,
        at: Date.now(),
      };

      options.onAnalytics?.(payload);
      listeners.forEach((listener) => {
        try {
          listener(payload);
        } catch {
          /* swallow subscriber errors */
        }
      });

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent(FEEDBACK_DOM_EVENT, {
            detail: {
              ...payload,
              hapticFired,
              sourceElement: triggerOptions.sourceElement ?? null,
              destinationElement: triggerOptions.destinationElement ?? null,
            },
          }),
        );
      }
    },
  };

  return service;
}
