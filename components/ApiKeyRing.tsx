import React, { useState } from 'react';
import { useUser } from '../contexts/UserContext';
import { Key, Trash2, Info, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// API Key Ring Component
export const ApiKeyRing: React.FC = () => {
  const { apiKeys, setApiKey, removeApiKey } = useUser();
  const [newKey, setNewKey] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<string>('gemini');
  const [showConfig, setShowConfig] = useState(false);

  const providers = [
    { id: 'gemini', name: 'Google Gemini', short: 'Gemini', suffix: 'AI Studio' },
    { id: 'openai', name: 'OpenAI', short: 'OpenAI', suffix: 'Platform' },
    { id: 'anthropic', name: 'Anthropic', short: 'Anthropic', suffix: 'Console' },
    { id: 'claude', name: 'Claude', short: 'Claude', suffix: 'Anthropic' },
    { id: 'you_com', name: 'You.com', short: 'You.com', suffix: 'Research API' },
    { id: 'stitch', name: 'Stitch', short: 'Stitch', suffix: 'Workspace API' },
    { id: 'thinkinglabs', name: 'ThinkingLabs', short: 'Thinking', suffix: 'Research API' },
    { id: 'exa', name: 'Exa', short: 'Exa', suffix: 'Neural Search' },
    { id: 'tavily', name: 'Tavily', short: 'Tavily', suffix: 'Research API' },
    { id: 'perplexity', name: 'Perplexity', short: 'Perplexity', suffix: 'Sonar API' },
  ];

  const handleAdd = () => {
    if (newKey.trim()) {
      setApiKey(selectedProvider, newKey.trim());
      setNewKey('');
    }
  };

  return (
    <div className="w-full bg-white rounded-none border border-nous-border p-4 sm:p-6 md:p-8">
      <div className="flex justify-between items-start gap-3 mb-5">
        <div className="min-w-0">
           <h2 className="font-serif text-2xl italic">Sovereign Keychain</h2>
           <p className="font-mono text-[9px] uppercase tracking-widest text-nous-subtle mt-1 block">Local API Credential Vault</p>
        </div>
        <button
          type="button"
          onClick={() => setShowConfig(!showConfig)}
          aria-label={showConfig ? 'Collapse keychain editor' : 'Expand keychain editor'}
          className="p-2 shrink-0 bg-nous-base border border-nous-border hover:bg-stone-100 transition-colors"
        >
            <Key size={16} className="text-nous-text" />
        </button>
      </div>

      <AnimatePresence>
      {(showConfig || Object.keys(apiKeys).length === 0) && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
          <div className="mb-5 pt-1 pb-5 border-b border-nous-border">
            <div className="-mx-1 px-1 mb-4 flex gap-2 overflow-x-auto no-scrollbar">
               {providers.map(p => (
                   <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedProvider(p.id)}
                      className={`shrink-0 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] border transition-all whitespace-nowrap ${selectedProvider === p.id ? 'bg-nous-text text-nous-base border-nous-text' : 'bg-nous-base border-nous-border text-nous-subtle hover:text-nous-text'}`}
                   >
                     <span className="sm:hidden">{p.short}</span>
                     <span className="hidden sm:inline">{p.name}</span>
                   </button>
               ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="password"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder={`Enter ${providers.find(p => p.id === selectedProvider)?.name} API Key…`}
                className="w-full min-w-0 flex-1 px-4 py-3 bg-nous-base border border-nous-border rounded-none focus:outline-none focus:border-nous-text transition-colors text-nous-text text-xs font-mono"
              />
              <button
                type="button"
                onClick={handleAdd}
                className="shrink-0 px-6 py-3 bg-nous-text text-nous-base rounded-none font-mono text-[10px] uppercase tracking-widest hover:opacity-90 transition-opacity flex items-center justify-center min-h-[44px]"
              >
                Anchor
              </button>
            </div>
            
            <p className="font-mono text-[9px] text-nous-subtle mt-4 flex items-start gap-2 leading-relaxed">
              <Info size={10} className="shrink-0 mt-0.5" />
              Keys remain exclusively in your local vault. Mimi acts as an edge router, ensuring zero backend exposure of your sovereign credits.
            </p>
          </div>
        </motion.div>
      )}
      </AnimatePresence>
      
      <div className="space-y-1">
        {providers.map(p => {
            const hasKey = !!apiKeys[p.id];
            
            if (!hasKey && !showConfig && Object.keys(apiKeys).length > 0) return null;

            return (
              <div
                key={p.id}
                className={`flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between text-xs font-mono border-l-2 pl-3 py-3 transition-colors ${hasKey ? 'border-nous-text bg-nous-base/50' : 'border-transparent text-nous-subtle'}`}
              >
                  <div className="flex items-start gap-3 min-w-0">
                     {hasKey ? <CheckCircle2 size={14} className="text-nous-text shrink-0 mt-0.5" /> : <div className="w-3.5 h-3.5 mt-0.5 rounded-full border border-nous-border shrink-0" />}
                     <div className="min-w-0">
                         <span className="font-bold block sm:inline">{p.name}</span>
                         <span className="sm:ml-2 opacity-50 text-[10px] uppercase tracking-widest">{p.suffix}</span>
                     </div>
                  </div>
                  {hasKey ? (
                     <div className="flex items-center gap-4 pl-6 sm:pl-0 shrink-0">
                        <span className="truncate opacity-50 tracking-widest">••••{apiKeys[p.id].slice(-4)}</span>
                        <button type="button" onClick={() => removeApiKey(p.id)} className="text-red-500 hover:text-red-600 transition-colors" aria-label={`Remove ${p.name} key`}>
                          <Trash2 size={14} />
                        </button>
                     </div>
                  ) : (
                     <span className="text-[9px] uppercase tracking-widest opacity-50 pl-6 sm:pl-0 shrink-0">Not Anchored</span>
                  )}
              </div>
            );
        })}
      </div>
    </div>
  );
};
