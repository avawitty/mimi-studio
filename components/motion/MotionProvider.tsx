import React from "react";
import { MotionConfig } from "motion/react";

type MotionProviderProps = {
  children: React.ReactNode;
  /**
   * Defaults to "user" — honor OS prefers-reduced-motion while preserving
   * useful opacity/color transitions (Motion reduced-motion grammar).
   */
  reducedMotion?: "user" | "always" | "never";
};

/**
 * Root Motion configuration for Mimi. Prefer wrapping the app once;
 * do not nest conflicting MotionConfig values in chambers.
 */
export function MotionProvider({
  children,
  reducedMotion = "user",
}: MotionProviderProps) {
  return (
    <MotionConfig reducedMotion={reducedMotion}>{children}</MotionConfig>
  );
}
