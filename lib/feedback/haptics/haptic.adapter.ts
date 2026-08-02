export type HapticIntent =
  | "selection"
  | "lightImpact"
  | "mediumImpact"
  | "softSuccess"
  | "success"
  | "warning";

export interface HapticAdapter {
  isSupported(): boolean;
  trigger(intent: HapticIntent): boolean;
}
