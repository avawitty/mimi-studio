import React from "react";
import { OBSERVATORY_WINDOW_DAYS, type ObservatoryWindowDays } from "../../services/collective/fetchMeanMedianModeReport";

export const ObservatoryWindowSelector: React.FC<{
  value: number;
  onChange: (days: ObservatoryWindowDays) => void;
  variant?: "void" | "field";
}> = ({ value, onChange, variant = "void" }) => {
  const subtle = variant === "void" ? "text-stone-500" : "text-[var(--mimi-stone)]";
  const active =
    variant === "void"
      ? "bg-stone-100 text-[#050506] border-stone-100"
      : "bg-[var(--mimi-ink)] text-[var(--mimi-field)] border-[var(--mimi-ink)]";
  const idle =
    variant === "void"
      ? "border-white/15 text-stone-500 hover:text-stone-200"
      : "border-[var(--mimi-hairline)] text-[var(--mimi-stone)] hover:text-[var(--mimi-ink)]";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className={`font-mono text-[8px] uppercase tracking-[0.28em] ${subtle}`}>
        Window
      </span>
      {OBSERVATORY_WINDOW_DAYS.map((days) => (
        <button
          key={days}
          type="button"
          onClick={() => onChange(days)}
          className={`px-2.5 py-1 font-mono text-[8px] uppercase tracking-widest border transition-colors ${
            value === days ? active : idle
          }`}
        >
          {days}d
        </button>
      ))}
    </div>
  );
};
