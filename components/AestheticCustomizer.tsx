import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { ToggleLeft, ToggleRight, Palette, Type, Monitor } from 'lucide-react';

export const AestheticCustomizer: React.FC = () => {
  const { 
    currentEra, 
    setEra, 
    currentPalette, 
    applyPalette, 
    isCRTEnabled, 
    toggleCRT,
    PALETTES
  } = useTheme();

  return (
    <div className="w-full border border-nous-border bg-[#FCFCFA] dark:bg-[#070707] rounded-none p-5 font-mono text-xs text-stone-800 dark:text-stone-300">
      <div className="flex justify-between items-center border-b border-nous-border/40 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <Monitor className="w-3.5 h-3.5 text-stone-500" />
          <span className="font-sans font-bold tracking-widest text-[#141414] dark:text-[#fcfcfa] uppercase text-[10px]">✥ SYSTEM CALIBRATION PANEL</span>
        </div>
        <span className="text-[9px] text-[#A8A29E] font-bold">CALIB_VAR_1.0</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. TYPOGRAPHY ERA SELECTOR */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-student-subtle">
            <Type className="w-3.5 h-3.5 text-[#A8A29E]" />
            <span className="uppercase text-[8px] font-bold tracking-wider text-[#A8A29E]">Typography Era</span>
          </div>
          <div className="flex flex-col gap-1.5">
            {['ethereal', 'editorial', 'genesis'].map((era) => (
              <button
                key={era}
                onClick={() => setEra(era)}
                className={`w-full text-left px-3 py-1.5 border rounded-none transition-all ${
                  currentEra === era
                    ? 'border-amber-500 bg-amber-500/5 font-extrabold text-[#141414] dark:text-[#fcfcfa] ring-1 ring-amber-500/10'
                    : 'border-nous-border bg-transparent text-stone-400 dark:text-stone-500 hover:border-stone-300'
                }`}
              >
                {era.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* 2. PALETTE SELECTOR */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-[#A8A29E]" />
            <span className="uppercase text-[8px] font-bold tracking-wider text-[#A8A29E]">Active Palette</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 max-h-[140px] overflow-y-auto pr-1 border border-nous-border/10">
            {['The Journal', "Editorial '94", 'Cinémathèque', 'Concrete Gallery', 'Haute Void', 'Void', 'Vanilla', 'Stone'].map((palName) => (
              <button
                key={palName}
                onClick={() => applyPalette(palName)}
                className={`text-[8.5px] uppercase text-left truncate px-2 py-1.5 border rounded-none transition-all ${
                  currentPalette?.name === palName
                    ? 'border-amber-500 bg-amber-500/5 font-extrabold text-[#141414] dark:text-[#fcfcfa]'
                    : 'border-nous-border hover:border-stone-300 text-stone-500'
                }`}
              >
                {palName}
              </button>
            ))}
          </div>
        </div>

        {/* 3. CRT SCREEN OPTICS */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Monitor className="w-3.5 h-3.5 text-[#A8A29E]" />
            <span className="uppercase text-[8px] font-bold tracking-wider text-[#A8A29E]">Optical Filter</span>
          </div>
          <div className="border border-nous-border bg-transparent p-3 flex flex-col justify-between h-[95px]">
            <div>
              <span className="text-[10px] font-bold text-[#141414] dark:text-[#fcfcfa] uppercase">CRT Main Shader</span>
              <p className="text-[8px] text-[#A8A29E] mt-0.5 leading-normal">
                Inject scanline overlay and movie film-grain.
              </p>
            </div>
            <button
              onClick={toggleCRT}
              className="flex items-center justify-between w-full border border-nous-border bg-stone-500/5 px-2 py-1.5 hover:border-stone-400 transition-all rounded-none mt-1"
            >
              <span className="text-[8px] font-black text-stone-500 uppercase">CRT STATUS:</span>
              <div className="flex items-center gap-1.5">
                <span className={`text-[8.5px] font-bold ${isCRTEnabled ? 'text-amber-500' : 'text-stone-400'}`}>
                  {isCRTEnabled ? 'ACTIVE' : 'OFFLINE'}
                </span>
                {isCRTEnabled ? (
                  <ToggleRight className="w-4 h-4 text-amber-500" />
                ) : (
                  <ToggleLeft className="w-4 h-4 text-stone-400" />
                )}
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
