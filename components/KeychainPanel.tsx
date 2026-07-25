import React, { useState, useEffect } from 'react';
import { storeKey, clearKey, getStoredKey, validateKey } from '../services/apiKeyService';
import { CheckCircle2, XCircle, AlertCircle, Loader2, Sparkles, ShieldAlert, Key } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const KeychainPanel: React.FC = () => {
  const [anthropicKey, setAnthropicKey] = useState(
    getStoredKey('anthropic') ? getStoredKey('anthropic')! : ''
  );
  const [openaiKey, setOpenaiKey] = useState(
    getStoredKey('openai') ? getStoredKey('openai')! : ''
  );
  const [geminiKey, setGeminiKey] = useState(
    getStoredKey('gemini') ? getStoredKey('gemini')! : ''
  );
  
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [isShowingSecrets, setIsShowingSecrets] = useState<Record<string, boolean>>({});
  
  const [validationStatuses, setValidationStatuses] = useState<Record<string, { 
    status: 'unchecked' | 'validating' | 'valid' | 'invalid'; 
    error?: string; 
  }>>({
    anthropic: { status: 'unchecked' },
    openai: { status: 'unchecked' },
    gemini: { status: 'unchecked' },
  });

  // Automatically validate active keys on mount
  useEffect(() => {
    const checkActiveKeys = async () => {
      const providers: ('anthropic' | 'openai' | 'gemini')[] = ['anthropic', 'openai', 'gemini'];
      for (const provider of providers) {
        const storedKey = getStoredKey(provider);
        if (storedKey) {
          handleValidate(provider, storedKey);
        }
      }
    };
    checkActiveKeys();
  }, []);

  const handleValidate = async (provider: 'anthropic' | 'openai' | 'gemini', keyValue: string) => {
    if (!keyValue.trim()) {
      setValidationStatuses(prev => ({
        ...prev,
        [provider]: { status: 'unchecked', error: 'No key provided' }
      }));
      return;
    }

    setValidationStatuses(prev => ({
      ...prev,
      [provider]: { status: 'validating' }
    }));

    const result = await validateKey(provider, keyValue);

    setValidationStatuses(prev => ({
      ...prev,
      [provider]: { 
        status: result.valid ? 'valid' : 'invalid', 
        error: result.error 
      }
    }));
  };

  const handleSave = async (provider: 'anthropic' | 'openai' | 'gemini', value: string, setter: any) => {
    const trimmed = value.trim();
    if (trimmed) {
      // Temporarily set saved state
      storeKey(provider, trimmed);
      setSaved(prev => ({ ...prev, [provider]: true }));
      setTimeout(() => setSaved(prev => ({ ...prev, [provider]: false })), 2000);
      
      // Perform validation
      await handleValidate(provider, trimmed);
    }
  };

  const handleClear = (provider: 'anthropic' | 'openai' | 'gemini', setter: any) => {
    clearKey(provider);
    setter('');
    setValidationStatuses(prev => ({
      ...prev,
      [provider]: { status: 'unchecked' }
    }));
  };

  const toggleShowSecret = (provider: string) => {
    setIsShowingSecrets(prev => ({ ...prev, [provider]: !prev[provider] }));
  };

  return (
    <div className="w-full bg-white dark:bg-stone-900 border border-nous-border p-8 mb-8">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="font-serif text-2xl italic flex items-center gap-2">
            <Key className="w-5 h-5 text-nous-text inline" /> Sovereign Keychain
          </h2>
          <p className="font-mono text-[9px] uppercase tracking-widest text-nous-subtle mt-1 block">
            Keys live in your browser's LocalStorage only — never stored on Firebase or transmitted to third parties
          </p>
        </div>
        <span className="text-[10px] uppercase tracking-widest font-mono px-3 py-1 border border-nous-border rounded-none text-nous-subtle">
          Vault Secure
        </span>
      </div>

      <div className="space-y-6 mt-6">
        {/* Gemini Provider Section */}
        <div className="border border-nous-border p-5 bg-nous-base/10 relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs uppercase tracking-widest font-bold">Google Gemini</span>
              {/* Validation Badge */}
              <AnimatePresence mode="wait">
                {validationStatuses.gemini.status === 'validating' && (
                  <motion.span 
                    initial={{ opacity: 0, scale: 0.8 }} 
                    animate={{ opacity: 1, scale: 1 }} 
                    exit={{ opacity: 0 }}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 border border-amber-300 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 font-mono text-[9px] uppercase tracking-wider"
                  >
                    <Loader2 size={10} className="animate-spin" /> Verifying...
                  </motion.span>
                )}
                {validationStatuses.gemini.status === 'valid' && (
                  <motion.span 
                    initial={{ opacity: 0, scale: 0.8 }} 
                    animate={{ opacity: 1, scale: 1 }} 
                    exit={{ opacity: 0 }}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 font-mono text-[9px] uppercase tracking-wider font-bold"
                  >
                    <CheckCircle2 size={10} className="text-emerald-500" /> Active & Verified
                  </motion.span>
                )}
                {validationStatuses.gemini.status === 'invalid' && (
                  <motion.span 
                    initial={{ opacity: 0, scale: 0.8 }} 
                    animate={{ opacity: 1, scale: 1 }} 
                    exit={{ opacity: 0 }}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 border border-red-300 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 font-mono text-[9px] uppercase tracking-wider"
                  >
                    <XCircle size={10} className="text-red-500" /> Validation Failed
                  </motion.span>
                )}
                {validationStatuses.gemini.status === 'unchecked' && (
                  <motion.span 
                    initial={{ opacity: 0, scale: 0.8 }} 
                    animate={{ opacity: 1, scale: 1 }} 
                    exit={{ opacity: 0 }}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 border border-nous-border bg-nous-base/30 text-nous-subtle font-mono text-[9px] uppercase tracking-wider"
                  >
                    Not Verified
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            
            <span className="font-mono text-[9px] text-nous-subtle uppercase">Target: AI Studio / Vertex AI API</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <input 
                type={isShowingSecrets.gemini ? "text" : "password"} 
                value={geminiKey} 
                onChange={(e) => setGeminiKey(e.target.value)} 
                placeholder="AIzaSy..." 
                className="w-full bg-white dark:bg-stone-900 border border-nous-border p-3 font-mono text-xs focus:outline-none focus:border-nous-text text-nous-text pr-14"
              />
              <button 
                type="button"
                onClick={() => toggleShowSecret('gemini')}
                className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[9px] uppercase tracking-wider text-nous-subtle hover:text-nous-text"
              >
                {isShowingSecrets.gemini ? "Hide" : "Show"}
              </button>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => handleSave('gemini', geminiKey, setGeminiKey)}
                disabled={validationStatuses.gemini.status === 'validating'}
                className="px-5 py-3 bg-nous-text hover:bg-stone-800 text-white dark:text-black font-mono text-[10px] uppercase tracking-widest transition-colors flex items-center justify-center gap-2 min-w-[80px]"
              >
                {saved['gemini'] ? 'Saved' : 'Anchor'}
              </button>
              {getStoredKey('gemini') && (
                <>
                  <button 
                    onClick={() => handleValidate('gemini', geminiKey)}
                    disabled={validationStatuses.gemini.status === 'validating'}
                    className="px-4 py-3 bg-transparent border border-nous-border text-nous-text hover:bg-nous-base font-mono text-[10px] uppercase tracking-widest transition-colors flex items-center justify-center"
                    title="Run Integrity Test"
                  >
                    Test
                  </button>
                  <button 
                    onClick={() => handleClear('gemini', setGeminiKey)}
                    className="px-4 py-3 bg-transparent border border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/10 font-mono text-[10px] uppercase tracking-widest transition-colors flex items-center justify-center"
                  >
                    Clear
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Validation Feedback details */}
          {validationStatuses.gemini.status === 'invalid' && validationStatuses.gemini.error && (
            <div className="mt-3 text-[10px] font-mono text-red-600 bg-red-50 dark:bg-red-950/10 border border-red-200 p-2.5 flex items-start gap-2">
              <ShieldAlert size={12} className="shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Error message:</span> {validationStatuses.gemini.error}
              </div>
            </div>
          )}

          {/* Special note on key status */}
          {!getStoredKey('gemini') && (
            <div className="mt-3 text-[9px] font-mono text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/50 p-2.5 flex items-start gap-2">
              <Sparkles size={11} className="shrink-0 mt-0.5 animate-pulse" />
              <div>
                No custom key set. The system is running using the shared <span className="font-bold">Sovereign Fallback Key</span>. Enter your own API key to ensure fully dedicated private compute limits.
              </div>
            </div>
          )}
        </div>

        {/* OpenAI Provider Section */}
        <div className="border border-nous-border p-5 relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs uppercase tracking-widest font-bold">OpenAI GPT</span>
              <AnimatePresence mode="wait">
                {validationStatuses.openai.status === 'validating' && (
                  <motion.span 
                    initial={{ opacity: 0, scale: 0.8 }} 
                    animate={{ opacity: 1, scale: 1 }} 
                    exit={{ opacity: 0 }}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 border border-amber-300 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 font-mono text-[9px] uppercase tracking-wider"
                  >
                    <Loader2 size={10} className="animate-spin" /> Verifying...
                  </motion.span>
                )}
                {validationStatuses.openai.status === 'valid' && (
                  <motion.span 
                    initial={{ opacity: 0, scale: 0.8 }} 
                    animate={{ opacity: 1, scale: 1 }} 
                    exit={{ opacity: 0 }}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 font-mono text-[9px] uppercase tracking-wider font-bold"
                  >
                    <CheckCircle2 size={10} className="text-emerald-500" /> Active & Verified
                  </motion.span>
                )}
                {validationStatuses.openai.status === 'invalid' && (
                  <motion.span 
                    initial={{ opacity: 0, scale: 0.8 }} 
                    animate={{ opacity: 1, scale: 1 }} 
                    exit={{ opacity: 0 }}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 border border-red-300 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 font-mono text-[9px] uppercase tracking-wider"
                  >
                    <XCircle size={10} className="text-red-500" /> Validation Failed
                  </motion.span>
                )}
                {validationStatuses.openai.status === 'unchecked' && (
                  <motion.span 
                    initial={{ opacity: 0, scale: 0.8 }} 
                    animate={{ opacity: 1, scale: 1 }} 
                    exit={{ opacity: 0 }}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 border border-nous-border bg-nous-base/30 text-nous-subtle font-mono text-[9px] uppercase tracking-wider"
                  >
                    Not Verified
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            
            <span className="font-mono text-[9px] text-nous-subtle uppercase">Target: OpenAI API / Platform</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <input 
                type={isShowingSecrets.openai ? "text" : "password"} 
                value={openaiKey} 
                onChange={(e) => setOpenaiKey(e.target.value)} 
                placeholder="sk-proj-..." 
                className="w-full bg-white dark:bg-stone-900 border border-nous-border p-3 font-mono text-xs focus:outline-none focus:border-nous-text text-nous-text pr-14"
              />
              <button 
                type="button"
                onClick={() => toggleShowSecret('openai')}
                className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[9px] uppercase tracking-wider text-nous-subtle hover:text-nous-text"
              >
                {isShowingSecrets.openai ? "Hide" : "Show"}
              </button>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => handleSave('openai', openaiKey, setOpenaiKey)}
                disabled={validationStatuses.openai.status === 'validating'}
                className="px-5 py-3 bg-nous-text hover:bg-stone-800 text-white dark:text-black font-mono text-[10px] uppercase tracking-widest transition-colors flex items-center justify-center gap-2 min-w-[80px]"
              >
                {saved['openai'] ? 'Saved' : 'Anchor'}
              </button>
              {getStoredKey('openai') && (
                <>
                  <button 
                    onClick={() => handleValidate('openai', openaiKey)}
                    disabled={validationStatuses.openai.status === 'validating'}
                    className="px-4 py-3 bg-transparent border border-nous-border text-nous-text hover:bg-nous-base font-mono text-[10px] uppercase tracking-widest transition-colors flex items-center justify-center"
                    title="Run Integrity Test"
                  >
                    Test
                  </button>
                  <button 
                    onClick={() => handleClear('openai', setOpenaiKey)}
                    className="px-4 py-3 bg-transparent border border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/10 font-mono text-[10px] uppercase tracking-widest transition-colors flex items-center justify-center"
                  >
                    Clear
                  </button>
                </>
              )}
            </div>
          </div>

          {validationStatuses.openai.status === 'invalid' && validationStatuses.openai.error && (
            <div className="mt-3 text-[10px] font-mono text-red-600 bg-red-50 dark:bg-red-950/10 border border-red-200 p-2.5 flex items-start gap-2">
              <ShieldAlert size={12} className="shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Error message:</span> {validationStatuses.openai.error}
              </div>
            </div>
          )}
        </div>

        {/* Anthropic Section */}
        <div className="border border-nous-border p-5 relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs uppercase tracking-widest font-bold">Anthropic Claude</span>
              <AnimatePresence mode="wait">
                {validationStatuses.anthropic.status === 'validating' && (
                  <motion.span 
                    initial={{ opacity: 0, scale: 0.8 }} 
                    animate={{ opacity: 1, scale: 1 }} 
                    exit={{ opacity: 0 }}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 border border-amber-300 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 font-mono text-[9px] uppercase tracking-wider"
                  >
                    <Loader2 size={10} className="animate-spin" /> Verifying...
                  </motion.span>
                )}
                {validationStatuses.anthropic.status === 'valid' && (
                  <motion.span 
                    initial={{ opacity: 0, scale: 0.8 }} 
                    animate={{ opacity: 1, scale: 1 }} 
                    exit={{ opacity: 0 }}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 font-mono text-[9px] uppercase tracking-wider font-bold"
                  >
                    <CheckCircle2 size={10} className="text-emerald-500" /> Active & Verified
                  </motion.span>
                )}
                {validationStatuses.anthropic.status === 'invalid' && (
                  <motion.span 
                    initial={{ opacity: 0, scale: 0.8 }} 
                    animate={{ opacity: 1, scale: 1 }} 
                    exit={{ opacity: 0 }}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 border border-red-300 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 font-mono text-[9px] uppercase tracking-wider"
                  >
                    <XCircle size={10} className="text-red-500" /> Validation Failed
                  </motion.span>
                )}
                {validationStatuses.anthropic.status === 'unchecked' && (
                  <motion.span 
                    initial={{ opacity: 0, scale: 0.8 }} 
                    animate={{ opacity: 1, scale: 1 }} 
                    exit={{ opacity: 0 }}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 border border-nous-border bg-nous-base/30 text-nous-subtle font-mono text-[9px] uppercase tracking-wider"
                  >
                    Not Verified
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            
            <span className="font-mono text-[9px] text-nous-subtle uppercase">Target: Anthropic Console / Claude API</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <input 
                type={isShowingSecrets.anthropic ? "text" : "password"} 
                value={anthropicKey} 
                onChange={(e) => setAnthropicKey(e.target.value)} 
                placeholder="sk-ant-..." 
                className="w-full bg-white dark:bg-stone-900 border border-nous-border p-3 font-mono text-xs focus:outline-none focus:border-nous-text text-nous-text pr-14"
              />
              <button 
                type="button"
                onClick={() => toggleShowSecret('anthropic')}
                className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[9px] uppercase tracking-wider text-nous-subtle hover:text-nous-text"
              >
                {isShowingSecrets.anthropic ? "Hide" : "Show"}
              </button>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => handleSave('anthropic', anthropicKey, setAnthropicKey)}
                disabled={validationStatuses.anthropic.status === 'validating'}
                className="px-5 py-3 bg-nous-text hover:bg-stone-800 text-white dark:text-black font-mono text-[10px] uppercase tracking-widest transition-colors flex items-center justify-center gap-2 min-w-[80px]"
              >
                {saved['anthropic'] ? 'Saved' : 'Anchor'}
              </button>
              {getStoredKey('anthropic') && (
                <>
                  <button 
                    onClick={() => handleValidate('anthropic', anthropicKey)}
                    disabled={validationStatuses.anthropic.status === 'validating'}
                    className="px-4 py-3 bg-transparent border border-nous-border text-nous-text hover:bg-nous-base font-mono text-[10px] uppercase tracking-widest transition-colors flex items-center justify-center"
                    title="Run Integrity Test"
                  >
                    Test
                  </button>
                  <button 
                    onClick={() => handleClear('anthropic', setAnthropicKey)}
                    className="px-4 py-3 bg-transparent border border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/10 font-mono text-[10px] uppercase tracking-widest transition-colors flex items-center justify-center"
                  >
                    Clear
                  </button>
                </>
              )}
            </div>
          </div>

          {validationStatuses.anthropic.status === 'invalid' && validationStatuses.anthropic.error && (
            <div className="mt-3 text-[10px] font-mono text-red-600 bg-red-50 dark:bg-red-950/10 border border-red-200 p-2.5 flex items-start gap-2">
              <ShieldAlert size={12} className="shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Error message:</span> {validationStatuses.anthropic.error}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
