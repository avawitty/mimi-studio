import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { getProfileByHandle } from '../services/firebaseUtils';
import { UserProfile } from '../types';
import { AestheticDNA } from './AestheticDNA';
import { Loader2, Share2, ShieldAlert, Award, Star, Activity } from 'lucide-react';

interface PublicDnaBadgeProps {
  handle: string;
  interactionLevel?: number;
}

export const PublicDnaBadge: React.FC<PublicDnaBadgeProps> = ({ handle, interactionLevel }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<number>(3);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const p = await getProfileByHandle(handle);
        if (p) {
          setProfile(p);
          // Determine starting interaction level if not explicitly passed
          if (interactionLevel !== undefined) {
            setSelectedLevel(interactionLevel);
          } else {
            // Compute dynamic fallback based on profile attributes
            const archetypesCount = p.aestheticDNA?.archetypes?.length || 0;
            const computedVal = archetypesCount ? Math.min(5, Math.max(1, Math.ceil(archetypesCount / 2))) : 3;
            setSelectedLevel(computedVal);
          }
        } else {
          setError('Profile not found.');
        }
      } catch (e) {
        setError('Failed to load profile.');
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [handle, interactionLevel]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center font-mono">
        <Loader2 className="animate-spin text-white/50" size={24} />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center font-mono space-y-4">
        <ShieldAlert size={32} className="text-red-500" />
        <p className="text-white/50 uppercase tracking-widest text-xs">{error || 'Identity not found.'}</p>
      </div>
    );
  }

  // Render the appropriate actualization badge graphic based on level
  const renderBadgeGraphic = (level: number) => {
    switch (level) {
      case 1:
        // Level 1: Simple geometric shape
        return (
          <div className="flex flex-col items-center justify-center p-8 border border-white/5 rounded-none bg-stone-950/40 relative group">
            <div className="absolute top-2 left-2 font-mono text-[8px] text-white/25 uppercase tracking-widest">Aesthetic Tier 01 // Seed</div>
            <motion.div
              animate={{ rotate: 45 }}
              transition={{ duration: 0 }}
              className="w-16 h-16 border border-white/30 flex items-center justify-center"
            >
              <div className="w-2 h-2 bg-white" />
            </motion.div>
            <span className="mt-4 font-mono text-[9px] uppercase tracking-[0.2em] text-white/50">Simple Geometric Monolith</span>
          </div>
        );

      case 2:
        return (
          <div className="flex flex-col items-center justify-center p-8 border border-white/5 rounded-none bg-stone-950/40 relative">
            <div className="absolute top-2 left-2 font-mono text-[8px] text-white/25 uppercase tracking-widest">Aesthetic Tier 02 // Helix Link</div>
            <div className="relative w-24 h-24 flex items-center justify-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                className="absolute w-16 h-16 border border-white/20"
              />
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
                className="absolute w-10 h-10 border border-white/40"
              />
              <div className="w-1.5 h-1.5 bg-white rounded-full" />
            </div>
            <span className="mt-4 font-mono text-[9px] uppercase tracking-[0.2em] text-white/50">Concentric Segmented Ring</span>
          </div>
        );

      case 3:
        // Level 3: Adds glowing CSS animations (animate-pulse) and layered borders
        return (
          <div className="flex flex-col items-center justify-center p-8 border border-amber-500/10 rounded-none bg-stone-950/60 relative overflow-hidden">
            <div className="absolute top-2 left-2 font-mono text-[8px] text-amber-500/55 uppercase tracking-widest flex items-center gap-1">
              <Star size={8} className="fill-amber-500 text-amber-500" />
              <span>Aesthetic Tier 03 // Harmonic</span>
            </div>
            {/* Ambient amber glow behind the badge */}
            <div className="absolute w-32 h-32 bg-amber-500/5 blur-3xl rounded-full pointer-events-none" />
            
            <div className="relative w-28 h-28 flex items-center justify-center">
              {/* Outer Layered pulsing border */}
              <motion.div 
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 border border-amber-500/20 rounded-full animate-pulse"
              />
              {/* Concentric rotating border */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                className="absolute w-20 h-20 border border-dashed border-amber-500/40 rounded-full"
              />
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                className="absolute w-14 h-14 border border-amber-500/60 rounded-full"
              />
              <div className="w-3 h-3 bg-amber-500 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.5)] animate-pulse" />
            </div>
            <span className="mt-4 font-mono text-[9px] uppercase tracking-[0.2em] text-amber-500 font-bold">Pulsing Amber Harmonic Resonance</span>
          </div>
        );

      case 4:
        return (
          <div className="flex flex-col items-center justify-center p-8 border border-amber-500/20 rounded-none bg-stone-950/70 relative overflow-hidden">
            <div className="absolute top-2 left-2 font-mono text-[8px] text-amber-500/70 uppercase tracking-widest flex items-center gap-1">
              <Star size={8} className="fill-amber-500 text-amber-500" />
              <span>Aesthetic Tier 04 // Singularity</span>
            </div>
            <div className="absolute w-40 h-40 bg-amber-500/10 blur-3xl rounded-full pointer-events-none" />
            
            <div className="relative w-32 h-32 flex items-center justify-center">
              <motion.div 
                animate={{ scale: [1, 1.08, 1], rotate: 360 }}
                transition={{ 
                  scale: { duration: 4, repeat: Infinity, ease: "easeInOut" },
                  rotate: { duration: 25, repeat: Infinity, ease: "linear" }
                }}
                className="absolute inset-0 border border-double border-amber-500/30 rounded-none"
              />
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="absolute w-20 h-20 border border-dashed border-white/40 rounded-full"
              />
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                className="absolute w-12 h-12 border border-amber-500 rounded-full animate-pulse"
              />
              <div className="w-2.5 h-2.5 bg-white rounded-full shadow-[0_0_12px_rgba(255,255,255,0.7)]" />
            </div>
            <span className="mt-4 font-mono text-[9px] uppercase tracking-[0.2em] text-amber-500/90 font-bold">Dual-Axis Latent Lattice</span>
          </div>
        );

      case 5:
      default:
        // Level 5: Complex, spinning SVG or highly stylized CSS representation of a "fully actualized" DNA thread
        return (
          <div className="flex flex-col items-center justify-center p-8 border border-amber-500/40 rounded-none bg-stone-950/80 relative overflow-hidden">
            <div className="absolute top-2 left-2 font-mono text-[8px] text-amber-400 uppercase tracking-widest flex items-center gap-1">
              <Award size={9} className="text-amber-400 animate-bounce" />
              <span>Aesthetic Tier 05 // Fully Actualized DNA</span>
            </div>
            {/* Outer neon halo and stardust gradient blur */}
            <div className="absolute w-48 h-48 bg-amber-500/15 blur-3xl rounded-full pointer-events-none animate-pulse" />
            
            <div className="relative w-36 h-36 flex items-center justify-center">
              {/* Spinning DNA Double Helix Path representation */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
                {/* Spiral Strand A */}
                <motion.path
                  d="M 20 50 Q 35 20, 50 50 T 80 50"
                  fill="none"
                  stroke="url(#amberGradient)"
                  strokeWidth="1.5"
                  strokeDasharray="4 2"
                  animate={{ strokeDashoffset: [0, -30] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                />
                {/* Spiral Strand B */}
                <motion.path
                  d="M 20 50 Q 35 80, 50 50 T 80 50"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.45)"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                  animate={{ strokeDashoffset: [0, 30] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                />
                <defs>
                  <linearGradient id="amberGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.2" />
                    <stop offset="50%" stopColor="#f59e0b" stopOpacity="1" />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity="0.4" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Advanced multi-axis vector circles */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                className="absolute w-28 h-28 border border-dashed border-amber-500/50 rounded-full"
              />
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                className="absolute w-24 h-24 border border-double border-white/20 rounded-full"
              />
              <motion.div
                animate={{ rotate: 180, scale: [0.95, 1.05, 0.95] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute w-16 h-16 border border-amber-400 rounded-full shadow-[0_0_20px_rgba(245,158,11,0.25)]"
              />

              {/* Glowing, actualized central core */}
              <div className="relative w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center shadow-[0_0_25px_rgba(245,158,11,0.9)]">
                <motion.div
                  animate={{ scale: [1, 1.8, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-0 bg-white rounded-full opacity-60"
                />
              </div>

              {/* Fast rotating outer nodes */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="absolute w-32 h-32"
              >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-amber-500" />
              </motion.div>
            </div>
            <span className="mt-4 font-mono text-[9px] uppercase tracking-[0.2em] text-amber-400 font-extrabold flex items-center gap-1.5">
              <Activity size={10} className="animate-pulse" />
              Sovereign Soul Matrix Synthesis
            </span>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 font-mono selection:bg-white/30">
      <div className="w-full max-w-2xl space-y-12">
        <header className="text-center space-y-4">
          <h1 className="text-4xl md:text-6xl font-serif italic tracking-tighter">@{profile.handle}</h1>
          <p className="text-xs text-white/50 uppercase tracking-[0.3em]">Aesthetic DNA Registry</p>
        </header>

        {/* Evolving Actualization Badge Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <span className="text-[10px] uppercase tracking-widest text-white/40">Actualization Progress Tracker</span>
            <span className="text-[10px] uppercase tracking-widest text-amber-500 font-bold">Tier {selectedLevel} of 5</span>
          </div>
          
          {renderBadgeGraphic(selectedLevel)}

          {/* Selector controls for previewing the evolution tiers */}
          <div className="flex items-center justify-center gap-2 pt-2">
            <span className="text-[8px] uppercase tracking-wider text-white/30 mr-2">Evolve Badge:</span>
            {[1, 2, 3, 4, 5].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setSelectedLevel(lvl)}
                className={`w-6 h-6 flex items-center justify-center font-mono text-[9px] border transition-all ${
                  selectedLevel === lvl
                    ? 'bg-amber-500 text-black border-amber-500 font-bold'
                    : 'border-white/10 text-white/60 hover:bg-white/5 hover:border-white/30'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        {profile.aestheticDNA ? (
          <div className="bg-[#0A0A0A] border border-white/10 p-8">
            <AestheticDNA dna={profile.aestheticDNA} />
          </div>
        ) : (
          <div className="text-center p-12 border border-white/10 border-dashed">
            <p className="text-white/50 italic font-serif">DNA sequence not yet synthesized.</p>
          </div>
        )}

        <footer className="flex justify-center">
          <button 
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              alert('DNA Link Copied');
            }}
            className="flex items-center gap-2 px-6 py-3 border border-white/20 hover:bg-white/5 transition-colors text-xs uppercase tracking-widest"
          >
            <Share2 size={14} />
            Copy DNA Link
          </button>
        </footer>
      </div>
    </div>
  );
};

