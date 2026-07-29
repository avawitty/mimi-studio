import React, { useId } from 'react';
import {
  CURIOSITY_PROMPTS,
  type CuriosityPromptId,
} from '../../../services/tailorEvidenceIntake';

interface CuriositySelectorProps {
  selected: CuriosityPromptId[];
  customText: string;
  onToggle: (id: CuriosityPromptId) => void;
  onCustomChange: (value: string) => void;
}

const ICONS: Record<CuriosityPromptId, string> = {
  wear: '◇',
  direction: '◎',
  patterns: '▦',
  drawn: '♡',
  words: 'Aa',
  communicate: '○',
  work: '☺',
};

export const CuriositySelector: React.FC<CuriositySelectorProps> = ({
  selected,
  customText,
  onToggle,
  onCustomChange,
}) => {
  const customId = useId();

  return (
    <section className="mb-10" aria-labelledby="curiosity-heading">
      <h3 id="curiosity-heading" className="font-serif text-xl sm:text-2xl text-nous-text mb-4">
        What are you curious about?
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
        {CURIOSITY_PROMPTS.map((prompt) => {
          const active = selected.includes(prompt.id);
          const wide = prompt.id === 'work';
          return (
            <button
              key={prompt.id}
              type="button"
              aria-pressed={active}
              onClick={() => onToggle(prompt.id)}
              className={`flex items-center gap-3 min-h-[44px] px-4 py-3 text-left border transition-colors ${
                wide ? 'sm:col-span-2' : ''
              } ${
                active
                  ? 'border-nous-text bg-nous-text/[0.04] text-nous-text'
                  : 'border-nous-border/50 text-nous-subtle hover:border-nous-text/40 hover:text-nous-text'
              }`}
            >
              <span className="font-serif text-base w-6 shrink-0 text-center" aria-hidden>
                {ICONS[prompt.id]}
              </span>
              <span className="text-sm leading-snug">{prompt.label}</span>
            </button>
          );
        })}
      </div>
      <label htmlFor={customId} className="sr-only">
        Or ask Mimi in your own words
      </label>
      <input
        id={customId}
        type="text"
        value={customText}
        onChange={(e) => onCustomChange(e.target.value)}
        placeholder="Or ask Mimi in your own words…"
        className="w-full min-h-[44px] border border-nous-border/50 bg-transparent px-4 py-3 text-sm focus:outline-none focus:border-nous-text/40"
      />
      <p className="mt-2 text-[11px] text-nous-subtle leading-relaxed">
        Curiosity stays with this reading unless you choose to save it to your profile later.
      </p>
    </section>
  );
};
