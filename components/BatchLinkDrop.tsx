import React, { useState } from 'react';
import { motion } from 'motion/react';
import { LinkIcon, Loader2, X, Activity } from 'lucide-react';
import { calculateAestheticTrajectory } from '../services/geminiService';
import { PocketItem, AestheticTrajectory } from '../types';
import { useUser } from '../contexts/UserContext';

export const BatchLinkDrop: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [links, setLinks] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [trajectory, setTrajectory] = useState<AestheticTrajectory | null>(null);
  const { user } = useUser();

  const handleAnalyze = async () => {
    const urls = links.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (urls.length === 0) return;

    setIsAnalyzing(true);
    
    // Create dummy PocketItems for the engine
    const dummyItems: PocketItem[] = urls.map((url, i) => ({
      id: `dummy-${i}`,
      userId: user?.uid || 'ghost',
      type: 'link',
      timestamp: Date.now(),
      savedAt: Date.now(),
      title: url,
      source: 'batch_drop',
      content: { url }
    }));

    try {
      const result = await calculateAestheticTrajectory(dummyItems);
      setTrajectory(result);
    } catch (error) {
      console.error("Failed to calculate trajectory:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full bg-nous-base border-b border-nous-border p-8"
    >
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="font-serif text-3xl italic text-nous-text">Batch Link Drop</h2>
            <p className="font-sans text-[10px] uppercase tracking-widest text-nous-subtle font-black mt-2">
              Future Self Trajectory Engine
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-nous-subtle hover:text-nous-text transition-colors">
            <X size={20} />
          </button>
        </div>

        {!trajectory ? (
          <div className="space-y-4">
            <textarea
              value={links}
              onChange={(e) => setLinks(e.target.value)}
              placeholder="Paste 5-10 links here (one per line)..."
              className="w-full h-48 bg-white border border-nous-border p-4 font-mono text-xs focus:outline-none focus:border-stone-500 resize-none"
            />
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || links.trim().length === 0}
              className="w-full py-4 bg-nous-base0 text-white font-sans text-[10px] uppercase tracking-widest font-black hover:bg-stone-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <Activity size={16} />}
              {isAnalyzing ? 'Calculating Trajectory...' : 'Analyze Trajectory'}
            </button>
          </div>
        ) : (
          <div className="space-y-6 bg-white p-6 border border-nous-border">
            <div className="flex items-center gap-3 border-b border-nous-border pb-4">
              <Activity size={20} className="text-nous-subtle" />
              <h3 className="font-sans text-xs uppercase tracking-widest font-black">Aesthetic Trajectory</h3>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <span className="font-sans text-[9px] uppercase tracking-widest text-nous-subtle font-black">User Momentum</span>
                <p className="font-serif italic text-lg">{trajectory.userMomentum}</p>
              </div>
              <div className="space-y-2">
                <span className="font-sans text-[9px] uppercase tracking-widest text-nous-subtle font-black">Predicted Shift</span>
                <p className="font-serif italic text-lg">{trajectory.predictedAestheticShift}</p>
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t border-nous-border">
              <span className="font-sans text-[9px] uppercase tracking-widest text-nous-subtle font-black">Psychological Observation</span>
              <p className="font-sans text-sm text-nous-subtle leading-relaxed">{trajectory.psychologicalObservation}</p>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-nous-border">
              <div className="space-y-1">
                <span className="font-sans text-[9px] uppercase tracking-widest text-nous-subtle font-black">Trajectory Label</span>
                <p className="font-mono text-xs uppercase font-bold">{trajectory.trajectoryLabel}</p>
              </div>
              <div className="space-y-1 text-right">
                <span className="font-sans text-[9px] uppercase tracking-widest text-nous-subtle font-black">Confidence</span>
                <p className="font-mono text-xs font-bold">{(trajectory.confidence * 100).toFixed(0)}%</p>
              </div>
            </div>
            
            <button 
              onClick={() => { setTrajectory(null); setLinks(''); }}
              className="w-full py-3 border border-nous-border font-sans text-[10px] uppercase tracking-widest font-black hover:bg-nous-base transition-colors"
            >
              Reset Engine
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};
