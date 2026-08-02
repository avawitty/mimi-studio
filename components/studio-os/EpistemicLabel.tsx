import React from "react";

export type EpistemicStatus =
  | "source"
  | "observation"
  | "inference"
  | "hypothesis"
  | "projection";

const STATUS_LABEL: Record<EpistemicStatus, string> = {
  source: "Source",
  observation: "Observation",
  inference: "Inference",
  hypothesis: "Hypothesis",
  projection: "Projection",
};

export interface EpistemicLabelProps {
  status: EpistemicStatus;
  className?: string;
}

export const EpistemicLabel: React.FC<EpistemicLabelProps> = ({
  status,
  className = "",
}) => (
  <span
    data-epistemic-status={status}
    className={`inline-flex border border-[var(--mimi-rule,#d8d4c9)] px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.2em] text-[var(--mimi-pencil,#8a877f)] ${className}`}
  >
    {STATUS_LABEL[status]}
  </span>
);
