import React, { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Sparkles, Radar, X, Loader2, Image as ImageIcon, Search, Check } from 'lucide-react';
import { GoogleGenAI } from"@google/genai";
import { getClient } from '../services/geminiClient';
import { SignatureUI } from './SignatureUI';
import { searchGrounding } from '../services/searchService';
import { saveArtifactLocally } from '../services/localArchive';
import { useFeedback } from '../hooks/useFeedback';
import { resolveMotionVariant } from '../lib/motion';

interface CommandDrawerProps {
 isOpen: boolean;
 onClose: () => void;
 context?: string;
}

export const CommandDrawer: React.FC<CommandDrawerProps> = ({ isOpen, onClose, context }) => {
 const feedback = useFeedback();
 const reduceMotion = Boolean(useReducedMotion());
 const sheet = resolveMotionVariant('sheetEnter', reduceMotion);
 const settle = resolveMotionVariant('settleIntoRegistry', reduceMotion);
 const [activeTab, setActiveTab] = useState<'image' | 'search'>('image');
 const [prompt, setPrompt] = useState(context || '');
 const [generating, setGenerating] = useState(false);
 const [generatedImage, setGeneratedImage] = useState<string | null>(null);
 const [isSaved, setIsSaved] = useState(false);
 const [searchQuery, setSearchQuery] = useState(context || '');
 const [searchResults, setSearchResults] = useState<any[]>([]);
 const [searchSummary, setSearchSummary] = useState('');
 const [searching, setSearching] = useState(false);

 const handleGenerate = async () => {
 if (!prompt) return;
 setGenerating(true);
 try {
 const { ai } = getClient();
 const response = await ai.models.generateContent({
 model: 'gemini-3.1-flash-lite-image',
 contents: { parts: [{ text: prompt }] },
 config: {
 imageConfig: {
 aspectRatio: '1:1',
 imageSize: '1K'
 }
 },
 });
 let base64EncodeString = '';
 for (const part of response.candidates[0].content.parts) {
 if (part.inlineData) {
 base64EncodeString = part.inlineData.data;
 break;
 }
 }
 if (!base64EncodeString) throw new Error("No image generated");
 setGeneratedImage(`data:image/png;base64,${base64EncodeString}`);
 } catch (error) {
 console.error('Error generating image:', error);
 setGeneratedImage("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=");
 } finally {
 setGenerating(false);
 }
 };

 const handleSearch = async () => {
 if (!searchQuery) return;
 setSearching(true);
 try {
 const { results, summary } = await searchGrounding(searchQuery);
 setSearchResults(results);
 setSearchSummary(summary);
 } catch (error) {
 console.error('Search error:', error);
 } finally {
 setSearching(false);
 }
 };

 return (
 <AnimatePresence>
 {isOpen && (
 <motion.div
 initial={sheet.initial}
 animate={sheet.animate}
 exit={sheet.exit}
 transition={sheet.transition}
 className="fixed inset-0 z-[5000] bg-nous-base/90 backdrop-blur-xl flex items-center justify-center p-8"
 >
 <div className="max-w-5xl w-full">
 <div className="flex gap-2 mb-12">
 <button 
 onClick={() => setActiveTab('image')} 
 className={`px-6 py-2 rounded-none font-sans text-xs uppercase tracking-[0.2em] transition-all duration-300 ${activeTab === 'image' ? 'bg-white text-nous-text' : 'bg-nous-base text-nous-subtle hover:bg-nous-base'}`}
 >
 Manifest
 </button>
 <button 
 onClick={() => setActiveTab('search')} 
 className={`px-6 py-2 rounded-none font-sans text-xs uppercase tracking-[0.2em] transition-all duration-300 ${activeTab === 'search' ? 'bg-white text-nous-text' : 'bg-nous-base text-nous-subtle hover:bg-nous-base'}`}
 >
 Scry
 </button>
 </div>

 {activeTab === 'image' ? (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
 <div className="flex flex-col gap-6">
 <div className="flex items-center gap-3 text-white">
 <Sparkles size={24} className="text-nous-subtle"/>
 <h2 className="font-serif italic text-4xl">Manifest</h2>
 </div>
 <textarea
 value={prompt}
 onChange={(e) => setPrompt(e.target.value)}
 placeholder="Describe the aesthetic..."
 className="w-full bg-nous-base/50 border border-nous-border p-6 text-white font-mono text-sm focus:outline-none focus:border-nous-border dark:focus:border-nous-border transition-colors"
 rows={6}
 />
 <button
 onClick={handleGenerate}
 disabled={generating}
 className="bg-white text-nous-text py-4 font-sans text-[10px] uppercase tracking-[0.3em] font-bold hover:bg-stone-400 transition-colors"
 >
 {generating ? <Loader2 size={16} className="animate-spin mx-auto"/> : 'Manifest'}
 </button>
 {generatedImage && (
 <div className="mt-4 space-y-2">
 <img src={generatedImage} alt="Generated"className="w-full h-80 object-cover border border-nous-border"/>
 <motion.button 
 initial={false}
 animate={isSaved ? settle.animate : { opacity: 1 }}
 transition={settle.transition}
 onClick={async () => {
 try {
 await saveArtifactLocally({
 id: Date.now().toString(),
 type: 'image',
 data: generatedImage,
 timestamp: Date.now()
 });
 setIsSaved(true);
 feedback.trigger('artifact.saved', { confirmed: true });
 setTimeout(() => setIsSaved(false), 2000);
 } catch (error) {
 console.error("MIMI // Failed to save artifact locally:", error);
 feedback.trigger('action.failed');
 }
 }}
 className={`w-full py-2 text-xs uppercase tracking-widest transition-colors ${isSaved ? 'bg-green-900 text-green-100' : 'bg-nous-base text-nous-subtle hover:bg-nous-base hover:text-nous-text'}`}
 >
 {isSaved ? <span className="flex items-center justify-center gap-2"><Check size={14}/> Saved</span> : 'Save to Archive'}
 </motion.button>
 </div>
 )}
 </div>
 <div className="flex flex-col gap-6">
 <div className="flex items-center gap-3 text-white">
 <Radar size={24} className="text-indigo-400"/>
 <h2 className="font-serif italic text-4xl">Signature</h2>
 </div>
 <div className="h-80 bg-nous-base/50 border border-nous-border p-4 overflow-hidden">
 <SignatureUI />
 </div>
 </div>
 </div>
 ) : (
 <div className="space-y-8 text-white">
 <div className="flex items-center gap-3">
 <Search size={24} className="text-nous-subtle"/>
 <h2 className="font-serif italic text-4xl">Scry Artifacts</h2>
 </div>
 
 <div className="relative">
 <input 
 type="text"
 value={searchQuery} 
 onChange={(e) => setSearchQuery(e.target.value)} 
 onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
 className="w-full bg-nous-base/50 border border-nous-border p-6 text-white font-mono text-lg focus:outline-none focus:border-nous-border transition-colors"
 placeholder="What are you looking for?"
 />
 <button 
 onClick={handleSearch} 
 disabled={searching} 
 className="absolute right-4 top-4 bg-stone-600 text-white p-3 rounded-none hover:bg-nous-base0 transition-colors"
 >
 {searching ? <Loader2 className="animate-spin"/> : <Search size={20} />}
 </button>
 </div>

 {searchSummary && (
 <div className="bg-nous-base/30 border-l-2 border-nous-border p-6 font-serif italic text-nous-text text-lg">
 {searchSummary}
 </div>
 )}

 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 {searchResults.map((res: any, i: number) => (
 <motion.div 
 key={i}
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: i * 0.05 }}
 className="bg-nous-base border border-nous-border p-6 hover:border-nous-border /50 transition-colors group"
 >
 <h3 className="font-medium text-white mb-2 group-hover:text-nous-subtle transition-colors">{res.title || 'Untitled Fragment'}</h3>
 <p className="text-nous-subtle text-sm font-mono">{res.type || 'Fragment'}</p>
 {res.snippet && <p className="text-nous-subtle text-xs mt-4 line-clamp-3">{res.snippet}</p>}
 </motion.div>
 ))}
 </div>
 </div>
 )}
 </div>
 <button onClick={onClose} className="absolute top-12 right-12 text-nous-subtle hover:text-nous-text transition-colors">
 <X size={32} />
 </button>
 </motion.div>
 )}
 </AnimatePresence>
 );
};
