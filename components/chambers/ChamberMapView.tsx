import React, { useMemo, useState } from "react";
import { CANON_MODULES, type CanonModuleStatus } from "../../lib/productCanon";

const STATUS_LABEL: Record<CanonModuleStatus, string> = {
  live: "Live",
  aliased: "Aliased",
  stub: "Stub",
  missing: "Missing",
};

interface ChamberMapViewProps {
  onNavigate?: (mode: string) => void;
}

export const ChamberMapView: React.FC<ChamberMapViewProps> = ({ onNavigate }) => {
  const [filter, setFilter] = useState<CanonModuleStatus | "all">("all");

  const modules = useMemo(() => {
    const list = [...CANON_MODULES].sort((a, b) => a.priority - b.priority);
    if (filter === "all") return list;
    return list.filter((m) => m.status === filter);
  }, [filter]);

  const openChamber = (module: (typeof CANON_MODULES)[number]) => {
    if (!onNavigate) return;
    const segment = module.canonicalRoute.replace(/^\//, "");
    onNavigate(segment);
  };

  return (
    <div className="min-h-full bg-nous-base text-nous-text p-6 md:p-10 max-w-5xl mx-auto">
      <header className="mb-8 border-b border-nous-border pb-6">
        <p className="font-mono text-[9px] uppercase tracking-[0.35em] text-nous-subtle font-black">
          Milestone 1 · Architectural Map
        </p>
        <h1 className="font-serif italic text-3xl md:text-4xl mt-2">Chamber Registry</h1>
        <p className="font-sans text-sm text-nous-subtle mt-2 max-w-2xl">
          Every canonical chamber registered as route, component, and CanonModule entry.
        </p>
      </header>

      <div className="flex flex-wrap gap-2 mb-8">
        {(["all", "live", "aliased", "stub", "missing"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`px-3 py-1 font-mono text-[8px] uppercase tracking-widest border ${
              filter === key ? "bg-nous-text text-nous-base border-nous-text" : "border-nous-border text-nous-subtle"
            }`}
          >
            {key}
          </button>
        ))}
      </div>

      <div className="grid gap-3">
        {modules.map((module) => (
          <article
            key={module.id}
            className="border border-nous-border p-4 md:p-5 bg-white/50 dark:bg-stone-950/40 flex flex-col md:flex-row md:items-start md:justify-between gap-4"
          >
            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-serif italic text-xl">{module.name}</h2>
                <span className="font-mono text-[7px] uppercase tracking-widest px-2 py-0.5 border border-nous-border text-nous-subtle">
                  {STATUS_LABEL[module.status]}
                </span>
                <span className="font-mono text-[7px] uppercase tracking-widest text-nous-subtle">
                  {module.layer}
                </span>
              </div>
              <p className="font-mono text-[9px] text-nous-subtle">
                {module.canonicalRoute} → {module.implementedMode} · {module.component}
              </p>
              <p className="font-sans text-[11px] text-nous-subtle leading-relaxed">{module.engine}</p>
              {module.notes && (
                <p className="font-serif italic text-[11px] text-nous-subtle/80">{module.notes}</p>
              )}
            </div>
            {onNavigate && module.implementedMode && (
              <button
                type="button"
                onClick={() => openChamber(module)}
                className="shrink-0 self-start px-4 py-2 border border-nous-border font-mono text-[8px] uppercase tracking-widest hover:bg-nous-base0/30"
              >
                Open
              </button>
            )}
          </article>
        ))}
      </div>
    </div>
  );
};
