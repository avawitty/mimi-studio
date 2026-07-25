import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useUser } from '../contexts/UserContext';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

interface CheckoutSuccessViewProps {
 plan: 'core' | 'pro' | 'lab';
 interval?: 'month' | 'year';
 onContinue: () => void;
}

export const CheckoutSuccessView: React.FC<CheckoutSuccessViewProps> = ({ plan, interval = 'month', onContinue }) => {
 const { upgradePlan, profile } = useUser();
 const [isUpgrading, setIsUpgrading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const hasAttemptedUpgrade = React.useRef(false);

 useEffect(() => {
 const processUpgrade = async () => {
 try {
 await upgradePlan(plan, interval);
 setIsUpgrading(false);
 } catch (err: any) {
 setError(err.message ||"Failed to process upgrade.");
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

 const planNames = {
 core: 'Mimi Core',
 pro: 'Mimi Pro',
 lab: 'Mimi Lab'
 };

 return (
 <div className="min-h-full bg-nous-base text-nous-text p-6 md:p-12 flex flex-col items-center justify-center">
 <motion.div
 initial={{ opacity: 0, scale: 0.95 }}
 animate={{ opacity: 1, scale: 1 }}
 className="max-w-md w-full text-center space-y-8"
 >
 {isUpgrading ? (
 <div className="space-y-6">
 <div className="w-16 h-16 border-2 border-nous-border border-t-stone-500 rounded-none animate-spin mx-auto"/>
 <h2 className="font-serif italic text-3xl">Activating Membership...</h2>
 <p className="font-sans text-xs uppercase tracking-widest text-nous-subtle">Please do not close this window</p>
 </div>
 ) : error ? (
 <div className="space-y-6">
 <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-none flex items-center justify-center mx-auto text-2xl">!</div>
 <h2 className="font-serif italic text-3xl">Activation Error</h2>
 <p className="text-nous-subtle">{error}</p>
 <button 
 onClick={onContinue}
 className="px-6 py-3 bg-nous-text text-nous-base rounded-none font-sans text-xs uppercase tracking-widest font-bold hover:bg-nous-text0 transition-colors"
 >
 Return to Studio
 </button>
 </div>
 ) : (
 <div className="space-y-8">
 <div className="w-20 h-20 bg-nous-base /30 text-nous-subtle rounded-none flex items-center justify-center mx-auto">
 <CheckCircle2 size={40} />
 </div>
 
 <div className="space-y-4">
 <h1 className="font-serif italic text-5xl tracking-tighter">Welcome to {planNames[plan]}.</h1>
 <p className="font-sans text-sm uppercase tracking-[0.2em] text-nous-subtle font-bold">
 Your capabilities have been unlocked
 </p>
 </div>

 <div className="pt-8 space-y-4">
 <button 
 onClick={onContinue}
 className="w-full px-6 py-4 bg-nous-text text-nous-base rounded-none font-sans text-xs uppercase tracking-widest font-bold hover:bg-nous-text0 transition-colors flex items-center justify-center gap-2"
 >
 Enter the Studio <ArrowRight size={16} />
 </button>
 
 <a 
 href="https://billing.stripe.com/p/login/3cI4gtekA8L36kX3NDaEE00"
 target="_blank"
 rel="noopener noreferrer"
 className="block w-full px-6 py-4 bg-transparent border border-nous-border text-nous-subtle rounded-none font-sans text-xs uppercase tracking-widest font-bold hover:bg-nous-base transition-colors"
 >
 Manage Subscription
 </a>
 </div>
 </div>
 )}
 </motion.div>
 </div>
 );
};
