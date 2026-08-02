import type { HapticAdapter, HapticIntent } from "./haptic.adapter";

/** Silent adapter for unsupported environments or user-disabled haptics. */
export class NoopHapticAdapter implements HapticAdapter {
  isSupported(): boolean {
    return false;
  }

  trigger(_intent: HapticIntent): boolean {
    return false;
  }
}
