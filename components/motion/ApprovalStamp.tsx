import React, { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { motionTokens } from "@/lib/motion";

type ApprovalStampProps = {
  /** Increment to fire the stamp */
  triggerKey: number;
  label?: string;
};

/** Editorial approval stamp — ink impression, not a green pill (PRD-06). */
export const ApprovalStamp: React.FC<ApprovalStampProps> = ({
  triggerKey,
  label = "APPROVED",
}) => {
  const reduceMotion = Boolean(useReducedMotion());
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (triggerKey <= 0) return;
    setVisible(true);
    const t = window.setTimeout(
      () => setVisible(false),
      reduceMotion ? 400 : 900,
    );
    return () => window.clearTimeout(t);
  }, [triggerKey, reduceMotion]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
          initial={
            reduceMotion
              ? { opacity: 1 }
              : { opacity: 0, scale: 1.35, rotate: -8 }
          }
          animate={{ opacity: 1, scale: 1, rotate: -6 }}
          exit={{ opacity: 0 }}
          transition={{
            duration: reduceMotion
              ? motionTokens.duration.instant
              : motionTokens.duration.standard,
            ease: [...motionTokens.ease.enter],
          }}
        >
          <div className="border-2 border-[var(--mimi-ink,#0a0a0a)] px-4 py-2 bg-[var(--mimi-field,#ffffff)]/90 shadow-[2px_2px_0_rgba(10,10,10,0.12)]">
            <span className="font-sans text-[11px] uppercase tracking-[0.35em] font-bold text-[var(--mimi-ink,#0a0a0a)]">
              {label}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
