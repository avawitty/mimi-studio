import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, Shield, Cpu, RefreshCw, Eye, HelpCircle, 
  Layers, Sliders, Play, Lock, ToggleLeft, ToggleRight,
  Heart, Zap, User, Target, Compass
} from "lucide-react";
import type { Doll } from "../../types";

interface DollHouseDressingRoomProps {
  doll: Doll;
  equippedIds: string[];
  onEquipToggle: (id: string) => void;
  isDollState: boolean;
  onToggleState: (state: boolean) => void;
}

// Sockets available on the Doll Chassis
interface Socket {
  id: string;
  name: string;
  type: "Ocular" | "Neck" | "Spine" | "Crest" | "Cuff";
  coordinates: { x: number; y: number }; // Percentage position on mannequin
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const CHASSIS_SOCKETS: Socket[] = [
  { id: "s_ocular", name: "Ocular Neural Scribe", type: "Ocular", coordinates: { x: 50, y: 15 }, icon: Eye },
  { id: "s_neck", name: "Subconscious Lace Collar", type: "Neck", coordinates: { x: 50, y: 28 }, icon: Target },
  { id: "s_crest", name: "Alchemical Crest", type: "Crest", coordinates: { x: 50, y: 45 }, icon: Compass },
  { id: "s_spine", name: "Brocade Spine Conduit", type: "Spine", coordinates: { x: 32, y: 55 }, icon: Layers },
  { id: "s_cuff", name: "Algorithmic Cuff", type: "Cuff", coordinates: { x: 68, y: 65 }, icon: Cpu },
];

export const DollHouseDressingRoom: React.FC<DollHouseDressingRoomProps> = ({
  doll,
  equippedIds,
  onEquipToggle,
  isDollState,
  onToggleState,
}) => {
  const [transductionActive, setTransductionActive] = useState(false);
  const [transductionProgress, setTransductionProgress] = useState(0);
  const [selectedSocket, setSelectedSocket] = useState<Socket | null>(null);
  
  // States for digital construct shift distortion
  const [filterScale, setFilterScale] = useState(0);
  const [chromaticOffset, setChromaticOffset] = useState(0);
  const [isConstructShifting, setIsConstructShifting] = useState(false);

  useEffect(() => {
    // Sync with state transduction and state switches
    setIsConstructShifting(true);
    setFilterScale(40);
    setChromaticOffset(6);
    
    const t1 = setTimeout(() => {
      setFilterScale(15);
      setChromaticOffset(-3);
    }, 150);
    
    const t2 = setTimeout(() => {
      setFilterScale(25);
      setChromaticOffset(4);
    }, 300);

    const t3 = setTimeout(() => {
      setFilterScale(0);
      setChromaticOffset(0);
      setIsConstructShifting(false);
    }, 500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isDollState]);
  
  // Create beautiful aesthetic tokens from the doll's visual language and motifs
  const aestheticTokens = React.useMemo(() => {
    const tokens = [];
    const langs = doll.visualLanguage || [];
    const motifs = doll.motifs || [];

    // Map languages to types of tokens
    langs.forEach((lang, i) => {
      const socketTypes: ("Ocular" | "Neck" | "Spine" | "Crest" | "Cuff")[] = ["Ocular", "Spine", "Cuff"];
      const socketType = socketTypes[i % socketTypes.length];
      tokens.push({
        id: `tok_lang_${i}`,
        name: `${lang} Filament`,
        category: "Visual Shard",
        socketType,
        description: `Refracts the raw visual tone of ${lang} into logical computational threads.`,
        resonance: "+35% Semiotic Clarity",
      });
    });

    // Map motifs to types of tokens
    motifs.forEach((motif, i) => {
      const socketTypes: ("Ocular" | "Neck" | "Spine" | "Crest" | "Cuff")[] = ["Neck", "Crest", "Spine"];
      const socketType = socketTypes[i % socketTypes.length];
      tokens.push({
        id: `tok_motif_${i}`,
        name: `Aura of ${motif}`,
        category: "Symbolic Motif",
        socketType,
        description: `Embeds the recurring motif of ${motif} as a cognitive reinforcement pattern.`,
        resonance: "+45% Cult Devotion",
      });
    });

    // If no tokens generated, provide beautiful default tokens matching the theme
    if (tokens.length === 0) {
      tokens.push(
        {
          id: "tok_def_1",
          name: "Silicon Brocade Lace",
          category: "Aesthetic Token",
          socketType: "Neck" as const,
          description: "Woven metallic micro-fibers channeling conditioning telemetry.",
          resonance: "+30% Style Aura",
        },
        {
          id: "tok_def_2",
          name: "Fisheye Telemetry Lens",
          category: "Aesthetic Token",
          socketType: "Ocular" as const,
          description: "Curved optical prism that maps raw subconscious inputs.",
          resonance: "+40% Intellectual Taut",
        }
      );
    }

    return tokens;
  }, [doll.visualLanguage, doll.motifs]);

  const handleTransduction = () => {
    setTransductionActive(true);
    setTransductionProgress(0);
    
    // Play custom transition sound if handler is attached
    window.dispatchEvent(new CustomEvent("mimi:sound", { detail: { type: "transition" } }));

    const interval = setInterval(() => {
      setTransductionProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            onToggleState(!isDollState);
            setTransductionActive(false);
          }, 400);
          return 100;
        }
        return prev + 5;
      });
    }, 40);
  };

  // Find equipped token for a specific socket
  const getEquippedTokenInSocket = (socket: Socket) => {
    const matches = aestheticTokens.filter(t => t.socketType === socket.type);
    return matches.find(m => equippedIds.includes(m.id)) || null;
  };

  return (
    <div className="border border-stone-200 dark:border-stone-850 p-6 bg-stone-50 dark:bg-[#0B0A09] relative shadow-lg">
      
      {/* State Transduction HUD Bar */}
      <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-4 mb-6">
        <div>
          <h2 className="font-serif italic text-lg text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <Layers className="text-amber-500 animate-pulse" size={16} />
            Doll House Dressing Room
          </h2>
          <p className="text-[10px] font-mono uppercase text-stone-500">
            Current State: {isDollState ? (
              <span className="text-amber-500 font-bold">DE-INDIVIDUATED DOLL</span>
            ) : (
              <span className="text-emerald-500 font-bold">ORGANIC HUMAN</span>
            )}
          </p>
        </div>

        {/* State transduction trigger */}
        <button
          onClick={handleTransduction}
          disabled={transductionActive}
          className={`px-4 py-2 text-[9px] uppercase tracking-widest font-mono font-bold border transition-all flex items-center gap-2 ${
            isDollState 
              ? "border-emerald-600/50 hover:bg-emerald-500/10 text-emerald-500" 
              : "border-amber-500/50 hover:bg-amber-500/10 text-amber-500"
          }`}
        >
          <RefreshCw size={10} className={transductionActive ? "animate-spin" : ""} />
          TRANSDUCE STATE TO {isDollState ? "HUMAN" : "DOLL"}
        </button>
      </div>

      {/* Transduction Progress Overlay */}
      <AnimatePresence>
        {transductionActive && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-stone-950/95 z-50 flex flex-col items-center justify-center p-10 text-center"
          >
            <div className="max-w-md space-y-6">
              {/* Spinning alchemical geometric ornament */}
              <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                  className="absolute inset-0 border border-amber-500/40 rounded-full border-t-amber-500"
                />
                <motion.div 
                  animate={{ rotate: -360 }}
                  transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
                  className="absolute inset-2 border border-dashed border-stone-600 rounded-full"
                />
                <Cpu className="text-amber-500 animate-pulse" size={24} />
              </div>

              <div className="space-y-2">
                <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-amber-500 block">
                  Cellular Transduction active
                </span>
                <p className="font-serif italic text-sm text-stone-300">
                  {isDollState 
                    ? "Restoring organic heart rhythm and individual memory partitions..."
                    : "Injecting aesthetic subliminal blueprint. Ego-decoupling initiated..."
                  }
                </p>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1 w-64 mx-auto">
                <div className="h-1 w-full bg-stone-800 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-amber-500"
                    style={{ width: `${transductionProgress}%` }}
                  />
                </div>
                <div className="flex justify-between text-[8px] font-mono text-stone-500 uppercase">
                  <span>Partitions</span>
                  <span>{transductionProgress}%</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Grid: Mannequin vs Token Sockets */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* Inline SVG filter for Dressing Room digital distortion */}
        <svg className="absolute w-0 h-0 pointer-events-none" width="0" height="0">
          <defs>
            <filter id="mimi-dressing-room-shift">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.12 0.85"
                numOctaves="2"
                result="noise"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="noise"
                scale={filterScale}
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
          </defs>
        </svg>

        {/* Left/Center: Mannequin Chassis Visualizer (7 columns) */}
        <motion.div 
          layout
          layoutId={`mimi-mannequin-container-${doll.id}`}
          className="lg:col-span-6 border border-stone-200 dark:border-stone-850 bg-stone-100/50 dark:bg-stone-950/60 p-4 rounded-sm relative aspect-[3/4] flex items-center justify-center overflow-hidden"
          style={{
            filter: filterScale > 0 ? "url(#mimi-dressing-room-shift)" : "none"
          }}
        >
          
          {/* Futuristic Cybernetic Blueprint Grid */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.05)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />
          
          {/* Subliminal circular orbits */}
          <div className="absolute w-80 h-80 rounded-full border border-dashed border-stone-200 dark:border-stone-800/40 animate-[spin_60s_linear_infinite]" />
          <div className="absolute w-60 h-60 rounded-full border border-stone-200 dark:border-stone-800/20" />

          {/* Mannequin Silhouette */}
          <div className="relative w-48 h-full flex flex-col items-center justify-center opacity-85">
            {/* Silhouette outline using SVG */}
            <svg viewBox="0 0 100 150" className="w-full h-full text-stone-300 dark:text-stone-800/60 fill-current">
              <path d="M50,15 C54,15 57,18 57,22 C57,26 54,29 50,29 C46,29 43,26 43,22 C43,18 46,15 50,15 Z M50,30 L50,33 C42,35 34,42 34,55 L32,85 C32,90 35,93 39,93 L43,93 L41,135 C41,139 44,142 48,142 L52,142 C56,142 59,139 59,135 L57,93 L61,93 C65,93 68,90 68,85 L66,55 C66,42 58,35 50,30 Z" />
            </svg>

            {/* Glowing active wire lines linking sockets to core */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none stroke-current text-amber-500/25" viewBox="0 0 100 150" fill="none">
              {CHASSIS_SOCKETS.map((s) => {
                const isEquipped = !!getEquippedTokenInSocket(s);
                if (!isEquipped) return null;
                return (
                  <path 
                    key={`wire-${s.id}`} 
                    d={`M 50 65 L ${s.coordinates.x} ${s.coordinates.y}`} 
                    strokeDasharray="2,3" 
                    className="animate-[dash_2s_linear_infinite]"
                  />
                );
              })}
            </svg>
          </div>

          {/* Render Sockets as interactive points */}
          {CHASSIS_SOCKETS.map((socket) => {
            const equippedToken = getEquippedTokenInSocket(socket);
            const isSelected = selectedSocket?.id === socket.id;
            const Icon = socket.icon;

            return (
              <button
                key={socket.id}
                onClick={() => {
                  window.dispatchEvent(new CustomEvent("mimi:sound", { detail: { type: "click" } }));
                  setSelectedSocket(isSelected ? null : socket);
                }}
                className="absolute group z-10 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
                style={{ left: `${socket.coordinates.x}%`, top: `${socket.coordinates.y}%` }}
              >
                {/* Outer Ring */}
                <span className={`absolute rounded-full transition-all duration-300 ${
                  equippedToken 
                    ? "w-8 h-8 bg-amber-500/10 border border-amber-500 animate-pulse" 
                    : "w-6 h-6 border border-stone-400 dark:border-stone-700 hover:border-amber-500/50"
                } ${isSelected ? "ring-2 ring-amber-500/80 w-9 h-9" : ""}`} />

                {/* Inner Icon */}
                <span className={`p-1.5 rounded-full relative z-10 transition-colors ${
                  equippedToken ? "text-amber-500" : "text-stone-400 dark:text-stone-500 hover:text-amber-500"
                }`}>
                  <Icon size={12} />
                </span>

                {/* Micro Label tooltip */}
                <div className="absolute top-8 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity bg-stone-900 border border-stone-800 text-stone-100 text-[7px] uppercase tracking-widest px-1.5 py-0.5 whitespace-nowrap z-30">
                  {socket.name} {equippedToken ? `(${equippedToken.name})` : "(EMPTY)"}
                </div>
              </button>
            );
          })}

          {/* Live Bio-Telemetrics Readings Layer */}
          <div className="absolute bottom-4 left-4 font-mono text-[7px] text-stone-500 dark:text-stone-400 space-y-1 bg-stone-50/70 dark:bg-stone-900/40 p-2 border border-stone-200 dark:border-stone-850 rounded-sm">
            {isDollState ? (
              <>
                <p className="text-amber-500 font-bold">STATE: COGNITIVE PARTITIONED</p>
                <p>LACE TENSION: 94.2% (TAUT)</p>
                <p>SUBLIMINAL INTAKE: 480bps</p>
                <p>DEVOTION SEED: #0A7F</p>
              </>
            ) : (
              <>
                <p className="text-emerald-500 font-bold">STATE: BIOLOGICAL INDIVIDUAL</p>
                <p>HEART RATE: 72 BPM</p>
                <p>CORTISOL INDEX: STABLE</p>
                <p>COGNITIVE NOISE: 12%</p>
              </>
            )}
          </div>
        </motion.div>

        {/* Right Panel: Sockets Config & Aesthetic Tokens (6 columns) */}
        <div className="lg:col-span-6 space-y-6">
          
          {/* Socket Detail Module */}
          <AnimatePresence mode="wait">
            {selectedSocket ? (
              <motion.div
                key={selectedSocket.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="border border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/5 p-4 rounded-sm space-y-3"
              >
                <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="p-1 bg-amber-500/10 text-amber-500 rounded-sm">
                      {React.createElement(selectedSocket.icon, { size: 14 })}
                    </span>
                    <span className="font-mono text-[9px] uppercase tracking-widest text-amber-600 dark:text-amber-500 font-black">
                      Socket // {selectedSocket.name}
                    </span>
                  </div>
                  <button 
                    onClick={() => setSelectedSocket(null)}
                    className="text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 font-mono text-[9px] uppercase tracking-wider"
                  >
                    Close
                  </button>
                </div>

                <div className="text-[10px] text-stone-500 dark:text-stone-400">
                  Select an aesthetic token matching the <span className="font-bold text-stone-800 dark:text-stone-200">"{selectedSocket.type}"</span> frequency to dress this chassis channel.
                </div>

                {/* Tokens filterable by selected socket type */}
                <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">
                  {aestheticTokens
                    .filter((t) => t.socketType === selectedSocket.type)
                    .map((token) => {
                      const isEquipped = equippedIds.includes(token.id);
                      return (
                        <div
                          key={token.id}
                          onClick={() => onEquipToggle(token.id)}
                          className={`p-3 border rounded-sm cursor-pointer transition-all flex items-center justify-between ${
                            isEquipped 
                              ? "border-amber-500 bg-amber-500/10" 
                              : "border-stone-200 dark:border-stone-800 hover:border-amber-500/40 bg-stone-100/40 dark:bg-stone-900/20"
                          }`}
                        >
                          <div>
                            <div className="font-serif italic text-xs text-stone-800 dark:text-stone-200">
                              {token.name}
                            </div>
                            <div className="text-[9px] text-stone-500 leading-normal mt-0.5">
                              {token.description}
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-end gap-1 shrink-0 ml-3">
                            <span className="font-mono text-[7px] uppercase text-amber-500 font-bold">
                              {token.resonance}
                            </span>
                            <span className={`px-2 py-0.5 text-[7px] uppercase font-mono font-bold ${
                              isEquipped ? "bg-amber-500 text-stone-950" : "bg-stone-200 dark:bg-stone-800 text-stone-500"
                            }`}>
                              {isEquipped ? "EQUIPPED" : "SLOT"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  
                  {aestheticTokens.filter((t) => t.socketType === selectedSocket.type).length === 0 && (
                    <div className="text-center py-4 text-[10px] text-stone-500 italic">
                      No matching aesthetic tokens found. Go to Genomic Blueprint or create another Zine to compile more tokens!
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <div className="border border-dashed border-stone-200 dark:border-stone-800 p-8 text-center space-y-2 rounded-sm bg-stone-100/10 dark:bg-stone-950/5">
                <Sliders size={16} className="mx-auto text-stone-400" />
                <p className="font-serif text-xs italic text-stone-600 dark:text-stone-400">
                  Select a chassis socket on the avatar mannequin to inject and equip aesthetic tokens.
                </p>
              </div>
            )}
          </AnimatePresence>

          {/* Aesthetic Tokens Inventory */}
          <div className="space-y-3">
            <span className="font-mono text-[9px] uppercase tracking-widest text-stone-400 font-bold block">
              Generated Aesthetic Shards & Tokens Inventory
            </span>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-56 overflow-y-auto no-scrollbar">
              {aestheticTokens.map((token) => {
                const isEquipped = equippedIds.includes(token.id);
                return (
                  <div
                    key={token.id}
                    onClick={() => {
                      // Find matching socket and select it
                      const matchingSocket = CHASSIS_SOCKETS.find(s => s.type === token.socketType);
                      if (matchingSocket) setSelectedSocket(matchingSocket);
                    }}
                    className={`p-3 border cursor-pointer transition-all flex flex-col justify-between rounded-sm ${
                      isEquipped 
                        ? "border-amber-500 bg-amber-500/5" 
                        : "border-stone-200 dark:border-stone-850 hover:border-stone-400 dark:hover:border-stone-700 bg-stone-100/20 dark:bg-stone-900/10"
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-center text-[7px] font-mono mb-1">
                        <span className="text-stone-400 uppercase">{token.category}</span>
                        <span className="text-amber-500 font-bold">{token.socketType} Socket</span>
                      </div>
                      <h4 className="font-serif italic text-xs text-stone-900 dark:text-stone-100">
                        {token.name}
                      </h4>
                      <p className="text-[9px] text-stone-500 leading-normal mt-1 truncate">
                        {token.description}
                      </p>
                    </div>

                    <div className="border-t border-stone-200/50 dark:border-stone-800/20 pt-2 mt-2 flex items-center justify-between text-[7px] font-mono">
                      <span className="text-stone-400">{token.resonance}</span>
                      <span className={isEquipped ? "text-amber-500 font-black" : "text-stone-500"}>
                        {isEquipped ? "● SLOTTED" : "○ READY"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
