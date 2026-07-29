/**
 * ShapeBriefReview — overlay panel for reviewing and approving Mimi's shape-brief
 * editorial suggestions.
 *
 * Extracted verbatim from InputStudio.tsx (lines ~2847–3029).  All state lives in
 * the parent; this component only renders and fires callbacks.
 */

import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { splitInferredAnchors } from "../../lib/utils";

// ---------------------------------------------------------------------------
// Shared result type (mirrors the inline type in InputStudio.tsx)
// ---------------------------------------------------------------------------

export interface ShapedBriefResult {
  preservedLanguage: string;
  proposedDirection: string;
  inferredAnchors: string;
  openQuestions: string;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ShapeBriefReviewProps {
  /** Whether the overlay is visible. */
  isOpen: boolean;
  /** The structured result from the shape-brief AI call. */
  result: ShapedBriefResult;
  /** Whether the panel is in edit mode (true) or read-only review mode (false). */
  isEditing: boolean;
  /** Called when the user edits any field. Parent updates its state in place. */
  onChange: (updated: ShapedBriefResult) => void;
  /** Switch to edit mode. */
  onEdit: () => void;
  /** Switch back to read-only review mode. */
  onViewReview: () => void;
  /**
   * Called when the user clicks "Apply to Brief".
   * Receives the current result so the parent can apply it without closing over
   * potentially stale state.
   */
  onApply: (result: ShapedBriefResult) => void;
  /** Dismiss the overlay without applying any changes. */
  onClose: () => void;
  /** Haptic / tactile click sound callback. */
  playClick: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ShapeBriefReview({
  isOpen,
  result,
  isEditing,
  onChange,
  onEdit,
  onViewReview,
  onApply,
  onClose,
  playClick,
}: ShapeBriefReviewProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.985 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.985 }}
          className="absolute inset-0 bg-stone-950/96 z-50 p-6 flex flex-col overflow-y-auto no-scrollbar border border-stone-900/50 m-2 rounded-sm shadow-2xl"
        >
          <div className="flex justify-between items-center mb-5 border-b border-stone-900 pb-3 shrink-0">
            <div>
              <span className="font-mono text-[7px] uppercase tracking-[0.25em] text-purple-400 font-extrabold">MIMI STUDY // SHAPE BRIEF REVIEW</span>
              <h3 className="font-serif italic text-lg text-[#F4F3EF] mt-0.5">
                {isEditing ? "Edit AI Suggestions" : "Review Editorial Direction"}
              </h3>
            </div>
            <button
              onClick={() => {
                onClose();
                playClick();
              }}
              className="text-stone-500 hover:text-white transition-colors p-1"
            >
              <X size={16} />
            </button>
          </div>

          {!isEditing ? (
            /* Read-Only Review Display */
            <div className="flex-1 space-y-5 text-stone-300">
              <p className="font-sans text-[10px] text-stone-450 leading-relaxed max-w-lg italic">
                Mimi has structured your unfinished thoughts. Review her proposals. None of your inputs have been changed yet.
              </p>

              {/* Preserved Language */}
              <div className="space-y-1 border-l border-amber-500/40 pl-3.5">
                <span className="font-mono text-[7px] uppercase tracking-widest text-amber-500 font-extrabold block">Preserved Language (Your Voice)</span>
                <p className="font-serif italic text-sm text-[#FAF9F6] leading-relaxed">
                  &ldquo;{result.preservedLanguage}&rdquo;
                </p>
              </div>

              {/* Proposed direction */}
              <div className="space-y-1 border-l border-purple-500/40 pl-3.5">
                <span className="font-mono text-[7px] uppercase tracking-widest text-purple-400 font-extrabold block">Proposed Editorial Direction</span>
                <p className="font-sans text-[10.5px] text-stone-200 leading-relaxed">
                  {result.proposedDirection}
                </p>
              </div>

              {/* Inferred anchors */}
              <div className="space-y-1 border-l border-blue-500/40 pl-3.5">
                <span className="font-mono text-[7px] uppercase tracking-widest text-blue-400 font-extrabold block">Inferred Anchors</span>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {splitInferredAnchors(result.inferredAnchors).map((anchor, i) => (
                    <span key={i} className="font-mono text-[7.5px] uppercase bg-blue-500/10 border border-blue-500/20 text-blue-400 px-2 py-0.5">
                      {anchor.replace(/^\[INFERRED\]\s*/i, "")}
                    </span>
                  ))}
                </div>
              </div>

              {/* Open questions */}
              <div className="space-y-1 border-l border-stone-800 pl-3.5">
                <span className="font-mono text-[7px] uppercase tracking-widest text-stone-500 font-extrabold block">Poetic Open Questions</span>
                <p className="font-serif italic text-[10px] text-stone-450 leading-relaxed">
                  {result.openQuestions}
                </p>
              </div>
            </div>
          ) : (
            /* Editable Inputs */
            <div className="flex-1 space-y-4 text-stone-300">
              <div className="flex flex-col gap-1">
                <span className="font-mono text-[7px] uppercase tracking-widest text-amber-500 font-bold">Preserved Language</span>
                <textarea
                  value={result.preservedLanguage}
                  onChange={(e) => onChange({ ...result, preservedLanguage: e.target.value })}
                  rows={2}
                  className="w-full bg-stone-900 border border-stone-850 p-2 text-xs font-sans rounded-xs focus:border-stone-700 outline-none text-white placeholder:text-stone-700"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-mono text-[7px] uppercase tracking-widest text-purple-400 font-bold">Proposed Editorial Direction</span>
                <textarea
                  value={result.proposedDirection}
                  onChange={(e) => onChange({ ...result, proposedDirection: e.target.value })}
                  rows={3}
                  className="w-full bg-stone-900 border border-stone-850 p-2 text-xs font-sans rounded-xs focus:border-stone-700 outline-none text-white placeholder:text-stone-700"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-mono text-[7px] uppercase tracking-widest text-blue-400 font-bold">Inferred Anchors (comma-separated)</span>
                <input
                  type="text"
                  value={result.inferredAnchors}
                  onChange={(e) => onChange({ ...result, inferredAnchors: e.target.value })}
                  className="w-full bg-stone-900 border border-stone-850 p-2 text-xs font-sans rounded-xs focus:border-stone-700 outline-none text-white placeholder:text-stone-700"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-mono text-[7px] uppercase tracking-widest text-stone-500 font-bold">Open Questions</span>
                <textarea
                  value={result.openQuestions}
                  onChange={(e) => onChange({ ...result, openQuestions: e.target.value })}
                  rows={2}
                  className="w-full bg-stone-900 border border-stone-850 p-2 text-xs font-sans rounded-xs focus:border-stone-700 outline-none text-white placeholder:text-stone-700"
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 mt-6 pt-3 border-t border-stone-900 shrink-0">
            <button
              type="button"
              onClick={() => {
                onApply(result);
              }}
              className="flex-1 py-2.5 bg-[#FAF9F6] text-black text-[9px] font-mono uppercase tracking-widest font-extrabold hover:bg-stone-200 transition-colors rounded-xs"
            >
              Apply to Brief
            </button>

            {!isEditing ? (
              <button
                type="button"
                onClick={() => {
                  onEdit();
                  playClick();
                }}
                className="px-3.5 py-2.5 border border-stone-800 hover:border-stone-600 text-stone-300 text-[9px] font-mono uppercase tracking-widest transition-colors rounded-xs"
              >
                Edit first
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onViewReview();
                  playClick();
                }}
                className="px-3.5 py-2.5 border border-stone-800 hover:border-stone-600 text-stone-300 text-[9px] font-mono uppercase tracking-widest transition-colors rounded-xs"
              >
                View Review
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                onClose();
                playClick();
              }}
              className="px-3.5 py-2.5 border border-stone-900 hover:border-stone-800 text-stone-500 text-[9px] font-mono uppercase tracking-widest transition-colors rounded-xs"
            >
              Keep original
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
