import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PocketItem, ZineMetadata } from '../types';
import { fetchPocketItems, fetchCommunityZines, addToPocket, deleteFromPocket } from '../services/firebase';
import { useUser } from '../contexts/UserContext';
import { 
  Grid, Search, Trash2, Sparkles, Layers, Sliders, Loader2, 
  Plus, Upload, FileText, Speech, Mic, Square, X, RefreshCw, AlertCircle
} from 'lucide-react';
import { ArchiveGridList } from './ArchiveGridList';
import { ArchiveTactileSandbox } from './ArchiveTactileSandbox';

export type FilterType = 'all' | 'image' | 'text' | 'voicenote' | 'zine';

interface AestheticArchiveProps {
  onSelectZine: (zine: ZineMetadata) => void;
}

export const AestheticArchive: React.FC<AestheticArchiveProps> = ({ onSelectZine }) => {
  const { user, profile } = useUser();
  const [items, setItems] = useState<PocketItem[]>([]);
  const [zines, setZines] = useState<ZineMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [layoutMode, setLayoutMode] = useState<'monospace' | 'sandbox'>('monospace');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Creation Drawer State
  const [showCreator, setShowCreator] = useState(false);
  const [creatorType, setCreatorType] = useState<'image' | 'text' | 'voicenote'>('image');
  const [textInput, setTextInput] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Sound Wave Ref for Animating Recording Visually
  const [waveAnimation, setWaveAnimation] = useState<number[]>([]);

  const loadArchive = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const uid = user?.uid || 'ghost';
      
      // Load shards (PocketItems)
      const cachedShards = await fetchPocketItems(uid);
      setItems(cachedShards || []);

      // Load Community / Editorial Zines
      const cachedZines = await fetchCommunityZines(30);
      setZines(cachedZines || []);
    } catch (e) {
      console.error("Archive Load Failed", e);
      setErrorMessage("Could not restore neural coordinates. Retrying is recommended.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadArchive();
  }, [user]);

  // Audio recording simulation & waveform pulse
  useEffect(() => {
    let interval: any;
    if (isRecording) {
      interval = setInterval(() => {
        setWaveAnimation(Array.from({ length: 15 }, () => Math.floor(Math.random() * 80) + 20));
      }, 120);
    } else {
      setWaveAnimation([]);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  // Handle Drag / Drop files onto standard layout
  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        setImageFile(file);
        setCreatorType('image');
        setShowCreator(true);
        const reader = new FileReader();
        reader.onload = () => setImagePreview(reader.result as string);
        reader.readAsDataURL(file);
      }
    }
  };

  // Image File triggers
  const triggerImageFileSelection = () => {
    fileInputRef.current?.click();
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // Recording audio mechanisms
  const startAudioRecording = async () => {
    try {
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
    } catch (e) {
      console.error("Microphone Access Blocked", e);
      setErrorMessage("Microphone access blocked. Dictation aborted.");
    }
  };

  const stopAudioRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      // Stop track stream safely
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  // Form submission / upload shard to DB
  const handleSaveShard = async () => {
    const uid = user?.uid || 'ghost';
    setIsUploading(true);
    setErrorMessage(null);

    try {
      let finalContent: any = {
        notes: textInput,
        palette: creatorType === 'image' ? ['#0C0A09', '#78716C', '#D6D3D1', '#E7E5E4'] : undefined
      };

      if (creatorType === 'image') {
        if (!imagePreview) throw new Error("Please specify or upload a raw image artifact first.");
        finalContent.imageUrl = imagePreview; // Keep base64 locally stored in cloud or offline
      } else if (creatorType === 'text') {
        if (!textInput.trim()) throw new Error("Ensure the conceptual text draft is not empty.");
        finalContent.text = textInput;
      } else if (creatorType === 'voicenote') {
        // Safe placeholder fallback for audio notes saving base64 recording track
        finalContent.notes = textInput || "Voice dictation session entry";
        finalContent.isVoice = true;
      }

      const cleanTitle = titleInput.trim() || `Shard_${Date.now().toString().slice(-6)}`;
      
      // Extra dynamic agent enrichment block tags mapping AI features
      const sampleTags = ['vault', creatorType];
      if (textInput) {
        textInput.toLowerCase().split(/\s+/).forEach(w => {
          if (w.startsWith('#') && w.length > 2) sampleTags.push(w.slice(1));
        });
      }

      await addToPocket(uid, creatorType, finalContent);
      
      // Reset State
      setTitleInput('');
      setTextInput('');
      setImageFile(null);
      setImagePreview(null);
      setAudioBlob(null);
      setShowCreator(false);
      
      // Reload lists
      await loadArchive();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed uploading conceptual shard.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteShard = async (id: string) => {
    setLoading(true);
    try {
      await deleteFromPocket(id);
      await loadArchive();
    } catch (err) {
      console.error("COULD NOT SCRAP SHARD", err);
      setErrorMessage("Scrap operation failed. Shard remains stable.");
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter(item => {
    const matchesKeyword = searchQuery ? (
      item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content?.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content?.text?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
      item.agentEnrichment?.autoTags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
    ) : true;

    if (filterType === 'all') return matchesKeyword;
    return item.type === filterType && matchesKeyword;
  });

  const filteredZines = zines.filter(zine => {
    if (filterType !== 'all' && filterType !== 'zine') return false;
    if (!searchQuery) return true;
    
    const q = searchQuery.toLowerCase();
    return (
      zine.title.toLowerCase().includes(q) ||
      (zine as any).concept?.toLowerCase().includes(q) ||
      zine.userHandle?.toLowerCase().includes(q)
    );
  });

  // Background weekly "dormant" pulse system check (over 30 days dormant)
  const isDormantItem = (item: PocketItem) => {
    const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
    return (Date.now() - (item.savedAt || item.timestamp || Date.now())) > thirtyDaysInMs;
  };

  // Map dormants for special glows
  const itemsWithDormancy = filteredItems.map(item => ({
    ...item,
    isDormant: isDormantItem(item)
  }));

  return (
    <div 
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleFileDrop}
      className="flex-1 w-full min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col pt-16 px-4 md:px-12 relative overflow-hidden transition-colors duration-500"
    >
      {/* ERROR MESSAGE NOTIFICATION */}
      {errorMessage && (
        <div className="fixed top-20 right-6 z-50 p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 flex items-center gap-3 shadow-md max-w-sm">
          <AlertCircle className="text-red-600 dark:text-red-400 shrink-0" size={18} />
          <p className="font-mono text-[9px] text-red-700 dark:text-red-300 uppercase tracking-wider">
            {errorMessage}
          </p>
          <button onClick={() => setErrorMessage(null)} className="ml-auto text-red-400 hover:text-red-600">
            <X size={14} />
          </button>
        </div>
      )}

      {/* HEADER BAR CONTROLS */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-stone-200 dark:border-stone-850 pb-6 mb-8 gap-6 pt-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-stone-400 dark:text-stone-500 font-mono text-[9px] tracking-widest uppercase">
            <span className="w-1.5 h-1.5 rounded-none bg-stone-800 dark:bg-stone-300 animate-pulse" />
            Vibe Classification Repository
          </div>
          <h1 className="font-serif italic text-4xl md:text-5xl tracking-tighter text-stone-900 dark:text-stone-50">
            The Latent Registry
          </h1>
          <p className="font-mono text-[8px] uppercase tracking-widest text-stone-400 dark:text-stone-500">
            Unified sovereign storage & semantic mood grouping engine
          </p>
        </div>

        {/* CONTROLS AREA */}
        <div className="flex flex-wrap gap-3 items-center w-full md:w-auto font-mono text-[10px]">
          {/* Filtering Keyword */}
          <div className="relative flex-1 md:flex-initial">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input 
              type="text" 
              placeholder="SEARCH MEMETIC SIGNALS..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full md:w-56 border border-stone-300 dark:border-stone-800 bg-transparent py-2 pl-9 pr-4 uppercase tracking-wider focus:outline-none focus:border-stone-800 dark:focus:border-stone-400 text-[10px]"
            />
          </div>

          {/* Type Selector Dropdown */}
          <select 
            value={filterType} 
            onChange={e => setFilterType(e.target.value as FilterType)}
            className="border border-stone-300 dark:border-stone-800 bg-transparent px-3 py-2 uppercase focus:outline-none focus:border-stone-600 text-[10px]"
          >
            <option value="all">ALL SHARDS</option>
            <option value="image">IMAGES ONLY</option>
            <option value="text">TEXT CARDS</option>
            <option value="voicenote">DICTATIONS</option>
            <option value="zine">ZINES ONLY</option>
          </select>

          {/* Quick Creator Ingestion Toggle */}
          <button 
            onClick={() => setShowCreator(!showCreator)}
            className="flex items-center gap-1.5 border border-stone-900 dark:border-stone-100 bg-stone-950 dark:bg-stone-50 text-white dark:text-stone-950 px-4 py-2 hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors"
          >
            <Plus size={12} />
            INGEST
          </button>

          {/* Layout Mode Toggles */}
          <div className="flex border border-stone-300 dark:border-stone-800 p-0.5 bg-stone-100 dark:bg-stone-900">
            <button 
              onClick={() => setLayoutMode('monospace')} 
              className={`px-3 py-1 font-bold ${layoutMode === 'monospace' ? 'bg-white dark:bg-[#1C1C1A] text-stone-950 dark:text-white shadow-sm' : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-200'}`}
              title="Monospace Grid Layout"
            >
              List
            </button>
            <button 
              onClick={() => setLayoutMode('sandbox')} 
              className={`px-3 py-1 font-bold ${layoutMode === 'sandbox' ? 'bg-white dark:bg-[#1C1C1A] text-stone-950 dark:text-white shadow-sm' : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-200'}`}
              title="Tactile Sandbox Sandbox"
            >
              Sandbox
            </button>
          </div>
        </div>
      </header>

      {/* QUICK INGESTOR FORM */}
      <AnimatePresence>
        {showCreator && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="border border-stone-300 dark:border-stone-800 bg-white dark:bg-[#0C0C0B] p-6 mb-8 shadow-md"
          >
            <div className="flex justify-between items-center pb-4 border-b border-stone-250 dark:border-stone-850 mb-4">
              <span className="font-mono text-[9px] uppercase tracking-widest text-stone-500 font-bold flex items-center gap-2">
                <Sparkles size={12} className="text-stone-400" />
                Ingest New Shard Coordinates
              </span>
              <button 
                onClick={() => setShowCreator(false)} 
                className="text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            {/* Selector Shard Type */}
            <div className="grid grid-cols-3 gap-2 mb-4 font-mono text-[9px] tracking-widest uppercase">
              <button 
                onClick={() => setCreatorType('image')}
                className={`py-2 border transition-all flex items-center justify-center gap-2 ${creatorType === 'image' ? 'border-stone-950 dark:border-stone-300 bg-stone-50 dark:bg-[#121211]' : 'border-stone-200 dark:border-stone-900 text-stone-400 hover:text-stone-600'}`}
              >
                <Upload size={12} /> Image
              </button>
              <button 
                onClick={() => setCreatorType('text')}
                className={`py-2 border transition-all flex items-center justify-center gap-2 ${creatorType === 'text' ? 'border-stone-950 dark:border-stone-300 bg-stone-50 dark:bg-[#121211]' : 'border-stone-200 dark:border-stone-900 text-stone-400 hover:text-stone-600'}`}
              >
                <FileText size={12} /> Thoughts
              </button>
              <button 
                onClick={() => setCreatorType('voicenote')}
                className={`py-2 border transition-all flex items-center justify-center gap-2 ${creatorType === 'voicenote' ? 'border-stone-950 dark:border-stone-300 bg-stone-50 dark:bg-[#121211]' : 'border-stone-200 dark:border-stone-900 text-stone-400 hover:text-stone-600'}`}
              >
                <Mic size={12} /> Voice note
              </button>
            </div>

            {/* Ingestion Inputs */}
            <div className="space-y-4">
              <input 
                type="text" 
                placeholder="PROVISIONAL TITLE // ENTRY LABEL (OPTIONAL)"
                value={titleInput}
                onChange={e => setTitleInput(e.target.value)}
                className="w-full border border-stone-200 dark:border-stone-850 bg-stone-50 dark:bg-stone-900 p-3 font-mono text-[10px] uppercase tracking-wider focus:outline-none focus:border-stone-800 text-stone-900 dark:text-stone-100 placeholder:text-stone-400"
              />

              {creatorType === 'image' && (
                <div 
                  onClick={triggerImageFileSelection}
                  className="border border-dashed border-stone-300 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/40 p-12 text-center cursor-pointer transition-colors hover:bg-stone-100/50 flex flex-col items-center justify-center"
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleImageFileChange} 
                  />
                  {imagePreview ? (
                    <div className="max-h-48 overflow-hidden border border-stone-200">
                      <img src={imagePreview} alt="Preview" className="h-full object-contain" />
                    </div>
                  ) : (
                    <>
                      <Upload size={24} className="text-stone-400 mb-2" />
                      <p className="font-serif italic text-xs text-stone-500">
                        Click or drag graphic reference to upload
                      </p>
                      <p className="font-mono text-[8px] text-stone-400 tracking-wider mt-2">
                        JPEG, PNG, WEBP, GIF (MAX 10MB)
                      </p>
                    </>
                  )}
                </div>
              )}

              {creatorType === 'text' && (
                <textarea 
                  placeholder="COMPOSE RADICAL DESIGN OBSERVATIONS & KEYWORDS HERE..."
                  value={textInput}
                  onChange={e => setTextInput(e.target.value)}
                  rows={4}
                  className="w-full border border-stone-200 dark:border-stone-850 bg-stone-50 dark:bg-stone-900 p-3 font-serif text-sm focus:outline-none focus:border-stone-800 text-stone-900 dark:text-stone-105 placeholder:text-stone-400"
                />
              )}

              {creatorType === 'voicenote' && (
                <div className="border border-stone-250 dark:border-stone-850 bg-stone-50 dark:bg-stone-900 p-6 flex flex-col items-center justify-center gap-4 text-center">
                  {audioBlob ? (
                    <div className="space-y-4 w-full flex flex-col items-center">
                      <span className="font-mono text-[9px] uppercase tracking-widest text-[#22c55e]">
                        ✓ Voice Dictation Track Saved
                      </span>
                      <audio src={URL.createObjectURL(audioBlob)} controls className="max-w-xs focus:outline-none" />
                      <button 
                        onClick={() => setAudioBlob(null)} 
                        className="font-mono text-[8px] uppercase tracking-widest text-red-500 hover:text-red-700"
                      >
                        [ Clear Track ]
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-4">
                        {!isRecording ? (
                          <button 
                            onClick={startAudioRecording}
                            className="w-12 h-12 rounded-full border border-stone-300 bg-white hover:bg-stone-100 flex items-center justify-center text-red-600 transition-transform active:scale-95"
                            title="Start Recording"
                          >
                            <Mic size={20} />
                          </button>
                        ) : (
                          <button 
                            onClick={stopAudioRecording}
                            className="w-12 h-12 rounded-full border border-red-500 bg-red-500 text-white animate-pulse flex items-center justify-center transition-transform active:scale-95"
                            title="Stop Recording"
                          >
                            <Square size={18} />
                          </button>
                        )}
                      </div>

                      <span className="font-mono text-[9px] uppercase tracking-widest text-stone-500">
                        {isRecording ? "● DICTATING BRAIN_OS OBSERVATION..." : "Click microphone on stand to begin"}
                      </span>

                      {/* Waveform Visualization Animation */}
                      {isRecording && (
                        <div className="flex gap-1 items-end h-8 w-48 justify-center overflow-hidden">
                          {waveAnimation.map((h, i) => (
                            <div 
                              key={i} 
                              style={{ height: `${h}%` }}
                              className="w-[3px] bg-red-400 dark:bg-red-500 transition-all duration-100 rounded-full" 
                            />
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  <textarea 
                    placeholder="COMPANION TRANSCRIPTION OR BRIEF DIRECTIVES..."
                    value={textInput}
                    onChange={e => setTextInput(e.target.value)}
                    rows={2}
                    className="w-full border border-transparent border-t border-stone-200 dark:border-stone-800 bg-transparent pt-3 font-serif text-xs focus:outline-none placeholder:text-stone-400 mt-4 h-16 resize-none"
                  />
                </div>
              )}

              {/* Upload Handler Trigger */}
              <div className="flex justify-end gap-3 font-mono text-[9px] uppercase tracking-widest">
                <button 
                  onClick={() => setShowCreator(false)}
                  className="px-4 py-2 border border-stone-200 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-900 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  disabled={isUploading}
                  onClick={handleSaveShard}
                  className="px-6 py-2 bg-stone-950 dark:bg-stone-50 text-white dark:text-stone-950 hover:bg-stone-850 hover:opacity-90 transition-all flex items-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      INGESTING...
                    </>
                  ) : "SAVE SHARD ENTRY"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* RENDER DORMANT RE-AWAKENER TELEMETRY */}
      {itemsWithDormancy.some(i => i.isDormant) && (
        <div className="mb-4 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 p-3 flex justify-between items-center z-10 font-mono text-[8px] tracking-wide uppercase text-amber-700 dark:text-amber-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>Alert // Dormant Vision Found System logs: Stagnating design research fragments require engagement focus</span>
          </div>
          <button 
            onClick={() => {
              // Highlight or nudge dormant items
              setSearchQuery('#dormant'); // or similar
            }}
            className="border border-amber-300 dark:border-amber-800 px-3 py-1 font-bold hover:bg-amber-500 hover:text-white transition-colors"
          >
            Refocus Shards
          </button>
        </div>
      )}

      {/* PERSISTENT STORAGE CONTAINER VIEWPORT */}
      {loading ? (
        <div className="flex-1 flex flex-col justify-center items-center py-40 gap-4">
          <Loader2 className="animate-spin text-stone-400" size={24} />
          <span className="font-mono text-[8px] uppercase tracking-[0.3em] text-stone-400">Restructuring Latent Coordinates...</span>
        </div>
      ) : (
        <div className="flex-1 pb-24">
          {layoutMode === 'monospace' ? (
            <ArchiveGridList 
              items={itemsWithDormancy} 
              zines={filteredZines}
              onSelectZine={onSelectZine}
              onSelectItem={(item) => {
                // Clicking opens dynamic details
                alert(`Shard Inspection Detail // ID: ${item.id}\nCaptured in registry database.\nType: ${item.type}\nNotes: ${item.notes || 'none'}`);
              }}
              onDeleteItem={handleDeleteShard}
            />
          ) : (
            <ArchiveTactileSandbox 
              items={itemsWithDormancy} 
              zines={filteredZines}
              onSelectZine={onSelectZine}
              onSelectItem={(item) => {
                alert(`Shard Selected // ID: ${item.id}\nSaved Date: ${new Date(item.savedAt).toLocaleDateString()}\nStatus: ${(item as any).isDormant ? 'Dormant' : 'Active'}`);
              }}
            />
          )}
        </div>
      )}

      {/* BOTTOM FOOTER */}
      <footer className="mt-auto border-t border-stone-200 dark:border-stone-900 py-8 text-center opacity-40 font-serif italic text-xs">
        "We are what we behold." • Cyber-Resonant Manifest Curation Engine.
      </footer>
    </div>
  );
};
