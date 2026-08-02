/**
 * Product motion grammar — semantic qualities for Collect → Read → Approve → Apply → Save.
 * Visual implementations live in motion.variants.ts; this maps grammar → recipe names.
 */

import type { MotionRecipeName } from "./motion.variants";

export type MotionGrammar =
  | "Gather"
  | "Read"
  | "Propose"
  | "Commit"
  | "Transfer"
  | "Settle"
  | "Trace";

export const motionGrammarRecipes: Record<MotionGrammar, MotionRecipeName[]> = {
  Gather: ["gatherIntoPocket"],
  Read: ["readingPulse", "softReveal"],
  Propose: ["provisionalReveal"],
  Commit: ["commitAndSettle"],
  Transfer: ["gatherIntoPocket"],
  Settle: ["settleIntoRegistry", "commitAndSettle"],
  Trace: ["softReveal"],
};

/** Loop correspondence with the product canon. */
export const productLoopMotion = {
  Collect: "Gather",
  Read: "Read",
  Approve: "Commit",
  Apply: "Transfer",
  Save: "Settle",
} as const satisfies Record<string, MotionGrammar>;
