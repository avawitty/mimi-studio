import React, { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { resolveMotionVariant } from "../../lib/motion";
import {
  SIGNAL_REFINE_LABELS,
  SIGNAL_REFINE_OPTIONS,
  type SignalRefineOption,
} from "../../lib/tasteIntelligence/signalRefine";
import type { TasteFeatureWeight } from "../../lib/tasteModel/contracts";

interface SignalRefineSheetProps {
  open: boolean;
  onClose: () => void;
  feature: TasteFeatureWeight | null;
  neighborFeatures: TasteFeatureWeight[];
  scopeLabel: string;
  onRefine: (
    option: SignalRefineOption,
    secondaryFeatureId?: string,
  ) => void;
  loading?: boolean;
}

export const SignalRefineSheet: React.FC<SignalRefineSheetProps> = ({
  open,
  onClose,
  feature,
  neighborFeatures,
  scopeLabel,
  onRefine,
  loading,
}) => {
  const reduceMotion = Boolean(useReducedMotion());
  const sheet = resolveMotionVariant("sheetEnter", reduceMotion);
  const [pendingCombined, setPendingCombined] =
    React.useState<SignalRefineOption | null>(null);

  useEffect(() => {
    if (!open) setPendingCombined(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && feature && (
        <motion.div
          className="fixed inset-0 z-[90] flex flex-col justify-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={sheet.transition}
          role="dialog"
          aria-label="Refine this signal"
        >
          <button
            type="button"
            aria-label="Dismiss refine sheet"
            className="absolute inset-0 bg-mimi-ink/20 backdrop-blur-[1px]"
            onClick={onClose}
          />

          <motion.div
            className="relative max-h-[85vh] overflow-y-auto border-t border-mimi-hairline/40 bg-mimi-field px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 shadow-xl"
            initial={sheet.initial}
            animate={sheet.animate}
            exit={sheet.exit}
            transition={sheet.transition}
          >
            <div className="mx-auto w-full max-w-lg">
              <p className="text-[10px] uppercase tracking-[0.25em] text-mimi-stone">
                Refine this signal
              </p>
              <h3 className="mt-1 font-display text-xl text-mimi-ink">
                {feature.label}
              </h3>
              <p className="mt-1 text-xs text-mimi-stone">
                Scope: {scopeLabel}
              </p>

              {pendingCombined === "not_when_combined" ? (
                <div className="mt-4 space-y-2">
                  <p className="text-sm text-mimi-stone">
                    Select the second feature this should not combine with:
                  </p>
                  <div className="flex flex-col gap-2">
                    {neighborFeatures
                      .filter((n) => n.featureId !== feature.featureId)
                      .map((neighbor) => (
                        <button
                          key={neighbor.featureId}
                          type="button"
                          disabled={loading}
                          onClick={() => {
                            onRefine("not_when_combined", neighbor.featureId);
                            onClose();
                          }}
                          className="min-h-[44px] border border-mimi-hairline/40 px-3 py-2 text-left text-sm text-mimi-ink hover:bg-mimi-hairline/10 disabled:opacity-50"
                        >
                          {neighbor.label}
                        </button>
                      ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setPendingCombined(null)}
                    className="text-[10px] uppercase tracking-wider text-mimi-stone"
                  >
                    Back
                  </button>
                </div>
              ) : (
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {SIGNAL_REFINE_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      disabled={loading}
                      onClick={() => {
                        if (option === "not_when_combined") {
                          setPendingCombined(option);
                          return;
                        }
                        onRefine(option);
                        onClose();
                      }}
                      className="min-h-[44px] border border-mimi-hairline/40 px-3 py-2 text-left text-sm text-mimi-ink hover:bg-mimi-hairline/10 disabled:opacity-50"
                    >
                      {SIGNAL_REFINE_LABELS[option]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
