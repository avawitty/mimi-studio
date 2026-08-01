import React from "react";
import { motion, useReducedMotion } from "motion/react";

type GraphSettleProps = {
  children: React.ReactNode;
  className?: string;
  /** Delay stagger index for newly added nodes */
  index?: number;
};

/**
 * Evidence → graph settle motion (PRD-06).
 * Wrap new Taste Graph nodes; existing nodes should not remount.
 */
export const GraphSettle: React.FC<GraphSettleProps> = ({
  children,
  className = "",
  index = 0,
}) => {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: -12, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.42,
        delay: Math.min(index * 0.04, 0.24),
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </motion.div>
  );
};
