import React, { useState, useRef, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import { motion, AnimatePresence } from 'motion/react';
import { Battery, BatteryFull, BatteryLow, BatteryMedium, Zap, Clock, ShieldCheck } from 'lucide-react';

const PAID_PLAN_STATUSES = new Set(['core', 'pro', 'lab', 'initiation', 'optioning', 'atelier', 'sovereign']);

export const CreditMeter: React.FC = () => {
 const { profile } = useUser();
 const [isOpen, setIsOpen] = useState(false);
 const meterRef = useRef<HTMLDivElement>(null);

 useEffect(() => {
 const handleClickOutside = (event: MouseEvent) => {
 if (meterRef.current && !meterRef.current.contains(event.target as Node)) {
 setIsOpen(false);
 }
 };
 document.addEventListener('mousedown', handleClickOutside);
 return () => document.removeEventListener('mousedown', handleClickOutside);
 }, []);

 if (!profile) return null;

 const status = profile.planStatus || 'ghost';
 const isPaid = PAID_PLAN_STATUSES.has(status) || Boolean(profile.isPatron);
 const isGhost = status === 'ghost';
 const isExpired = status === 'expired';

 const membershipCredits = profile.membershipCredits;
 const trialCredits = profile.trial?.remainingCredits ?? 0;
 const credits = isPaid
   ? Number(membershipCredits?.remaining ?? trialCredits)
   : trialCredits;
 const totalCredits = isPaid
   ? Number(membershipCredits?.allowance ?? membershipCredits?.remaining ?? profile.trial?.grantedCredits ?? 0)
   : (profile.trial?.grantedCredits || 12);
 const percentage = totalCredits > 0
   ? Math.max(0, Math.min(100, (credits / totalCredits) * 100))
   : 0;

 let Icon = BatteryMedium;
 if (isPaid && credits > 0) Icon = Zap;
 else if (percentage > 75) Icon = BatteryFull;
 else if (percentage > 25) Icon = BatteryMedium;
 else if (percentage > 0) Icon = BatteryLow;
 else Icon = Battery;

 const daysLeft = profile.trial?.endsAt 
 ? Math.max(0, Math.ceil((profile.trial.endsAt - Date.now()) / (1000 * 60 * 60 * 24)))
 : 0;

 return (
 <div className="relative"ref={meterRef}>
 <button 
 onClick={() => setIsOpen(!isOpen)}
 className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-300 ${
 isPaid ? 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400' :
 isExpired ? 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400' :
 credits <= 2 ? 'border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400' :
 'border-nous-border bg-white/50 /50 text-nous-subtle hover:bg-nous-base '
 }`}
 >
 <Icon size={14} className={isPaid ? 'text-amber-500' : ''} />
 <span className="font-mono text-[10px] uppercase tracking-widest font-bold">
 {isExpired ? 'Expired' : `${credits} CR`}
 </span>
 </button>

 <AnimatePresence>
 {isOpen && (
 <motion.div
 initial={{ opacity: 0, y: 10, scale: 0.95 }}
 animate={{ opacity: 1, y: 0, scale: 1 }}
 exit={{ opacity: 0, y: 10, scale: 0.95 }}
 transition={{ duration: 0.2 }}
 className="absolute top-full right-0 mt-2 w-64 bg-white border border-nous-border shadow-xl z-50 overflow-hidden"
 >
 <div className="p-4 border-b border-nous-border bg-nous-base /50">
 <div className="flex items-center justify-between mb-2">
 <span className="font-serif italic text-sm text-nous-text">
 {isPaid ? 'Patron Status' : isGhost ? 'Ghost Protocol' : 'Trial Access'}
 </span>
 {isPaid ? <ShieldCheck size={14} className="text-amber-500"/> : <Clock size={14} className="text-nous-subtle"/>}
 </div>
 
 <div className="flex items-end justify-between mb-1">
 <span className="font-mono text-2xl font-light tracking-tighter text-nous-text ">
 {credits}
 </span>
 <span className="font-sans text-[10px] uppercase tracking-widest text-nous-subtle mb-1">
 Credits Remaining
 </span>
 </div>
 <div className="w-full h-1 bg-stone-200 rounded-full overflow-hidden">
 <div 
 className={`h-full transition-all duration-500 ${
 credits <= 2 ? 'bg-orange-500' : 'bg-nous-base '
 }`}
 style={{ width: `${percentage}%` }}
 />
 </div>
 {isPaid && totalCredits > 0 && (
 <p className="font-sans text-[9px] text-nous-subtle mt-2">
 {credits} of {totalCredits} credits this cycle.
 </p>
 )}
 {!isPaid && !isGhost && !isExpired && (
 <p className="font-sans text-[9px] text-nous-subtle mt-2">
 {daysLeft} {daysLeft === 1 ? 'day' : 'days'} remaining in trial.
 </p>
 )}
 </div>

 {!isPaid && (
 <div className="p-4 bg-white">
 <h4 className="font-sans text-[9px] uppercase tracking-widest text-nous-subtle mb-3">Generation Costs</h4>
 <ul className="space-y-2">
 <li className="flex justify-between items-center text-[11px] font-sans">
 <span className="text-nous-subtle">Tailor Scry</span>
 <span className="font-mono text-nous-text">1 CR</span>
 </li>
 <li className="flex justify-between items-center text-[11px] font-sans">
 <span className="text-nous-subtle">Light Reading</span>
 <span className="font-mono text-nous-text">1 CR</span>
 </li>
 <li className="flex justify-between items-center text-[11px] font-sans">
 <span className="text-nous-subtle">Full Zine</span>
 <span className="font-mono text-nous-text">2 CR</span>
 </li>
 <li className="flex justify-between items-center text-[11px] font-sans">
 <span className="text-nous-subtle">Deep Research</span>
 <span className="font-mono text-nous-text">3 CR</span>
 </li>
 </ul>
 
 <button 
 onClick={() => {
 if (isPaid) return;
 if (isGhost) {
 window.dispatchEvent(new CustomEvent('mimi:open_gateway'));
 } else {
 window.dispatchEvent(new CustomEvent('mimi:open_patron_modal'));
 }
 }}
 className={`w-full mt-4 py-2 font-sans text-white text-[10px] uppercase tracking-widest transition-colors ${isPaid ? 'bg-nous-subtle cursor-default' : 'bg-nous-text hover:opacity-80'}`}
 >
 {isPaid ? 'Platform Unlocked' : (isGhost ? 'Claim your trial' : 'Upgrade to Patron')}
 </button>
 </div>
 )}
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 );
};
