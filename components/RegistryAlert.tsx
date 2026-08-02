
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

export const RegistryAlert: React.FC = () => {
 const [alerts, setAlerts] = useState<any[]>([]);

 useEffect(() => {
 const handleAlert = (e: any) => {
 const message = String(e.detail?.message || "").trim();
 // Dedupe identical toasts — gateway/credit failures were stacking System Dissonance.
 setAlerts((prev) => {
   if (message && prev.some((a) => String(a.message || "").trim() === message)) {
     return prev;
   }
   const id = Math.random().toString(36).substr(2, 9);
   const newAlert = { id, ...e.detail };
   setTimeout(() => {
     setAlerts((current) => current.filter((a) => a.id !== id));
   }, 5000);
   const soundType = e.detail.type === 'error' ? 'error' : 'success';
   window.dispatchEvent(new CustomEvent('mimi:sound', { detail: { type: soundType } }));
   return [...prev, newAlert];
 });
 };

 window.addEventListener('mimi:registry_alert', handleAlert);
 return () => window.removeEventListener('mimi:registry_alert', handleAlert);
 }, []);

 return (
 <div className="fixed bottom-8 right-8 z-[10000] flex flex-col gap-3 pointer-events-none">
 <AnimatePresence>
 {alerts.map(alert => (
 <motion.div
 key={alert.id}
 initial={{ opacity: 0, x: 20, scale: 0.95 }}
 animate={{ opacity: 1, x: 0, scale: 1 }}
 exit={{ opacity: 0, x: 20, scale: 0.95 }}
 className={`pointer-events-auto min-w-[300px] p-4 rounded-none border flex items-center gap-4 backdrop-blur-xl ${
 alert.type === 'error' 
 ? 'bg-red-950/90 border-red-500/50 text-red-200' 
 : alert.type === 'announcement'
 ? 'bg-blue-950/90 border-blue-500/50 text-blue-200'
 : 'bg-nous-base/90 border-nous-border/50 text-nous-text'
 }`}
 >
 <div className={`shrink-0 ${alert.type === 'error' ? 'text-red-500' : alert.type === 'announcement' ? 'text-blue-500' : 'text-nous-subtle'}`}>
 {alert.icon || (alert.type === 'error' ? <AlertCircle size={18} /> : alert.type === 'announcement' ? <Info size={18} /> : <CheckCircle size={18} />)}
 </div>
 <div className="flex-1">
 <p className="font-sans text-[10px] uppercase tracking-widest font-black opacity-50 mb-1">
 {alert.type === 'error' ? 'System Dissonance' : alert.type === 'announcement' ? 'Site Announcement' : 'Registry Update'}
 </p>
 <p className="font-serif italic text-sm">{alert.message}</p>
 </div>
 <button 
 onClick={() => setAlerts(prev => prev.filter(a => a.id !== alert.id))}
 className="p-1 hover:bg-white/10 rounded-none transition-colors"
 >
 <X size={14} className="opacity-50"/>
 </button>
 </motion.div>
 ))}
 </AnimatePresence>
 </div>
 );
};
