import React from "react";
import { SpecimenCard } from "./SpecimenCard";

type PromptCycleProps = {
  cycle: number;
  total?: number;
  question: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  phaseLabel?: string;
  onNext?: () => void;
  selected?: boolean;
  onSelect?: () => void;
  className?: string;
};

/**
 * WT-006 — Oracle question card: cycle number, typewriter question, italic textarea.
 */
export const PromptCycle: React.FC<PromptCycleProps> = ({
  cycle,
  total,
  question,
  value,
  onChange,
  placeholder = "It started when…",
  phaseLabel = "INTAKE",
  onNext,
  selected = true,
  onSelect,
  className = "",
}) => {
  const fig = String(cycle).padStart(2, "0");

  return (
    <SpecimenCard
      fig={fig}
      state={value.trim() ? "draft" : "open"}
      selected={selected}
      onSelect={onSelect}
      className={className}
      date={total ? `${cycle}/${total}` : undefined}
    >
      <div data-specimen="WT-006" className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--wt-ink,var(--mimi-ink-soft,#111110))] leading-relaxed">
            {question}
          </p>
          <span className="shrink-0 font-mono text-[8px] uppercase tracking-[0.22em] text-[var(--wt-ink-2,#8a877f)] border border-[var(--wt-line,#d8d4c9)] px-1.5 py-0.5">
            {phaseLabel}
          </span>
        </div>

        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          placeholder={placeholder}
          rows={3}
          className="w-full resize-none bg-transparent border-0 border-b border-[var(--wt-line,#d8d4c9)] focus:border-[var(--wt-ink,#111110)] focus:outline-none font-serif italic font-light text-[18px] leading-snug text-[var(--wt-ink,#111110)] placeholder:text-[var(--wt-ink-2,#8a877f)] min-h-[3.5rem]"
          style={{ fontSize: "16px" }} /* ≥16px avoids iOS zoom */
        />

        {onNext && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onNext();
              }}
              className="font-mono text-[9px] uppercase tracking-[0.22em] text-[var(--wt-ink-2,#8a877f)] hover:text-[var(--wt-ink,#111110)] min-h-12 px-2"
            >
              Next cycle →
            </button>
          </div>
        )}
      </div>
    </SpecimenCard>
  );
};
