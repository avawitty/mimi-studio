import React, { useState } from 'react';
import { Terminal, Copy, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useUser } from '../contexts/UserContext';
import { getAIProvider } from '../services/aiProvider';

export const TranslationTerminal: React.FC<{
    standalone?: boolean;
}> = ({ standalone = true }) => {
    const { activePersona } = useUser();
    const [input, setInput] = useState('');
    const [output, setOutput] = useState('');
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState<'optimized' | 'semantic' | 'aesthetic'>('optimized');

    const handleTranslate = async () => {
        if (!input.trim()) return;
        setLoading(true);
        setOutput('');
        try {
            const provider = getAIProvider();
            const prompt = `Translate the following user raw intent into an optimal LLM prompt based on the chosen mode: ${mode}.
            
Modes:
- optimized: SEO-for-AI, create highly structured, dense semantic metadata.
- semantic: Translate visual/creative intent into pure machine-readable aesthetic embeddings.
- aesthetic: Extract the visual signature and generate a cinematic director's prompt.

Raw Intent:
"${input}"

Return ONLY the translated technical prompt, nothing else. Do not include markdown formatting if unnecessary, just the raw text.`;
            
            const response = await provider.generateContent({
                messages: [{ role: 'user', content: prompt }],
                systemInstruction: "You are the GEO Engine translation terminal. Your job is to restructure prompts for machine retrieval and LLM orchestration."
            });
            setOutput(response.text || 'No translation output');
        } catch (err: any) {
            setOutput('Error: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`bg-nous-base border border-nous-border flex flex-col font-mono text-[10px] ${standalone ? 'w-full max-w-md my-4' : 'w-full h-full'}`}>
            <div className="flex items-center justify-between p-2 border-b border-nous-border bg-nous-base0/50">
                <div className="flex items-center gap-2 text-nous-subtle">
                    <Terminal size={12} />
                    <span className="uppercase tracking-widest font-bold">Translation Terminal</span>
                </div>
                <div className="flex gap-2">
                    {['optimized', 'semantic', 'aesthetic'].map(m => (
                        <button 
                            key={m}
                            onClick={() => setMode(m as any)}
                            className={`px-2 py-1 uppercase tracking-wider ${mode === m ? 'bg-nous-text text-nous-base' : 'text-nous-subtle hover:text-nous-text'}`}
                        >
                            {m}
                        </button>
                    ))}
                </div>
            </div>
            
            <div className="p-4 flex flex-col gap-4">
                <textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="Enter raw creative intent or visual thought..."
                    className="w-full h-24 bg-transparent border border-nous-border p-2 focus:outline-none focus:border-nous-text resize-none text-nous-text"
                />
                
                <button 
                    onClick={handleTranslate}
                    disabled={loading || !input.trim()}
                    className="flex justify-between items-center p-2 border border-nous-border hover:bg-nous-text hover:text-nous-base disabled:opacity-50 transition-colors uppercase tracking-widest"
                >
                    <span>Execute Translation</span>
                    {loading ? <Loader2 size={12} className="animate-spin" /> : <ArrowRight size={12} />}
                </button>
                
                <AnimatePresence>
                    {output && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-3 bg-nous-base0/30 border border-nous-border relative mt-2"
                        >
                            <span className="absolute -top-2 left-2 px-1 bg-nous-base text-nous-subtle text-[8px] uppercase tracking-widest">
                                Output Vector
                            </span>
                            <p className="whitespace-pre-wrap text-nous-text leading-relaxed mt-2">{output}</p>
                            <button 
                                onClick={() => navigator.clipboard.writeText(output)}
                                className="absolute top-2 right-2 p-1 text-nous-subtle hover:text-nous-text"
                            >
                                <Copy size={12} />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};
