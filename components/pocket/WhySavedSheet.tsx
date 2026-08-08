import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useModalFocus } from "../../lib/a11y/useModalFocus";
import { epistemicLabelForHypothesis } from "../../lib/tasteIntelligence/savedReason";
import { resolveMotionVariant } from "../../lib/motion";
import type { SavedReasonHypothesis } from "../../schemas/tasteIntelligenceContracts";

interface WhySavedSheetProps {
  open: boolean;
  onDismiss: () => void;
  onDone: () => void;
  hypotheses: SavedReasonHypothesis[];
  loading?: boolean;
  error?: string | null;
  snapshotAvailable?: boolean;
  queuePosition?: number;
  queueLength?: number;
  isReviewing?: (hypothesisId: string) => boolean;
  reviewErrors?: Record<string, string>;
  onReview: (
    hypothesis: SavedReasonHypothesis,
    action: "confirm" | "reject" | "edit" | "skip",
    editedText?: string,
  ) => void | Promise<void>;
}

export const WhySavedSheet: React.FC<WhySavedSheetProps> = ({
  open,
  onDismiss,
  onDone,
  hypotheses,
  loading,
  error,
  snapshotAvailable = true,
  queuePosition = 0,
  queueLength = 0,
  isReviewing = () => false,
  reviewErrors = {},
  onReview,
}) => {
  const reduceMotion = Boolean(useReducedMotion());
  const sheet = resolveMotionVariant("sheetEnter", reduceMotion);
  const panelRef = useRef<HTMLDivElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");

  useModalFocus(open, panelRef);

  useEffect(() => {
    if (!open) {
      setEditingId(null);
      setEditDraft("");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onDismiss]);

  const showQueueMeta = queueLength > 1 && queuePosition > 0;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[95] flex flex-col justify-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={sheet.transition}
          role="dialog"
          aria-modal="true"
          aria-label="Why did you save this?"
        >
          <button
            type="button"
            aria-label="Dismiss why-saved sheet"
            className="absolute inset-0 bg-mimi-ink/20 backdrop-blur-[1px]"
            onClick={onDismiss}
          />

          <motion.div
            ref={panelRef}
            tabIndex={-1}
            className="relative max-h-[85vh] overflow-y-auto border-t border-mimi-hairline/40 bg-mimi-field px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 shadow-xl outline-none"
            initial={sheet.initial}
            animate={sheet.animate}
            exit={sheet.exit}
            transition={sheet.transition}
          >
            <div className="mx-auto w-full max-w-lg">
              <p className="text-[10px] uppercase tracking-[0.25em] text-mimi-stone">
                Why saved
                {showQueueMeta ? (
                  <span className="ml-2 tabular-nums">
                    · {queuePosition} of {queueLength}
                  </span>
                ) : null}
              </p>
              <h3 className="mt-1 font-display text-xl text-mimi-ink">
                What drew you to this?
              </h3>
              <p className="mt-2 text-sm text-mimi-stone">
                Mimi proposes interpretive hypotheses — not identity claims. Confirm,
                reject, or correct what fits.
              </p>

              {!snapshotAvailable && (
                <p className="mt-3 text-xs border border-mimi-hairline/30 p-2 text-mimi-stone">
                  Taste model not compiled yet — hypotheses are tag-based only.
                </p>
              )}

              {error && (
                <p className="mt-3 text-sm text-red-700" role="alert">
                  {error}
                </p>
              )}

              {loading && hypotheses.length === 0 ? (
                <p className="mt-4 text-sm text-mimi-stone">Reading your taste model…</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {hypotheses.map((hypothesis) => {
                    const isEditing = editingId === hypothesis.id;
                    const reviewed = hypothesis.userStatus !== "unreviewed";
                    const pending = isReviewing(hypothesis.id);
                    const itemError = reviewErrors[hypothesis.id];
                    return (
                      <li
                        key={hypothesis.id}
                        className="border border-mimi-hairline/30 p-3"
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-[9px] uppercase tracking-wider text-mimi-stone">
                            {epistemicLabelForHypothesis(hypothesis)}
                          </span>
                          <span className="text-[9px] text-mimi-stone tabular-nums">
                            {Math.round(hypothesis.confidence * 100)}% confidence
                          </span>
                        </div>

                        {itemError && (
                          <p className="mb-2 text-xs text-red-700" role="alert">
                            {itemError}
                          </p>
                        )}

                        {pending && !isEditing && (
                          <p className="mb-2 text-xs text-mimi-stone">Saving review…</p>
                        )}

                        {isEditing ? (
                          <div className="space-y-2">
                            <textarea
                              value={editDraft}
                              onChange={(e) => setEditDraft(e.target.value)}
                              rows={3}
                              className="w-full border border-mimi-hairline/30 bg-transparent px-2 py-2 text-sm"
                            />
                            <div className="flex gap-2">
                              <button
                                type="button"
                                disabled={pending || !editDraft.trim()}
                                onClick={() => {
                                  void onReview(hypothesis, "edit", editDraft.trim());
                                  setEditingId(null);
                                }}
                                className="min-h-[44px] flex-1 text-[10px] uppercase tracking-wider border border-mimi-cobalt/40 text-mimi-cobalt"
                              >
                                Save correction
                              </button>
                              <button
                                type="button"
                                disabled={pending}
                                onClick={() => setEditingId(null)}
                                className="min-h-[44px] px-3 text-[10px] uppercase tracking-wider text-mimi-stone"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="text-sm text-mimi-ink">{hypothesis.hypothesis}</p>
                            {!reviewed && (
                              <div className="mt-3 grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  disabled={pending}
                                  onClick={() => void onReview(hypothesis, "confirm")}
                                  className="min-h-[44px] text-[10px] uppercase tracking-wider border border-mimi-hairline/40"
                                >
                                  That fits
                                </button>
                                <button
                                  type="button"
                                  disabled={pending}
                                  onClick={() => void onReview(hypothesis, "reject")}
                                  className="min-h-[44px] text-[10px] uppercase tracking-wider border border-mimi-hairline/40"
                                >
                                  Not why I saved it
                                </button>
                                <button
                                  type="button"
                                  disabled={pending}
                                  onClick={() => {
                                    setEditingId(hypothesis.id);
                                    setEditDraft(hypothesis.hypothesis);
                                  }}
                                  className="min-h-[44px] text-[10px] uppercase tracking-wider border border-mimi-hairline/40"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  disabled={pending}
                                  onClick={() => void onReview(hypothesis, "skip")}
                                  className="min-h-[44px] text-[10px] uppercase tracking-wider text-mimi-stone"
                                >
                                  Skip
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}

              {hypotheses.length > 0 && (
                <button
                  type="button"
                  onClick={onDone}
                  className="mt-4 w-full min-h-[44px] text-[10px] uppercase tracking-wider border border-mimi-hairline/40"
                >
                  {queueLength > queuePosition ? "Done — skip remaining" : "Done"}
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
