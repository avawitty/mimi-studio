import React from "react";

export const AURA_MOODS = [
  "CHIC",
  "NOSTALGIA",
  "DREAM",
  "UNHINGED",
  "PANIC",
  "EDITORIAL",
] as const;

export type AuraMood = (typeof AURA_MOODS)[number];

type AuraMeterProps = {
  mood: AuraMood;
  onChange: (mood: AuraMood) => void;
  className?: string;
};

/**
 * WT-008 — Mood voltage meter: needle readout + aura tabs.
 */
export const AuraMeter: React.FC<AuraMeterProps> = ({
  mood,
  onChange,
  className = "",
}) => {
  const index = Math.max(0, AURA_MOODS.indexOf(mood));
  const needlePct = AURA_MOODS.length <= 1 ? 50 : (index / (AURA_MOODS.length - 1)) * 100;

  return (
    <section
      data-specimen="WT-008"
      aria-label="Aura voltage"
      className={`border border-[var(--wt-line,#d8d4c9)] bg-[var(--wt-paper,var(--mimi-manila-sheet,#f7f3e8))] px-3 py-3 ${className}`.trim()}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-[9px] uppercase tracking-[0.28em] text-[var(--wt-ink-2,#8a877f)]">
          Aura voltage
        </span>
        <span className="font-serif text-[14px] tracking-wide text-[var(--wt-ink,#111110)]">
          {mood}
        </span>
      </div>

      {/* Needle track */}
      <div
        className="relative h-2 mb-3 border border-[var(--wt-line,#d8d4c9)] bg-[var(--wt-paper-2,#ede9df)]"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={AURA_MOODS.length - 1}
        aria-valuenow={index}
        aria-valuetext={mood}
      >
        <span
          aria-hidden
          className="absolute top-1/2 -translate-y-1/2 w-0.5 h-4 bg-[var(--wt-seal,var(--mimi-seal,#c33b32))] transition-[left] duration-300 ease-out motion-reduce:transition-none"
          style={{ left: `calc(${needlePct}% - 1px)` }}
        />
      </div>

      <div
        role="tablist"
        aria-label="Aura moods"
        className="flex flex-wrap gap-1"
      >
        {AURA_MOODS.map((m) => {
          const active = m === mood;
          return (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(m)}
              className={`min-h-10 px-2.5 font-serif text-[13px] tracking-wide transition-colors duration-150 motion-reduce:transition-none ${
                active
                  ? "bg-[var(--wt-ink,#111110)] text-[var(--wt-paper,#f7f3e8)]"
                  : "text-[var(--wt-ink-2,#8a877f)] hover:text-[var(--wt-ink,#111110)]"
              }`}
            >
              {m}
            </button>
          );
        })}
      </div>
    </section>
  );
};

/** Map aura mood → InputStudio-ish tone tag when possible */
export function auraMoodToTone(mood: AuraMood): string {
  switch (mood) {
    case "CHIC":
      return "CONTENT";
    case "NOSTALGIA":
      return "VINTAGE";
    case "DREAM":
      return "dream";
    case "UNHINGED":
      return "unhinged";
    case "PANIC":
      return "RAW";
    case "EDITORIAL":
      return "editorial";
    default: {
      const _exhaustive: never = mood;
      return _exhaustive;
    }
  }
}
