import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Zap } from 'lucide-react';

interface AestheticTrajectoryProps {
 current: { density: number; entropy: number; palette: string[] };
 target: { density: number; entropy: number; palette: string[] };
 recommendation: { treatment: string; persona: string; reasoning: string };
}

export const AestheticTrajectory: React.FC<AestheticTrajectoryProps> = ({ current, target, recommendation }) => {
 return (
 <div className="mb-16">
 <h3 className="text-[10px] font-mono tracking-widest uppercase text-nous-subtle mb-6 border-b border-nous-border pb-2">Aesthetic Trajectory</h3>
 
 <div className="grid md:grid-cols-2 gap-0 border border-nous-border mb-8">
 <div className="p-6 border-b md:border-b-0 md:border-r border-nous-border relative overflow-hidden">
 <div className="absolute inset-0 opacity-5"style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '10px 10px' }}></div>
 <p className="text-[10px] text-nous-subtle font-mono uppercase tracking-widest mb-4 relative z-10">Current Coordinates</p>
 <div className="flex gap-4 relative z-10">
 <div className="flex-1">
 <span className="block text-4xl font-mono text-nous-text tracking-tighter">{current.density}</span>
 <span className="text-[9px] font-mono uppercase text-nous-subtle tracking-widest">Density</span>
 </div>
 <div className="flex-1">
 <span className="block text-4xl font-mono text-nous-text tracking-tighter">{current.entropy}</span>
 <span className="text-[9px] font-mono uppercase text-nous-subtle tracking-widest">Entropy</span>
 </div>
 </div>
 </div>
 <div className="p-6 relative overflow-hidden">
 <div className="absolute inset-0 opacity-5"style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '10px 10px' }}></div>
 <p className="text-[10px] text-nous-subtle font-mono uppercase tracking-widest mb-4 relative z-10">Target Coordinates</p>
 <div className="flex gap-4 relative z-10">
 <div className="flex-1">
 <span className="block text-4xl font-mono text-nous-text tracking-tighter">{target.density}</span>
 <span className="text-[9px] font-mono uppercase text-nous-subtle tracking-widest">Density</span>
 </div>
 <div className="flex-1">
 <span className="block text-4xl font-mono text-nous-text tracking-tighter">{target.entropy}</span>
 <span className="text-[9px] font-mono uppercase text-nous-subtle tracking-widest">Entropy</span>
 </div>
 </div>
 </div>
 </div>

 <div className="border border-nous-border p-6 flex items-start gap-4">
 <Zap className="text-nous-subtle shrink-0 mt-0.5"size={16} />
 <div>
 <p className="text-[10px] font-mono uppercase tracking-widest text-nous-text mb-2">Recommended Bridge: <span className="text-nous-subtle">{recommendation.treatment}</span></p>
 <p className="text-xs text-nous-subtle font-sans">{recommendation.reasoning}</p>
 </div>
 </div>
 </div>
 );
};
