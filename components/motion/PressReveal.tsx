import React from "react";
import { motion, useReducedMotion } from "motion/react";

type PressRevealProps = {
  children: React.ReactNode;
  className?: string;
};

/** Page-turn / press reveal for entering plates and issues (PRD-06). */
export const PressReveal: React.FC<PressRevealProps> = ({
  children,
  className = "",
}) => {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 16, rotateX: 6 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
      style={{ transformPerspective: 1200 }}
    >
      {children}
    </motion.div>
  );
};
