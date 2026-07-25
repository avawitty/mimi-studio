import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { BookOpen, Check, Trash2, Sparkles } from "lucide-react";
import { UsedContextEntry, UsedContextTarget } from "../types";
import {
  approveAllUsedContext,
  getUsedContext,
  removeFromUsedContext,
  setUsedContextApproved,
  subscribeUsedContext,
} from "../services/usedContextService";

interface UsedContextTrayProps {
  compact?: boolean;
  target?: UsedContextTarget;
  onOpenScribe?: () => void;
  className?: string;
}

export const UsedContextTray: React.FC<UsedContextTrayProps> = ({
  compact = false,
  target = "studio",
  onOpenScribe,
  className = "",
}) => {
  const [entries, setEntries] = useState<UsedContextEntry[]>([]);
  const destinationLabel = target === "studio" ? "issue" : "edit compile";

  useEffect(() => {
    const refresh = () => setEntries(getUsedContext(target));
    refresh();
    return subscribeUsedContext(refresh);
  }, [target]);

  if (entries.length === 0) {
    return compact ? null : (
      <div className={`border border-dashed border-stone-700/60 p-6 text-center space-y-2 ${className}`}>
        <BookOpen size={18} className="mx-auto text-stone-500" />
        <p className="font-mono text-[9px] uppercase tracking-widest text-stone-500">
          No Scribe atoms in queue
        </p>
        <p className="font-sans text-[10px] text-stone-600 leading-relaxed max-w-xs mx-auto">
          Send atoms from Scribe → Retrieve. Approve here before {destinationLabel}.
        </p>
        {onOpenScribe && (
          <button
            type="button"
            onClick={onOpenScribe}
            className="font-mono text-[8px] uppercase tracking-widest text-stone-400 hover:text-[#FAF9F6] transition-colors"
          >
            Open Scribe
          </button>
        )}
      </div>
    );
  }

  const approvedCount = entries.filter((e) => e.approved).length;

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.25em] text-[#FAF9F6] font-bold">
            Used Context
          </p>
          <p className="font-sans text-[9px] text-stone-500 mt-0.5">
            {approvedCount} of {entries.length} approved for {destinationLabel}
          </p>
        </div>
        {entries.some((e) => !e.approved) && (
          <button
            type="button"
            onClick={() => approveAllUsedContext(target)}
            className="font-mono text-[8px] uppercase tracking-widest px-2 py-1 border border-stone-600 text-stone-400 hover:text-[#FAF9F6] hover:border-stone-400 transition-colors shrink-0"
          >
            Approve all
          </button>
        )}
      </div>

      <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
        <AnimatePresence mode="popLayout">
          {entries.map((entry) => (
            <motion.div
              key={`${entry.atomId}-${entry.target}`}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className={`border p-3 flex gap-3 items-start transition-colors ${
                entry.approved
                  ? "border-emerald-800/50 bg-emerald-950/20"
                  : "border-stone-700/60 bg-stone-900/30"
              }`}
            >
              <button
                type="button"
                onClick={() =>
                  setUsedContextApproved(entry.atomId, !entry.approved, target)
                }
                className={`mt-0.5 w-5 h-5 border flex items-center justify-center shrink-0 transition-colors ${
                  entry.approved
                    ? "border-emerald-500 bg-emerald-500/20 text-emerald-400"
                    : "border-stone-600 text-transparent hover:border-stone-400"
                }`}
                title={entry.approved ? "Revoke approval" : "Approve for issue"}
              >
                {entry.approved && <Check size={12} />}
              </button>

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-serif italic text-sm text-[#FAF9F6] leading-snug truncate">
                    {entry.title}
                  </p>
                  <button
                    type="button"
                    onClick={() => removeFromUsedContext(entry.atomId, target)}
                    className="p-1 text-stone-600 hover:text-red-400 transition-colors shrink-0"
                    title="Remove from queue"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                <p className="font-sans text-[10px] text-stone-500 line-clamp-2 leading-relaxed">
                  {entry.content}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {entry.source && (
                    <span className="font-mono text-[7px] uppercase tracking-wider text-stone-600 border border-stone-700 px-1 py-0.5">
                      {entry.source}
                    </span>
                  )}
                  {entry.approved && (
                    <span className="font-mono text-[7px] uppercase tracking-wider text-emerald-600 flex items-center gap-0.5">
                      <Sparkles size={8} /> Ready
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
