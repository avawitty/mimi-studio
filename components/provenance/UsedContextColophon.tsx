import React, { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { UsedContextEntry, UsedContextTarget } from "../../types";
import {
  approveAllUsedContext,
  getUsedContext,
  removeFromUsedContext,
  setUsedContextApproved,
  subscribeUsedContext,
} from "../../services/usedContextService";
import { useUser } from "../../contexts/UserContext";
import { useFeedback } from "../../hooks/useFeedback";
import { resolveMotionVariant } from "../../lib/motion";
import { ColumnRule } from "../public-face/ColumnRule";
import { PressMark } from "../public-face/PressMark";
import { DossierTab } from "../public-face/DossierTab";
import { ApprovalStamp } from "../motion/ApprovalStamp";

interface UsedContextColophonProps {
  target?: UsedContextTarget;
  className?: string;
  /** Start expanded (publish review screens) */
  defaultExpanded?: boolean;
  onOpenScribe?: () => void;
}

/**
 * Used Context as typographic colophon / attribution mark — always present, quiet by default.
 * PRD-05: provenance as design, not developer tray.
 */
export const UsedContextColophon: React.FC<UsedContextColophonProps> = ({
  target = "studio",
  className = "",
  defaultExpanded = false,
  onOpenScribe,
}) => {
  const { user, profile } = useUser();
  const feedback = useFeedback();
  const reduceMotion = Boolean(useReducedMotion());
  const provisional = resolveMotionVariant("provisionalReveal", reduceMotion);
  const commit = resolveMotionVariant("commitAndSettle", reduceMotion);
  const sheet = resolveMotionVariant("sheetEnter", reduceMotion);
  const ownerUid = user?.uid || profile?.uid;
  const [entries, setEntries] = useState<UsedContextEntry[]>([]);
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [stampKey, setStampKey] = useState(0);
  const [committingId, setCommittingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => setEntries(getUsedContext(target, ownerUid));
    refresh();
    return subscribeUsedContext(refresh);
  }, [target, ownerUid]);

  const approvedCount = entries.filter((e) => e.approved).length;
  const pendingCount = entries.length - approvedCount;
  const preview = entries.slice(0, 4);

  const italicLine =
    entries.length === 0
      ? "No approved context — Mimi will not invent sources."
      : pendingCount > 0
        ? `${approvedCount} approved · ${pendingCount} pending`
        : `${approvedCount} approved reference${approvedCount === 1 ? "" : "s"}`;

  const handleApprove = (atomId: string, next: boolean) => {
    setErrorMessage(null);
    if (!next) {
      setUsedContextApproved(atomId, false, target, ownerUid);
      feedback.trigger("proposal.rejected");
      return;
    }

    // Immediate visual press/pending — haptic only after persistence confirms.
    setCommittingId(atomId);
    try {
      setUsedContextApproved(atomId, true, target, ownerUid);
      setStampKey((k) => k + 1);
      feedback.trigger("proposal.approved", { confirmed: true });
    } catch {
      setErrorMessage("Could not approve this reference. It remains pending.");
      feedback.trigger("action.failed");
    } finally {
      setCommittingId(null);
    }
  };

  return (
    <aside
      className={`mimi-colophon relative border-t border-[var(--mimi-hairline,#d4d4d4)] bg-[var(--mimi-field,#ffffff)] text-[var(--mimi-ink,#0a0a0a)] ${className}`}
      aria-label="Used Context colophon"
    >
      <ApprovalStamp triggerKey={stampKey} />

      {/* Folder tab sits on the colophon sheet — never over the canvas above. */}
      <div className="px-4 md:px-6 pt-2">
        <DossierTab label="Mimi // Colophon" classify="Registry" />
      </div>

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left px-4 md:px-6 py-3 md:py-4 flex items-start justify-between gap-4 hover:bg-black/[0.02] transition-colors border border-t-0"
        style={{
          borderColor: "var(--mimi-manila-edge, #C9BA86)",
          background:
            "linear-gradient(180deg, var(--mimi-manila-sheet, #F7F3E8) 0%, var(--mimi-field, #ffffff) 42%)",
        }}
      >
        <div className="min-w-0 space-y-2">
          <div className="flex items-center gap-3">
            <span className="font-sans text-[9px] uppercase tracking-[0.3em] font-semibold text-[var(--mimi-olive,#5A5A40)]">
              Used Context
            </span>
            <PressMark label="Filed" tone="cobalt" />
          </div>
          <p className="font-serif italic text-sm md:text-base text-[var(--mimi-ink,#0a0a0a)]">
            {italicLine}
          </p>
          {preview.length > 0 && (
            <div className="flex items-center gap-2 pt-1">
              {preview.map((entry) => (
                <div
                  key={`${entry.atomId}-${entry.target}`}
                  className="w-8 h-8 border border-[var(--mimi-hairline,#d4d4d4)] bg-[var(--mimi-worktable,#fafafa)] flex items-center justify-center shrink-0"
                  title={entry.title}
                >
                  <span className="font-serif text-[10px] italic text-[var(--mimi-stone,#78716c)]">
                    {entry.title.slice(0, 1)}
                  </span>
                </div>
              ))}
              {entries.length > 4 && (
                <span className="font-mono text-[9px] text-[var(--mimi-stone,#78716c)]">
                  +{entries.length - 4}
                </span>
              )}
            </div>
          )}
        </div>
        <span className="font-sans text-[9px] uppercase tracking-[0.22em] text-[var(--mimi-stone,#78716c)] shrink-0 pt-1">
          {expanded ? "Close" : "Review"}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={
              reduceMotion
                ? sheet.initial
                : { height: 0, opacity: 0 }
            }
            animate={
              reduceMotion
                ? sheet.animate
                : { height: "auto", opacity: 1 }
            }
            exit={
              reduceMotion
                ? sheet.exit
                : { height: 0, opacity: 0 }
            }
            transition={sheet.transition}
            className="overflow-hidden"
          >
            <div className="px-4 md:px-6 pb-5 space-y-4">
              <ColumnRule />
              {errorMessage && (
                <p
                  role="alert"
                  className="font-sans text-xs text-[var(--mimi-ink,#0a0a0a)]"
                >
                  {errorMessage}
                </p>
              )}
              {entries.length === 0 ? (
                <div className="space-y-2 py-2">
                  <p className="font-sans text-xs text-[var(--mimi-stone,#78716c)] leading-relaxed">
                    Send atoms from Scribe or Pocket, then approve before compose.
                  </p>
                  {onOpenScribe && (
                    <button
                      type="button"
                      onClick={onOpenScribe}
                      className="font-sans text-[10px] uppercase tracking-[0.22em] font-semibold underline underline-offset-4"
                    >
                      Open Scribe
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {pendingCount > 0 && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          approveAllUsedContext(target, ownerUid);
                          setStampKey((k) => k + 1);
                          feedback.trigger("proposal.approved", {
                            confirmed: true,
                          });
                        }}
                        className="font-sans text-[9px] uppercase tracking-[0.22em] font-semibold border border-[var(--mimi-ink,#0a0a0a)] px-3 py-1.5"
                      >
                        Approve all
                      </button>
                    </div>
                  )}
                  <ul className="space-y-3 max-h-64 overflow-y-auto">
                    {entries.map((entry) => {
                      const isCommitting = committingId === entry.atomId;
                      const variant = entry.approved ? commit : provisional;
                      return (
                        <motion.li
                          key={`${entry.atomId}-${entry.target}`}
                          layoutId={`used-context-${entry.atomId}-${entry.target}`}
                          initial={variant.initial}
                          animate={
                            isCommitting
                              ? { opacity: 0.85, scale: 1 }
                              : variant.animate
                          }
                          transition={variant.transition}
                          className={`flex items-start justify-between gap-4 border-b border-[var(--mimi-hairline,#d4d4d4)] pb-3 ${
                            entry.approved ? "" : "opacity-95"
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="font-serif italic text-base truncate">
                              {entry.title}
                            </p>
                            <p className="font-mono text-[9px] uppercase tracking-widest text-[var(--mimi-stone,#78716c)] mt-1">
                              {entry.source || "atom"} ·{" "}
                              {isCommitting
                                ? "saving"
                                : entry.approved
                                  ? "approved"
                                  : "pending"}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <button
                              type="button"
                              disabled={isCommitting}
                              onClick={() =>
                                handleApprove(entry.atomId, !entry.approved)
                              }
                              className="font-sans text-[9px] uppercase tracking-[0.18em] font-semibold"
                            >
                              {entry.approved ? "Revoke" : "Approve"}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                removeFromUsedContext(
                                  entry.atomId,
                                  target,
                                  ownerUid,
                                )
                              }
                              className="font-sans text-[9px] uppercase tracking-[0.18em] text-[var(--mimi-stone,#78716c)]"
                            >
                              Remove
                            </button>
                          </div>
                        </motion.li>
                      );
                    })}
                  </ul>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
};
