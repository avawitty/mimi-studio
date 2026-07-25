import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Check } from 'lucide-react';

interface EntropyDensityMatrixProps {
 initialDensity: number;
 initialEntropy: number;
 userDensity?: number;
 userEntropy?: number;
 readOnly?: boolean;
 onCalibrate?: (density: number, entropy: number) => void;
}

export const EntropyDensityMatrix: React.FC<EntropyDensityMatrixProps> = ({
 initialDensity,
 initialEntropy,
 userDensity,
 userEntropy,
 readOnly = false,
 onCalibrate
}) => {
 const [density, setDensity] = useState(initialDensity);
 const [entropy, setEntropy] = useState(initialEntropy);
 const [isDragging, setIsDragging] = useState(false);
 const [hasChanged, setHasChanged] = useState(false);
 const containerRef = useRef<HTMLDivElement>(null);

 // Update state if props change
 useEffect(() => {
 setDensity(initialDensity);
 setEntropy(initialEntropy);
 setHasChanged(false);
 }, [initialDensity, initialEntropy]);

 const handlePointerDown = (e: React.PointerEvent) => {
 if (readOnly) return;
 setIsDragging(true);
 updatePosition(e);
 };

 const handlePointerMove = (e: React.PointerEvent) => {
 if (!isDragging || readOnly) return;
 updatePosition(e);
 };

 const handlePointerUp = () => {
 setIsDragging(false);
 };

 const updatePosition = (e: React.PointerEvent) => {
 if (!containerRef.current) return;
 const rect = containerRef.current.getBoundingClientRect();
 let x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
 let y = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height)); // Invert Y so 10 is top

 const newDensity = Number((x * 10).toFixed(1));
 const newEntropy = Number((y * 10).toFixed(1));

 setDensity(newDensity);
 setEntropy(newEntropy);
 setHasChanged(newDensity !== initialDensity || newEntropy !== initialEntropy);
 };

 const handleSave = () => {
 if (onCalibrate) {
 onCalibrate(density, entropy);
 setHasChanged(false);
 }
 };

 return (
 <div className="flex flex-col items-center w-full">
 <div 
 ref={containerRef}
 className={`relative w-full aspect-square max-w-[300px] bg-nous-base dark:bg border border-nous-border rounded-none overflow-hidden ${readOnly ? '' : 'cursor-crosshair touch-none'}`}
 onPointerDown={handlePointerDown}
 onPointerMove={handlePointerMove}
 onPointerUp={handlePointerUp}
 onPointerLeave={handlePointerUp}
 >
 {/* Grid Lines */}
 <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 pointer-events-none">
 <div className="border-r border-b border-nous-border"></div>
 <div className="border-b border-nous-border"></div>
 <div className="border-r border-nous-border"></div>
 <div></div>
 </div>

 {/* Labels */}
 <span className="absolute top-2 left-1/2 -translate-x-1/2 text-[8px] uppercase tracking-widest text-nous-subtle font-mono pointer-events-none">Chaos (High Entropy)</span>
 <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[8px] uppercase tracking-widest text-nous-subtle font-mono pointer-events-none">Order (Low Entropy)</span>
 <span className="absolute left-2 top-1/2 -translate-y-1/2 -rotate-90 text-[8px] uppercase tracking-widest text-nous-subtle font-mono pointer-events-none origin-center whitespace-nowrap">Minimal (Low Density)</span>
 <span className="absolute right-2 top-1/2 -translate-y-1/2 rotate-90 text-[8px] uppercase tracking-widest text-nous-subtle font-mono pointer-events-none origin-center whitespace-nowrap">Maximal (High Density)</span>

 {/* User Baseline Zone */}
 {userDensity !== undefined && userEntropy !== undefined && (
 <div 
 className="absolute w-16 h-16 -ml-8 -mb-8 rounded-none bg-nous-base0/5 border border-nous-border/20 pointer-events-none flex items-center justify-center"
 style={{ left: `${(userDensity / 10) * 100}%`, bottom: `${(userEntropy / 10) * 100}%` }}
 >
 <div className="w-1 h-1 rounded-none bg-nous-base0/50"></div>
 </div>
 )}

 {/* Artifact Node */}
 <motion.div 
 className="absolute w-4 h-4 -ml-2 -mb-2 rounded-none bg-[var(--hover-accent)] pointer-events-none z-10"
 animate={{ left: `${(density / 10) * 100}%`, bottom: `${(entropy / 10) * 100}%` }}
 transition={{ type:"spring", stiffness: 300, damping: 25 }}
 />
 </div>

 {/* Controls & Readout */}
 <div className="mt-4 flex flex-col items-center w-full max-w-[300px]">
 <div className="flex justify-between w-full text-xs font-mono text-nous-subtle mb-2">
 <span>Density: {density.toFixed(1)}</span>
 <span>Entropy: {entropy.toFixed(1)}</span>
 </div>
 
 {!readOnly && hasChanged && (
 <button 
 onClick={handleSave}
 className="flex items-center gap-2 px-4 py-2 bg-[var(--hover-accent)] text-white text-[10px] font-bold uppercase tracking-widest rounded-none hover:opacity-90 transition-opacity mt-2"
 >
 <Check size={12} /> Calibrate Neural Weight
 </button>
 )}
 
 {!readOnly && !hasChanged && (
 <p className="text-[9px] text-nous-subtle uppercase tracking-widest text-center mt-2">
 Drag node to correct AI perception
 </p>
 )}
 </div>
 </div>
 );
};
