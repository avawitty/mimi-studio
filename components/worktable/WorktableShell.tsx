import React, { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

type WorktableShellProps = {
  /** Hero media / canvas */
  children: React.ReactNode;
  /** Collapsed sheet label */
  toolsLabel?: string;
  /** Tool controls rendered inside the expandable sheet */
  tools: React.ReactNode;
  /** Optional thin top bar */
  chrome?: React.ReactNode;
  /** Default open state; mobile defaults closed */
  defaultToolsOpen?: boolean;
  className?: string;
};

/**
 * Canvas-first worktable: media hero + collapsible tools sheet (PRD-04).
 * Mobile defaults to tools collapsed so media ≥ ~70% viewport.
 */
export const WorktableShell: React.FC<WorktableShellProps> = ({
  children,
  toolsLabel = "Tools",
  tools,
  chrome,
  defaultToolsOpen,
  className = "",
}) => {
  const reduceMotion = useReducedMotion();
  const [isNarrow, setIsNarrow] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => {
      setIsNarrow(mq.matches);
      if (defaultToolsOpen === undefined) {
        setToolsOpen(!mq.matches);
      }
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [defaultToolsOpen]);

  useEffect(() => {
    if (defaultToolsOpen !== undefined) setToolsOpen(defaultToolsOpen);
  }, [defaultToolsOpen]);

  return (
    <div
      className={`flex flex-col h-full min-h-0 bg-[var(--mimi-worktable,#fafafa)] text-[var(--mimi-ink,#0a0a0a)] ${className}`}
    >
      {chrome && <div className="shrink-0 border-b border-[var(--mimi-hairline,#d4d4d4)]">{chrome}</div>}

      <div className="flex-1 min-h-0 relative overflow-hidden">{children}</div>

      <div className="shrink-0 border-t border-[var(--mimi-hairline,#d4d4d4)] bg-[var(--mimi-field,#ffffff)]">
        <button
          type="button"
          onClick={() => setToolsOpen((v) => !v)}
          className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
          aria-expanded={toolsOpen}
        >
          <span className="flex items-center gap-3">
            <span
              aria-hidden
              className="block w-8 h-0.5 bg-[var(--mimi-stone,#78716c)] rounded-full"
            />
            <span className="font-sans text-[10px] uppercase tracking-[0.28em] font-semibold text-[var(--mimi-stone,#78716c)]">
              {toolsLabel}
            </span>
          </span>
          <span className="font-sans text-[9px] uppercase tracking-[0.22em] text-[var(--mimi-stone,#78716c)]">
            {toolsOpen ? "Hide" : isNarrow ? "Open" : toolsOpen ? "Hide" : "Show"}
          </span>
        </button>

        <AnimatePresence initial={false}>
          {toolsOpen && (
            <motion.div
              initial={reduceMotion ? { height: "auto" } : { height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={reduceMotion ? { height: 0 } : { height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden border-t border-[var(--mimi-hairline,#d4d4d4)]"
            >
              <div className="max-h-[min(48vh,420px)] overflow-y-auto px-4 py-4">
                {tools}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
