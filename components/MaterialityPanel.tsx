import React from 'react';
import { Sliders, Columns, AlignJustify, HelpCircle } from 'lucide-react';
import { MaterialityConfig } from '../types';

interface MaterialityPanelProps {
  config: MaterialityConfig;
  onChangeConfig: (newConfig: MaterialityConfig) => void;
  playClickSound?: () => void;
}

export const MaterialityPanel: React.FC<MaterialityPanelProps> = ({
  config,
  onChangeConfig,
  playClickSound = () => {}
}) => {

  const updateField = (key: keyof MaterialityConfig, value: any) => {
    try {
      playClickSound();
    } catch (_) {}
    onChangeConfig({
      ...config,
      [key]: value
    });
  };

  return (
    <div className="w-full border border-nous-border bg-[#FCFCFA] dark:bg-[#070707] p-5 font-mono text-xs text-stone-800 dark:text-stone-300">
      <div className="flex justify-between items-center border-b border-nous-border pb-3 mb-4">
        <div className="flex items-center gap-2">
          <Sliders className="w-3.5 h-3.5 text-stone-500 animate-pulse" />
          <span className="font-sans font-bold tracking-widest text-[#141414] dark:text-[#fcfcfa] uppercase text-[10px]">✥ AESTHETIC PRESS ROOM</span>
        </div>
        <span className="text-[9px] text-stone-400">MATERIALITY_V1.1</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Left Side: Layout Configurations */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <span className="text-[8px] uppercase text-stone-400 font-bold block">Paper Stock & Tooth</span>
            <div className="grid grid-cols-2 gap-2">
              {(['newsprint', 'vellum', 'cold-press', 'raw-cardboard'] as const).map((stock) => (
                <button
                  type="button"
                  key={stock}
                  onClick={() => updateField('paperStock', stock)}
                  className={`py-2 px-3 border text-left rounded-none font-bold text-[9px] transition-all cursor-pointer ${
                    config.paperStock === stock
                      ? 'border-amber-500 bg-white dark:bg-[#111] text-stone-900 dark:text-stone-100'
                      : 'border-nous-border bg-stone-500/5 text-stone-400 hover:border-stone-400'
                  }`}
                >
                  {stock.toUpperCase().replace('-', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-[8px] uppercase text-stone-400 font-bold block">Typography Lineage</span>
            <div className="grid grid-cols-3 gap-1.5">
              {(['brutalist', 'editorial-serif', 'technical-mono'] as const).map((font) => (
                <button
                  type="button"
                  key={font}
                  onClick={() => updateField('typographyLineage', font)}
                  className={`py-1.5 px-2 border text-center rounded-none text-[9.5px] font-bold transition-all truncate cursor-pointer ${
                    config.typographyLineage === font
                      ? 'border-amber-500 bg-white dark:bg-[#111] text-stone-900 dark:text-stone-100'
                      : 'border-nous-border bg-stone-500/5 text-stone-400 hover:border-stone-400'
                  }`}
                >
                  {font.split('-')[0].toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Margin Proportions & Contrast Inks */}
        <div className="space-y-4 border border-nous-border bg-white dark:bg-[#0a0a0a] p-4 flex flex-col justify-between">
          <div className="space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-[8px] uppercase text-stone-400 font-bold">Negative Space Density</span>
              <span className="font-bold text-stone-900 dark:text-stone-100">{config.negativeSpaceDensity}/10</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={config.negativeSpaceDensity}
              onChange={(e) => updateField('negativeSpaceDensity', parseInt(e.target.value))}
              className="w-full h-1 bg-stone-100 dark:bg-stone-900 accent-amber-500 border border-nous-border outline-none rounded-none cursor-pointer"
            />
            <p className="text-[8px] text-stone-400 dark:text-stone-500 leading-normal uppercase tracking-wide">
              Adjusts column-gaps, padding heights, and margin parameters to balance text weight against negative space.
            </p>
          </div>

          <div className="border-t border-nous-border/40 pt-2.5">
            <span className="text-[8px] uppercase text-[#A8A29E] font-bold block mb-1.5 font-sans">Inks & Ink Contrast</span>
            <div className="flex gap-1.5">
              {(['monochrome', 'high-contrast', 'earth-tones'] as const).map((scheme) => (
                <button
                  type="button"
                  key={scheme}
                  onClick={() => updateField('colorScheme', scheme)}
                  className={`flex-1 py-1.5 border text-center rounded-none text-[8.5px] font-bold transition-all cursor-pointer ${
                    config.colorScheme === scheme
                      ? 'border-stone-900 dark:border-stone-100 bg-stone-900 dark:bg-stone-100 text-[#fcfcfa] dark:text-[#0c0c0c]'
                      : 'border-nous-border bg-stone-500/5 text-stone-400 hover:border-stone-400'
                  }`}
                >
                  {scheme.split('-')[0].toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
