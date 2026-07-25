
// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SemanticSteps } from './SemanticSteps';
import { X, Cpu, ShieldCheck, Sparkles, Activity, Terminal, Play, Settings } from 'lucide-react';
import { useAgents } from '../contexts/AgentContext';
import { getSystemEvents, clearSystemEvents, getBreakersState } from '../services/aiProvider';

export const DeveloperSettings: React.FC<{ onClose: () => void }> = ({ onClose }) => {
 const { agentConfig, setAgentConfig, agentLogs, triggerManualSentinel, activeAgents } = useAgents();
 const [activeTab, setActiveTab] = useState<'config' | 'console' | 'events'>('config');
 const [systemEvents, setSystemEvents] = useState<any[]>([]);
 const [breakers, setBreakers] = useState<any>({});
 const logsEndRef = useRef<HTMLDivElement>(null);

 useEffect(() => {
 logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
 }, [agentLogs, activeTab]);

 useEffect(() => {
   // Initial fetch
   setSystemEvents(getSystemEvents());
   setBreakers(getBreakersState());

   // Listen for live system event logs
   const handleEventLogged = (e: any) => {
     if (e.detail === null) {
       setSystemEvents([]);
     } else {
       setSystemEvents(prev => [e.detail, ...prev].slice(0, 100));
     }
     setBreakers(getBreakersState());
   };

   window.addEventListener('mimi:system_event_logged', handleEventLogged);
   
   // Poll breakers state periodically to show live cooldown countdowns
   const timer = setInterval(() => {
     setBreakers(getBreakersState());
   }, 2000);

   return () => {
     window.removeEventListener('mimi:system_event_logged', handleEventLogged);
     clearInterval(timer);
   };
 }, []);

 const handleClearEvents = () => {
   clearSystemEvents();
 };

 return (
 <motion.div 
 initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
 className="fixed inset-0 z-[12000] bg-nous-base/95 backdrop-blur-xl flex items-center justify-center p-6"
 >
 <div className="w-full max-w-2xl bg-nous-base border border-nous-border rounded-none p-8 md:p-12 space-y-10 flex flex-col max-h-[85vh]">
 <div className="flex justify-between items-start shrink-0">
 <div className="space-y-2">
 <div className="flex items-center gap-3 text-nous-subtle">
 <Cpu size={18} />
 <span className="font-sans text-[10px] uppercase tracking-[0.5em] font-black italic">System Logic</span>
 </div>
 <h2 className="font-serif text-3xl italic text-white">Agent Protocols.</h2>
 </div>
 <button onClick={onClose} className="p-2 text-nous-subtle hover:text-nous-text"><X size={24} /></button>
 </div>

 <div className="flex gap-8 border-b border-white/5 shrink-0">
 <button onClick={() => setActiveTab('config')} className={`pb-3 font-sans text-[9px] uppercase tracking-widest font-black transition-all ${activeTab === 'config' ? 'text-white border-b-2 border-white' : 'text-nous-subtle'}`}>
 Configuration
 </button>
 <button onClick={() => setActiveTab('console')} className={`pb-3 font-sans text-[9px] uppercase tracking-widest font-black transition-all ${activeTab === 'console' ? 'text-white border-b-2 border-white' : 'text-nous-subtle'}`}>
 Live Console
 </button>
 <button onClick={() => setActiveTab('events')} className={`pb-3 font-sans text-[9px] uppercase tracking-widest font-black transition-all ${activeTab === 'events' ? 'text-white border-b-2 border-white' : 'text-nous-subtle'}`}>
 System Events
 </button>
 </div>

 <div className="flex-1 overflow-y-auto no-scrollbar pr-2">
 <AnimatePresence mode="wait">
 {activeTab === 'config' ? (
 <motion.div key="config"initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
 <div className="flex items-center justify-between p-4 bg-black/40 border border-white/5 rounded-none">
 <div className="space-y-1">
 <div className="flex items-center gap-2 text-white">
 <Sparkles size={14} className="text-indigo-400"/>
 <span className="font-sans text-[8px] uppercase tracking-widest font-black">The Curator</span>
 </div>
 <p className="font-serif italic text-xs text-nous-subtle">Auto-enrich uploads with cultural metadata.</p>
 </div>
 <button 
 onClick={() => setAgentConfig({ ...agentConfig, curatorEnabled: !agentConfig.curatorEnabled })}
 className={`w-12 h-6 rounded-none transition-colors relative ${agentConfig.curatorEnabled ? 'bg-stone-600' : 'bg-nous-base'}`}
 >
 <div className={`absolute top-1 w-4 h-4 bg-white rounded-none transition-all ${agentConfig.curatorEnabled ? 'left-7' : 'left-1'}`} />
 </button>
 </div>

 <div className="flex items-center justify-between p-4 bg-black/40 border border-white/5 rounded-none">
 <div className="space-y-1">
 <div className="flex items-center gap-2 text-white">
 <ShieldCheck size={14} className="text-red-400"/>
 <span className="font-sans text-[8px] uppercase tracking-widest font-black">The Sentinel</span>
 </div>
 <p className="font-serif italic text-xs text-nous-subtle">Audit aesthetic drift against manifesto.</p>
 </div>
 <button 
 onClick={() => setAgentConfig({ ...agentConfig, sentinelEnabled: !agentConfig.sentinelEnabled })}
 className={`w-12 h-6 rounded-none transition-colors relative ${agentConfig.sentinelEnabled ? 'bg-stone-600' : 'bg-nous-base'}`}
 >
 <div className={`absolute top-1 w-4 h-4 bg-white rounded-none transition-all ${agentConfig.sentinelEnabled ? 'left-7' : 'left-1'}`} />
 </button>
 </div>

 <div className="space-y-6 pt-4 border-t border-white/5">
 <div className="space-y-4">
 <div className="flex justify-between items-center">
 <div className="flex flex-col">
 <span className="font-sans text-[8px] uppercase tracking-widest font-black text-nous-subtle">Curator Thinking Budget</span>
 <span className="font-serif italic text-[10px] text-nous-subtle">Impact: Semiotic depth of shard analysis.</span>
 </div>
 <span className="font-mono text-[10px] text-nous-subtle">{agentConfig.curatorThinkingBudget} Tokens</span>
 </div>
 <SemanticSteps 
 steps={[
 { label: 'Low', value: 1024 },
 { label: 'Medium', value: 4096 },
 { label: 'High', value: 8192 },
 { label: 'Max', value: 16384 }
 ]}
 value={agentConfig.curatorThinkingBudget}
 onChange={(val) => setAgentConfig({ ...agentConfig, curatorThinkingBudget: val })}
 />
 <p className="font-serif italic text-[10px] text-nous-subtle leading-relaxed">
 A higher budget for the Curator allows it to perform deeper cultural cross-referencing and more sophisticated semiotic decoding of your shards. 
 <span className="text-amber-500/60 ml-1">Warning: High values increase analysis latency.</span>
 </p>
 </div>

 <div className="space-y-4">
 <div className="flex justify-between items-center">
 <div className="flex flex-col">
 <span className="font-sans text-[8px] uppercase tracking-widest font-black text-nous-subtle">Sentinel Thinking Budget</span>
 <span className="font-serif italic text-[10px] text-nous-subtle">Impact: Precision of aesthetic drift detection.</span>
 </div>
 <span className="font-mono text-[10px] text-nous-subtle">{agentConfig.sentinelThinkingBudget} Tokens</span>
 </div>
 <SemanticSteps 
 steps={[
 { label: 'Low', value: 1024 },
 { label: 'Medium', value: 4096 },
 { label: 'High', value: 8192 },
 { label: 'Max', value: 16384 }
 ]}
 value={agentConfig.sentinelThinkingBudget}
 onChange={(val) => setAgentConfig({ ...agentConfig, sentinelThinkingBudget: val })}
 />
 <p className="font-serif italic text-[10px] text-nous-subtle leading-relaxed">
 The Sentinel uses this budget to audit your recent debris against your stated Manifesto. 
 Higher budgets result in more nuanced detection of aesthetic drift and more insightful clinical observations.
 </p>
 </div>

 <div className="p-4 bg-nous-base0/5 border border-nous-border/10 rounded-none">
 <p className="font-sans text-[8px] uppercase tracking-widest font-black text-nous-subtle mb-2 flex items-center gap-2">
 <Activity size={10} /> Performance Note
 </p>
 <p className="font-serif italic text-[10px] text-nous-subtle leading-relaxed">
 Thinking budgets determine the maximum reasoning effort the model can expend. 
 Increasing these values improves generation quality and reasoning depth but will result in longer"thinking"times before the agent files its report.
 </p>
 </div>
 </div>
 </motion.div>
 ) : activeTab === 'console' ? (
 <motion.div key="console"initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col h-full space-y-6">
 <div className="flex-1 bg-black/60 border border-nous-border p-4 rounded-none font-mono text-[10px] text-nous-subtle overflow-y-auto min-h-[300px] space-y-2">
 {agentLogs.length === 0 && <span className="text-nous-subtle italic">System quiet. No agents active.</span>}
 {agentLogs.map(log => (
 <div key={log.id} className="border-b border-nous-border pb-2 mb-2 last:border-0">
 <div className="flex gap-2 items-center mb-1">
 <span className="text-nous-subtle">{new Date(log.timestamp).toLocaleTimeString()}</span>
 <span className={`uppercase font-bold ${log.agent === 'curator' ? 'text-indigo-400' : 'text-red-400'}`}>[{log.agent}]</span>
 </div>
 <p className="pl-14">{log.message}</p>
 {log.data && (
 <pre className="pl-14 mt-1 text-nous-subtle overflow-x-auto">{JSON.stringify(log.data, null, 2)}</pre>
 )}
 </div>
 ))}
 <div ref={logsEndRef} />
 </div>
 
 <div className="flex gap-4">
 <button 
 onClick={triggerManualSentinel}
 disabled={activeAgents.includes('sentinel')}
 className="flex-1 py-3 bg-nous-base hover:bg-stone-700 text-white rounded-none font-sans text-[9px] uppercase tracking-widest font-black flex items-center justify-center gap-2 transition-all disabled:opacity-50"
 >
 {activeAgents.includes('sentinel') ? <Activity size={12} className="animate-spin"/> : <Play size={12} />}
 Run Sentinel Audit
 </button>
 </div>
 </motion.div>
 ) : (
 <motion.div key="events" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col h-full space-y-6 overflow-hidden max-h-[50vh]">
   {/* Live Breaker Status Grid */}
   <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-b border-white/5 pb-4 shrink-0">
     {Object.entries(breakers || {}).map(([id, b]: [string, any]) => {
       const isCooldownActive = b.state === 'OPEN' && b.nextTrialTime > Date.now();
       const cooldownLeft = isCooldownActive ? Math.ceil((b.nextTrialTime - Date.now()) / 1000) : 0;
       
       return (
         <div key={id} className="p-3 bg-black/40 border border-white/5 rounded-none flex flex-col justify-between space-y-2">
           <div className="flex items-center justify-between">
             <span className="font-sans text-[8px] uppercase tracking-widest font-black text-white">{id}</span>
             <span className={`px-1.5 py-0.5 font-sans text-[7px] uppercase tracking-widest font-black ${
               b.state === 'CLOSED' ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/30' :
               b.state === 'HALF_OPEN' ? 'bg-amber-950/40 text-amber-400 border border-amber-900/30' :
               'bg-red-950/40 text-red-400 border border-red-900/30'
             }`}>
               {b.state}
             </span>
           </div>
           
           <div className="space-y-1 font-mono text-[8px] text-nous-subtle">
             <div className="flex justify-between">
               <span>Failures:</span>
               <span className="text-white">{b.failureCount}</span>
             </div>
             <div className="flex justify-between">
               <span>Cooldown:</span>
               <span className="text-white">{b.cooldownDuration}ms</span>
             </div>
             {isCooldownActive && (
               <div className="flex justify-between text-red-400 animate-pulse font-bold">
                 <span>Retrying in:</span>
                 <span>{cooldownLeft}s</span>
               </div>
             )}
           </div>
         </div>
       );
     })}
   </div>

   {/* System Event Logs List */}
   <div className="flex-1 bg-black/60 border border-nous-border p-4 rounded-none font-mono text-[10px] text-nous-subtle overflow-y-auto space-y-2 min-h-[150px]">
     {systemEvents.length === 0 && <span className="text-nous-subtle italic">No system events logged. Run AI prompts to monitor routing.</span>}
     {systemEvents.map(evt => (
       <div key={evt.id} className="border-b border-white/5 pb-2 mb-2 last:border-0 hover:bg-white/[0.02] p-1 transition-all">
         <div className="flex justify-between items-start flex-wrap gap-2 mb-1">
           <div className="flex items-center gap-2">
             <span className="text-neutral-500">{new Date(evt.timestamp).toLocaleTimeString()}</span>
             <span className={`px-1 text-[7px] uppercase font-bold rounded-none ${
               evt.type === 'breaker_trip' ? 'bg-red-950 text-red-400 border border-red-900/40 font-black' :
               evt.type === 'breaker_recover' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/40 font-black' :
               evt.type === 'failover' ? 'bg-amber-950 text-amber-400 border border-amber-900/40 font-black' :
               evt.type === 'error' ? 'bg-red-900/50 text-red-300 border border-red-900/30 font-black' :
               evt.type === 'warning' ? 'bg-yellow-950 text-yellow-500 border border-yellow-900/30' :
               'bg-zinc-800 text-zinc-300'
             }`}>
               {evt.type}
             </span>
             <span className="text-white font-sans text-[7px] uppercase tracking-wider bg-white/5 px-1 font-black">
               {evt.provider}
             </span>
           </div>
           <span className="text-[7px] text-neutral-600 font-mono">ID: {evt.id}</span>
         </div>
         <p className="text-neutral-200 mt-1 pl-1 text-[10px]">{evt.message}</p>
         {evt.details && (
           <p className="text-neutral-500 text-[8px] mt-0.5 pl-2 border-l border-white/5 italic">
             {evt.details}
           </p>
         )}
       </div>
     ))}
   </div>

   <div className="flex shrink-0">
     <button 
       onClick={handleClearEvents}
       className="flex-1 py-2.5 bg-nous-base hover:bg-stone-800 border border-nous-border text-white rounded-none font-sans text-[9px] uppercase tracking-widest font-black transition-all"
     >
       Wipe Event Ledger
     </button>
   </div>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 </div>
 </motion.div>
 );
};
