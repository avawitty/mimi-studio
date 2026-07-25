import React, { useCallback, useEffect, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { useUser } from "../../contexts/UserContext";
import { fetchMemoryAtoms } from "../../services/memoryService";
import { addToUsedContext } from "../../services/usedContextService";
import type { MemoryAtom } from "../../types";
import { ScribeThreadOrbital } from "./ScribeThreadOrbital";

export const ScribeThreadsPanel: React.FC = () => {
  const { user } = useUser();
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
    addToUsedContext(atom, "studio");
    setQueued(atom.id);
    window.dispatchEvent(
      new CustomEvent("mimi:toast", {
        detail: { message: "Atom queued in Studio Used Context.", type: "success" },
      }),
    );
  };

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-0">
      <div className="relative flex-1 min-h-[280px] lg:min-h-0 border-b lg:border-b-0 lg:border-r archive-border">
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

      <aside className="w-full lg:w-[320px] shrink-0 flex flex-col bg-archive-surface/40 min-h-[200px]">
        {selected ? (
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
                className="w-full py-2.5 bg-archive-ink text-archive-cream font-mono text-[8px] uppercase tracking-widest font-black"
              >
                {queued === selected.id ? "Queued for Studio" : "Send to Studio"}
              </button>
              <button
                type="button"
                onClick={() => {
                  addToUsedContext(selected, "the-edit");
                  window.dispatchEvent(
                    new CustomEvent("mimi:toast", {
                      detail: { message: "Atom queued in The Edit Used Context.", type: "success" },
                    }),
                  );
                }}
                className="w-full py-2.5 border archive-border archive-text-muted hover:archive-text-ink font-mono text-[8px] uppercase tracking-widest flex items-center justify-center gap-1"
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
        )}
        {loading && (
          <div className="p-3 border-t archive-border flex items-center justify-center gap-2 archive-text-muted">
            <Loader2 size={12} className="animate-spin" />
            <span className="font-mono text-[7px] uppercase tracking-widest">Syncing atoms</span>
          </div>
        )}
      </aside>
    </div>
  );
};
