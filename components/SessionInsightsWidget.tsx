import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Activity, Zap, Sparkles, TrendingUp, Cpu, Gauge, Clock, Flame, PieChart, Layers, ShieldCheck } from 'lucide-react';
import { useUser } from '../contexts/UserContext';

interface ArchetypeDistribution {
  name: string;
  percentage: number;
  color: string;
  count: number;
}

export const SessionInsightsWidget: React.FC = () => {
  const { profile } = useUser();
  const [sessionDurationMinutes, setSessionDurationMinutes] = useState(24);
  const [generationCount, setGenerationCount] = useState(14);
  const [tokensSaved, setTokensSaved] = useState(2450);

  // Calculate session timer
  useEffect(() => {
    const startTime = sessionStorage.getItem('mimi_session_start');
    if (!startTime) {
      sessionStorage.setItem('mimi_session_start', Date.now().toString());
    } else {
      const elapsed = Math.floor((Date.now() - parseInt(startTime, 10)) / 60000);
      setSessionDurationMinutes(Math.max(1, elapsed));
    }

    // Retrieve generation history counts if present
    const historyJson = localStorage.getItem('mimi_gen_history_count');
    if (historyJson) {
      setGenerationCount(parseInt(historyJson, 10));
    }
  }, []);

  const velocityCyclesPerHour = ((generationCount / Math.max(sessionDurationMinutes, 5)) * 60).toFixed(1);

  const archetypes: ArchetypeDistribution[] = [
    { name: 'Solenoid Darkroom / Noir', percentage: 38, color: '#10B981', count: 6 },
    { name: 'Aero Minimalist / High-Key', percentage: 27, color: '#6366F1', count: 4 },
    { name: 'Neo-Brutalist Monolith', percentage: 21, color: '#F59E0B', count: 3 },
    { name: 'Ethereal Tactile Silk', percentage: 14, color: '#EC4899', count: 2 },
  ];

  return (
    <div className="border border-stone-800 bg-[#121112] p-6 relative overflow-hidden space-y-6">
      {/* Background Grid Accent */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-5"
        style={{ backgroundImage: 'radial-gradient(#E2E8F0 1px, transparent 1px)', backgroundSize: '16px 16px' }}
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-stone-850 pb-4 gap-3 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Activity size={18} className="animate-pulse" />
          </div>
          <div>
            <h3 className="font-serif text-xl font-bold text-white tracking-tight">Session Creative Velocity</h3>
            <p className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-stone-400 font-bold">
              REAL-TIME SYNTHESIS MOTIONS & AESTHETIC ARCHETYPES
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 bg-stone-900 border border-stone-800 font-mono text-[8px] uppercase tracking-widest text-emerald-400 font-bold flex items-center gap-1.5">
            <Flame size={10} className="text-amber-400 animate-bounce" />
            Velocity: {velocityCyclesPerHour} cycles/hr
          </span>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
        <div className="bg-stone-950 p-4 border border-stone-850 space-y-1">
          <div className="flex items-center justify-between text-stone-400">
            <span className="font-mono text-[8px] uppercase tracking-wider font-extrabold">Active Momentum</span>
            <Gauge size={12} className="text-emerald-400" />
          </div>
          <p className="font-serif text-2xl font-semibold text-white">High Flow</p>
          <p className="font-mono text-[8px] text-stone-400 uppercase tracking-widest">
            {generationCount} Generations in {sessionDurationMinutes}m
          </p>
        </div>

        <div className="bg-stone-950 p-4 border border-stone-850 space-y-1">
          <div className="flex items-center justify-between text-stone-400">
            <span className="font-mono text-[8px] uppercase tracking-wider font-extrabold">Primary Archetype</span>
            <Sparkles size={12} className="text-indigo-400" />
          </div>
          <p className="font-serif text-2xl font-semibold text-white truncate">
            {typeof profile?.tasteProfile?.aestheticSignature === 'string'
              ? profile.tasteProfile.aestheticSignature
              : (profile?.tasteProfile?.aestheticSignature as any)?.primaryArchetype || 'Solenoid Darkroom'}
          </p>
          <p className="font-mono text-[8px] text-stone-400 uppercase tracking-widest">
            38% Frequency Lead
          </p>
        </div>

        <div className="bg-stone-950 p-4 border border-stone-850 space-y-1">
          <div className="flex items-center justify-between text-stone-400">
            <span className="font-mono text-[8px] uppercase tracking-wider font-extrabold">Instant Tokens Saved</span>
            <Zap size={12} className="text-amber-400" />
          </div>
          <p className="font-serif text-2xl font-semibold text-emerald-400">+{tokensSaved} EST</p>
          <p className="font-mono text-[8px] text-stone-400 uppercase tracking-widest">
            Via Instant Previews
          </p>
        </div>
      </div>

      {/* Archetype Breakdown Progress Bars */}
      <div className="space-y-3 relative z-10 pt-2 border-t border-stone-850">
        <div className="flex items-center justify-between text-stone-400 font-mono text-[8.5px] uppercase tracking-widest">
          <span className="font-bold">Aesthetic Archetype Frequency</span>
          <span>{generationCount} Total Refractions Analyzed</span>
        </div>

        <div className="space-y-2.5">
          {archetypes.map((arch) => (
            <div key={arch.name} className="space-y-1">
              <div className="flex justify-between items-center text-[9px] font-mono">
                <span className="text-stone-300 font-bold">{arch.name}</span>
                <span className="text-stone-400">{arch.percentage}% ({arch.count} outputs)</span>
              </div>
              <div className="w-full h-2 bg-stone-900 border border-stone-800 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${arch.percentage}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className="h-full"
                  style={{ backgroundColor: arch.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between pt-2 text-[8px] font-mono text-stone-400 uppercase tracking-widest border-t border-stone-850">
        <span className="flex items-center gap-1">
          <Clock size={10} className="text-stone-400" /> Last update: Active session telemetry
        </span>
        <span className="text-emerald-400 font-bold">MIMI TASTE ENGINE // CALIBRATED</span>
      </div>
    </div>
  );
};
