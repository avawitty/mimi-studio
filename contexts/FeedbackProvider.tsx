import React, { createContext, useMemo } from "react";

import {
  createFeedbackService,
  type FeedbackPreferences,
  type FeedbackService,
  type HapticAdapter,
} from "@/lib/feedback";
import { WebHapticAdapter } from "@/lib/feedback/haptics/web-haptic.adapter";

type FeedbackProviderProps = {
  children: React.ReactNode;
  hapticAdapter?: HapticAdapter;
  preferences?: Partial<FeedbackPreferences>;
};

const FeedbackContext = createContext<FeedbackService | null>(null);

export function FeedbackProvider({
  children,
  hapticAdapter,
  preferences,
}: FeedbackProviderProps) {
  const service = useMemo(
    () =>
      createFeedbackService({
        hapticAdapter: hapticAdapter ?? new WebHapticAdapter(),
        preferences,
      }),
    [hapticAdapter, preferences],
  );

  return (
    <FeedbackContext.Provider value={service}>{children}</FeedbackContext.Provider>
  );
}

export { FeedbackContext };
