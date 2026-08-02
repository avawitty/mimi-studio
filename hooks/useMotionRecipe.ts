import { useReducedMotion } from "motion/react";

import {
  resolveMotionVariant,
  type MotionRecipeName,
} from "@/lib/motion";

/** Resolve a named motion recipe with reduced-motion substitution. */
export function useMotionRecipe(name: MotionRecipeName) {
  const reduceMotion = Boolean(useReducedMotion());
  const variant = resolveMotionVariant(name, reduceMotion);
  return { ...variant, reduceMotion };
}
