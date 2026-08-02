import React, { useCallback, useEffect, useState } from "react";
import { ArrowRight, Loader2, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useUser } from "../../contexts/UserContext";
import { fetchMemoryAtoms } from "../../services/memoryService";
import { addToUsedContext } from "../../services/usedContextService";
import type { MemoryAtom } from "../../types";
import { ScribeThreadOrbital } from "./ScribeThreadOrbital";

export const ScribeThreadsPanel: React.FC = () => {
  const { user } = useUser();
  const reduceMotion = useReducedMotion();
  const [atoms, setAtoms] = useState<MemoryAtom[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<MemoryAtom | null>(null);
  const [queued, setQueued] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.uid) {
      setAtoms([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setAtoms(await fetchMemoryAtoms(user.uid));
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    void load();
  }, [load]);

  const queueForStudio = (atom: MemoryAtom) => {
    addToUsedContext(atom, "studio", user?.uid);
    setQueued(atom.id);
    window.dispatchEvent(
      new CustomEvent("mimi:toast", {
        detail: { message: "Atom queued in Studio Used Context.", type: "success" },
      }),
    );
  };

  const detailBody = selected ? (
    <div className="p-5 space-y-4 overflow-y-auto flex-1">
      <p className="font-mono text-[8px] uppercase tracking-widest archive-text-muted">Selected atom</p>
      <h3 className="font-serif italic text-lg archive-text-ink leading-snug">
        {selected.title || "Untitled fragment"}
      </h3>
      <p className="font-sans text-[11px] archive-text-muted leading-relaxed line-clamp-8">
        {selected.content}
      </p>
      <div className="flex flex-wrap gap-1">
        {(selected.tags || []).slice(0, 6).map((tag) => (
          <span
            key={tag}
            className="font-mono text-[7px] uppercase tracking-wide border archive-border px-1.5 py-0.5 archive-text-muted"
          >
            {tag}
          </span>
        ))}
      </div>
      <div className="flex flex-col gap-2 pt-2">
        <button
          type="button"
          onClick={() => queueForStudio(selected)}
          className="w-full py-3 min-h-[44px] bg-archive-ink text-archive-cream font-mono text-[8px] uppercase tracking-widest font-black"
        >
          {queued === selected.id ? "Queued for Studio" : "Send to Studio"}
        </button>
        <button
          type="button"
          onClick={() => {
            addToUsedContext(selected, "the-edit", user?.uid);
            window.dispatchEvent(
              new CustomEvent("mimi:toast", {
                detail: { message: "Atom queued in The Edit Used Context.", type: "success" },
              }),
            );
          }}
          className="w-full py-3 min-h-[44px] border archive-border archive-text-muted hover:archive-text-ink font-mono text-[8px] uppercase tracking-widest flex items-center justify-center gap-1"
        >
          Send to Edit <ArrowRight size={10} />
        </button>
      </div>
    </div>
  ) : (
    <div className="p-6 flex flex-col justify-center flex-1 text-center">
      <p className="font-serif italic text-sm archive-text-muted">
        Orbit a node to inspect the thread and route it to Studio or The Edit.
      </p>
    </div>
  );

  return (
    <div className="relative flex flex-col lg:flex-row h-full min-h-0">
      <div className="relative flex-1 min-h-0 border-b lg:border-b-0 lg:border-r archive-border">
        <ScribeThreadOrbital
          atoms={atoms}
          loading={loading}
          selectedId={selected?.id}
          onSelectAtom={setSelected}
        />
        <div className="absolute top-3 left-3 pointer-events-none">
          <p className="font-mono text-[7px] uppercase tracking-[0.3em] text-stone-500 bg-black/50 px-2 py-1">
            Semantic threads · {atoms.length} atoms
          </p>
        </div>
      </div>

      {/* Desktop side rail */}
      <aside className="hidden lg:flex w-full lg:w-[320px] shrink-0 flex-col bg-archive-surface/40 min-h-0">
        {detailBody}
        {loading && (
          <div className="p-3 border-t archive-border flex items-center justify-center gap-2 archive-text-muted">
            <Loader2 size={12} className="animate-spin" />
            <span className="font-mono text-[7px] uppercase tracking-widest">Syncing atoms</span>
          </div>
        )}
      </aside>

      {/* Mobile selection sheet */}
      <AnimatePresence>
        {selected && (
          <>
            <button
              type="button"
              aria-label="Dismiss selected atom"
              className="lg:hidden fixed inset-0 z-[70] bg-black/35"
              onClick={() => setSelected(null)}
            />
            <motion.aside
              initial={reduceMotion ? { y: 0 } : { y: "100%" }}
              animate={{ y: 0 }}
              exit={reduceMotion ? { y: 0 } : { y: "100%" }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="lg:hidden fixed inset-x-0 bottom-0 z-[80] max-h-[min(62vh,480px)] flex flex-col bg-archive-surface border-t archive-border shadow-2xl rounded-t-xl"
              aria-label="Selected atom"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b archive-border shrink-0">
                <div className="flex items-center gap-3">
                  <span aria-hidden className="block w-8 h-0.5 bg-stone-400" />
                  <span className="font-mono text-[9px] uppercase tracking-[0.2em] archive-text-muted font-black">
                    Thread atom
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  aria-label="Close"
                  className="archive-icon-btn w-9 h-9 border archive-border flex items-center justify-center"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto pb-[env(safe-area-inset-bottom,0px)]">
                {detailBody}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
