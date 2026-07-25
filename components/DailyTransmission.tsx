
// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Volume2, Loader2, Sparkles, X, WifiOff, Radio, Moon, Terminal, Info, Cat, Waves, Heart, ShieldAlert } from 'lucide-react';
import { generateAudio } from '../services/geminiService';
import { useTheme } from '../contexts/ThemeContext';

const FALLBACK_EDICTS = [
"The universe isn’t ghosting you; it’s just waiting for a higher resolution version of the request.",
"Treat your self-doubt like last season’s footwear: acknowledged, then archived indefinitely.",
"Intelligence is the ultimate accessory. Wear it with a slight pout and a heavy heart.",
"Your vibes are currently in post-production. Trust the edit.",
"The void is actually just an empty gallery waiting for your solo show. Hang the first piece.",
"The simulation is glitching because your intent is too sharp. Soften the edges and proceed.",
"Every delay is just a chance for better lighting. Wait for the glow-up.",
"The architect of your reality is currently on a lunch break. Be patient with the construction.",
"Beauty is a form of intelligence that the pedestrian mind simply cannot parse. Keep them guessing."
];

export const DailyTransmission: React.FC = () => {
 const { currentPalette } = useTheme();
 const [isPlaying, setIsPlaying] = useState(false);
 const [isLoading, setIsLoading] = useState(false);
 const [isTired, setIsTired] = useState(false);
 const [activeEdict, setActiveEdict] = useState<{message: string, isWarning: boolean, timestamp: number} | null>(null);
 const [lastTrace, setLastTrace] = useState<{ code: string, message: string } | null>(null);
 
 const audioCtxRef = useRef<AudioContext | null>(null);
 const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

 useEffect(() => {
 const handleSystemEdict = (e: any) => {
 setActiveEdict(e.detail);
 setIsTired(false);
 };
 window.addEventListener('mimi:system_edict', handleSystemEdict);
 return () => {
 window.removeEventListener('mimi:system_edict', handleSystemEdict);
 if (sourceNodeRef.current) { try { sourceNodeRef.current.stop(); } catch(e) {} }
 };
 }, []);

 const decodePCM = (ctx: AudioContext, data: Uint8Array): AudioBuffer => {
 // Ensure we have an even number of bytes for 16-bit PCM
 const length = Math.floor(data.byteLength / 2);
 const dataInt16 = new Int16Array(data.buffer, data.byteOffset, length);
 const audioBuffer = ctx.createBuffer(1, length, 24000);
 const channelData = audioBuffer.getChannelData(0);
 for (let i = 0; i < length; i++) { 
 channelData[i] = dataInt16[i] / 32768.0; 
 }
 return audioBuffer;
 };

 const playTransmission = async (overrideText?: string) => {
 if (isPlaying) { 
 if (sourceNodeRef.current) { try { sourceNodeRef.current.stop(); } catch(e) {} } 
 setIsPlaying(false); 
 return; 
 }
 
 setIsLoading(true);
 setIsTired(false);
 setLastTrace(null);
 
 try {
 const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
 
 // Recreate context if it's closed or not present
 if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
 audioCtxRef.current = new AudioContextClass();
 }
 
 if (audioCtxRef.current.state === 'suspended') {
 await audioCtxRef.current.resume();
 }
 
 const baseText = overrideText || activeEdict?.message || FALLBACK_EDICTS[Math.floor(Math.random() * FALLBACK_EDICTS.length)];
 const bytes = await generateAudio(baseText);

 // Check if it's a standard format (WAV/MP3) or raw PCM
 let buffer: AudioBuffer;
 
 // Simple check for RIFF header (WAV)
 if (bytes[0] === 82 && bytes[1] === 73 && bytes[2] === 70 && bytes[3] === 70) {
 buffer = await audioCtxRef.current.decodeAudioData(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
 } else {
 // Fallback to raw 16-bit PCM 24kHz
 buffer = decodePCM(audioCtxRef.current, bytes);
 }

 const source = audioCtxRef.current.createBufferSource();
 source.buffer = buffer;
 source.connect(audioCtxRef.current.destination);
 source.onended = () => setIsPlaying(false);
 source.start(0);
 sourceNodeRef.current = source;
 setIsPlaying(true);
 } catch (err: any) { 
 console.error("MIMI // Signal Drift:", err);
 setIsPlaying(false);
 setIsTired(true);
 setLastTrace({ code: err.code || 'SIGNAL_DRIFT', message: err.message });
 
 // Emit specific registry alert for 500s or quota errors
 if (err.message?.includes('500') || err.message?.includes('internal')) {
 window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
 detail: { message:"Oracle Drift detected. Retrying handshake...", icon: <ShieldAlert size={14} className="text-amber-500"/> } 
 }));
 } else if (err.message?.includes('overloaded') || err.code === 'QUOTA_EXCEEDED') {
 window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
 detail: { message:"Oracle Overloaded. Frequency too high.", icon: <ShieldAlert size={14} className="text-red-500"/> } 
 }));
 }
 
 setTimeout(() => setIsTired(false), 8000);
 } finally { 
 setIsLoading(false); 
 }
 };

 return (
 <div className="flex flex-col items-center justify-center gap-4 mb-4 w-full transition-all duration-700">
 <div className="relative flex items-center justify-center">
 <AnimatePresence>
 {(activeEdict || isPlaying || isTired) && (
 <motion.div 
 initial={{ scale: 0.8, opacity: 0 }}
 animate={{ 
 scale: isPlaying ? [1.1, 1.4, 1.1] : 1.1, 
 opacity: 1 
 }}
 transition={isPlaying ? { repeat: Infinity, duration: 1.5, ease:"easeInOut"} : {}}
 exit={{ scale: 1.5, opacity: 0 }}
 className={`absolute inset-0 rounded-none blur-2xl pointer-events-none transition-colors duration-1000 ${isPlaying ? 'bg-stone-400/30' : isTired ? 'bg-red-400/20' : 'bg-stone-400/10'}`}
 />
 )}
 </AnimatePresence>
 
 <div className="flex flex-col items-center gap-2">
 <motion.button 
 whileTap={{ scale: 0.95 }}
 onClick={() => playTransmission()}
 className={`relative z-10 flex items-center gap-3 px-8 py-3 bg-white/70 /70 backdrop-blur-3xl border border-black/5 rounded-none group transition-all ${isPlaying ? 'ring-2 ring-stone-500/40' : isTired ? 'ring-2 ring-red-500/20' : ''}`}
 >
 {isLoading ? (
 <Loader2 size={12} className="animate-spin text-nous-subtle"/>
 ) : isTired ? (
 <Moon size={12} className="text-red-400 animate-pulse"/>
 ) : (
 <div className={`w-2 h-2 rounded-none transition-all duration-500 ${isPlaying ? 'bg-nous-base0 animate-pulse scale-150' : activeEdict ? 'bg-stone-400' : 'bg-stone-300'}`} />
 )}
 <span className="font-sans text-[8px] md:text-[10px] uppercase tracking-[0.4em] font-black text-nous-subtle">
 {isLoading ? 'Calibrating' : isPlaying ? 'Transmitting' : isTired ? 'Model Dissonance' : 'Manifestation'}
 </span>
 {isPlaying ? (
 <X size={12} className="text-nous-subtle hover:text-red-500 transition-colors"/>
 ) : (
 <div className="flex items-center gap-2">
 <Heart size={10} className="text-nous-text opacity-20 group-hover:opacity-100 transition-opacity"/>
 <Sparkles size={12} className={`text-nous-subtle group-hover:text-nous-subtle transition-colors ${activeEdict && !isTired ? 'animate-pulse text-nous-subtle' : ''}`} />
 </div>
 )}
 </motion.button>
 </div>
 </div>

 <AnimatePresence>
 {(isPlaying || isTired) && (
 <motion.div 
 initial={{ opacity: 0, y: 5 }} 
 animate={{ opacity: 1, y: 0 }} 
 exit={{ opacity: 0 }}
 className="flex flex-col items-center gap-2"
 >
 <p className="font-serif italic text-xs md:text-sm text-nous-subtle text-center max-w-xs md:max-w-md px-6 leading-tight">
 {isTired ?"The scotopic signal suffered a structural internal error. Distill the request and retry.": `“${activeEdict?.message ||"Mimi is co-authoring with you."}”`}
 </p>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 );
};
