import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { UsedContextEntry, UsedContextTarget } from "../../types";
import {
  approveAllUsedContext,
  getUsedContext,
  removeFromUsedContext,
  setUsedContextApproved,
  subscribeUsedContext,
} from "../../services/usedContextService";
import { useUser } from "../../contexts/UserContext";
import { ColumnRule } from "../public-face/ColumnRule";
import { PressMark } from "../public-face/PressMark";
import { RegistryCorners } from "../public-face/RegistryCorners";
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
  const ownerUid = user?.uid || profile?.uid;
  const [entries, setEntries] = useState<UsedContextEntry[]>([]);
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [stampKey, setStampKey] = useState(0);

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
    setUsedContextApproved(atomId, next, target, ownerUid);
    if (next) setStampKey((k) => k + 1);
  };

  return (
    <aside
      className={`mimi-colophon mimi-cobalt-haze relative border-t border-[var(--mimi-hairline,#d4d4d4)] bg-[var(--mimi-field,#ffffff)] text-[var(--mimi-ink,#0a0a0a)] ${className}`}
      aria-label="Used Context colophon"
    >
      <RegistryCorners tone="cobalt" />
      <ApprovalStamp triggerKey={stampKey} />

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left px-4 md:px-6 py-4 flex items-start justify-between gap-4 hover:bg-black/[0.02] transition-colors"
      >
        <div className="min-w-0 space-y-2">
          <div className="flex items-center gap-3">
            <span className="font-sans text-[9px] uppercase tracking-[0.3em] font-semibold text-[var(--mimi-cobalt-deep,#6A8AA4)]">
              Colophon
            </span>
            <PressMark label="Registry" tone="cobalt" />
          </div>
          <div className="mimi-deco-fan" aria-hidden />
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
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 md:px-6 pb-5 space-y-4">
              <ColumnRule />
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
                        onClick={() => approveAllUsedContext(target, ownerUid)}
                        className="font-sans text-[9px] uppercase tracking-[0.22em] font-semibold border border-[var(--mimi-ink,#0a0a0a)] px-3 py-1.5"
                      >
                        Approve all
                      </button>
                    </div>
                  )}
                  <ul className="space-y-3 max-h-64 overflow-y-auto">
                    {entries.map((entry) => (
                      <li
                        key={`${entry.atomId}-${entry.target}`}
                        className="flex items-start justify-between gap-4 border-b border-[var(--mimi-hairline,#d4d4d4)] pb-3"
                      >
                        <div className="min-w-0">
                          <p className="font-serif italic text-base truncate">
                            {entry.title}
                          </p>
                          <p className="font-mono text-[9px] uppercase tracking-widest text-[var(--mimi-stone,#78716c)] mt-1">
                            {entry.source || "atom"} ·{" "}
                            {entry.approved ? "approved" : "pending"}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <button
                            type="button"
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
                      </li>
                    ))}
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
