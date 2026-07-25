import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ImageIcon, Loader2, Sparkles, RefreshCw, Maximize2, Download, Minimize2, Edit3, Send, X } from 'lucide-react';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { TailorLogicDraft } from '../types';
import { generateZineImage } from '../services/geminiService';
import { useUser } from '../contexts/UserContext';

interface TailorPreviewProps {
 draft: TailorLogicDraft;
 activePersonaId: string;
 apiKey?: string;
}

export const TailorPreview: React.FC<TailorPreviewProps> = ({ draft, activePersonaId, apiKey }) => {
 const { user } = useUser();
 const { handleError } = useErrorHandler();
 const [previewUrl, setPreviewUrl] = useState<string | null>(null);
 const [isLoading, setIsLoading] = useState(false);
 const [isSaving, setIsSaving] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const [isExpanded, setIsExpanded] = useState(false);
 const [visionEdit, setVisionEdit] = useState('');
 const [isEditing, setIsEditing] = useState(false);
 const debounceTimer = useRef<NodeJS.Timeout | null>(null);
 const lastGeneratedDraft = useRef<string>('');

  const generatePreview = async (force = false, customPrompt?: string) => {
    // Use visionEdit state if customPrompt is not provided (for the debounced auto-refresh)
    const effectiveCustomPrompt = customPrompt !== undefined ? customPrompt : visionEdit;

    const currentDraftString = JSON.stringify({
      eraBias: draft.positioningCore.aestheticCore.eraBias,
      presentation: draft.positioningCore.aestheticCore.presentation,
      silhouettes: draft.positioningCore.aestheticCore.silhouettes,
      materiality: draft.positioningCore.aestheticCore.materiality,
      chromatic: draft.expressionEngine.chromaticRegistry,
      culturalReferences: draft.positioningCore.anchors.culturalReferences,
      ideologicalBias: draft.positioningCore.anchors.ideologicalBias,
      authorityClaim: draft.positioningCore.authorityClaim,
      narrativeVoice: draft.expressionEngine.narrativeVoice,
      customPrompt: effectiveCustomPrompt
    });

    if (!force && currentDraftString === lastGeneratedDraft.current) return;

    setIsLoading(true);
    setError(null);
    lastGeneratedDraft.current = currentDraftString;

    try {
      const presentationStr = draft.positioningCore.aestheticCore.presentation ? ` Form & Presentation: ${draft.positioningCore.aestheticCore.presentation}.` : '';
      const silhouettesStr = (draft.positioningCore.aestheticCore.silhouettes || []).length > 0 ? ` silhouettes: ${draft.positioningCore.aestheticCore.silhouettes.join(', ')}.` : '';
      const materialityStr = (draft.positioningCore.aestheticCore.materiality || []).length > 0 ? ` materiality: ${draft.positioningCore.aestheticCore.materiality.join(', ')}.` : '';
      const anchorsStr = (draft.positioningCore.anchors.culturalReferences || []).length > 0 ? ` cultural anchors: ${draft.positioningCore.anchors.culturalReferences.join(', ')}.` : '';
      const ideologyStr = (draft.positioningCore.anchors.ideologicalBias || []).length > 0 ? ` ideological bias: ${draft.positioningCore.anchors.ideologicalBias.join(', ')}.` : '';
      const chromaticStr = ` chromatic logic: base ${draft.expressionEngine.chromaticRegistry.baseNeutral}, accent ${draft.expressionEngine.chromaticRegistry.accentSignal}, palette: ${draft.expressionEngine.chromaticRegistry.primaryPalette.map(p => p.name).join(', ')}.`;
      const voiceStr = ` narrative tone: ${draft.expressionEngine.narrativeVoice.emotionalTemperature} and ${draft.expressionEngine.narrativeVoice.structureBias}.`;
      
      let prompt = `A high-end editorial fashion photograph, centered composition, sharp focus, professional lighting, representing the aesthetic DNA: ${draft.positioningCore.aestheticCore.eraBias}.${presentationStr}${silhouettesStr}${materialityStr}${anchorsStr}${ideologyStr}${chromaticStr}${voiceStr} Authority claim: ${draft.positioningCore.authorityClaim}.`;
      
      if (effectiveCustomPrompt) {
        prompt += ` Additional vision guidance: ${effectiveCustomPrompt}`;
      }
      
      // We pass a mock profile object that generateZineImage expects
      const mockProfile = { tailorDraft: draft };
      
      const url = await generateZineImage(
        prompt, 
        '3:4', 
        '1K', 
        mockProfile, 
        true, // isLite
        apiKey
      );
      
      setPreviewUrl(url);
    } catch (err: any) {
      handleError(err, "Failed to manifest preview.");
    } finally {
      setIsLoading(false);
    }
  };

 const [isSaved, setIsSaved] = useState(false);

 const handleSaveToPocket = async () => {
 if (!previewUrl || !user) return;
 setIsSaving(true);
 try {
 const { archiveManager } = await import('../services/archiveManager');
 await archiveManager.saveToPocket(user.uid, 'image', {
 imageUrl: previewUrl,
 prompt: `Tailor Preview: ${draft.positioningCore.aestheticCore.eraBias}`
 });
 setIsSaved(true);
 setTimeout(() => setIsSaved(false), 2000);
 } catch (err) {
 console.error("Failed to save preview:", err);
 } finally {
 setIsSaving(false);
 }
 };

 const handleVisionEditSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 if (!visionEdit.trim()) return;
 generatePreview(true, visionEdit);
 setIsEditing(false);
 };

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    
    debounceTimer.current = setTimeout(() => {
      generatePreview();
    }, 3000); // 3 second debounce

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [draft, visionEdit]);

 const PreviewContent = (
 <>
 <AnimatePresence mode="wait">
 {previewUrl ? (
 <motion.img
 key={previewUrl}
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 transition={{ duration: 1 }}
 src={previewUrl}
 alt="Aesthetic Preview"
 className="w-full h-full object-cover"
 referrerPolicy="no-referrer"
 />
 ) : (
 <div className="absolute inset-0 flex flex-col items-center justify-center text-nous-subtle p-6 text-center">
 <ImageIcon size={32} className="mb-4 opacity-20"/>
 <p className="font-serif italic text-xs">Adjust your Tailor logic to manifest a visual preview.</p>
 </div>
 )}
 </AnimatePresence>

 {/* Overlays */}
 <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors pointer-events-none"/>
 
 <div className="absolute top-3 right-3 flex gap-2">
 <button 
 onClick={() => setIsExpanded(!isExpanded)}
 className="p-2 bg-white/80 /80 backdrop-blur-md rounded-none text-nous-subtle hover:scale-110 active:scale-95 transition-all"
 title={isExpanded ?"Minimize":"Expand"}
 >
 {isExpanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
 </button>
 {previewUrl && (
 <button 
 id="save-preview-btn"
 onClick={handleSaveToPocket}
 disabled={isSaving || isSaved}
 className="p-2 bg-white/80 /80 backdrop-blur-md rounded-none text-nous-subtle hover:scale-110 active:scale-95 transition-all disabled:opacity-50"
 title="Save to Archive"
 >
 {isSaving ? <Loader2 size={12} className="animate-spin"/> : isSaved ? <svg xmlns="http://www.w3.org/2000/svg"width="12"height="12"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"strokeLinejoin="round"className="text-nous-text"><polyline points="20 6 9 17 4 12"></polyline></svg> : <Download size={12} />}
 </button>
 )}
 <button 
 onClick={() => generatePreview(true)}
 disabled={isLoading}
 className="p-2 bg-white/80 /80 backdrop-blur-md rounded-none text-nous-subtle hover:scale-110 active:scale-95 transition-all disabled:opacity-50"
 title="Regenerate Preview"
 >
 {isLoading ? <Loader2 size={12} className="animate-spin"/> : <RefreshCw size={12} />}
 </button>
 </div>

 {isLoading && (
 <div className="absolute inset-0 flex items-center justify-center bg-white/40 /40 backdrop-blur-[2px]">
 <div className="flex flex-col items-center gap-3">
 <Loader2 size={24} className="animate-spin text-nous-text"/>
 <span className="font-sans text-[8px] uppercase tracking-widest font-black text-nous-text">Manifesting...</span>
 </div>
 </div>
 )}

 {error && (
 <div className="absolute bottom-3 left-3 right-3 bg-red-500/90 backdrop-blur-md text-white p-2 rounded-none text-[8px] uppercase tracking-widest font-black flex items-center gap-2">
 <Sparkles size={10} />
 {error}
 </div>
 )}

 <div className="absolute bottom-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
 <div className="bg-white/80 /80 backdrop-blur-md px-2 py-1 rounded-none border border-black/5 /5">
 <span className="font-sans text-[7px] uppercase tracking-widest font-black text-nous-subtle">Aesthetic Preview // 1K</span>
 </div>
 {previewUrl && !isEditing && (
 <button 
 onClick={() => setIsEditing(true)}
 className="bg-white/80 /80 backdrop-blur-md px-2 py-1 rounded-none border border-black/5 /5 flex items-center gap-1 hover:bg-white dark:hover:bg-black transition-colors text-nous-text"
 >
 <Edit3 size={10} />
 <span className="font-sans text-[7px] uppercase tracking-widest font-black">Vision Edit</span>
 </button>
 )}
 </div>

 {isEditing && (
 <div className="absolute bottom-0 left-0 right-0 bg-white/95 /95 backdrop-blur-md border-t border-nous-border p-3">
 <form onSubmit={handleVisionEditSubmit} className="flex items-center gap-2">
 <input 
 type="text"
 value={visionEdit}
 onChange={(e) => setVisionEdit(e.target.value)}
 placeholder="e.g. 'Add a brutalist silver necklace...'"
 className="flex-1 bg-transparent border-b border-nous-border py-1 text-xs font-serif italic focus:outline-none focus:border-nous-border dark:focus:border-nous-border text-nous-text"
 autoFocus
 />
 <button 
 type="submit"
 disabled={!visionEdit.trim() || isLoading}
 className="p-1.5 bg-nous-base text-nous-base rounded-none disabled:opacity-50"
 >
 <Send size={12} />
 </button>
 <button 
 type="button"
 onClick={() => setIsEditing(false)}
 className="p-1.5 text-nous-subtle hover:text-nous-text"
 >
 <X size={12} />
 </button>
 </form>
 </div>
 )}
 </>
 );

 return (
 <>
 <div className="relative group aspect-[3/4] bg-nous-base rounded-none overflow-hidden border border-nous-border">
 {PreviewContent}
 </div>

 <AnimatePresence>
 {isExpanded && (
 <motion.div 
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 md:p-12"
 onClick={() => setIsExpanded(false)}
 >
 <motion.div 
 initial={{ scale: 0.95, opacity: 0 }}
 animate={{ scale: 1, opacity: 1 }}
 exit={{ scale: 0.95, opacity: 0 }}
 className="relative w-full max-w-4xl max-h-[90vh] aspect-[3/4] md:aspect-auto md:h-full bg-nous-base border border-nous-border overflow-hidden shadow-2xl"
 onClick={(e) => e.stopPropagation()}
 >
 {PreviewContent}
 </motion.div>
 </motion.div>
 )}
 </AnimatePresence>
 </>
 );
};
