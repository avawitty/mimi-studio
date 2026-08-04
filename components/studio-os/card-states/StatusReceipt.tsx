import type { ReactNode } from "react";
import type { CoverageState, MimiCardState } from "../../../lib/cardStateTypes";
import { MimiStateFrame } from "./MimiStateFrame";
import "./cardStates.css";

const COVERAGE_LABELS: Record<CoverageState, string> = {
  live: "Live",
  derived: "Derived",
  demonstration: "Demonstration",
  "awaiting-connection": "Awaiting connection",
  empty: "Empty",
  unavailable: "Unavailable",
  failed: "Failed",
};

export type StatusReceiptProps = {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  coverage?: CoverageState;
  updatedAt?: string;
  children?: ReactNode;
  state?: MimiCardState;
  className?: string;
};

/**
 * Status scene — loading, queued, synced, failed, or complete receipts.
 */
export function StatusReceipt({
  eyebrow,
  title,
  description,
  coverage,
  updatedAt,
  children,
  state = "idle",
  className = "",
}: StatusReceiptProps) {
  return (
    <MimiStateFrame
      kind="status"
      state={state}
      eyebrow={eyebrow ?? (coverage ? COVERAGE_LABELS[coverage] : undefined)}
      title={title}
      description={description}
      className={`mimi-status-receipt ${className}`.trim()}
      footer={updatedAt ? <time className="mimi-status-receipt__time">{updatedAt}</time> : undefined}
    >
      {coverage ? (
        <div className="mimi-status-receipt__coverage" data-coverage={coverage}>
          {children}
        </div>
      ) : (
        children
      )}
    </MimiStateFrame>
  );
}
