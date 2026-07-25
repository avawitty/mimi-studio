import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Check, Sliders, X, Sparkles, HelpCircle } from 'lucide-react';

interface ProofModeProps {
  confidence?: 'High' | 'Medium' | 'Exploratory';
  basedOn?: string[];
  reasoning?: string[];
  onSteer?: (action: 'accept' | 'soften' | 'reject' | 'retailor', element: string) => void;
  className?: string;
}

export const ProofMode: React.FC<ProofModeProps> = ({
  confidence = 'High',
  basedOn = ['Silk Ingestion Shard', '90s Minimalist Template', 'Chromatic Void Presets'],
  reasoning = [
    'Silhouette matched structured sleekness with fine density boundaries.',
    'Voice level favored poetic, concise cadence to elevate the core reference universe.',
    'Color saturation was restricted based on the "Exclusion Principle" avoiding hot neon gradients.'
  ],
  onSteer,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [steeredElements, setSteeredElements] = useState<Record<string, string>>({});

  const handleAction = (element: string, action: 'accept' | 'soften' | 'reject' | 'retailor') => {
    setSteeredElements(prev => ({ ...prev, [element]: action }));
    if (onSteer) {
      onSteer(action, element);
    }
    // Fire a global event to let users see visual response
    window.dispatchEvent(new CustomEvent('mimi:registry_alert', {
      detail: {
        message: `Signal adjusted: ${action.toUpperCase()} ${element}`,
        icon: <Sparkles size={14} className="text-emerald-500 animate-pulse" />
      }
    }));
  };

  const getConfidenceStyle = (conf: string) => {
    switch (conf) {
      case 'High':
        return 'text-emerald-600 bg-emerald-50/50 border-emerald-100 dark:text-emerald-400 dark:bg-emerald-950/20 dark:border-emerald-900/30';
      case 'Medium':
        return 'text-amber-600 bg-amber-50/50 border-amber-100 dark:text-amber-400 dark:bg-amber-950/20 dark:border-[#382a1c]';
      default:
        return 'text-purple-600 bg-purple-50/50 border-purple-100 dark:text-purple-400 dark:bg-purple-950/20 dark:border-purple-900/30';
    }
  };

  return (
    <div className={`border border-nous-border/40 bg-[#FDFBF7]/30 dark:bg-[#0A0A0A]/30 backdrop-blur-md rounded-none ${className}`}>
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-nous-border/25">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 group text-left cursor-pointer"
        >
          <ShieldCheck size={14} className="text-nous-subtle group-hover:text-nous-text transition-colors" />
          <span className="font-sans text-[9px] uppercase tracking-[0.2em] font-bold text-nous-subtle group-hover:text-nous-text transition-colors">
            Proof Mode {isOpen ? '• Active' : '• Toggle Integrity'}
          </span>
        </button>
        <span className={`font-mono text-[8px] uppercase tracking-widest px-2 py-0.5 border font-semibold ${getConfidenceStyle(confidence)}`}>
          Confidence: {confidence}
        </span>
      </div>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-4 font-serif">
              {/* Reasoning */}
              <div>
                <span className="font-sans text-[8px] uppercase tracking-widest text-nous-subtle font-black block mb-2">Aesthetic Alignment</span>
                <ul className="space-y-1.5 text-xs text-nous-text leading-relaxed">
                  {reasoning.map((item, idx) => (
                    <li key={idx} className="flex gap-2 items-start text-left">
                      <span className="text-nous-accent select-none mt-1">◇</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Based On References */}
              <div>
                <span className="font-sans text-[8px] uppercase tracking-widest text-nous-subtle font-black block mb-2">Taste Drivers</span>
                <div className="flex flex-wrap gap-1.5">
                  {basedOn.map((ref, idx) => (
                    <span 
                      key={idx} 
                      className="px-2 py-0.5 border border-nous-border/30 bg-nous-base/50 text-[9px] font-sans uppercase tracking-widest text-nous-subtle"
                    >
                      {ref}
                    </span>
                  ))}
                </div>
              </div>

              {/* Steering Controls */}
              <div className="pt-2 border-t border-nous-border/20">
                <span className="font-sans text-[8px] uppercase tracking-widest text-nous-subtle font-black block mb-2">Refine Signal Steer</span>
                <div className="space-y-2">
                  {[
                    { label: 'Layout Grid Density', key: 'grid' },
                    { label: 'Narrative Cadence', key: 'voice' },
                    { label: 'Palette Restraint', key: 'chroma' }
                  ].map((elem) => (
                    <div key={elem.key} className="flex justify-between items-center bg-nous-base/20 px-3 py-2 border border-nous-border/15">
                      <span className="text-xs text-nous-text">{elem.label}</span>
                      
                      <div className="flex gap-1">
                        {[
                          { action: 'accept', label: 'Keep' },
                          { action: 'soften', label: 'Soften' },
                          { action: 'reject', label: 'Reject' },
                          { action: 'retailor', label: 'Re-tailor' }
                        ].map((btn) => {
                          const isSelected = steeredElements[elem.key] === btn.action;
                          return (
                            <button
                              key={btn.action}
                              onClick={() => handleAction(elem.key, btn.action as any)}
                              className={`px-2 py-1 font-sans text-[8px] uppercase tracking-wider transition-colors ${
                                isSelected 
                                  ? 'bg-[#141414] text-white dark:bg-[#F5F5F0] dark:text-black font-bold' 
                                  : 'text-nous-subtle hover:text-nous-text bg-transparent'
                              }`}
                            >
                              {btn.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
