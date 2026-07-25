import React, { useState } from 'react';
import { useUser } from '../contexts/UserContext';
import { motion, AnimatePresence } from 'motion/react';
import { Cpu, Check } from 'lucide-react';

export const ApiSwitcher: React.FC = () => {
    const { activeLlmProvider, setActiveLlmProvider, apiKeys } = useUser();
    const [isOpen, setIsOpen] = useState(false);

    const providers = [
        { id: 'gemini', label: 'Gemini (Vertex)', available: !!apiKeys['gemini'] || !!import.meta.env.VITE_GEMINI_API_KEY },
        { id: 'openai', label: 'OpenAI (GPT-4o)', available: !!apiKeys['openai'] || true },
        { id: 'anthropic', label: 'Anthropic (Claude-3.5)', available: !!apiKeys['anthropic'] || true },
    ];

    return (
        <div className="relative z-50">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 text-[9px] uppercase tracking-widest font-mono text-nous-subtle hover:text-nous-text transition-colors border border-transparent hover:border-nous-border px-2 py-1"
                title="Model Routing"
            >
                <Cpu size={12} className={activeLlmProvider === 'gemini' ? "text-blue-400" : activeLlmProvider === 'openai' ? "text-green-500" : "text-amber-500"} />
                <span className="hidden sm:inline">{activeLlmProvider}</span>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                        <motion.div 
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 5 }}
                            className="absolute right-0 top-full mt-2 w-48 bg-nous-base border border-nous-border shadow-xl z-50"
                        >
                            <div className="px-3 py-2 border-b border-nous-border bg-stone-100 dark:bg-stone-900">
                                <span className="text-[8px] uppercase tracking-widest font-mono text-nous-subtle">Routing Engine</span>
                            </div>
                            <div className="flex flex-col py-1">
                                {providers.map(p => (
                                    <button 
                                        key={p.id}
                                        onClick={() => {
                                            setActiveLlmProvider(p.id as any);
                                            setIsOpen(false);
                                        }}
                                        className={`px-3 py-2 text-left font-mono text-[10px] flex items-center justify-between transition-colors ${activeLlmProvider === p.id ? 'bg-nous-text text-nous-base' : 'hover:bg-stone-100 dark:hover:bg-stone-800 text-nous-text'}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            {p.label}
                                            {!p.available && <span className="opacity-50 text-[8px]">(No Key)</span>}
                                        </div>
                                        {activeLlmProvider === p.id && <Check size={12} />}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};
