import type { HapticAdapter, HapticIntent } from "./haptic.adapter";

/** Brief vibration patterns — punctuation, not alarms. */
export const webHapticPatterns: Record<HapticIntent, number | number[]> = {
  selection: 8,
  lightImpact: 12,
  mediumImpact: 18,
  softSuccess: [10, 45, 12],
  success: [12, 50, 18],
  warning: [18, 55, 18],
};

/**
 * Progressive-enhancement web haptics via Vibration API.
 * Unsupported browsers / missing user activation → silent false.
 */
export class WebHapticAdapter implements HapticAdapter {
  isSupported(): boolean {
    return (
      typeof navigator !== "undefined" &&
      typeof navigator.vibrate === "function"
    );
  }

  trigger(intent: HapticIntent): boolean {
    if (!this.isSupported()) return false;
    try {
      return Boolean(navigator.vibrate(webHapticPatterns[intent]));
    } catch {
      return false;
    }
  }
}
