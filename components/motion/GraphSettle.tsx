import React from "react";
import { motion, useReducedMotion } from "motion/react";

type GraphSettleProps = {
  children: React.ReactNode;
  className?: string;
  /** Delay stagger index for newly added nodes */
  index?: number;
  /** Use `g` for SVG coordinate-map nodes */
  as?: "div" | "g";
};

/**
 * Evidence → graph settle motion (PRD-06).
 * Wrap new Taste Graph nodes only; existing nodes should not remount.
 */
export const GraphSettle: React.FC<GraphSettleProps> = ({
  children,
  className = "",
  index = 0,
  as = "div",
}) => {
  const reduceMotion = useReducedMotion();
  const transition = {
    duration: reduceMotion ? 0.01 : 0.42,
    delay: reduceMotion ? 0 : Math.min(index * 0.04, 0.24),
    ease: [0.22, 1, 0.36, 1] as const,
  };

  if (as === "g") {
    if (reduceMotion) {
      return <g className={className}>{children}</g>;
    }
    return (
      <motion.g
        className={className}
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={transition}
        style={{ transformOrigin: "center", transformBox: "fill-box" }}
      >
        {children}
      </motion.g>
    );
  }

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: -12, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={transition}
    >
      {children}
    </motion.div>
  );
};
