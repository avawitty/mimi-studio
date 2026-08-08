import React from "react";
import type { GenerationMode } from "../../schemas/tasteIntelligenceContracts";

const MODE_LABELS: Record<GenerationMode, string> = {
  aligned: "Aligned",
  adjacent: "Adjacent",
  divergent: "Divergent",
};

const MODE_HINTS: Record<GenerationMode, string> = {
  aligned: "Preserve signature taste; minimal departure.",
  adjacent: "Explore near the boundary of your model.",
  divergent: "Push novelty within refusal guardrails.",
};

type TasteGenerationModePickerProps = {
  mode: GenerationMode;
  onChange: (mode: GenerationMode) => void;
  disabled?: boolean;
};

export const TasteGenerationModePicker: React.FC<TasteGenerationModePickerProps> = ({
  mode,
  onChange,
  disabled,
}) => {
  const modes: GenerationMode[] = ["aligned", "adjacent", "divergent"];

  return (
    <div className="space-y-2" role="group" aria-label="Generation mode">
      <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-mimi-stone">
        Generation mode
      </p>
      <div className="flex flex-wrap gap-1.5">
        {modes.map((item) => {
          const active = item === mode;
          return (
            <button
              key={item}
              type="button"
              disabled={disabled}
              aria-pressed={active}
              onClick={() => onChange(item)}
              className={[
                "px-2.5 py-1.5 border font-mono text-[8px] uppercase tracking-wider transition-colors",
                active
                  ? "border-mimi-olive/60 bg-mimi-olive/10 text-mimi-ink"
                  : "border-mimi-hairline/50 bg-mimi-field text-mimi-stone hover:border-mimi-olive/40",
                disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
              ].join(" ")}
              title={MODE_HINTS[item]}
            >
              {MODE_LABELS[item]}
            </button>
          );
        })}
      </div>
      <p className="font-sans text-[10px] text-mimi-stone leading-snug">
        {MODE_HINTS[mode]}
      </p>
    </div>
  );
};
