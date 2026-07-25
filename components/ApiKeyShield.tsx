// @ts-nocheck
import React, { useState } from 'react';
import { useUser } from '../contexts/UserContext';
import { motion, AnimatePresence } from 'motion/react';
import { Key, AlertTriangle, Sparkles, RefreshCw, Info, ExternalLink, Zap, X, CheckCircle2, XCircle, Loader2, ShieldCheck, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { validateKey, getStoredKey, storeKey, LLMProvider } from '../services/apiKeyService';

export const ApiKeyShield: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose = () => {} }) => {
  const { openKeySelector, hasApiKey, refreshHasApiKey } = useUser();
  const [testKeyInput, setTestKeyInput] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<LLMProvider>('gemini');
  const [isValidating, setIsValidating] = useState(false);
  const [showHowToGet, setShowHowToGet] = useState(false);
  const [verificationFeedback, setVerificationFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const handleVerifyKey = async () => {
    setIsValidating(true);
    setVerificationFeedback(null);

    const storedKey = getStoredKey(selectedProvider) || getStoredKey('gemini') || getStoredKey('openai');
    const keyToTest = testKeyInput.trim() || storedKey || '';

    try {
      const result = await validateKey(selectedProvider, keyToTest || 'default');

      if (result.valid) {
        setVerificationFeedback({
          type: 'success',
          message: `API Key verified successfully (${selectedProvider.toUpperCase()})! Handshake operational.`
        });
        
        if (testKeyInput.trim()) {
          storeKey(selectedProvider, testKeyInput.trim());
        }

        await refreshHasApiKey();
      } else {
        setVerificationFeedback({
          type: 'error',
          message: `Validation failed: ${result.error || 'Invalid API Key or server endpoint error.'}`
        });
      }
    } catch (err: any) {
      setVerificationFeedback({
        type: 'error',
        message: `Verification error: ${err.message || 'Network error during validation.'}`
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleManualRecheck = async () => {
    try {
      await refreshHasApiKey();
      if (!hasApiKey) {
        window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
          detail: { message:"Registry still obscured. Check AI Studio.", type: 'error' } 
        }));
      } else {
        onClose();
      }
    } catch (e) {
      console.error("MIMI // Failed to refresh API key status", e);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[12000] flex items-center justify-center p-6 bg-nous-base/95 backdrop-blur-3xl overflow-y-auto"
        >
          <div className="max-w-md w-full text-center space-y-8 py-8 relative">
            <button 
              onClick={onClose}
              className="absolute -top-4 -right-4 p-4 text-nous-subtle hover:text-nous-text transition-colors cursor-pointer"
            >
              <X size={24} />
            </button>

            <div className="space-y-4">
              <div className="w-20 h-20 border border-nous-border rounded-none flex items-center justify-center mx-auto relative group">
                <div className="absolute inset-0 border-t-2 border-amber-500 rounded-none animate-[spin_4s_linear_infinite]"/>
                <Key size={28} className="text-amber-500 animate-pulse"/>
              </div>
              <div className="space-y-2">
                <h1 className="font-serif text-3xl md:text-4xl italic tracking-tighter text-nous-text">Quota Thermal Lock.</h1>
                <p className="font-sans text-[9px] uppercase tracking-[0.5em] text-nous-subtle font-black">Imperial Registry Exhausted</p>
              </div>
            </div>

            <div className="space-y-6 font-serif italic text-base text-nous-subtle leading-relaxed text-balance">
              <p>
                The Oracle has reached its maximum frequency for this period. Test an existing key or anchor a fresh Sovereign Key to proceed.
              </p>
              <div className="p-4 bg-amber-500/10 dark:bg-amber-900/20 rounded-none border border-amber-500/30 dark:border-amber-900/40 text-xs">
                <p className="text-amber-700 dark:text-amber-300 font-bold mb-1 flex items-center justify-center gap-2">
                  <Zap size={13} /> Quota Debt Detected
                </p>
                Testing a key validates your connection without consuming generation tokens.
              </div>
            </div>

            {/* Test API Key Input & Verification Section */}
            <div className="space-y-3 p-4 border studio-border bg-stone-50/50 dark:bg-stone-900/50 text-left">
              <div className="flex items-center justify-between text-[9px] uppercase tracking-wider font-mono text-nous-subtle font-bold">
                <span>Test Custom / Stored Key</span>
                <select 
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value as LLMProvider)}
                  className="bg-transparent border border-nous-border px-1.5 py-0.5 text-[9px] font-mono text-nous-text cursor-pointer"
                >
                  <option value="gemini">Gemini</option>
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                </select>
              </div>

              <input 
                type="password"
                placeholder="Paste API key to verify (optional)..."
                value={testKeyInput}
                onChange={(e) => setTestKeyInput(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-stone-950 border studio-border text-nous-text focus:outline-none focus:border-amber-500 transition-colors"
              />

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setShowHowToGet(!showHowToGet)}
                  className="text-[9px] font-mono uppercase tracking-wider text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <HelpCircle size={11} />
                  <span>How to get a {selectedProvider.toUpperCase()} key?</span>
                  {showHowToGet ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                </button>
              </div>

              {/* Context-Aware Info Panel */}
              <AnimatePresence>
                {showHowToGet && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-3.5 bg-amber-500/5 dark:bg-amber-950/20 border border-amber-500/20 text-xs space-y-2.5 my-1">
                      <div className="font-bold text-[10px] font-mono uppercase tracking-wider text-amber-700 dark:text-amber-300 flex items-center justify-between">
                        <span>Obtaining {selectedProvider === 'gemini' ? 'Google AI Studio' : selectedProvider === 'openai' ? 'OpenAI' : 'Anthropic'} Key</span>
                      </div>

                      {selectedProvider === 'gemini' && (
                        <div className="space-y-2 text-stone-700 dark:text-stone-300 font-sans text-[11px] leading-relaxed">
                          <ol className="list-decimal list-inside space-y-1">
                            <li>Visit <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-amber-600 dark:text-amber-400 underline font-mono inline-flex items-center gap-0.5">Google AI Studio <ExternalLink size={9} /></a>.</li>
                            <li>Sign in with your Google Account and click <strong>Create API key</strong>.</li>
                            <li>Copy your key, paste it into the box above, and click <strong>Verify API Key</strong>.</li>
                          </ol>
                        </div>
                      )}

                      {selectedProvider === 'openai' && (
                        <div className="space-y-2 text-stone-700 dark:text-stone-300 font-sans text-[11px] leading-relaxed">
                          <ol className="list-decimal list-inside space-y-1">
                            <li>Visit <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-amber-600 dark:text-amber-400 underline font-mono inline-flex items-center gap-0.5">OpenAI Platform <ExternalLink size={9} /></a>.</li>
                            <li>Sign in and click <strong>Create new secret key</strong>.</li>
                            <li>Copy your key and paste it into the verification input above.</li>
                          </ol>
                        </div>
                      )}

                      {selectedProvider === 'anthropic' && (
                        <div className="space-y-2 text-stone-700 dark:text-stone-300 font-sans text-[11px] leading-relaxed">
                          <ol className="list-decimal list-inside space-y-1">
                            <li>Visit <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="text-amber-600 dark:text-amber-400 underline font-mono inline-flex items-center gap-0.5">Anthropic Console <ExternalLink size={9} /></a>.</li>
                            <li>Sign in, navigate to API Keys, and click <strong>Create Key</strong>.</li>
                            <li>Copy your key into the verification box above and test it.</li>
                          </ol>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <button 
                type="button"
                onClick={handleVerifyKey}
                disabled={isValidating}
                className="w-full py-2.5 border border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 font-sans text-[10px] uppercase tracking-widest font-black transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-wait"
              >
                {isValidating ? (
                  <>
                    <Loader2 size={13} className="animate-spin text-amber-500" />
                    <span>Verifying Key...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={13} className="text-amber-500" />
                    <span>Verify API Key</span>
                  </>
                )}
              </button>

              {/* Clear Feedback Banner */}
              {verificationFeedback && (
                <div className={`p-3 border text-[10px] font-mono uppercase tracking-wider flex items-start gap-2.5 leading-snug animate-fadeIn ${
                  verificationFeedback.type === 'success' 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400' 
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-400'
                }`}>
                  {verificationFeedback.type === 'success' ? (
                    <CheckCircle2 size={14} className="shrink-0 text-emerald-500 mt-0.5" />
                  ) : (
                    <XCircle size={14} className="shrink-0 text-rose-500 mt-0.5" />
                  )}
                  <span>{verificationFeedback.message}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={openKeySelector}
                className="w-full py-4 bg-amber-500 hover:bg-amber-600 hover:scale-[1.01] active:scale-[0.99] text-white font-sans text-xs tracking-[0.4em] uppercase font-black transition-all duration-300 flex items-center justify-center gap-3 shadow-sm hover:shadow-md cursor-pointer"
              >
                <Sparkles size={15} /> Anchor New Sovereign Key
              </button>

              <button 
                onClick={handleManualRecheck}
                className="w-full py-3 border border-nous-border rounded-none font-sans text-[9px] uppercase tracking-widest font-black text-nous-subtle hover:text-nous-text transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw size={11} /> Verify Handshake
              </button>
              
              <a 
                href="https://ai.google.dev/gemini-api/docs/billing"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 font-sans text-[8px] uppercase tracking-widest text-nous-subtle hover:text-nous-text transition-colors"
              >
                <Info size={10} /> View Billing Documentation <ExternalLink size={8} />
              </a>
            </div>

            <div className="pt-4 border-t border-nous-border opacity-30">
              <p className="font-serif italic text-xs">"The Oracle requires a fresh link to breathe."</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
