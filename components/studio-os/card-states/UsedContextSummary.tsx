import type { ReactNode } from "react";
import { ProvenanceTray } from "./ProvenanceTray";
import "./cardStates.css";

export type UsedContextSummaryProps = {
  entries: Array<{ id: string; label: string; source?: string }>;
  state?: "none" | "proposed" | "approved" | "partial" | "stale" | "excluded";
  onInspect?: () => void;
  className?: string;
  children?: ReactNode;
};

const STATE_COPY: Record<NonNullable<UsedContextSummaryProps["state"]>, string> = {
  none: "No approved context — Mimi will not invent sources.",
  proposed: "Context proposed — approve before generation.",
  approved: "Approved context will shape this result.",
  partial: "Some context is unavailable.",
  stale: "Context changed after the last generation.",
  excluded: "Context excluded from this result.",
};

/**
 * Canonical Used Context summary for generation gates.
 */
export function UsedContextSummary({
  entries,
  state = entries.length > 0 ? "approved" : "none",
  onInspect,
  className = "",
  children,
}: UsedContextSummaryProps) {
  return (
    <ProvenanceTray label="Used Context" className={className}>
      <p className="mimi-used-context__state" data-state={state}>
        {STATE_COPY[state]}
      </p>
      {entries.length > 0 ? (
        <ul className="mimi-used-context__list">
          {entries.map((entry) => (
            <li key={entry.id}>
              <span>{entry.label}</span>
              {entry.source ? (
                <span className="mimi-used-context__source">{entry.source}</span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {children}
      {onInspect ? (
        <button type="button" className="mimi-used-context__inspect" onClick={onInspect}>
          Inspect context
        </button>
      ) : null}
    </ProvenanceTray>
  );
}
