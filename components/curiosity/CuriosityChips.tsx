import React, { useId } from "react";
import {
  CURIOSITY_PROMPTS,
  type CuriosityPromptId,
} from "../../services/tailorEvidenceIntake";

interface CuriosityChipsProps {
  selected: CuriosityPromptId[];
  customText: string;
  onToggle: (id: CuriosityPromptId) => void;
  onCustomChange: (value: string) => void;
  variant?: "default" | "twilight" | "scry";
}

export const CuriosityChips: React.FC<CuriosityChipsProps> = ({
  selected,
  customText,
  onToggle,
  onCustomChange,
  variant = "default",
}) => {
  const customId = useId();
  const isTwilight = variant === "twilight" || variant === "scry";

  const chipClass = (active: boolean) => {
    if (isTwilight) {
      return active
        ? "border-mimi-cobalt bg-mimi-cobalt/10 text-[var(--mimi-bone)]"
        : "border-white/15 text-mimi-stone hover:border-mimi-cobalt/40 hover:text-[var(--mimi-bone)]";
    }
    return active
      ? "border-nous-text bg-nous-text/[0.04] text-nous-text"
      : "border-nous-border/50 text-nous-subtle hover:border-nous-text/40 hover:text-nous-text";
  };

  const headingClass = isTwilight
    ? "font-mono text-[9px] uppercase tracking-[0.24em] text-mimi-cobalt"
    : "font-serif text-xl sm:text-2xl text-nous-text";

  const inputClass = isTwilight
    ? "w-full min-h-[44px] border border-white/15 bg-black/30 px-4 py-3 text-sm text-[var(--mimi-bone)] placeholder:text-white/25 focus:outline-none focus:border-mimi-cobalt"
    : "w-full min-h-[44px] border border-nous-border/50 bg-transparent px-4 py-3 text-sm focus:outline-none focus:border-nous-text/40";

  const hintClass = isTwilight
    ? "mt-2 text-[10px] text-mimi-stone leading-relaxed"
    : "mt-2 text-[11px] text-nous-subtle leading-relaxed";

  return (
    <section aria-labelledby="curiosity-chips-heading" className="space-y-3">
      <h3 id="curiosity-chips-heading" className={headingClass}>
        What are you curious about?
      </h3>
      <div className="flex flex-wrap gap-2">
        {CURIOSITY_PROMPTS.map((prompt) => {
          const active = selected.includes(prompt.id);
          return (
            <button
              key={prompt.id}
              type="button"
              aria-pressed={active}
              onClick={() => onToggle(prompt.id)}
              className={`min-h-[40px] px-3 py-2 text-left border text-[12px] leading-snug transition-colors ${chipClass(active)}`}
            >
              {prompt.label}
            </button>
          );
        })}
      </div>
      <label htmlFor={customId} className="sr-only">
        Or ask in your own words
      </label>
      <input
        id={customId}
        type="text"
        value={customText}
        onChange={(e) => onCustomChange(e.target.value)}
        placeholder="Or ask in your own words…"
        className={inputClass}
      />
      <p className={hintClass}>
        Curiosity is logged for pattern reports — not approved memory unless you save it elsewhere.
      </p>
    </section>
  );
};
