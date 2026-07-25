import React, { useState, useEffect, useRef } from 'react';
import { Thimble } from './Thimble';
import { AestheticVisualizer } from './AestheticVisualizer';

export const LatentTelemetry: React.FC = () => {
 const [isListening, setIsListening] = useState(false);
 const [errorMsg, setErrorMsg] = useState<string | null>(null);
 const audioCtxRef = useRef<AudioContext | null>(null);
 const analyserRef = useRef<AnalyserNode | null>(null);
 const streamRef = useRef<MediaStream | null>(null);

 const toggleListening = async () => {
 setErrorMsg(null);
 if (isListening) {
 // Stop listening
 if (streamRef.current) {
 streamRef.current.getTracks().forEach(track => track.stop());
 streamRef.current = null;
 }
 if (audioCtxRef.current) {
 audioCtxRef.current.close();
 audioCtxRef.current = null;
 }
 analyserRef.current = null;
 setIsListening(false);
 } else {
 // Start listening
 try {
 const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
 streamRef.current = stream;
 
 const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
 const audioCtx = new AudioContextClass();
 audioCtxRef.current = audioCtx;
 
 const analyser = audioCtx.createAnalyser();
 analyser.fftSize = 256;
 analyserRef.current = analyser;
 
 const source = audioCtx.createMediaStreamSource(stream);
 source.connect(analyser);
 
 setIsListening(true);
 } catch (err: any) {
 console.warn("Microphone access denied or failed", err);
 if (err.name === 'NotFoundError' || err.message.includes('Requested device not found')) {
 setErrorMsg("No microphone detected. Please connect a microphone to use this feature.");
 } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
 setErrorMsg("Microphone access denied. Please enable microphone permissions in your browser settings.");
 } else {
 setErrorMsg("Unable to access microphone. Please check your device settings.");
 }
 setIsListening(false);
 }
 }
 };

 useEffect(() => {
 return () => {
 if (streamRef.current) {
 streamRef.current.getTracks().forEach(track => track.stop());
 }
 if (audioCtxRef.current) {
 audioCtxRef.current.close();
 }
 };
 }, []);

 return (
 <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-4 pointer-events-none">
 {/* The Aesthetic Visualizer appears when listening */}
 <div className={`transition-all duration-1000 ease-in-out origin-bottom-right ${isListening ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
 {isListening && analyserRef.current && (
 <div className="bg-nous-text/80 dark:bg-nous-base/80 backdrop-blur-md border border p-6 rounded-none pointer-events-auto w-[320px]">
 <div className="flex justify-between items-center mb-4">
 <span className="font-mono text-[8px] uppercase tracking-widest text-nous-subtle animate-pulse">Acoustic Uplink Active</span>
 <span className="font-mono text-[8px] uppercase tracking-widest text-nous-subtle">MIMI_CORE</span>
 </div>
 <AestheticVisualizer analyser={analyserRef.current} className="text-stone-400 mx-auto"/>
 </div>
 )}
 </div>

 {/* Error Message */}
 {errorMsg && (
 <div className="bg-red-900/80 backdrop-blur-md border border-red-800 p-4 rounded-none pointer-events-auto w-[320px] mb-2">
 <div className="flex justify-between items-start">
 <span className="font-mono text-[10px] uppercase tracking-widest text-red-300">{errorMsg}</span>
 <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-red-200 ml-2">
 ×
 </button>
 </div>
 </div>
 )}

 {/* The Thimble acts as the toggle */}
 <div className="pointer-events-auto"title={isListening ?"Close Acoustic Uplink":"Open Acoustic Uplink"}>
 <Thimble 
 isActive={isListening} 
 onClick={toggleListening} 
 className="w-12 h-12 text-nous-subtle hover:text-nous-subtle transition-colors"
 />
 </div>
 </div>
 );
};
