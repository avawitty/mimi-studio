
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

const MAX_ALERT_CHARS = 200;

function truncateMessage(message: string): string {
  const trimmed = message.trim();
  if (trimmed.length <= MAX_ALERT_CHARS) return trimmed;
  return `${trimmed.slice(0, MAX_ALERT_CHARS - 1).trim()}…`;
}

export const RegistryAlert: React.FC = () => {
 const [alerts, setAlerts] = useState<any[]>([]);
 const recentMessages = useRef<Set<string>>(new Set());

 useEffect(() => {
 const handleAlert = (e: any) => {
 const message = truncateMessage(String(e.detail?.message || ""));
 // Dedupe identical toasts — gateway/credit failures were stacking System Dissonance.
 if (message && recentMessages.current.has(message)) {
   return;
 }
 if (message) {
   recentMessages.current.add(message);
   setTimeout(() => {
     recentMessages.current.delete(message);
   }, 5000);
 }

 const id = Math.random().toString(36).substr(2, 9);
 setAlerts((prev) => [...prev, { id, ...e.detail, message }]);

 // Side effects outside the state updater (React may invoke updaters twice).
 const soundType = e.detail.type === 'error' ? 'error' : 'success';
 window.dispatchEvent(new CustomEvent('mimi:sound', { detail: { type: soundType } }));
 setTimeout(() => {
   setAlerts((current) => current.filter((a) => a.id !== id));
 }, 5000);
 };

 window.addEventListener('mimi:registry_alert', handleAlert);
 return () => window.removeEventListener('mimi:registry_alert', handleAlert);
 }, []);

 return (
 <div className="fixed z-[10000] flex flex-col gap-2 pointer-events-none left-4 right-4 top-[max(0.75rem,env(safe-area-inset-top))] sm:left-auto sm:right-6 sm:top-auto sm:bottom-8 sm:max-w-sm">
 <AnimatePresence>
 {alerts.map(alert => (
 <motion.div
 key={alert.id}
 initial={{ opacity: 0, y: -8, scale: 0.98 }}
 animate={{ opacity: 1, y: 0, scale: 1 }}
 exit={{ opacity: 0, y: -8, scale: 0.98 }}
 className={`pointer-events-auto w-full p-3 sm:p-4 rounded-none border flex items-start gap-3 backdrop-blur-xl shadow-lg ${
 alert.type === 'error' 
 ? 'bg-red-950/95 border-red-500/50 text-red-100' 
 : alert.type === 'announcement'
 ? 'bg-blue-950/95 border-blue-500/50 text-blue-100'
 : 'bg-nous-base/95 border-nous-border/50 text-nous-text'
 }`}
 >
 <div className={`shrink-0 mt-0.5 ${alert.type === 'error' ? 'text-red-400' : alert.type === 'announcement' ? 'text-blue-400' : 'text-nous-subtle'}`}>
 {alert.icon || (alert.type === 'error' ? <AlertCircle size={16} /> : alert.type === 'announcement' ? <Info size={16} /> : <CheckCircle size={16} />)}
 </div>
 <div className="flex-1 min-w-0">
 <p className="font-sans text-[9px] uppercase tracking-widest font-black opacity-60 mb-1">
 {alert.type === 'error' ? 'System Dissonance' : alert.type === 'announcement' ? 'Notice' : 'Registry Update'}
 </p>
 <p className="font-sans text-[13px] leading-snug break-words">{alert.message}</p>
 </div>
 <button 
 type="button"
 onClick={() => setAlerts(prev => prev.filter(a => a.id !== alert.id))}
 className="p-1 hover:bg-white/10 rounded-none transition-colors shrink-0"
 aria-label="Dismiss"
 >
 <X size={14} className="opacity-60"/>
 </button>
 </motion.div>
 ))}
 </AnimatePresence>
 </div>
 );
};
