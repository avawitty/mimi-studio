import React from "react";
import { ChevronRight } from "lucide-react";
import type { ReleaseStage } from "../../lib/publisher/types";
import { ReadinessBadge } from "./ReadinessUI";

export const ReleaseStageChecklist: React.FC<{
  stages: ReleaseStage[];
  onNavigate: (path: string) => void;
}> = ({ stages, onNavigate }) => {
  const sequence = stages.filter((s) => s.id !== "publish");

  return (
    <section
      className="border border-stone-850 bg-[#121112] p-5 space-y-4"
      aria-labelledby="release-sequence-heading"
    >
      <div>
        <h3 id="release-sequence-heading" className="font-serif text-lg font-bold text-white">
          Release sequence
        </h3>
        <p className="font-mono text-[8px] uppercase tracking-wider text-stone-500 mt-1">
          Proof → Metadata → Rights → Context → Destinations → Publish
        </p>
      </div>
      <ol className="space-y-2 list-none">
        {sequence.map((stage) => (
          <li
            key={stage.id}
            className="border border-stone-800 bg-stone-950/40 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-sans text-sm font-medium text-stone-200">
                  {stage.label}
                </span>
                <ReadinessBadge status={stage.status} compact />
                {stage.unresolvedCount > 0 && (
                  <span className="font-mono text-[7px] uppercase tracking-wider text-stone-500">
                    {stage.unresolvedCount} unresolved
                  </span>
                )}
              </div>
              <p className="font-sans text-[11px] text-stone-500 mt-1">{stage.summary}</p>
              {stage.checks.length > 0 && stage.unresolvedCount > 0 && (
                <ul className="mt-2 space-y-1 list-none">
                  {stage.checks
                    .filter((c) => c.status !== "ready")
                    .slice(0, 3)
                    .map((c) => (
                      <li key={c.id} className="text-[10px] text-stone-600">
                        · {c.label}
                      </li>
                    ))}
                </ul>
              )}
            </div>
            {stage.actionLabel && stage.actionPath && (
              <button
                type="button"
                onClick={() => onNavigate(stage.actionPath!)}
                className="shrink-0 min-h-9 px-3 py-1.5 border border-stone-700 font-mono text-[8px] uppercase tracking-widest text-stone-400 hover:border-stone-500 flex items-center gap-1"
              >
                {stage.actionLabel}
                <ChevronRight size={10} />
              </button>
            )}
          </li>
        ))}
      </ol>
      {stages.find((s) => s.id === "publish") && (
        <div className="border-t border-stone-800 pt-3 flex items-center justify-between gap-3">
          <div>
            <span className="font-sans text-sm text-stone-300">Publish</span>
            <p className="font-sans text-[11px] text-stone-500">
              {stages.find((s) => s.id === "publish")?.summary}
            </p>
          </div>
          <ReadinessBadge status={stages.find((s) => s.id === "publish")!.status} />
        </div>
      )}
    </section>
  );
};
