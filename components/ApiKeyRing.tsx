import React, { useState } from 'react';
import { useUser } from '../contexts/UserContext';
import { Key, Trash2, Plus, Info, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// API Key Ring Component
export const ApiKeyRing: React.FC = () => {
  const { apiKeys, setApiKey, removeApiKey } = useUser();
  const [newKey, setNewKey] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<string>('gemini');
  const [showConfig, setShowConfig] = useState(false);

  const providers = [
    { id: 'gemini', name: 'Google Gemini', suffix: 'AI Studio' },
    { id: 'openai', name: 'OpenAI', suffix: 'Platform' },
    { id: 'anthropic', name: 'Anthropic', suffix: 'Console' },
    { id: 'claude', name: 'Claude', suffix: 'Anthropic' },
    { id: 'you_com', name: 'You.com (Yooda)', suffix: 'Research API' },
    { id: 'stitch', name: 'Stitch', suffix: 'Workspace API' },
    { id: 'thinkinglabs', name: 'ThinkingLabs', suffix: 'Research API' },
    { id: 'exa', name: 'Exa', suffix: 'Neural Search' },
    { id: 'tavily', name: 'Tavily', suffix: 'Research API' },
    { id: 'perplexity', name: 'Perplexity', suffix: 'Sonar API' }
  ];

  const handleAdd = () => {
    if (newKey.trim()) {
      setApiKey(selectedProvider, newKey.trim());
      setNewKey('');
    }
  };

  return (
    <div className="w-full bg-white rounded-none border border-nous-border p-8">
      <div className="flex justify-between items-start mb-6">
        <div>
           <h2 className="font-serif text-2xl italic">Sovereign Keychain</h2>
           <p className="font-mono text-[9px] uppercase tracking-widest text-nous-subtle mt-1 block">Local API Credential Vault</p>
        </div>
        <button onClick={() => setShowConfig(!showConfig)} className="p-2 bg-nous-base border border-nous-border hover:bg-stone-100 transition-colors">
            <Key size={16} className="text-nous-text" />
        </button>
      </div>

      <AnimatePresence>
      {(showConfig || Object.keys(apiKeys).length === 0) && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
          <div className="mb-6 pt-2 pb-6 border-b border-nous-border">
            <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
               {providers.map(p => (
                   <button 
                      key={p.id}
                      onClick={() => setSelectedProvider(p.id as any)}
                      className={`px-4 py-2 font-mono text-[10px] uppercase tracking-widest border transition-all whitespace-nowrap ${selectedProvider === p.id ? 'bg-nous-text text-nous-base border-nous-text' : 'bg-nous-base border-nous-border text-nous-subtle hover:text-nous-text'}`}
                   >
                     {p.name}
                   </button>
               ))}
            </div>

            <div className="flex gap-2">
              <input
                type="password"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder={`Enter ${providers.find(p => p.id === selectedProvider)?.name} API Key...`}
                className="flex-grow px-4 py-3 bg-nous-base border border-nous-border rounded-none focus:outline-none focus:border-nous-text dark:focus:border-nous-text transition-colors text-nous-text text-xs font-mono"
              />
              <button
                onClick={handleAdd}
                className="px-6 py-3 bg-nous-text text-nous-base rounded-none font-mono text-[10px] uppercase tracking-widest hover:bg-nous-text0 transition-colors flex items-center justify-center"
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
      
      <div className="space-y-3">
        {providers.map(p => {
            const hasKey = !!apiKeys[p.id];
            
            if (!hasKey && !showConfig && Object.keys(apiKeys).length > 0) return null; // Hide unset if collapsed

            return (
              <div key={p.id} className={`flex items-center justify-between text-xs font-mono border-l-2 pl-3 py-3 transition-colors ${hasKey ? 'border-nous-text bg-nous-base/50' : 'border-transparent text-nous-subtle'}`}>
                  <div className="flex items-center gap-3">
                     {hasKey ? <CheckCircle2 size={14} className="text-nous-text" /> : <div className="w-3.5 h-3.5 rounded-full border border-nous-border" />}
                     <div>
                         <span className="font-bold">{p.name}</span>
                         <span className="ml-2 opacity-50 text-[10px] uppercase tracking-widest">{p.suffix}</span>
                     </div>
                  </div>
                  {hasKey ? (
                     <div className="flex items-center gap-4">
                        <span className="truncate opacity-50 tracking-widest">••••{apiKeys[p.id].slice(-4)}</span>
                        <button onClick={() => removeApiKey(p.id)} className="text-red-500 hover:text-red-600 transition-colors">
                          <Trash2 size={14} />
                        </button>
                     </div>
                  ) : (
                     <span className="text-[9px] uppercase tracking-widest opacity-50">Not Anchored</span>
                  )}
              </div>
            );
        })}
      </div>
    </div>
  );
};
