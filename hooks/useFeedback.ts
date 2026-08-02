import { useContext } from "react";

import { FeedbackContext } from "@/contexts/FeedbackProvider";
import type { FeedbackService } from "@/lib/feedback";
import { createFeedbackService } from "@/lib/feedback";
import { NoopHapticAdapter } from "@/lib/feedback/haptics/noop-haptic.adapter";

let fallbackService: FeedbackService | null = null;

function getFallbackService(): FeedbackService {
  if (!fallbackService) {
    // Safe outside provider (tests / isolated shells): no haptics.
    fallbackService = createFeedbackService({
      hapticAdapter: new NoopHapticAdapter(),
    });
  }
  return fallbackService;
}

/**
 * Typed feedback orchestrator. Prefer calling semantic events:
 * `feedback.trigger("proposal.approved")`
 * Never call `navigator.vibrate` from components.
 */
export function useFeedback(): FeedbackService {
  const ctx = useContext(FeedbackContext);
  return ctx ?? getFallbackService();
}
