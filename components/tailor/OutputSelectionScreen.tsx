import React from 'react';

export type TailorOutputChoice =
  | 'doll'
  | 'brand_kit'
  | 'art_style'
  | 'writing_voice'
  | 'art_history'
  | 'marketing_asset'
  | 'field_notes'
  | 'mimi_you';

const OUTPUTS: { id: TailorOutputChoice; label: string; description: string }[] = [
  { id: 'doll', label: 'Generate Doll', description: 'Symbolic embodiment of your taste graph' },
  { id: 'brand_kit', label: 'Brand Kit', description: 'Positioning, palette, and voice directives' },
  { id: 'art_style', label: 'Art Style Container', description: 'Visual grammar for illustration' },
  { id: 'writing_voice', label: 'Writing Voice', description: 'Editorial tone and language grammar' },
  { id: 'art_history', label: 'Art History Mirror', description: 'Thematic comparisons across art history' },
  { id: 'marketing_asset', label: 'Marketing Asset', description: 'Campaign-ready derived copy' },
  { id: 'field_notes', label: 'Save to Field Notes', description: 'Add to your research notebook' },
  { id: 'mimi_you', label: 'Reveal mimi.you', description: 'Your personal creative universe' },
];

interface OutputSelectionScreenProps {
  onSelect: (choice: TailorOutputChoice) => void;
  onFinish: () => void;
}

export const OutputSelectionScreen: React.FC<OutputSelectionScreenProps> = ({ onSelect, onFinish }) => (
  <div className="max-w-2xl mx-auto px-6 py-10">
    <p className="text-[10px] uppercase tracking-[0.3em] text-nous-subtle mb-2">Outputs</p>
    <h2 className="font-serif text-2xl text-nous-text mb-8">What should we generate?</h2>
    <div className="grid gap-2 mb-8">
      {OUTPUTS.map((out) => (
        <button
          key={out.id}
          type="button"
          onClick={() => onSelect(out.id)}
          className="text-left px-5 py-4 border border-nous-border/40 hover:border-nous-text/30 transition-colors"
        >
          <span className="block text-sm font-medium text-nous-text">{out.label}</span>
          <span className="block text-xs text-nous-subtle mt-1">{out.description}</span>
        </button>
      ))}
    </div>
    <button
      type="button"
      onClick={onFinish}
      className="w-full py-3 border border-nous-border/40 text-xs uppercase tracking-[0.2em] text-nous-subtle hover:text-nous-text"
    >
      Return to Tailor Blueprint
    </button>
  </div>
);
