import React from "react";
import { motion, useReducedMotion } from "motion/react";

import { motionTokens, resolveMotionVariant } from "@/lib/motion";

type PressRevealProps = {
  children: React.ReactNode;
  className?: string;
};

/** Page-turn / press reveal for entering plates and issues (PRD-06). */
export const PressReveal: React.FC<PressRevealProps> = ({
  children,
  className = "",
}) => {
  const reduceMotion = Boolean(useReducedMotion());
  const soft = resolveMotionVariant("softReveal", reduceMotion);

  if (reduceMotion) {
    return (
      <motion.div
        className={className}
        initial={soft.initial}
        animate={soft.animate}
        transition={soft.transition}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      className={className}
      initial={{
        opacity: 0,
        y: motionTokens.distance.medium,
        rotateX: 6,
      }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{
        duration: motionTokens.duration.deliberate,
        ease: [...motionTokens.ease.enter],
      }}
      style={{ transformPerspective: 1200 }}
    >
      {children}
    </motion.div>
  );
};
