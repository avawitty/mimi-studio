import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { analyzeTryOn, renderTryOn } from "@/services/geminiService";
import { Loader2, Save, FolderPlus, Check, Pocket as PocketIcon, Info, User as UserIcon, Shirt, Sparkles } from "lucide-react";
import { useUser } from '../contexts/UserContext';
import { db } from '../services/firebaseInit';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { ThimbleBoard } from '../types';
import { handleFirestoreError, logFirestoreError, OperationType } from '../services/firebaseUtils';
import { motion, AnimatePresence } from 'motion/react';

type TryOnAnalysis = {
  bodyType?: string;
  silhouetteBias?: string;
  colorTheory?: string;
  stylistNote?: string;
  garmentCategory?: string;
  fitCompatibility?: string;
  garmentDescription?: string;
};

type TryOnResult = {
  outputImageUrl?: string;
  analysis?: TryOnAnalysis;
  status: 'idle' | 'analyzing' | 'rendering' | 'done' | 'error';
  error?: string;
};

export const TryOnTool: React.FC = () => {
  const { user } = useUser();
  const [modelImage, setModelImage] = useState<string | null>(null);
  const [itemImage, setItemImage] = useState<string | null>(null);
  const [result, setResult] = useState<TryOnResult>({ status: 'idle' });
  const [boards, setBoards] = useState<ThimbleBoard[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<string>('');
  const [isSaved, setIsSaved] = useState(false);
  const [isPocketSaved, setIsPocketSaved] = useState(false);

  const toEpochMillis = (value: any) => {
    if (typeof value === 'number') return value;
    if (value && typeof value.toMillis === 'function') return value.toMillis();
    if (value && typeof value.seconds === 'number') return value.seconds * 1000;
    return 0;
  };

  useEffect(() => {
    if (!user?.uid) return;
    let ownedBoards: ThimbleBoard[] = [];
    let sharedBoards: ThimbleBoard[] = [];
    const syncBoards = () => {
      const merged = new Map<string, ThimbleBoard>();
      [...ownedBoards, ...sharedBoards].forEach((board) => merged.set(board.id, board));
      const orderedBoards = Array.from(merged.values()).sort((a, b) => toEpochMillis(b.createdAt) - toEpochMillis(a.createdAt));
      setBoards(orderedBoards);
      setSelectedBoardId((prev) => {
        if (orderedBoards.length === 0) return '';
        if (prev && orderedBoards.some((board) => board.id === prev)) return prev;
        return orderedBoards[0].id;
      });
    };
    const ownedQuery = query(collection(db, 'thimbleBoards'), where('userId', '==', user.uid));
    const sharedQuery = query(collection(db, 'thimbleBoards'), where('collaborators', 'array-contains', user.uid));
    const unsubscribeOwned = onSnapshot(ownedQuery, (snapshot) => {
      ownedBoards = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ThimbleBoard));
      syncBoards();
    }, (error) => {
      logFirestoreError(error, OperationType.LIST, 'thimbleBoards');
    });
    const unsubscribeShared = onSnapshot(sharedQuery, (snapshot) => {
      sharedBoards = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ThimbleBoard));
      syncBoards();
    }, (error) => {
      logFirestoreError(error, OperationType.LIST, 'thimbleBoards');
    });
    return () => {
      unsubscribeOwned();
      unsubscribeShared();
    };
  }, [user?.uid]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (url: string | null) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setter(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleExecuteTryOn = async () => {
    if (!modelImage || !itemImage) return;
    setResult(prev => ({ ...prev, status: 'analyzing', error: undefined }));
    try {
      const analysis = await analyzeTryOn(modelImage, itemImage, "image/png");
      setResult(prev => ({ ...prev, status: 'rendering', analysis }));
      
      const outputImageUrl = await renderTryOn(modelImage, itemImage, "image/png", analysis);
      setResult(prev => ({ ...prev, status: 'done', outputImageUrl }));
    } catch (e) {
      console.error("Try-on execution failed:", e);
      setResult(prev => ({ ...prev, status: 'error', error: e instanceof Error ? e.message : 'Execution failed' }));
    }
  };

  const handleSaveToBoard = async () => {
    if (!user?.uid || !result.outputImageUrl || !selectedBoardId) return;
    try {
      const { ref, uploadString, getDownloadURL } = await import('firebase/storage');
      const { storage } = await import('../services/firebaseInit');
      
      let finalImageUrl = result.outputImageUrl;
      if (finalImageUrl.startsWith('data:image')) {
        const storageRef = ref(storage, `users/${user.uid}/tryon/output_${Date.now()}.png`);
        await uploadString(storageRef, finalImageUrl, 'data_url');
        finalImageUrl = await getDownloadURL(storageRef);
      }

      await addDoc(collection(db, 'thimbleItems'), {
        boardId: selectedBoardId,
        userId: user.uid,
        title: `Try-On: ${result.analysis?.garmentCategory || 'Composite'}`,
        imageUrl: finalImageUrl,
        notes: `Body Type: ${result.analysis?.bodyType}\n\nSilhouette Bias: ${result.analysis?.silhouetteBias}\n\nStylist Note: ${result.analysis?.stylistNote}`,
        url: '#',
        price: 'N/A',
        createdAt: serverTimestamp()
      });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (e) {
      console.error("Failed to save to board", e);
    }
  };

  const handleSaveToPocket = async () => {
    if (!user?.uid || !result.analysis || !result.outputImageUrl) return;
    try {
      const { ref, uploadString, getDownloadURL } = await import('firebase/storage');
      const { storage } = await import('../services/firebaseInit');
      
      let finalImageUrl = result.outputImageUrl;
      if (finalImageUrl.startsWith('data:image')) {
        const storageRef = ref(storage, `users/${user.uid}/tryon/output_${Date.now()}.png`);
        await uploadString(storageRef, finalImageUrl, 'data_url');
        finalImageUrl = await getDownloadURL(storageRef);
      }

      const { archiveManager } = await import('../services/archiveManager');
      await archiveManager.saveToPocket(user.uid, 'image', {
        content: finalImageUrl,
        title: `Try-On Analysis: ${result.analysis.garmentCategory || 'Composite'}`,
        timestamp: Date.now(),
        origin: 'AI Try-On Tool',
        metadata: {
          garmentCategory: result.analysis.garmentCategory,
          bodyType: result.analysis.bodyType,
          silhouetteBias: result.analysis.silhouetteBias,
          colorTheory: result.analysis.colorTheory,
          fitCompatibility: result.analysis.fitCompatibility,
          stylistNote: result.analysis.stylistNote
        }
      });
      setIsPocketSaved(true);
      setTimeout(() => setIsPocketSaved(false), 3000);
    } catch (e) {
      console.error("Failed to save to pocket", e);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 p-4">
      {/* Top Area: Inputs */}
      <Card className="rounded-none border-nous-border bg-white/50 backdrop-blur-sm h-fit shadow-md">
        <CardHeader className="border-b border-nous-border flex flex-row items-center justify-between">
          <CardTitle className="font-serif italic text-2xl flex items-center gap-3">
            <Shirt size={20} className="opacity-60" />
            Strategic Conceptualization Input
          </CardTitle>
          <div className="text-[10px] uppercase tracking-widest opacity-40 font-mono">
            Model // Garment
          </div>
        </CardHeader>
        <CardContent className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <Label htmlFor="model-upload" className="text-[10px] uppercase tracking-widest font-bold opacity-60 flex items-center gap-2">
                <UserIcon size={14} /> Model Base / Your Photo
              </Label>
              <div className="relative w-full h-64 border border-nous-border bg-stone-100 flex items-center justify-center overflow-hidden group hover:border-nous-text transition-colors">
                {modelImage ? (
                  <>
                    <img src={modelImage} alt="Model" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button variant="secondary" size="sm" onClick={() => setModelImage(null)} className="rounded-none text-[10px] uppercase tracking-widest">Remove</Button>
                    </div>
                  </>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center gap-3 opacity-50 hover:opacity-100 transition-opacity w-full h-full justify-center bg-white/30">
                    <FolderPlus size={28} />
                    <span className="text-[10px] uppercase tracking-widest">Upload Base</span>
                    <input id="model-upload" type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setModelImage)} className="hidden" />
                  </label>
                )}
              </div>
            </div>
            
            <div className="space-y-4">
              <Label htmlFor="item-upload" className="text-[10px] uppercase tracking-widest font-bold opacity-60 flex items-center gap-2">
                <Shirt size={14} /> Clothing Item Artifact
              </Label>
              <div className="relative w-full h-64 border border-nous-border bg-stone-100 flex items-center justify-center overflow-hidden group hover:border-nous-text transition-colors">
                {itemImage ? (
                  <>
                    <img src={itemImage} alt="Item" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button variant="secondary" size="sm" onClick={() => setItemImage(null)} className="rounded-none text-[10px] uppercase tracking-widest">Remove</Button>
                    </div>
                  </>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center gap-3 opacity-50 hover:opacity-100 transition-opacity w-full h-full justify-center bg-white/30">
                    <FolderPlus size={28} />
                    <span className="text-[10px] uppercase tracking-widest">Upload Item</span>
                    <input id="item-upload" type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setItemImage)} className="hidden" />
                  </label>
                )}
              </div>
            </div>
          </div>

          <Button 
            className="w-full rounded-none bg-nous-text text-white hover:bg-black transition-all text-[11px] uppercase tracking-[0.2em] py-8 border border-nous-text" 
            onClick={handleExecuteTryOn} 
            disabled={result.status === 'analyzing' || result.status === 'rendering' || !modelImage || !itemImage}
          >
            {(result.status === 'analyzing' || result.status === 'rendering') ? <Loader2 className="w-5 h-5 animate-spin mr-3" /> : "Execute Try-On Simulation"}
          </Button>
        </CardContent>
      </Card>

      {/* Bottom Area: Output and Diagnosis (Only visible after analysis starts) */}
      {(result.status !== 'idle' || result.outputImageUrl) && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8"
          >
            {/* Visual Output */}
            <div className="lg:col-span-5 space-y-4">
              <div className="text-[10px] uppercase tracking-widest font-bold opacity-60 flex items-center gap-2">
                <Sparkles size={14} /> Rendered Output
              </div>
              <div className="relative aspect-[3/4] w-full border border-nous-border bg-stone-100 flex items-center justify-center overflow-hidden shadow-sm">
                {result.outputImageUrl ? (
                  <img src={result.outputImageUrl} alt="Try-On Result" className="w-full h-full object-cover" />
                ) : result.status === 'rendering' ? (
                  <div className="flex flex-col items-center gap-4 opacity-70 p-8">
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <div className="text-[10px] uppercase tracking-widest text-center space-y-2 mt-4 font-mono">
                      <p>Draping garment over form...</p>
                      <p>Resolving silhouette tension...</p>
                      <p>Compositing editorial preview...</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-[10px] uppercase tracking-widest opacity-40">
                    Awaiting Generation
                  </div>
                )}
              </div>
              
              {result.outputImageUrl && (
                <div className="pt-4 space-y-4">
                  <div className="flex flex-col gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase tracking-widest opacity-60">Select Board for Acquisition</Label>
                      <select 
                        value={selectedBoardId}
                        onChange={(e) => setSelectedBoardId(e.target.value)}
                        className="w-full bg-white border border-nous-border p-3 text-[10px] uppercase tracking-widest outline-none focus:ring-0 cursor-pointer hover:bg-stone-50"
                      >
                        {boards.map(board => (
                          <option key={board.id} value={board.id}>{board.title}</option>
                        ))}
                        {boards.length === 0 && <option value="">No boards available</option>}
                      </select>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button 
                        onClick={handleSaveToBoard} 
                        disabled={!selectedBoardId || isSaved}
                        className="flex-1 rounded-none bg-nous-base text-nous-text border border-nous-border hover:bg-stone-100 text-[10px] uppercase tracking-widest gap-2"
                      >
                        {isSaved ? <><Check size={14} /> Saved to Board</> : <><Save size={14} /> Save to Board</>}
                      </Button>
                      <Button 
                        onClick={handleSaveToPocket} 
                        disabled={isPocketSaved}
                        variant="outline"
                        className="flex-1 rounded-none border border-nous-border text-[10px] uppercase tracking-widest gap-2 bg-white"
                      >
                        {isPocketSaved ? <><Check size={14} /> Added to Darkroom</> : <><PocketIcon size={14} /> Add to Darkroom</>}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Editorial Diagnosis */}
            <div className="lg:col-span-7">
              <Card className="rounded-none border-nous-border bg-white shadow-xl h-full">
                <CardHeader className="border-b border-nous-border bg-stone-50">
                  <div className="flex justify-between items-center">
                    <CardTitle className="font-serif italic text-2xl">Editorial Diagnosis</CardTitle>
                    {result.status === 'analyzing' && <Loader2 className="w-5 h-5 animate-spin opacity-50" />}
                    {result.analysis?.garmentCategory && (
                      <div className="px-3 py-1 bg-white border border-nous-border text-[9px] uppercase tracking-widest font-black shadow-sm">
                        {result.analysis.garmentCategory}
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-8 min-h-[400px]">
                  {result.analysis ? (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="space-y-8"
                    >
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold opacity-60">
                          <Info size={14} /> Body Type & Posture Analysis
                        </div>
                        <p className="font-serif text-xl leading-relaxed italic text-nous-text/90 pl-4 border-l-2 border-nous-border">
                          "{result.analysis.bodyType}"
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-5 border border-nous-border bg-stone-50/50 space-y-3">
                          <div className="text-[9px] uppercase tracking-widest font-bold opacity-50">Silhouette Bias</div>
                          <p className="text-sm leading-relaxed">{result.analysis.silhouetteBias}</p>
                        </div>
                        
                        <div className="p-5 border border-nous-border bg-stone-50/50 space-y-3">
                          <div className="text-[9px] uppercase tracking-widest font-bold opacity-50">Color Theory Interface</div>
                          <p className="text-sm leading-relaxed">{result.analysis.colorTheory}</p>
                        </div>
                      </div>

                      <div className="pt-6 border-t border-nous-border space-y-4">
                        <div className="text-[10px] uppercase tracking-widest font-bold opacity-60">
                          Fit & Concept Compatibility
                        </div>
                        <p className="text-sm leading-relaxed">{result.analysis.fitCompatibility}</p>
                      </div>
                      
                      <div className="p-6 bg-nous-base border border-nous-border space-y-3">
                        <div className="text-[9px] uppercase tracking-widest font-bold opacity-70">Stylist's Final Note</div>
                        <p className="font-serif italic text-base leading-relaxed opacity-90">{result.analysis.stylistNote}</p>
                      </div>
                      
                      {result.status === 'done' && (
                        <div className="flex justify-end pt-4 border-t border-nous-border mt-8">
                          <Button 
                            onClick={handleSaveToPocket}
                            disabled={isPocketSaved}
                            variant="default"
                            className="rounded-none bg-black text-white hover:bg-black/80 text-[10px] uppercase tracking-widest gap-2 px-6"
                          >
                            <Save size={14} /> {isPocketSaved ? "Diagnosis Saved" : "Save Diagnosis to Darkroom"}
                          </Button>
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-40 space-y-4 min-h-[300px]">
                      {result.status === 'analyzing' ? (
                        <>
                          <Loader2 className="w-8 h-8 animate-spin" />
                          <p className="text-[10px] uppercase tracking-widest">Interpreting structural semantics...</p>
                        </>
                      ) : (
                        <>
                          <Info className="w-8 h-8" />
                          <p className="text-[10px] uppercase tracking-widest">Awaiting execution parameters.</p>
                        </>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
};
