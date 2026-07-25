
import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, X, Zap, Sparkles, Loader2, Play, Square, Video, Mic, Image as ImageIcon, Save, Layers, ArrowRight } from 'lucide-react';
import { LiveAestheticService, AestheticAnalysis } from '../services/liveAestheticService';
import { useUser } from '../contexts/UserContext';
import { analyzeMiseEnScene, analyzeVideo, analyzeAudio, analyzeArchitecturalIntent, analyzeLatentResonance } from '../services/geminiService';
import { saveTask } from '../services/firebaseUtils';
import { VibeGraph } from './VibeGraph';

export const TheLens = () => {
 const videoRef = useRef<HTMLVideoElement>(null);
 const canvasRef = useRef<HTMLCanvasElement>(null);
 const [isActive, setIsActive] = useState(false);
 const [isConnecting, setIsConnecting] = useState(false);
 const [analysis, setAnalysis] = useState<AestheticAnalysis[]>([]);
 const [currentReading, setCurrentReading] = useState<string>("");
 const serviceRef = useRef<LiveAestheticService | null>(null);
 const { user, profile } = useUser();

 const [isRecordingVideo, setIsRecordingVideo] = useState(false);
 const [isRecordingAudio, setIsRecordingAudio] = useState(false);
 const [isAnalyzing, setIsAnalyzing] = useState(false);
 const [captureResult, setCaptureResult] = useState<any>(null);
 const [isSaving, setIsSaving] = useState(false);
 
 const [lensMode, setLensMode] = useState<'spectral' | 'mesopic'>('spectral');
 const [selectedArchiveNode, setSelectedArchiveNode] = useState<any>(null);
 const [isAnalyzingLatent, setIsAnalyzingLatent] = useState(false);
 const [latentAnalysisResult, setLatentAnalysisResult] = useState<any>(null);

 const mediaRecorderRef = useRef<MediaRecorder | null>(null);
 const chunksRef = useRef<Blob[]>([]);

 const handleSaveToPocket = async () => {
 if (!captureResult || !user?.uid) return;
 setIsSaving(true);
 try {
 const { archiveManager } = await import('../services/archiveManager');
 await archiveManager.saveToPocket(user.uid, 'analysis_report', {
 title: `The Lens Analysis: ${captureResult.type.toUpperCase()}`,
 content: captureResult.data,
 timestamp: Date.now()
 });
 window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
 detail: { message:"Analysis Anchored.", icon: <Save size={14} /> } 
 }));
 setCaptureResult(null);
 } catch (e) {
 console.error("Failed to save analysis", e);
 } finally {
 setIsSaving(false);
 }
 };

 const handlePushToBoard = async () => {
 if (!captureResult?.data?.tasks || !user?.uid) return;
 try {
 for (const task of captureResult.data.tasks) {
 await saveTask(user.uid, {
 id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
 text: task.title,
 description: task.description,
 completed: false,
 createdAt: Date.now(),
 tags: ['lens_directive']
 });
 }
 window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
 detail: { message:"Directives pushed to Action Board.", icon: <ArrowRight size={14} /> } 
 }));
 } catch (e) {
 console.error("MIMI // Failed to push tasks to board:", e);
 }
 };

 const handleNodeSelect = async (node: any) => {
 setSelectedArchiveNode(node);
 setIsAnalyzingLatent(true);
 setLatentAnalysisResult(null);
 try {
 const result = await analyzeLatentResonance(node, profile);
 setLatentAnalysisResult(result);
 } catch (e) {
 console.error(e);
 } finally {
 setIsAnalyzingLatent(false);
 }
 };

 const handlePushLatentDirective = async () => {
 if (!latentAnalysisResult?.architectural_directive || !user?.uid) return;
 try {
 const task = latentAnalysisResult.architectural_directive;
 await saveTask(user.uid, {
 id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
 text: task.title,
 description: task.description,
 completed: false,
 createdAt: Date.now(),
 tags: ['latent_directive']
 });
 window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
 detail: { message:"Latent Directive pushed to Action Board.", icon: <ArrowRight size={14} /> } 
 }));
 } catch (e) {
 console.error("MIMI // Failed to push latent directive:", e);
 }
 };

 const startLens = async () => {
 setIsConnecting(true);
 try {
 const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: true });
 if (videoRef.current) {
 videoRef.current.srcObject = stream;
 }
 
 serviceRef.current = new LiveAestheticService((data) => {
 if (data.scribeReading) {
 setCurrentReading(data.scribeReading);
 setAnalysis(prev => [...prev, data]);
 }
 });
 
 await serviceRef.current.connect();
 setIsActive(true);
 } catch (err) {
 console.error("MIMI // Failed to start The Lens:", err);
 } finally {
 setIsConnecting(false);
 }
 };

 const stopLens = () => {
 setIsActive(false);
 if (serviceRef.current) {
 serviceRef.current.close();
 }
 if (videoRef.current?.srcObject) {
 (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
 }
 };

 useEffect(() => {
 let interval: any;
 if (isActive && serviceRef.current && lensMode === 'spectral') {
 interval = setInterval(() => {
 if (videoRef.current && canvasRef.current && !isRecordingVideo) {
 const context = canvasRef.current.getContext('2d');
 if (context) {
 context.drawImage(videoRef.current, 0, 0, 640, 480);
 const base64 = canvasRef.current.toDataURL('image/jpeg', 0.5).split(',')[1];
 serviceRef.current?.sendVideoFrame(base64);
 }
 }
 }, 3000); // Send frame every 3 seconds
 }
 return () => clearInterval(interval);
 }, [isActive, isRecordingVideo, lensMode]);

 const captureImage = async () => {
 if (!videoRef.current || !canvasRef.current) return;
 const context = canvasRef.current.getContext('2d');
 if (!context) return;
 context.drawImage(videoRef.current, 0, 0, 640, 480);
 const base64 = canvasRef.current.toDataURL('image/jpeg', 0.8).split(',')[1];
 
 setIsAnalyzing(true);
 setCaptureResult(null);
 try {
 const result = await analyzeArchitecturalIntent(base64, 'image/jpeg', profile);
 setCaptureResult({ type: 'image', data: result });
 } catch (e) {
 console.error(e);
 } finally {
 setIsAnalyzing(false);
 }
 };

 const toggleVideoRecording = () => {
 if (isRecordingVideo) {
 mediaRecorderRef.current?.stop();
 setIsRecordingVideo(false);
 } else {
 if (!videoRef.current?.srcObject) return;
 chunksRef.current = [];
 const stream = videoRef.current.srcObject as MediaStream;
 const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
 mediaRecorder.ondataavailable = (e) => {
 if (e.data.size > 0) chunksRef.current.push(e.data);
 };
 mediaRecorder.onstop = async () => {
 const blob = new Blob(chunksRef.current, { type: 'video/webm' });
 const reader = new FileReader();
 reader.onloadend = async () => {
 const base64 = (reader.result as string).split(',')[1];
 setIsAnalyzing(true);
 try {
 const result = await analyzeVideo(base64, 'video/webm', profile);
 setCaptureResult({ type: 'video', data: result });
 } catch (e) {
 console.error(e);
 } finally {
 setIsAnalyzing(false);
 }
 };
 reader.onerror = (e) => console.error("MIMI // FileReader error", e);
 reader.readAsDataURL(blob);
 };
 mediaRecorder.start();
 mediaRecorderRef.current = mediaRecorder;
 setIsRecordingVideo(true);
 }
 };

 const toggleAudioRecording = () => {
 if (isRecordingAudio) {
 mediaRecorderRef.current?.stop();
 setIsRecordingAudio(false);
 } else {
 if (!videoRef.current?.srcObject) return;
 chunksRef.current = [];
 const stream = videoRef.current.srcObject as MediaStream;
 const audioStream = new MediaStream(stream.getAudioTracks());
 const mediaRecorder = new MediaRecorder(audioStream);
 mediaRecorder.ondataavailable = (e) => {
 if (e.data.size > 0) chunksRef.current.push(e.data);
 };
 mediaRecorder.onstop = async () => {
 const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
 const reader = new FileReader();
 reader.onloadend = async () => {
 const base64 = (reader.result as string).split(',')[1];
 setIsAnalyzing(true);
 try {
 const result = await analyzeAudio(base64, 'audio/webm');
 setCaptureResult({ type: 'audio', data: result });
 } catch (e) {
 console.error(e);
 } finally {
 setIsAnalyzing(false);
 }
 };
 reader.onerror = (e) => console.error("MIMI // FileReader error", e);
 reader.readAsDataURL(blob);
 };
 mediaRecorder.start();
 mediaRecorderRef.current = mediaRecorder;
 setIsRecordingAudio(true);
 }
 };

 return (
 <div className="w-full h-full bg-black flex flex-col relative overflow-hidden">
 <canvas ref={canvasRef} width={640} height={480} className="hidden"/>
 
 <AnimatePresence mode="wait">
 {lensMode === 'spectral' ? (
 <motion.div 
 key="spectral"
 initial={{ opacity: 0, scale: 1.1 }}
 animate={{ opacity: 1, scale: 1 }}
 exit={{ opacity: 0, scale: 0.9 }}
 transition={{ duration: 0.8, ease:"easeInOut"}}
 className="absolute inset-0 z-0"
 >
 <video 
 ref={videoRef} 
 autoPlay 
 playsInline 
 muted 
 className="w-full h-full object-cover opacity-60 grayscale contrast-125"
 />
 <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80 pointer-events-none"/>
 
 {/* Scanning Line Effect */}
 {isActive && (
 <motion.div 
 initial={{ top: '0%' }}
 animate={{ top: '100%' }}
 transition={{ duration: 4, repeat: Infinity, ease:"linear"}}
 className="absolute left-0 right-0 h-[1px] bg-nous-base0/50 z-10"
 />
 )}
 </motion.div>
 ) : (
 <motion.div 
 key="mesopic"
 initial={{ opacity: 0, scale: 0.9 }}
 animate={{ opacity: 1, scale: 1 }}
 exit={{ opacity: 0, scale: 1.1 }}
 transition={{ duration: 0.8, ease:"easeInOut"}}
 className="absolute inset-0 z-0"
 >
 <div className="absolute inset-0 backdrop-blur-xl bg-black/40 z-10 pointer-events-none"style={{ backdropFilter: 'blur(20px) contrast(1.2) saturate(1.5)' }} />
 <VibeGraph onGenerateZine={() => {}} onNodeSelect={handleNodeSelect} />
 <div className="absolute inset-0 pointer-events-none z-20"style={{ boxShadow: 'inset 0 0 100px rgba(0,0,0,0.8)' }} />
 </motion.div>
 )}
 </AnimatePresence>

 <div className="relative z-20 flex-1 flex flex-col p-8 pointer-events-none">
 <div className="flex justify-between items-start pointer-events-auto">
 <div className="space-y-1">
 <h2 className="text-white font-mono text-2xl uppercase tracking-[0.3em] flex items-center gap-3">
 <Camera size={24} className={isActive ?"text-nous-subtle animate-pulse":"text-white/20"} />
 The Lens
 </h2>
 <p className="text-white/40 text-[10px] uppercase tracking-widest">Spatial Aesthetic Capture Engine</p>
 </div>
 
 <div className="flex items-center gap-4">
 <div className="flex bg p-1 border border-nous-border">
 <button
 onClick={() => setLensMode('spectral')}
 className={`px-4 py-1.5 text-[9px] font-mono uppercase tracking-widest transition-colors ${lensMode === 'spectral' ? 'bg-nous-base text-nous-subtle' : 'text-nous-subtle hover:text-nous-subtle'}`}
 >
 Spectral
 </button>
 <button
 onClick={() => setLensMode('mesopic')}
 className={`px-4 py-1.5 text-[9px] font-mono uppercase tracking-widest transition-colors ${lensMode === 'mesopic' ? 'bg-nous-base text-nous-subtle' : 'text-nous-subtle hover:text-nous-subtle'}`}
 >
 Mesopic
 </button>
 </div>

 <button 
 onClick={isActive ? stopLens : startLens}
 disabled={isConnecting}
 className={`px-6 py-3 font-mono text-[9px] uppercase tracking-widest transition-all flex items-center gap-3 ${
 isActive 
 ?"bg-red-900/20 text-red-500 border border-red-900/50 hover:bg-red-900/40"
 :"bg-transparent text-nous-subtle border border-nous-border hover:bg-nous-base"
 }`}
 >
 {isConnecting ? <Loader2 className="animate-spin"size={14} /> : isActive ? <Square size={14} /> : <Play size={14} />}
 {isConnecting ?"Initializing...": isActive ?"Terminate":"[ INITIATE LENS ]"}
 </button>
 </div>
 </div>

 <div className="flex-1 flex flex-col justify-end pb-12 pointer-events-auto">
 <AnimatePresence mode="wait">
 {lensMode === 'spectral' && currentReading && !captureResult ? (
 <motion.div
 key={currentReading}
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -20 }}
 className="max-w-2xl mb-8"
 >
 <div className="text-nous-subtle font-mono text-[10px] uppercase tracking-[0.4em] mb-4 flex items-center gap-2">
 <Sparkles size={12} /> Scribe Reading
 </div>
 <p className="text-white font-serif italic text-3xl leading-tight tracking-tight">
"{currentReading}"
 </p>
 </motion.div>
 ) : captureResult ? (
 <motion.div
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 className="max-w-2xl mb-8 bg p-6 border border-nous-border backdrop-blur-md max-h-[60vh] overflow-y-auto"
 >
 <div className="flex justify-between items-start mb-4">
 <div className="text-nous-subtle font-mono text-[9px] uppercase tracking-widest flex items-center gap-2 font-bold">
 <Zap size={12} /> {captureResult.type} Analysis
 </div>
 <div className="flex items-center gap-2">
 {captureResult.data.tasks && captureResult.data.tasks.length > 0 && (
 <button onClick={handlePushToBoard} className="text-nous-subtle hover:text-nous-subtle flex items-center gap-1 text-[9px] font-mono uppercase tracking-widest border border-nous-border hover:bg-nous-base px-2 py-1 transition-colors">
 <ArrowRight size={12} /> Push to Board
 </button>
 )}
 <button onClick={handleSaveToPocket} disabled={isSaving} className="text-nous-subtle hover:text-nous-subtle disabled:opacity-50 transition-colors">
 {isSaving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16} />}
 </button>
 <button onClick={() => setCaptureResult(null)} className="text-nous-subtle hover:text-nous-subtle transition-colors">
 <X size={16} />
 </button>
 </div>
 </div>
 <div className="space-y-4 text-nous-subtle">
 {captureResult.data.directives && (
 <div>
 <span className="text-[9px] font-mono uppercase tracking-widest text-nous-subtle block mb-2 font-bold">Architectural Directives</span>
 <ul className="list-disc pl-4 space-y-1 text-sm font-serif italic">
 {captureResult.data.directives.map((d: string, i: number) => (
 <li key={i}>{d}</li>
 ))}
 </ul>
 </div>
 )}
 {captureResult.data.tasks && (
 <div>
 <span className="text-[9px] font-mono uppercase tracking-widest text-nous-subtle block mb-2 font-bold">Actionable Tasks</span>
 <div className="space-y-2">
 {captureResult.data.tasks.map((t: any, i: number) => (
 <div key={i} className="bg-transparent p-3 border border-nous-border">
 <h4 className="font-mono text-[9px] uppercase tracking-widest font-bold text-nous-subtle">{t.title}</h4>
 <p className="font-serif italic text-xs text-nous-subtle mt-1">{t.description}</p>
 </div>
 ))}
 </div>
 </div>
 )}
 {captureResult.data.directors_note && (
 <p className="font-serif italic text-xl">"{captureResult.data.directors_note}"</p>
 )}
 {captureResult.data.lighting_analysis && (
 <div>
 <span className="text-[10px] uppercase tracking-widest text-white/50 block mb-1">Lighting</span>
 <p className="text-sm">{captureResult.data.lighting_analysis}</p>
 </div>
 )}
 {captureResult.data.cultural_parallel && (
 <div>
 <span className="text-[9px] font-mono uppercase tracking-widest text-nous-subtle block mb-1 font-bold">Cultural Parallel</span>
 <p className="text-sm font-serif italic">{captureResult.data.cultural_parallel}</p>
 </div>
 )}
 {captureResult.data.semiotic_touchpoints && (
 <div className="flex flex-wrap gap-2">
 {captureResult.data.semiotic_touchpoints.map((t: string, i: number) => (
 <span key={i} className="px-2 py-1 bg-transparent border border-nous-border text-[9px] font-mono uppercase tracking-widest text-nous-subtle">{t}</span>
 ))}
 </div>
 )}
 </div>
 </motion.div>
 ) : lensMode === 'mesopic' ? (
 isAnalyzingLatent ? (
 <motion.div
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 className="max-w-2xl mb-8 bg p-6 border border-nous-border backdrop-blur-md flex items-center gap-4"
 >
 <Loader2 className="animate-spin text-nous-subtle"size={24} />
 <span className="text-nous-subtle font-mono text-sm uppercase tracking-widest font-bold">Extracting Latent Resonance...</span>
 </motion.div>
 ) : latentAnalysisResult ? (
 <motion.div
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 className="max-w-2xl mb-8 bg p-6 border border-nous-border backdrop-blur-md max-h-[60vh] overflow-y-auto"
 >
 <div className="flex justify-between items-start mb-4">
 <div className="text-nous-subtle font-mono text-[9px] uppercase tracking-widest flex items-center gap-2 font-bold">
 <Sparkles size={12} /> Latent Resonance
 </div>
 <div className="flex items-center gap-2">
 <button onClick={handlePushLatentDirective} className="text-nous-subtle hover:text-nous-subtle flex items-center gap-1 text-[9px] font-mono uppercase tracking-widest border border-nous-border hover:bg-nous-base px-2 py-1 transition-colors">
 <ArrowRight size={12} /> Push to Board
 </button>
 <button onClick={() => setLatentAnalysisResult(null)} className="text-nous-subtle hover:text-nous-subtle transition-colors">
 <X size={16} />
 </button>
 </div>
 </div>
 <div className="space-y-4 text-nous-subtle">
 {latentAnalysisResult.resonance_insight && (
 <p className="font-serif italic text-xl text-nous-subtle">"{latentAnalysisResult.resonance_insight}"</p>
 )}
 {latentAnalysisResult.architectural_directive && (
 <div>
 <span className="text-[9px] font-mono uppercase tracking-widest text-nous-subtle block mb-2 font-bold">Architectural Directive</span>
 <div className="bg-transparent p-3 border border-nous-border">
 <h4 className="font-mono text-[9px] uppercase tracking-widest font-bold text-nous-subtle">{latentAnalysisResult.architectural_directive.title}</h4>
 <p className="font-serif italic text-xs text-nous-subtle mt-1">{latentAnalysisResult.architectural_directive.description}</p>
 </div>
 </div>
 )}
 {latentAnalysisResult.aesthetic_vectors && (
 <div className="flex flex-wrap gap-2">
 {latentAnalysisResult.aesthetic_vectors.map((v: string, i: number) => (
 <span key={i} className="px-2 py-1 bg-transparent border border-nous-border text-[9px] font-mono uppercase tracking-widest text-nous-subtle">{v}</span>
 ))}
 </div>
 )}
 </div>
 </motion.div>
 ) : (
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 className="text-white/20 font-serif italic text-2xl mb-8"
 >
 Exploring the Mesopic Archive...
 </motion.div>
 )
 ) : (
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 className="text-white/20 font-serif italic text-2xl mb-8"
 >
 Waiting for spatial resonance...
 </motion.div>
 )}
 </AnimatePresence>

 {isActive && lensMode === 'spectral' && (
 <div className="flex items-center gap-4">
 <button 
 onClick={captureImage}
 disabled={isAnalyzing || isRecordingVideo || isRecordingAudio}
 className="w-12 h-12 bg-transparent border border-nous-border flex items-center justify-center text-nous-subtle hover:bg-nous-base hover:text-nous-subtle transition-colors disabled:opacity-50"
 >
 {isAnalyzing ? <Loader2 className="animate-spin"size={18} /> : <ImageIcon size={18} />}
 </button>
 <button 
 onClick={toggleVideoRecording}
 disabled={isAnalyzing || isRecordingAudio}
 className={`w-12 h-12 border flex items-center justify-center transition-colors disabled:opacity-50 ${
 isRecordingVideo ?"bg-red-900/20 text-red-500 border-red-900/50 animate-pulse":"bg-transparent border-nous-border text-nous-subtle hover:bg-nous-base hover:text-nous-subtle"
 }`}
 >
 <Video size={18} />
 </button>
 <button 
 onClick={toggleAudioRecording}
 disabled={isAnalyzing || isRecordingVideo}
 className={`w-12 h-12 border flex items-center justify-center transition-colors disabled:opacity-50 ${
 isRecordingAudio ?"bg-red-900/20 text-red-500 border-red-900/50 animate-pulse":"bg-transparent border-nous-border text-nous-subtle hover:bg-nous-base hover:text-nous-subtle"
 }`}
 >
 <Mic size={18} />
 </button>
 </div>
 )}
 </div>

 {/* Real-time Telemetry */}
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-nous-border pt-8 pointer-events-auto">
 <div className="space-y-1">
 <div className="text-[9px] font-mono text-nous-subtle uppercase tracking-widest font-bold">Signal Strength</div>
 <div className="h-1 bg border border-nous-border overflow-hidden">
 <motion.div 
 animate={{ width: isActive ? '85%' : '0%' }}
 className="h-full bg-nous-base0"
 />
 </div>
 </div>
 <div className="space-y-1">
 <div className="text-[9px] font-mono text-nous-subtle uppercase tracking-widest font-bold">Aesthetic Entropy</div>
 <div className="h-1 bg border border-nous-border overflow-hidden">
 <motion.div 
 animate={{ width: isActive ? '42%' : '0%' }}
 className="h-full bg-stone-700"
 />
 </div>
 </div>
 <div className="space-y-1">
 <div className="text-[9px] font-mono text-nous-subtle uppercase tracking-widest font-bold">Latent Depth</div>
 <div className="h-1 bg border border-nous-border overflow-hidden">
 <motion.div 
 animate={{ width: isActive ? '68%' : '0%' }}
 className="h-full bg-stone-600"
 />
 </div>
 </div>
 <div className="space-y-1">
 <div className="text-[9px] font-mono text-nous-subtle uppercase tracking-widest font-bold">Registry Sync</div>
 <div className="flex items-center gap-2">
 <div className={`w-1.5 h-1.5 ${isActive ?"bg-nous-base0 animate-pulse":"bg-nous-base"}`} />
 <span className="text-[9px] text-nous-subtle font-mono uppercase tracking-widest font-bold">
 {isActive ?"Connected":"Idle"}
 </span>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
};

export default TheLens;
