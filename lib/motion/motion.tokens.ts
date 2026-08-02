/**
 * Central motion tokens for Mimi Studio.
 * Components must not invent local timing/spring values unless documented.
 */

export const motionTokens = {
  duration: {
    instant: 0.08,
    quick: 0.16,
    standard: 0.24,
    deliberate: 0.38,
    editorial: 0.56,
  },
  ease: {
    enter: [0.22, 1, 0.36, 1] as const,
    exit: [0.4, 0, 1, 1] as const,
    standard: [0.2, 0, 0, 1] as const,
  },
  spring: {
    selection: {
      type: "spring" as const,
      stiffness: 520,
      damping: 34,
      mass: 0.55,
    },
    settle: {
      type: "spring" as const,
      stiffness: 320,
      damping: 30,
      mass: 0.8,
    },
    transfer: {
      type: "spring" as const,
      stiffness: 240,
      damping: 27,
      mass: 0.9,
    },
  },
  distance: {
    micro: 2,
    small: 6,
    medium: 14,
    large: 28,
  },
  scale: {
    press: 0.98,
    selected: 1.015,
    arrival: 0.96,
  },
} as const;

export type MotionTokens = typeof motionTokens;
