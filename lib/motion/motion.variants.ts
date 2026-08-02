import type { Transition, Variants } from "motion/react";

import { motionTokens } from "./motion.tokens";

/** Named physical qualities — reusable, not product-specific. */
export type MotionPrimitive =
  | "fade"
  | "lift"
  | "settle"
  | "reveal"
  | "collapse"
  | "transfer"
  | "pulse"
  | "shake";

type MotionProps = Record<string, number | string | number[]>;

export type MotionVariantSet = {
  initial: MotionProps;
  animate: MotionProps;
  exit?: MotionProps;
  transition: Transition;
  /** Opacity-only alternate when reduced motion is preferred. */
  reduced: {
    initial: MotionProps;
    animate: MotionProps;
    exit?: MotionProps;
    transition: Transition;
  };
};

const easeEnter = [...motionTokens.ease.enter] as [number, number, number, number];
const easeExit = [...motionTokens.ease.exit] as [number, number, number, number];
const easeStandard = [...motionTokens.ease.standard] as [
  number,
  number,
  number,
  number,
];

/** Semantic visual recipes keyed for FeedbackService mapping. */
export const motionVariantRecipes = {
  selectionTick: {
    initial: { scale: 1 },
    animate: { scale: [1, motionTokens.scale.selected, 1] },
    transition: motionTokens.spring.selection,
    reduced: {
      initial: { opacity: 1 },
      animate: { opacity: 1 },
      transition: { duration: motionTokens.duration.instant },
    },
  },
  gatherIntoPocket: {
    initial: {
      opacity: 0,
      y: -motionTokens.distance.medium,
      scale: motionTokens.scale.arrival,
    },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, scale: motionTokens.scale.press },
    transition: motionTokens.spring.transfer,
    reduced: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: motionTokens.duration.quick, ease: easeStandard },
    },
  },
  readingPulse: {
    initial: { opacity: 0.55 },
    animate: { opacity: [0.55, 0.9, 0.55] },
    transition: {
      duration: motionTokens.duration.editorial,
      // Finite, not unbounded — callers re-trigger while loading if needed.
      repeat: 2,
      ease: easeStandard,
    },
    reduced: {
      initial: { opacity: 0.85 },
      animate: { opacity: 0.85 },
      transition: { duration: 0 },
    },
  },
  softReveal: {
    initial: { opacity: 0, y: motionTokens.distance.small },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0 },
    transition: {
      duration: motionTokens.duration.deliberate,
      ease: easeEnter,
    },
    reduced: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: motionTokens.duration.quick, ease: easeStandard },
    },
  },
  provisionalReveal: {
    initial: {
      opacity: 0,
      y: motionTokens.distance.small,
      scale: motionTokens.scale.arrival,
    },
    animate: { opacity: 0.92, y: 0, scale: 1 },
    exit: { opacity: 0 },
    transition: {
      duration: motionTokens.duration.standard,
      ease: easeEnter,
    },
    reduced: {
      initial: { opacity: 0 },
      animate: { opacity: 0.92 },
      exit: { opacity: 0 },
      transition: { duration: motionTokens.duration.quick, ease: easeStandard },
    },
  },
  commitAndSettle: {
    initial: { scale: 1, opacity: 0.92 },
    animate: { scale: [1, motionTokens.scale.press, 1], opacity: 1 },
    transition: motionTokens.spring.settle,
    reduced: {
      initial: { opacity: 0.92 },
      animate: { opacity: 1 },
      transition: { duration: motionTokens.duration.quick, ease: easeStandard },
    },
  },
  dismiss: {
    initial: { opacity: 1, y: 0 },
    animate: { opacity: 0, y: motionTokens.distance.small },
    transition: {
      duration: motionTokens.duration.quick,
      ease: easeExit,
    },
    reduced: {
      initial: { opacity: 1 },
      animate: { opacity: 0 },
      transition: { duration: motionTokens.duration.instant },
    },
  },
  settleIntoRegistry: {
    initial: { opacity: 0.85, y: -motionTokens.distance.micro },
    animate: { opacity: 1, y: 0 },
    transition: motionTokens.spring.settle,
    reduced: {
      initial: { opacity: 0.85 },
      animate: { opacity: 1 },
      transition: { duration: motionTokens.duration.quick, ease: easeStandard },
    },
  },
  containedError: {
    initial: { x: 0 },
    animate: {
      x: [0, -motionTokens.distance.micro, motionTokens.distance.micro, 0],
    },
    transition: {
      duration: motionTokens.duration.standard,
      ease: easeStandard,
    },
    reduced: {
      initial: { opacity: 1 },
      animate: { opacity: [1, 0.7, 1] },
      transition: { duration: motionTokens.duration.quick },
    },
  },
  sheetEnter: {
    initial: { opacity: 0, y: motionTokens.distance.large },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: motionTokens.distance.medium },
    transition: {
      duration: motionTokens.duration.deliberate,
      ease: easeEnter,
    },
    reduced: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: motionTokens.duration.quick, ease: easeStandard },
    },
  },
  press: {
    initial: { scale: 1 },
    animate: { scale: motionTokens.scale.press },
    transition: { duration: motionTokens.duration.instant, ease: easeStandard },
    reduced: {
      initial: { opacity: 1 },
      animate: { opacity: 0.92 },
      transition: { duration: motionTokens.duration.instant },
    },
  },
} satisfies Record<string, MotionVariantSet>;

export type MotionRecipeName = keyof typeof motionVariantRecipes;

export function resolveMotionVariant(
  name: MotionRecipeName,
  reduceMotion: boolean,
): {
  initial: MotionProps;
  animate: MotionProps;
  exit?: MotionProps;
  transition: Transition;
} {
  const recipe = motionVariantRecipes[name] as MotionVariantSet;
  if (reduceMotion) {
    return {
      initial: recipe.reduced.initial,
      animate: recipe.reduced.animate,
      exit: recipe.reduced.exit,
      transition: recipe.reduced.transition,
    };
  }
  return {
    initial: recipe.initial,
    animate: recipe.animate,
    exit: recipe.exit,
    transition: recipe.transition,
  };
}

/** Framer/Motion Variants helper for common enter/exit pairs. */
export function toVariants(
  name: MotionRecipeName,
  reduceMotion = false,
): Variants {
  const resolved = resolveMotionVariant(name, reduceMotion);
  return {
    initial: resolved.initial,
    animate: resolved.animate,
    exit: resolved.exit ?? { opacity: 0 },
  };
}

/** True when a recipe uses an unbounded loop (should stay false for all recipes). */
export function recipeHasUnboundedLoop(name: MotionRecipeName): boolean {
  const t = motionVariantRecipes[name].transition as Transition & {
    repeat?: number;
  };
  return t.repeat === Infinity || t.repeat === Number.POSITIVE_INFINITY;
}
