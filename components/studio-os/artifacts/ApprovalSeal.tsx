import React from "react";

export interface ApprovalSealProps {
  onApply: () => void;
  applied?: boolean;
  disabled?: boolean;
  className?: string;
}

export const ApprovalSeal: React.FC<ApprovalSealProps> = ({
  onApply,
  applied = false,
  disabled = false,
  className = "",
}) => (
  <button
    type="button"
    onClick={onApply}
    disabled={disabled || applied}
    aria-pressed={applied}
    className={`inline-flex min-h-12 items-center justify-center border border-[var(--mimi-red,#c33b32)] px-5 font-mono text-[9px] uppercase tracking-[0.24em] text-[var(--mimi-red,#c33b32)] disabled:opacity-50 ${className}`}
  >
    {applied ? "Seal applied" : "Apply seal"}
  </button>
);
