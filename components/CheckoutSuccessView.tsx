import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useUser } from '../contexts/UserContext';
import { ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { openBillingPortal } from '../services/stripe';

type CheckoutPlan = 'core' | 'optioning' | 'pro' | 'lab';

interface CheckoutSuccessViewProps {
  plan: CheckoutPlan;
  interval?: 'month' | 'year';
  onContinue: () => void;
}

const PLAN_NAMES: Record<CheckoutPlan, string> = {
  core: 'The Initiation',
  optioning: 'Optioning',
  pro: 'The Atelier',
  lab: 'The Lab',
};

const PLAN_ROLES: Record<CheckoutPlan, string> = {
  core: 'Interpreter',
  optioning: 'Tailor',
  pro: 'Couturier',
  lab: 'Maison',
};

export const CheckoutSuccessView: React.FC<CheckoutSuccessViewProps> = ({ plan, interval = 'month', onContinue }) => {
  const { upgradePlan, profile } = useUser();
  const [isUpgrading, setIsUpgrading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const hasAttemptedUpgrade = React.useRef(false);

  useEffect(() => {
    const processUpgrade = async () => {
      try {
        await upgradePlan(plan, interval);
        setIsUpgrading(false);
      } catch (err: any) {
        setError(err?.message || 'Failed to process upgrade.');
        setIsUpgrading(false);
      }
    };

    if (hasAttemptedUpgrade.current) return;

    if (profile) {
      if (profile.plan !== plan || profile.subscriptionInterval !== interval) {
        hasAttemptedUpgrade.current = true;
        processUpgrade();
      } else {
        setIsUpgrading(false);
      }
    }
  }, [plan, interval, profile, upgradePlan]);

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      await openBillingPortal();
    } catch (err: any) {
      setError(err?.message || 'Could not open the billing portal.');
      setPortalLoading(false);
    }
  };

  const planName = PLAN_NAMES[plan] ?? 'Mimi';
  const planRole = PLAN_ROLES[plan] ?? 'Member';
  const intervalLabel = interval === 'year' ? 'Annual patronage' : 'Monthly patronage';

  return (
    <div className="min-h-full bg-nous-base text-nous-text p-6 md:p-12 flex flex-col items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full text-center"
      >
        {isUpgrading ? (
          <div className="space-y-6">
            <div className="w-14 h-14 border border-nous-border border-t-nous-text rounded-none animate-spin mx-auto" />
            <h2 className="font-serif italic text-3xl text-balance">Activating your membership</h2>
            <p className="font-sans text-[10px] uppercase tracking-[0.25em] text-nous-subtle">
              Please do not close this window
            </p>
          </div>
        ) : error ? (
          <div className="space-y-6">
            <div className="w-14 h-14 border border-red-400 text-red-500 rounded-none flex items-center justify-center mx-auto text-2xl font-serif italic">
              !
            </div>
            <h2 className="font-serif italic text-3xl">Activation error</h2>
            <p className="text-nous-subtle text-sm text-pretty">{error}</p>
            <button
              onClick={onContinue}
              className="min-h-11 px-6 py-3 bg-nous-text text-nous-base rounded-none font-sans text-[10px] uppercase tracking-[0.25em] font-bold hover:opacity-90 transition-opacity"
            >
              Return to Studio
            </button>
          </div>
        ) : (
          <div className="space-y-10">
            <div className="space-y-6">
              <div className="w-16 h-16 border border-nous-border text-nous-text rounded-none flex items-center justify-center mx-auto">
                <CheckCircle2 size={32} strokeWidth={1.25} />
              </div>
              <div className="space-y-3">
                <div className="font-mono text-[10px] uppercase tracking-[0.35em] text-nous-subtle">
                  {planRole} &middot; {intervalLabel}
                </div>
                <h1 className="font-serif italic text-5xl tracking-tight text-balance leading-tight">
                  Welcome to {planName}.
                </h1>
                <p className="font-sans text-[11px] uppercase tracking-[0.25em] text-nous-subtle font-bold">
                  Your atelier is now open
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={onContinue}
                className="w-full min-h-12 px-6 py-4 bg-nous-text text-nous-base rounded-none font-sans text-[10px] uppercase tracking-[0.25em] font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                Enter the Studio <ArrowRight size={16} strokeWidth={1.5} />
              </button>

              <button
                onClick={handleManageSubscription}
                disabled={portalLoading}
                className="w-full min-h-12 px-6 py-4 bg-transparent border border-nous-border text-nous-subtle rounded-none font-sans text-[10px] uppercase tracking-[0.25em] font-bold hover:bg-nous-text hover:text-nous-base transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {portalLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                Manage Subscription
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
