import React from "react";
import { motion } from "motion/react";
import type { ChamberFamily } from "../../lib/design-system";

export interface ChamberSkeletonProps {
  family?: ChamberFamily;
  /** Void / dark plate placeholder */
  voidPlate?: boolean;
  label?: string | null;
}

/**
 * Suspense fallback shaped by chamber family.
 * Replaces the generic ViewSkeleton for route transitions.
 */
export const ChamberSkeleton: React.FC<ChamberSkeletonProps> = ({
  family = "orientation",
  voidPlate = false,
  label,
}) => {
  const plate = voidPlate
    ? "bg-[#0a0a0c]"
    : "bg-stone-200 dark:bg-stone-800";
  const soft = voidPlate
    ? "bg-[#141418]"
    : "bg-stone-100 dark:bg-stone-900";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`flex-1 w-full h-full p-8 flex flex-col gap-6 ${
        voidPlate ? "bg-[#050506]" : ""
      }`}
      aria-busy="true"
      aria-label={label ? `Loading ${label}` : "Loading chamber"}
    >
      <div className="flex items-center justify-between gap-4">
        <div className={`w-1/3 h-10 ${plate} animate-pulse`} />
        {family === "intelligence" || family === "capture" ? (
          <div
            className="w-16 h-4 animate-pulse"
            style={{ background: "var(--mimi-cobalt, #9BB8CE)", opacity: 0.35 }}
          />
        ) : null}
      </div>
      <div className={`w-1/4 h-4 ${soft} animate-pulse`} />

      {family === "production" || family === "services" ? (
        <div className="flex-1 mt-4 flex flex-col gap-3 min-h-0">
          <div className={`flex-1 w-full ${plate} animate-pulse`} />
          <div className={`h-14 w-full ${soft} animate-pulse`} />
        </div>
      ) : (
        <div className="flex-1 mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className={`w-full h-64 ${i % 2 === 0 ? soft : plate} animate-pulse`}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
};
