import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useUser } from '../contexts/UserContext';
import { X, Shield, Zap, Lock } from 'lucide-react';
import { t } from '../lib/i18n';
import { formatAuthError } from '../lib/formatAuthError';

interface MimiGatewayProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MimiGateway: React.FC<MimiGatewayProps> = ({ isOpen, onClose }) => {
  const { linkAccount, user, speedGhostEntrance, authError } = useUser();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (authError) setError(authError);
  }, [authError]);

  useEffect(() => {
    if (!isOpen) {
      setError(null);
    }
  }, [isOpen]);

  const handleDismiss = () => {
    onClose();
  };

  const handleGuestContinue = async () => {
    try {
      await speedGhostEntrance();
      handleDismiss();
    } catch (e: any) {
      setError(e.message || "Could not start guest session.");
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await linkAccount(false);
      onClose();
    } catch (e: any) {
      setError(formatAuthError(e.code || e.message));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={handleDismiss}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-white rounded-none overflow-hidden border border-nous-border"
          >
            <button
              onClick={handleDismiss}
              className="absolute top-4 right-4 p-2 text-nous-subtle hover:text-nous-text transition-colors"
            >
              <X size={20} />
            </button>

            <div className="p-8">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center gap-2 px-3 py-1 bg-stone-900 border border-stone-800 text-stone-300 rounded-sm mb-6">
                  <Shield size={10} className="text-stone-400" />
                  <span className="text-[10px] uppercase tracking-widest font-bold">Your Taste Graph</span>
                </div>
                <h2 className="text-h1 text-nous-text mb-3">
                  {user?.isAnonymous ? 'Save your approved evidence' : 'Keep your studio across devices'}
                </h2>
                <p className="text-body text-nous-subtle max-w-[280px] mx-auto">
                  {user?.isAnonymous 
                    ? 'Guest sessions stay on this device. Sign in to keep memory atoms, Tailor evidence, and exports tied to your account.'
                    : 'Sign in so captured evidence, approved Used Context, and published artifacts stay with you — not scattered across sessions.'}
                </p>
              </div>

              {error && (
                <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs rounded-none text-center border border-red-100 dark:border-red-900/50">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <button
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-stone-950 text-white hover:bg-stone-800 transition-colors font-sans text-sm font-bold tracking-wide disabled:opacity-50 border border-stone-800"
                >
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  {isLoading ? t('app.loading') : 'Sign in with Google'}
                </button>
                
                <button
                  type="button"
                  onClick={handleGuestContinue}
                  className="w-full px-6 py-3 text-[10px] uppercase tracking-[0.2em] text-stone-500 hover:text-stone-800 transition-colors font-mono"
                >
                  Explore as guest →
                </button>
              </div>

              {/* Privacy Promise */}
              <div className="mt-8 pt-6 border-t border-nous-border">
                <div className="flex items-center justify-center gap-6 text-[10px] uppercase tracking-widest text-nous-subtle font-sans">
                  <div className="flex items-center gap-1.5">
                    <Shield size={12} />
                    <span>Private</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Lock size={12} />
                    <span>Secure</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Zap size={12} />
                    <span>Fast</span>
                  </div>
                </div>
                <p className="text-center text-small mt-4 font-serif italic text-stone-500">
                  {t('auth.privacyPromise')}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
