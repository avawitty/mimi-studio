import React, { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { resolveMotionVariant } from "../../lib/motion";
import type { SavedReasonHypothesis } from "../../schemas/tasteIntelligenceContracts";

interface WhySavedSheetProps {
  open: boolean;
  onClose: () => void;
  hypotheses: SavedReasonHypothesis[];
  loading?: boolean;
  error?: string | null;
  snapshotAvailable?: boolean;
  onReview: (
    hypothesis: SavedReasonHypothesis,
    action: "confirm" | "reject" | "edit" | "skip",
    editedText?: string,
  ) => void | Promise<void>;
}

const SOURCE_LABEL: Record<SavedReasonHypothesis["source"], string> = {
  model_proposed: "Inferred",
  rule_based: "Observed",
  creator_authored: "Creator confirmed",
};

export const WhySavedSheet: React.FC<WhySavedSheetProps> = ({
  open,
  onClose,
  hypotheses,
  loading,
  error,
  snapshotAvailable = true,
  onReview,
}) => {
  const reduceMotion = Boolean(useReducedMotion());
  const sheet = resolveMotionVariant("sheetEnter", reduceMotion);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");

  useEffect(() => {
    if (!open) {
      setEditingId(null);
      setEditDraft("");
    }
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
      {open && (
        <motion.div
          className="fixed inset-0 z-[95] flex flex-col justify-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={sheet.transition}
          role="dialog"
          aria-label="Why did you save this?"
        >
          <button
            type="button"
            aria-label="Dismiss why-saved sheet"
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
                Why saved
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
              ) : hypotheses.length === 0 ? (
                <div className="mt-4 space-y-3">
                  <p className="text-sm text-mimi-stone">
                    Mimi could not infer a saved-reason hypothesis for this capture yet.
                    That is normal when your taste model is sparse or the file tags do not
                    match a known dimension.
                  </p>
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full min-h-[44px] text-[10px] uppercase tracking-wider border border-mimi-hairline/40"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <ul className="mt-4 space-y-3">
                  {hypotheses.map((hypothesis) => {
                    const isEditing = editingId === hypothesis.id;
                    const reviewed = hypothesis.userStatus !== "unreviewed";
                    return (
                      <li
                        key={hypothesis.id}
                        className="border border-mimi-hairline/30 p-3"
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-[9px] uppercase tracking-wider text-mimi-stone">
                            {SOURCE_LABEL[hypothesis.source]}
                            {reviewed && hypothesis.userStatus === "rejected"
                              ? " · Creator rejected"
                              : reviewed && hypothesis.userStatus === "confirmed"
                                ? " · Creator confirmed"
                                : reviewed && hypothesis.userStatus === "edited"
                                  ? " · Creator corrected"
                                  : ""}
                          </span>
                          <span className="text-[9px] text-mimi-stone tabular-nums">
                            {Math.round(hypothesis.confidence * 100)}% confidence
                          </span>
                        </div>

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
                                disabled={loading || !editDraft.trim()}
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
                                  disabled={loading}
                                  onClick={() => void onReview(hypothesis, "confirm")}
                                  className="min-h-[44px] text-[10px] uppercase tracking-wider border border-mimi-hairline/40"
                                >
                                  That fits
                                </button>
                                <button
                                  type="button"
                                  disabled={loading}
                                  onClick={() => void onReview(hypothesis, "reject")}
                                  className="min-h-[44px] text-[10px] uppercase tracking-wider border border-mimi-hairline/40"
                                >
                                  Not why I saved it
                                </button>
                                <button
                                  type="button"
                                  disabled={loading}
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
                                  disabled={loading}
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
                  onClick={onClose}
                  className="mt-4 w-full min-h-[44px] text-[10px] uppercase tracking-wider border border-mimi-hairline/40"
                >
                  Done
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
