import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { FileAudio, Loader2, Play, Sparkles, Upload, X } from 'lucide-react';
import { getClient } from '../services/geminiClient';
import { GoogleGenAI } from '@google/genai';
import { modelFor } from '../services/modelConfig';

export const DarkroomTranscription: React.FC = () => {
 const [file, setFile] = useState<{ data: string; mimeType: string; name: string } | null>(null);
 const [isTranscribing, setIsTranscribing] = useState(false);
 const [transcription, setTranscription] = useState<string | null>(null);
 const [error, setError] = useState<string | null>(null);
 const fileInputRef = useRef<HTMLInputElement>(null);

 const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
 if (e.target.files && e.target.files[0]) {
 const f = e.target.files[0];
 
 const data = await new Promise<string>((resolve, reject) => {
 const reader = new FileReader();
 reader.onloadend = () => resolve(reader.result as string);
 reader.onerror = reject;
 reader.readAsDataURL(f);
 });

 setFile({ data, mimeType: f.type, name: f.name });
 setTranscription(null);
 setError(null);
 }
 };

 const handleTranscribe = async () => {
 if (!file) return;
 setIsTranscribing(true);
 setError(null);
 setTranscription(null);

 try {
 const { ai } = getClient();
 const base64Data = file.data.split(',')[1];
 
 const prompt = `Please provide a highly accurate transcription of this audio/video file. Include speaker labels if there are multiple speakers, and note any significant background sounds or music in brackets.`;

 const response = await ai.models.generateContent({
 model: modelFor('textFast', 'gemini'),
 contents: {
 parts: [
 { inlineData: { data: base64Data, mimeType: file.mimeType } },
 { text: prompt }
 ]
 }
 });

 if (response.text) {
 setTranscription(response.text);
 } else {
 throw new Error("No transcription generated.");
 }
 } catch (err: any) {
 console.error("Transcription error:", err);
 setError(err.message ||"Failed to transcribe audio.");
 } finally {
 setIsTranscribing(false);
 }
 };

 return (
 <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
 {/* LEFT: CONTROLS */}
 <div className="lg:col-span-4 space-y-6">
 <div className="flex items-center gap-3 mb-4">
 <FileAudio size={14} className="text-nous-text/50 dark:text-nous-base/50"/>
 <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold text">Sonic Decoupling</h2>
 </div>

 <div className="bg border border-nous-text/20 dark:border-nous-base/20 p-6 space-y-6">
 <div>
 <h3 className="text-[9px] uppercase tracking-[0.2em] text-nous-text/50 dark:text-nous-base/50 mb-3 font-bold">Source Media</h3>
 
 {!file ? (
 <div 
 className="border border-dashed border-nous-text/20 dark:border-nous-base/20 hover:border-nous-text/40 dark:border-nous-base/40 transition-all duration-300 flex flex-col items-center justify-center p-8 cursor-pointer bg-nous-text/5 dark:bg-nous-base/5 hover:bg-nous-text/10 dark:bg-nous-base/10"
 onClick={() => fileInputRef.current?.click()}
 >
 <input ref={fileInputRef} type="file"accept="audio/*,video/*"className="hidden"onChange={handleFileChange} />
 <Upload size={24} className="mb-4 text-nous-text/50 dark:text-nous-base/50"/>
 <p className="text-sm font-serif italic text-nous-text/70 dark:text-nous-base/70 text-center">Drop audio or video file</p>
 <p className="text-[10px] uppercase tracking-widest text-nous-text/40 dark:text-nous-base/40 mt-4">MP3, WAV, MP4, WEBM</p>
 </div>
 ) : (
 <div className="relative border border-nous-text/20 dark:border-nous-base/20 bg-nous-text/5 dark:bg-nous-base/5 p-4 flex items-center gap-4">
 <div className="w-10 h-10 bg border border-nous-text/10 dark:border-nous-base/10 flex items-center justify-center text-nous-text/50 dark:text-nous-base/50">
 <FileAudio size={20} />
 </div>
 <div className="flex-1 overflow-hidden">
 <p className="text-[10px] text truncate font-mono uppercase tracking-widest">{file.name}</p>
 <p className="text-[9px] uppercase tracking-[0.2em] text-nous-text/50 dark:text-nous-base/50 mt-1">Ready for extraction</p>
 </div>
 <button 
 onClick={() => setFile(null)}
 className="p-2 text-nous-text/50 dark:text-nous-base/50 hover:text transition-colors"
 >
 <X size={16} />
 </button>
 </div>
 )}
 </div>

 <div className="pt-4 border-t border-nous-text/10 dark:border-nous-base/10">
 <button 
 onClick={handleTranscribe}
 disabled={isTranscribing || !file}
 className={`w-full py-4 text-[10px] uppercase tracking-[0.3em] font-bold transition-all flex items-center justify-center gap-2 border
 ${isTranscribing || !file ? 'border-nous-text/10 dark:border-nous-base/10 text-nous-text/30 dark:text-nous-base/30 cursor-not-allowed' : 'border-nous-text/50 dark:border-nous-base/50 text hover:bg-nous-text/10 dark:bg-nous-base/10'}`}
 >
 {isTranscribing ? (
 <><Loader2 size={16} className="animate-spin"/> Transcribing...</>
 ) : (
 <><Sparkles size={16} /> Extract Transcript</>
 )}
 </button>
 </div>
 </div>
 </div>

 {/* RIGHT: OUTPUT PREVIEW */}
 <div className="lg:col-span-8 space-y-6">
 <div className="flex items-center gap-3 mb-4">
 <Play size={14} className="text-nous-text/50 dark:text-nous-base/50"/>
 <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold text">Transcription Output</h2>
 </div>

 <div className="min-h-[500px] border border-nous-text/20 dark:border-nous-base/20 bg relative flex items-center justify-center overflow-hidden p-8">
 {error && (
 <div className="absolute inset-0 flex items-center justify-center p-8 text-center bg-red-950/20">
 <p className="text-red-400 font-mono text-[10px] uppercase tracking-widest">{error}</p>
 </div>
 )}

 {!isTranscribing && !transcription && !error && (
 <div className="text-nous-text/30 dark:text-nous-base/30 font-mono text-[10px] uppercase tracking-[0.3em]">
 Awaiting Audio Source
 </div>
 )}

 {isTranscribing && (
 <div className="flex flex-col items-center gap-4 text-nous-text/50 dark:text-nous-base/50">
 <Loader2 size={32} className="animate-spin"/>
 <div className="space-y-2 font-mono text-[10px] text-center uppercase tracking-widest">
 <p className="animate-pulse">Analyzing audio frequencies...</p>
 <p className="animate-pulse"style={{ animationDelay: '0.5s' }}>Processing speech patterns...</p>
 <p className="animate-pulse"style={{ animationDelay: '1s' }}>Generating transcript...</p>
 </div>
 </div>
 )}

 {transcription && !isTranscribing && (
 <motion.div 
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 className="w-full h-full overflow-y-auto custom-scrollbar"
 >
 <div className="prose prose-invert max-w-none">
 <div className="whitespace-pre-wrap font-mono text-[10px] text leading-relaxed uppercase tracking-widest">
 {transcription}
 </div>
 </div>
 </motion.div>
 )}
 </div>
 </div>
 </div>
 );
};
