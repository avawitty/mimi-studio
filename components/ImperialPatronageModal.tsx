import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Loader2, Check, Crown, Fingerprint, ChevronDown } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { createCheckoutSession } from '../services/stripe';
import { ManifestIdentityGate } from './ManifestIdentityGate';
import {
  PLAN_MONTHLY_USD,
  PLAN_ANNUAL_USD,
  type BillingInterval,
  type PlanTier,
} from '../constants';

type CheckoutPlan = 'core' | 'optioning' | 'pro' | 'lab';

interface Tier {
  plan: CheckoutPlan;
  name: string;
  role: string;
  cta: string;
  features: string[];
  recommended?: boolean;
  dark?: boolean;
}

const TIERS: Tier[] = [
  {
    plan: 'core',
    name: 'The Initiation',
    role: 'Interpreter',
    cta: 'Understand Your Taste',
    features: [
      '500 generation credits monthly',
      'Persistent Archive saves',
      'Full Aesthetic DNA editing',
      'Advanced Analysis maps',
    ],
  },
  {
    plan: 'optioning',
    name: 'Optioning',
    role: 'Tailor',
    cta: 'Tailor Your Taste',
    recommended: true,
    features: [
      'Everything in Initiation',
      '1,500 generation credits monthly',
      'Tailor visual treatments',
      'Priority generation queue',
    ],
  },
  {
    plan: 'pro',
    name: 'The Atelier',
    role: 'Couturier',
    cta: 'Apply Your Taste',
    features: [
      'Everything in Optioning',
      '3,000 generation credits monthly',
      'Multi-project workspaces',
      'Brand positioning outputs',
      'Strategic roadmap generation',
    ],
  },
  {
    plan: 'lab',
    name: 'The Lab',
    role: 'Maison',
    cta: 'Shape The System',
    dark: true,
    features: [
      'Everything in the Atelier',
      '10,000 generation credits monthly',
      'Experimental features',
      'Advanced embeddings tuning',
      'API / Integrations',
    ],
  },
];

const formatPrice = (plan: CheckoutPlan, interval: BillingInterval) => {
  if (interval === 'year') {
    const perMonth = Math.round(PLAN_ANNUAL_USD[plan] / 12);
    return { big: `$${perMonth}`, small: '/mo', note: `$${PLAN_ANNUAL_USD[plan]} billed yearly` };
  }
  return { big: `$${PLAN_MONTHLY_USD[plan]}`, small: '/mo', note: 'billed monthly' };
};

export const ImperialPatronageModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  prefillKey?: string;
  isLimitReached?: boolean;
}> = ({ isOpen, onClose, prefillKey, isLimitReached }) => {
  const { activatePatron, user, profile } = useUser();
  const [keyInput, setKeyInput] = useState(prefillKey || '');
  const [status, setStatus] = useState<'idle' | 'validating' | 'success' | 'error'>('idle');
  const [isCheckoutLoading, setIsCheckoutLoading] = useState<CheckoutPlan | null>(null);
  const [interval, setInterval] = useState<BillingInterval>('year');
  const [keyOpen, setKeyOpen] = useState(!!prefillKey);

  const activePaidPlan: PlanTier | null =
    profile?.subscriptionStatus === 'active' ? (profile?.planStatus as PlanTier) : null;

  useEffect(() => {
    if (prefillKey) {
      setKeyInput(prefillKey);
      setKeyOpen(true);
    }
  }, [prefillKey]);

  const handleValidate = async () => {
    if (!keyInput.trim()) return;
    setStatus('validating');
    try {
      await activatePatron(keyInput.trim());
      setStatus('success');
      setTimeout(() => {
        onClose();
        setKeyInput('');
        setStatus('idle');
      }, 2000);
    } catch (e) {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 2000);
    }
  };

  const handleSubscribe = async (plan: CheckoutPlan) => {
    if (!user) return;
    setIsCheckoutLoading(plan);
    try {
      await createCheckoutSession(plan, interval);
    } catch (error) {
      console.error('Checkout failed:', error);
      alert(error instanceof Error ? error.message : 'Checkout failed');
      setIsCheckoutLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[12000] flex items-start md:items-center justify-center p-4 md:p-6 bg-nous-base/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 20 }}
        transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        className="relative w-full max-w-[960px] overflow-hidden flex flex-col rounded-none my-4 md:my-8 bg-nous-paper text-nous-text border border-nous-text/10"
      >
        <div
          className="absolute inset-0 pointer-events-none opacity-40 mix-blend-multiply z-0"
          style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/cream-paper.png')" }}
        />

        <button
          onClick={onClose}
          aria-label="Close membership panel"
          className="absolute top-4 right-4 min-h-11 min-w-11 flex items-center justify-center text-nous-subtle hover:text-nous-text transition-colors z-30"
        >
          <X size={22} />
        </button>

        <AnimatePresence>
          {status === 'success' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-nous-text/95 backdrop-blur-sm flex flex-col items-center justify-center text-nous-base"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: 'spring' }}
                className="flex flex-col items-center gap-4"
              >
                <div className="w-16 h-16 border border-nous-base flex items-center justify-center">
                  <Check size={30} strokeWidth={2} />
                </div>
                <h2 className="font-serif italic text-4xl tracking-tight">Access Granted.</h2>
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] opacity-80">Membership unlocked</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative z-10 w-full px-5 md:px-10 pt-14 pb-10 flex flex-col items-center">
          {/* HEADER */}
          <div className="text-center space-y-4 w-full border-b border-nous-text/10 pb-8">
            <div className="flex justify-center text-nous-text opacity-80">
              <Crown size={28} strokeWidth={1} />
            </div>
            <div className="space-y-2">
              <h3 className="font-mono text-[10px] uppercase tracking-[0.4em] text-nous-subtle">Maison Mimi Patronage</h3>
              <h2 className="font-serif text-4xl md:text-5xl italic tracking-tight leading-none text-balance">
                Choose your atelier.
              </h2>
            </div>
            {isLimitReached && (
              <div className="inline-block bg-nous-text text-nous-base px-4 py-2 text-[10px] font-mono uppercase tracking-[0.2em]">
                {profile?.planStatus === 'expired'
                  ? 'Your trial has concluded — select a membership to continue.'
                  : 'Credits depleted — select a membership to continue.'}
              </div>
            )}
          </div>

          {/* BILLING TOGGLE */}
          <div className="mt-8 flex flex-col items-center gap-2">
            <div
              role="tablist"
              aria-label="Billing interval"
              className="inline-flex border border-nous-text/20 p-1 bg-nous-base/40"
            >
              <button
                role="tab"
                aria-selected={interval === 'month'}
                onClick={() => setInterval('month')}
                className={`min-h-9 px-4 font-mono text-[10px] uppercase tracking-[0.2em] transition-colors ${
                  interval === 'month' ? 'bg-nous-text text-nous-base' : 'text-nous-subtle hover:text-nous-text'
                }`}
              >
                Monthly
              </button>
              <button
                role="tab"
                aria-selected={interval === 'year'}
                onClick={() => setInterval('year')}
                className={`min-h-9 px-4 font-mono text-[10px] uppercase tracking-[0.2em] transition-colors flex items-center gap-2 ${
                  interval === 'year' ? 'bg-nous-text text-nous-base' : 'text-nous-subtle hover:text-nous-text'
                }`}
              >
                Annual
                <span className={`text-[9px] ${interval === 'year' ? 'text-nous-base' : 'text-nous-text'}`}>
                  2 months free
                </span>
              </button>
            </div>
          </div>

          {/* TIERS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-5 w-full text-left mt-8">
            {TIERS.map((tier) => {
              const price = formatPrice(tier.plan, interval);
              const isCurrent =
                activePaidPlan === tier.plan &&
                (!profile?.subscriptionInterval || profile.subscriptionInterval === interval);
              const loading = isCheckoutLoading === tier.plan;
              return (
                <div
                  key={tier.plan}
                  className={`p-6 flex flex-col relative border ${
                    tier.dark
                      ? 'bg-nous-text text-nous-base border-nous-text'
                      : tier.recommended
                        ? 'bg-nous-base border-nous-text border-2'
                        : 'bg-nous-base/60 border-nous-text/20'
                  }`}
                >
                  {tier.recommended && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-nous-text text-nous-base text-[9px] font-mono uppercase tracking-[0.2em] px-3 py-1 whitespace-nowrap">
                      Most Chosen
                    </div>
                  )}
                  <h3 className={`font-serif italic text-2xl ${tier.dark ? 'text-nous-base' : 'text-nous-text'}`}>
                    {tier.name}
                  </h3>
                  <div className={`font-mono text-[10px] uppercase tracking-[0.2em] mb-4 ${tier.dark ? 'text-nous-base/60' : 'text-nous-subtle'}`}>
                    {tier.role}
                  </div>
                  <div className="mb-1 flex items-baseline gap-1">
                    <span className="text-3xl font-light tracking-tight">{price.big}</span>
                    <span className={`text-sm ${tier.dark ? 'text-nous-base/60' : 'text-nous-subtle'}`}>{price.small}</span>
                  </div>
                  <div className={`text-[10px] font-mono uppercase tracking-[0.15em] mb-6 ${tier.dark ? 'text-nous-base/50' : 'text-nous-subtle'}`}>
                    {price.note}
                  </div>
                  <ul className={`space-y-3 mb-8 flex-1 text-sm leading-relaxed ${tier.dark ? 'text-nous-base/80' : 'text-nous-subtle'}`}>
                    {tier.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <Check size={14} className="mt-1 shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                  <ManifestIdentityGate>
                    <button
                      onClick={() => handleSubscribe(tier.plan)}
                      disabled={!!isCheckoutLoading || isCurrent}
                      className={`w-full min-h-11 py-3 font-sans text-[10px] uppercase tracking-[0.2em] font-bold transition-colors flex justify-center items-center gap-2 border ${
                        isCurrent
                          ? 'cursor-not-allowed opacity-50 border-current'
                          : tier.dark
                            ? 'border-nous-base/40 hover:bg-nous-base hover:text-nous-text'
                            : tier.recommended
                              ? 'bg-nous-text text-nous-base border-nous-text hover:opacity-90'
                              : 'border-nous-text/30 hover:bg-nous-text hover:text-nous-base'
                      }`}
                    >
                      {loading ? <Loader2 size={14} className="animate-spin" /> : isCurrent ? 'Current Plan' : tier.cta}
                    </button>
                  </ManifestIdentityGate>
                </div>
              );
            })}
          </div>

          {/* DOWNPLAYED SOVEREIGN KEY */}
          <div className="mt-10 pt-6 border-t border-nous-text/10 w-full max-w-sm mx-auto text-center">
            <button
              onClick={() => setKeyOpen((v) => !v)}
              aria-expanded={keyOpen}
              className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-nous-subtle hover:text-nous-text transition-colors min-h-11"
            >
              <Fingerprint size={12} />
              Have a Sovereign Key?
              <ChevronDown size={12} className={`transition-transform ${keyOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {keyOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-4">
                    <input
                      type="text"
                      value={keyInput}
                      onChange={(e) => setKeyInput(e.target.value)}
                      placeholder="ENTER_ACCESS_CODE"
                      className="w-full bg-nous-base/40 border-b border-nous-text/20 py-3 text-center font-mono text-xs uppercase tracking-[0.3em] text-nous-text focus:outline-none focus:border-nous-text transition-colors placeholder:text-nous-text/30"
                    />
                    <button
                      onClick={handleValidate}
                      disabled={status === 'validating' || !keyInput}
                      className={`w-full mt-4 min-h-11 py-3 border rounded-none font-sans text-[9px] uppercase tracking-[0.3em] font-black transition-all flex items-center justify-center gap-3 ${
                        status === 'success'
                          ? 'bg-nous-text text-nous-base border-nous-text'
                          : 'border-nous-text/30 hover:bg-nous-text hover:text-nous-base text-nous-text disabled:opacity-50'
                      }`}
                    >
                      {status === 'validating' ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : status === 'success' ? (
                        <Check size={12} />
                      ) : (
                        <Fingerprint size={12} />
                      )}
                      <span>
                        {status === 'validating'
                          ? 'Verifying...'
                          : status === 'success'
                            ? 'Access Granted'
                            : status === 'error'
                              ? 'Invalid Key'
                              : 'Acquire Access'}
                      </span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
