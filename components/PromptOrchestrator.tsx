import React, { useState } from 'react';
import { Loader2, Play, Copy, Check, Wand2 } from 'lucide-react';
import { orchestratePrompts, generateZineImage } from '../services/geminiService';
import { useUser } from '../contexts/UserContext';

interface PromptOrchestratorProps {
 isOpen: boolean;
 onClose: () => void;
}

export const PromptOrchestrator: React.FC<PromptOrchestratorProps> = ({ isOpen, onClose }) => {
 const { profile, user } = useUser();
 const [intent, setIntent] = useState('');
 const [isOrchestrating, setIsOrchestrating] = useState(false);
 const [prompts, setPrompts] = useState<any[]>([]);
 const [generatingId, setGeneratingId] = useState<string | null>(null);
 const [copiedId, setCopiedId] = useState<string | null>(null);

 const handleOrchestrate = async () => {
 if (!intent.trim()) return;
 setIsOrchestrating(true);
 try {
 const results = await orchestratePrompts(intent, profile);
 setPrompts(results || []);
 } catch (e) {
 console.error("Orchestration failed", e);
 } finally {
 setIsOrchestrating(false);
 }
 };

 const handleGenerateImage = async (prompt: any) => {
 setGeneratingId(prompt.id);
 try {
 const base64 = await generateZineImage(prompt.text, '1:1', '1K', profile, false);
 if (base64) {
 // Upload to storage
 const { archiveManager } = await import('../services/archiveManager');
 const path = `pocket_images/${user?.uid || 'ghost'}_${Date.now()}.jpg`;
 const url = await archiveManager.uploadMedia(user?.uid || 'ghost', base64, path);

 // Add to pocket
 const newItem = {
 imageUrl: url,
 prompt: prompt.text,
 timestamp: Date.now(),
 origin: 'Orchestrator'
 };
 await archiveManager.saveToPocket(user?.uid || 'ghost', 'image', newItem);
 window.dispatchEvent(new CustomEvent('mimi:registry_alert', { detail: { message:"Image Generated & Saved to Pocket."} }));
 }
 } catch (e) {
 console.error("Generation failed", e);
 window.dispatchEvent(new CustomEvent('mimi:registry_alert', { detail: { message:"Generation Failed."} }));
 } finally {
 setGeneratingId(null);
 }
 };

 const handleCopy = (id: string, text: string) => {
 navigator.clipboard.writeText(text).catch(e => console.error("MIMI // Clipboard error", e));
 setCopiedId(id);
 setTimeout(() => setCopiedId(null), 2000);
 };

 if (!isOpen) return null;

 return (
 <div className="flex flex-col gap-6 w-full">
 <div className="space-y-2">
 <label className="font-sans text-[9px] uppercase tracking-widest text-nous-subtle">Intent / Treatment</label>
 <textarea
 value={intent}
 onChange={(e) => setIntent(e.target.value)}
 placeholder="e.g., A portrait of a musician, brutalist interior, or 'Cyber-Noir Convergence'..."
 className="w-full bg-white border border-nous-border rounded-none p-3 text-sm font-mono text-nous-text placeholder:text-nous-subtle outline-none focus:border-primary dark:focus:border-nous-border resize-none h-24"
 />
 <button
 onClick={handleOrchestrate}
 disabled={isOrchestrating || !intent.trim()}
 className="w-full bg-nous-base  text-white py-3 text-[10px] uppercase tracking-widest font-bold hover:bg-nous-base dark:hover:bg-stone-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
 >
 {isOrchestrating ? <Loader2 size={14} className="animate-spin"/> : <Wand2 size={14} />}
 {isOrchestrating ? 'Orchestrating...' : 'Prune & Orchestrate'}
 </button>
 </div>

 {prompts.length > 0 && (
 <div className="space-y-6 mt-4">
 <div className="flex items-center gap-2">
 <div className="h-[1px] flex-1 bg-stone-200"/>
 <span className="font-sans text-[9px] uppercase tracking-widest text-nous-subtle">Orchestrated Prompts</span>
 <div className="h-[1px] flex-1 bg-stone-200"/>
 </div>

 {prompts.map((p, i) => (
 <div key={p.id || i} className="bg-white border border-nous-border p-4 rounded-none space-y-3 relative group">
 <div className="flex justify-between items-start gap-4">
 <p className="font-mono text-[11px] leading-relaxed text-nous-text">
 {p.text}
 </p>
 <button 
 onClick={() => handleCopy(p.id, p.text)}
 className="text-nous-subtle hover:text-nous-text hover:text-nous-text transition-colors flex-shrink-0"
 >
 {copiedId === p.id ? <Check size={14} className="text-nous-subtle"/> : <Copy size={14} />}
 </button>
 </div>
 
 <div className="bg-nous-base p-2 rounded-none border border-nous-border">
 <p className="font-sans text-[9px] uppercase tracking-wider text-nous-subtle mb-1">Rationale</p>
 <p className="font-sans text-[11px] text-nous-subtle leading-snug">{p.rationale}</p>
 </div>

 <button
 onClick={() => handleGenerateImage(p)}
 disabled={generatingId === p.id}
 className="w-full border border-nous-border py-2 text-[9px] uppercase tracking-widest font-bold text-nous-subtle hover:bg-nous-base transition-colors flex items-center justify-center gap-2 mt-2"
 >
 {generatingId === p.id ? <Loader2 size={12} className="animate-spin"/> : <Play size={12} />}
 {generatingId === p.id ? 'Generating...' : 'Run Prompt'}
 </button>
 </div>
 ))}
 </div>
 )}
 </div>
 );
};
