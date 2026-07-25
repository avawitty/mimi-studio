import React, { Suspense, lazy, useMemo } from "react";
import { Loader2 } from "lucide-react";
import type { MemoryAtom } from "../../types";
import { buildScribeThreadGraph } from "../../lib/scribeThreadGraph";

const ScribeThreadScene = lazy(() =>
  import("./ScribeThreadScene").then((m) => ({ default: m.ScribeThreadScene })),
);

interface ScribeThreadOrbitalProps {
  atoms: MemoryAtom[];
  loading?: boolean;
  selectedId?: string | null;
  onSelectAtom?: (atom: MemoryAtom) => void;
}

export const ScribeThreadOrbital: React.FC<ScribeThreadOrbitalProps> = ({
  atoms,
  loading,
  selectedId,
  onSelectAtom,
}) => {
  const graph = useMemo(() => buildScribeThreadGraph(atoms), [atoms]);

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-stone-950">
        <Loader2 className="animate-spin text-stone-500" size={24} />
      </div>
    );
  }

  if (graph.nodes.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-stone-950 p-6 text-center">
        <p className="font-serif italic text-sm text-stone-400 max-w-xs">
          Capture memory atoms in Scribe — they will orbit here as semantic threads.
        </p>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="w-full h-full flex items-center justify-center bg-stone-950">
          <Loader2 className="animate-spin text-stone-500" size={24} />
        </div>
      }
    >
      <ScribeThreadScene
        nodes={graph.nodes}
        edges={graph.edges}
        selectedId={selectedId}
        onSelectAtom={onSelectAtom}
      />
    </Suspense>
  );
};
