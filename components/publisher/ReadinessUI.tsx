import type { ReadinessStatus } from "../../lib/publisher/types";
import {
  readinessStatusLabel,
  readinessStatusSymbol,
} from "../../lib/publisher/releaseReadiness";

const STATUS_CLASS: Record<ReadinessStatus, string> = {
  ready: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  "needs-review": "border-amber-500/30 bg-amber-500/10 text-amber-400",
  blocked: "border-red-500/30 bg-red-500/10 text-red-400",
  "not-configured": "border-stone-700 bg-stone-900 text-stone-500",
};

export function ReadinessBadge({
  status,
  compact,
}: {
  status: ReadinessStatus;
  compact?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 border font-mono text-[8px] uppercase tracking-widest font-bold ${STATUS_CLASS[status]}`}
    >
      {compact ? readinessStatusSymbol(status) : readinessStatusLabel(status)}
    </span>
  );
}

export function StageProgressRow({
  stages,
}: {
  stages: { label: string; status: ReadinessStatus }[];
}) {
  return (
    <div className="flex flex-wrap gap-2" role="list" aria-label="Release stage progress">
      {stages.map((stage) => (
        <div
          key={stage.label}
          role="listitem"
          className="flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-wider text-stone-400"
        >
          <span className="text-stone-300">{stage.label}</span>
          <span
            className={
              stage.status === "ready"
                ? "text-emerald-400"
                : stage.status === "blocked"
                  ? "text-red-400"
                  : "text-amber-400"
            }
            aria-label={`${stage.label}: ${readinessStatusLabel(stage.status)}`}
          >
            {readinessStatusSymbol(stage.status)}
          </span>
        </div>
      ))}
    </div>
  );
}
