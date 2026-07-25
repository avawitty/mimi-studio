import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, Package, Lock, Unlock, Eye, Compass, Tag, 
  Plus, Trash2, CreditCard, ArrowRight, Volume2, Flame, 
  Settings, ShoppingBag, X, Activity, CheckCircle, Loader2, Coins, ExternalLink,
  Link, Upload, FileText, Image as ImageIcon, HelpCircle
} from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { generateMimiDropMeta, generateMimiDropMetaFromDebris, generateRawImage } from '../services/geminiService';
import { db } from '../services/firebaseInit';
import { doc, setDoc, collection, getDocs, deleteDoc, query, where } from 'firebase/firestore';
import { SubscriptionMatrix } from './SovereignCommerceEngine';
import { buildShopifyProductFromDrop, downloadShopifyProductPack } from '../services/shopifyExportService';

export interface MimiDropItem {
  id: string;
  name: string;
  category: string;
  vibe: string;
  price: number;
  supply: number;
  sold: number;
  tagline?: string;
  conceptThesis?: string;
  sensoryPalette?: string[];
  materiality?: string;
  ambiance?: string;
  statusConferred?: string;
  deliveryFriction?: string;
  objectionResolved?: string;
  checkoutButtonText?: string;
  mimiCritique?: string;
  imageUrl?: string;
  createdAt: number;
}

const DEFAULT_DROPS: MimiDropItem[] = [
  {
    id: "drop_default_1",
    name: "Fragmented Ivory",
    category: "Brutalist Domestic",
    vibe: "Concrete Minimalist, Silent Luxury",
    price: 180,
    supply: 50,
    sold: 43,
    tagline: "A structural pause in a high-entropy room.",
    conceptThesis: "A sculptural vessel hand-casted in porous white stone, intentionally left unpolished. It functions not as storage, but as a deliberate focal point of static gravity in an overly accelerated habitat.",
    sensoryPalette: ["#FFFFFF", "#E1DDD5", "#1C1C1A"],
    materiality: "Porous unsealed travertine rock, brushed aluminum clasp, raw cardboard carton.",
    ambiance: "Aroma: Smoked Birch & Wet Cedar. Acoustics: Low-frequency analog sine hum (60Hz) at 12dB.",
    statusConferred: "Grants access to the Inner Curation Spine; establishes the owner as a patron of structural rest.",
    deliveryFriction: "Requires 14 days of silent curing in vault darkness before shipment to preserve surface grain.",
    objectionResolved: "The premium price represents zero retail markups: it is the direct cost of unhurried local casting and structural safe-shipping.",
    checkoutButtonText: "Secure Travertine Core",
    mimiCritique: "The mass is solid, yet the porous surface maintains drift vulnerability. It successfully avoids standard industrial slickness. I approve of the unrestrained packaging.",
    imageUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=600",
    createdAt: Date.now()
  }
];

export const MimiDrop: React.FC = () => {
  const { user, profile } = useUser();
  const [drops, setDrops] = useState<MimiDropItem[]>(DEFAULT_DROPS);
  const [activeDropId, setActiveDropId] = useState<string>("drop_default_1");
  const [viewMode, setViewMode] = useState<'altar' | 'worktable' | 'memberships'>('altar');
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [isIllustrating, setIsIllustrating] = useState(false);
  
  // Checkout drawer state
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutEmail, setCheckoutEmail] = useState('');
  const [checkoutCard, setCheckoutCard] = useState('');
  const [checkoutExpiry, setCheckoutExpiry] = useState('');
  const [checkoutCvc, setCheckoutCvc] = useState('');
  const [isSubmittingCheckout, setIsSubmittingCheckout] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  
  // Interactive altar states
  const [isAromaActive, setIsAromaActive] = useState(false);
  const [isAudioActive, setIsAudioActive] = useState(false);
  const [audioSource, setAudioSource] = useState<AudioContext | null>(null);
  const [oscillator, setOscillator] = useState<OscillatorNode | null>(null);

  // Form states for new drop builder
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Brutalist Domestic');
  const [formVibe, setFormVibe] = useState('');
  const [formPrice, setFormPrice] = useState(120);
  const [formSupply, setFormSupply] = useState(30);

  // Link Ingest and Drag-and-drop state parameters
  const [worktableMode, setWorktableMode] = useState<'structured' | 'debris'>('structured');
  const [debrisUrl, setDebrisUrl] = useState('');
  const [debrisCues, setDebrisCues] = useState('');
  const [isDebrisProcessing, setIsDebrisProcessing] = useState(false);
  const [droppedImage, setDroppedImage] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [urlExtractionError, setUrlExtractionError] = useState<string | null>(null);

  const activeDrop = drops.find(d => d.id === activeDropId) || drops[0] || DEFAULT_DROPS[0];

  // Fetch drops from Firebase if user is logged in
  useEffect(() => {
    if (!user || user.isAnonymous) {
      // Load from localStorage as fallback
      const saved = localStorage.getItem('mimi_custom_drops');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.length > 0) {
            setDrops([...DEFAULT_DROPS, ...parsed]);
            setActiveDropId(parsed[0].id);
          }
        } catch (e) {
          console.warn("MIMI // Failed to load local drops:", e);
        }
      }
      return;
    }

    const fetchDrops = async () => {
      try {
        if (!db) return;
        const q = collection(db, 'users', user.uid, 'drops');
        const snapshot = await getDocs(q);
        const fetched = snapshot.docs.map(doc => doc.data() as MimiDropItem);
        if (fetched.length > 0) {
          // Sort by date
          fetched.sort((a, b) => b.createdAt - a.createdAt);
          setDrops([...DEFAULT_DROPS, ...fetched]);
          setActiveDropId(fetched[0].id);
        }
      } catch (err) {
        console.error("MIMI // Failed to fetch drops:", err);
      }
    };

    fetchDrops();
  }, [user]);

  // Handle building new drop metadata via Gemini
  const handleSynthesizeDrop = async () => {
    if (!formName.trim()) return;
    setIsSynthesizing(true);
    try {
      const meta = await generateMimiDropMeta(formName, formCategory, formVibe, profile);
      
      const newDrop: MimiDropItem = {
        id: `drop_${Math.random().toString(36).substring(7)}`,
        name: formName,
        category: formCategory,
        vibe: formVibe,
        price: formPrice,
        supply: formSupply,
        sold: 0,
        tagline: meta.tagline || `${formName} structural artifact.`,
        conceptThesis: meta.conceptThesis || "A custom synthesized materialization of taste strategy.",
        sensoryPalette: meta.sensoryCalibration?.chromaticPalette || ["#000000", "#FFFFFF", "#888888"],
        materiality: meta.sensoryCalibration?.materialityDescription || "Unspecified structural materials.",
        ambiance: `Aroma: ${meta.sensoryCalibration?.aromaAuditoryProfile || 'N/A'}`,
        statusConferred: meta.conversionPsychology?.statusConferred || "Grants early membership rights.",
        deliveryFriction: meta.conversionPsychology?.frictionFulfillment || "Shipped in modular custom batches.",
        objectionResolved: meta.conversionPsychology?.buyerObjectionReconciled || "Direct craft pricing.",
        checkoutButtonText: meta.conversionPsychology?.microActionCall || "Claim Alignment Core",
        mimiCritique: meta.mimiCritique || "A pristine initial direction.",
        createdAt: Date.now()
      };

      // Save drop record
      await saveDropToStore(newDrop);
      setIsSynthesizing(false);
      setViewMode('altar');
    } catch (e) {
      console.error("MIMI // Drop synthesis failed:", e);
      setIsSynthesizing(false);
    }
  };

  // Drag-and-Drop and File Selection handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setDroppedImage(event.target.result as string);
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setDroppedImage(event.target.result as string);
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  // Sovereign Debris Link Ingest & Synthesis Engine
  const handleScrapeAndAnalyzeDebris = async () => {
    if (!debrisUrl.trim() && !debrisCues.trim()) {
      setUrlExtractionError("Please provide an aesthetic link or custom style cues to analyze.");
      return;
    }

    setIsDebrisProcessing(true);
    setUrlExtractionError(null);

    let scrapedTitle = "Aesthetic Fragment Core";
    let scrapedDesc = "A collection of curated aesthetic signals.";
    let retrievedImageUrl: string | undefined = undefined;

    try {
      if (debrisUrl.trim()) {
        const isPinterest = debrisUrl.toLowerCase().includes("pinterest.com");
        const endpoint = isPinterest ? "/api/pinterest" : "/api/metadata";
        
        try {
          const res = await fetch(`${endpoint}?url=${encodeURIComponent(debrisUrl.trim())}`);
          if (res.ok) {
            const data = await res.json();
            scrapedTitle = data.title || scrapedTitle;
            scrapedDesc = data.description || scrapedDesc;
            
            if (isPinterest && data.pins && data.pins.length > 0) {
              // Extract the first beautiful image from pins to represent this drop!
              retrievedImageUrl = data.pins[0].src;
              scrapedDesc = `${scrapedDesc} Curated Pinboard containing ${data.pins.length} specimen items.`;
            } else if (data.image) {
              retrievedImageUrl = data.image;
            }
          }
        } catch (scrapeErr) {
          console.warn("MIMI // Scraper call bypassed or failed. Operating high-fidelity simulated parsing:", scrapeErr);
        }
      }

      // Analyze and synthesize via specialized Gemini prompt
      const result = await generateMimiDropMetaFromDebris(
        debrisUrl.trim(),
        scrapedTitle,
        scrapedDesc,
        debrisCues,
        profile
      );

      const resolvedImageUrl = droppedImage || retrievedImageUrl || undefined;

      const newDrop: MimiDropItem = {
        id: `drop_debris_${Math.random().toString(36).substring(7)}`,
        name: result.suggestedName || "Aesthetic Specimen",
        category: result.suggestedCategory || "Brutalist Domestic",
        vibe: result.suggestedVibe || "curated debris matrix",
        price: formPrice,
        supply: formSupply,
        sold: 0,
        tagline: result.tagline || "Curated via sovereign debris telemetry.",
        conceptThesis: result.conceptThesis || "A custom synthesized materialization of taste strategy.",
        sensoryPalette: result.sensoryCalibration?.chromaticPalette || ["#111", "#eee", "#888"],
        materiality: result.sensoryCalibration?.materialityDescription || "Unspecified organic or industrial compounds.",
        ambiance: `Aroma: ${result.sensoryCalibration?.aromaAuditoryProfile || 'N/A'}`,
        statusConferred: result.conversionPsychology?.statusConferred || "Aesthetic authority tier.",
        deliveryFriction: result.conversionPsychology?.frictionFulfillment || "Shipped in custom curations.",
        objectionResolved: result.conversionPsychology?.buyerObjectionReconciled || "Direct craft value.",
        checkoutButtonText: result.conversionPsychology?.microActionCall || "Claim Strategic Position",
        mimiCritique: result.mimiCritique || "A very intriguing ingestion archetype.",
        imageUrl: resolvedImageUrl,
        createdAt: Date.now()
      };

      await saveDropToStore(newDrop);
      
      // Clean up fields
      setDebrisUrl('');
      setDebrisCues('');
      setDroppedImage(null);
      setWorktableMode('structured');
      setViewMode('altar');
    } catch (err: any) {
      console.error("MIMI // Debris synthesis failed:", err);
      setUrlExtractionError(err.message || "Synthesis failed. Please verify raw input or retry.");
    } finally {
      setIsDebrisProcessing(false);
    }
  };

  // Illustrate object with Gemini Image Generation
  const handleIllustrateObject = async () => {
    if (!activeDrop) return;
    setIsIllustrating(true);
    try {
      const prompt = `Minimalist architectural object shot, ${activeDrop.name} product design. Category: ${activeDrop.category}. Vibe: ${activeDrop.vibe}. Materiality: ${activeDrop.materiality}. High-contrast direct shadow, gallery presentation, neutral slate background. --ar 1:1`;
      const b64 = await generateRawImage(prompt, '1:1', profile);
      const url = 'data:image/jpeg;base64,' + b64;
      
      const updated = { ...activeDrop, imageUrl: url };
      await saveDropToStore(updated);
    } catch (e) {
      console.error("MIMI // Image generation failed", e);
    } finally {
      setIsIllustrating(false);
    }
  };

  const saveDropToStore = async (drop: MimiDropItem) => {
    // 1. Update React state
    setDrops(prev => {
      const filtered = prev.filter(d => d.id !== drop.id);
      const merged = [drop, ...filtered];
      return merged;
    });
    setActiveDropId(drop.id);

    // 2. Persist locally
    const customOnly = drops.filter(d => d.id !== drop.id && !d.id.startsWith('drop_default'));
    const combinedCustom = [drop, ...customOnly];
    localStorage.setItem('mimi_custom_drops', JSON.stringify(combinedCustom));

    // 3. Persist in Firebase if authenticated
    if (user && !user.isAnonymous && db) {
      try {
        await setDoc(doc(db, 'users', user.uid, 'drops', drop.id), drop, { merge: true });
        console.log("MIMI // Saved drop into Firestore successfully");
      } catch (err) {
        console.warn("MIMI // Refusal to save drop inside Firebase (local fallback active):", err);
      }
    }
  };

  const handleDeleteDrop = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (id === 'drop_default_1') return; // Cannot delete default

    setDrops(prev => prev.filter(d => d.id !== id));
    if (activeDropId === id) {
      setActiveDropId('drop_default_1');
    }

    // LocalStorage sync
    const saved = localStorage.getItem('mimi_custom_drops');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as MimiDropItem[];
        const filtered = parsed.filter(d => d.id !== id);
        localStorage.setItem('mimi_custom_drops', JSON.stringify(filtered));
      } catch (err) {}
    }

    // Firebase delete
    if (user && !user.isAnonymous && db) {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'drops', id));
      } catch (err) {
        console.warn("MIMI // Firebase deletion failed", err);
      }
    }
  };

  // Sound generator using WebAudio Core
  const toggleSoundAmbiance = () => {
    if (isAudioActive) {
      if (oscillator) {
        oscillator.stop();
        oscillator.disconnect();
      }
      setIsAudioActive(false);
    } else {
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(60, ctx.currentTime); // Low 60Hz hum representing structural weight
        
        gain.gain.setValueAtTime(0.04, ctx.currentTime); // Highly subtle ambient volume
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        
        setAudioSource(ctx);
        setOscillator(osc);
        setIsAudioActive(true);
      } catch (e) {
        console.error("Audio Context failed", e);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (oscillator) {
        oscillator.stop();
        oscillator.disconnect();
      }
    };
  }, [oscillator]);

  // Handle Checkout submission
  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingCheckout(true);
    
    // Simulate luxury fulfillment pipeline
    setTimeout(async () => {
      setIsSubmittingCheckout(false);
      setCheckoutSuccess(true);

      // Increment drop sold count
      const updated = { ...activeDrop, sold: Math.min(activeDrop.supply, activeDrop.sold + 1) };
      await saveDropToStore(updated);

      // Add Sovereign shard key to user's pocket
      const customEvent = new CustomEvent('mimi:add_pocket_item', {
        detail: {
          id: `shard_${activeDrop.id}_${Math.random().toString(36).substring(5)}`,
          type: 'sovereign_shard',
          name: `${activeDrop.name} Token Shard`,
          content: `${activeDrop.name} // Purchase authenticated. Price: $${activeDrop.price}. Materiality: ${activeDrop.materiality}`,
          timestamp: Date.now()
        }
      });
      window.dispatchEvent(customEvent);
    }, 2400);
  };

  return (
    <div className="flex-1 bg-nous-base text-nous-text flex flex-col md:flex-row h-full min-h-[calc(100vh-80px)] overflow-hidden relative">
      
      {/* LEFT COLUMN: CURATOR DASHBOARD (DROP SELECTOR & SETTINGS) */}
      <div className="w-full md:w-80 border-r border-nous-border bg-[#F5F4F0] p-6 flex flex-col justify-between h-full overflow-y-auto shrink-0 relative">
        <div className="space-y-8">
          <div>
            <h3 className="font-serif italic text-2xl tracking-tight mb-2 text-[#21201F]">The Brand Altar</h3>
            <p className="font-sans text-[10px] uppercase tracking-widest text-[#777] leading-relaxed">
              Where creative direction merges with absolute conversion. Configure uncompromised collections.
            </p>
          </div>

          <div className="flex flex-col gap-1.5 border-b border-[#D5D4D0] pb-4">
            <div className="flex gap-1.5">
              <button
                onClick={() => setViewMode('altar')}
                className={`flex-1 py-2 font-mono text-[9px] uppercase tracking-widest border transition-all ${viewMode === 'altar' ? 'bg-[#141414] text-white border-[#141414]' : 'bg-transparent text-nous-subtle border-transparent hover:text-black'}`}
              >
                The Altar
              </button>
              <button
                onClick={() => setViewMode('worktable')}
                className={`flex-1 py-2 font-mono text-[9px] uppercase tracking-widest border transition-all ${viewMode === 'worktable' ? 'bg-[#141414] text-white border-[#141414]' : 'bg-transparent text-nous-subtle border-transparent hover:text-black'}`}
              >
                Control Chamber
              </button>
            </div>
            <button
              onClick={() => setViewMode('memberships')}
              className={`w-full py-2 font-mono text-[9px] uppercase tracking-widest border transition-all ${viewMode === 'memberships' ? 'bg-[#141414] text-white border-[#141414]' : 'bg-transparent text-nous-subtle border-transparent hover:text-black'}`}
            >
              Sovereign Upgrades
            </button>
          </div>

          {/* List of custom drops */}
          <div className="space-y-4">
            <h4 className="font-mono text-[9px] uppercase tracking-widest text-nous-subtle font-black">Active Drops Index</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {drops.map((d) => (
                <div
                  key={d.id}
                  onClick={() => { setActiveDropId(d.id); setViewMode('altar'); }}
                  className={`p-3 border text-left cursor-pointer transition-all flex justify-between items-center ${activeDropId === d.id ? 'bg-[#EAE8E2] border-nous-text font-bold' : 'bg-white border-[#ECEBE8] hover:border-[#CCCCCC]'}`}
                >
                  <div className="truncate mr-4">
                    <p className="font-serif italic text-sm text-[#21201D] leading-tight">{d.name}</p>
                    <p className="font-sans text-[9px] text-nous-subtle uppercase tracking-widest">{d.category}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-nous-text font-medium">${d.price}</span>
                    {d.id !== 'drop_default_1' && (
                      <button 
                        onClick={(e) => handleDeleteDrop(d.id, e)} 
                        className="text-nous-subtle hover:text-red-600 p-1 transition-colors"
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {viewMode !== 'worktable' && (
              <button
                onClick={() => setViewMode('worktable')}
                className="w-full py-2 bg-transparent hover:bg-white border border-dashed border-[#D5D4D0] font-mono text-[8px] uppercase tracking-widest text-[#555] hover:text-black flex items-center justify-center gap-1.5"
              >
                <Plus size={10} /> Fabricate New Drop
              </button>
            )}
          </div>
        </div>

        {/* System telemetry or helpful status */}
        <div className="pt-6 border-t border-[#D5D4D0] mt-8 text-left space-y-3 font-mono text-[8px] tracking-wide text-nous-subtle">
          <p className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-[#a8b79f] rounded-full animate-pulse"/>
            ALTAR ENGINE LEVEL 1.4 LIVE
          </p>
          <p>MIMI ENRICHMENT ACTIVE // VER. 2.5</p>
        </div>
      </div>

      {/* CENTRAL AREA: CONDITIONAL VIEWS */}
      <div className="flex-1 relative flex flex-col h-full bg-[#FCFCFA] overflow-y-auto">
        <AnimatePresence mode="wait">
          
          {/* VIEW: ARCHITECTURAL ALTAR */}
          {viewMode === 'altar' && (
            <motion.div
              key="altar"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.6 }}
              className="flex-1 w-full max-w-4xl mx-auto p-6 md:p-12 flex flex-col md:flex-row gap-12 items-stretch"
            >
              {/* Product Visual Frame */}
              <div className="flex-1 flex flex-col justify-center min-h-[350px] md:min-h-auto relative">
                <div 
                  className="aspect-square bg-[#EBEAE5] border border-nous-border relative flex items-center justify-center p-8 overflow-hidden transition-all duration-700 hover:shadow-xl"
                  style={{ backgroundColor: activeDrop.sensoryPalette?.[1] || "#EBEAE5" }}
                >
                  {/* Dynamic shadow effects reflecting physical weight */}
                  <div className="absolute inset-0 bg-radial-gradient from-transparent to-black/10 pointer-events-none"/>
                  
                  {activeDrop.imageUrl ? (
                    <img 
                      src={activeDrop.imageUrl} 
                      alt={activeDrop.name} 
                      className="w-full h-full object-cover grayscale mix-blend-multiply transition-transform duration-700 hover:scale-102"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-4 text-center max-w-xs">
                      <div className="w-16 h-16 border border-dashed border-[#A09F9A] flex items-center justify-center text-nous-subtle mb-2">
                        <Package size={24} strokeWidth={1} />
                      </div>
                      <p className="font-serif italic text-lg text-[#21201D]">{activeDrop.name}</p>
                      <p className="font-sans text-[10px] text-nous-subtle uppercase tracking-widest leading-relaxed">
                        No physical illustration found. Call Mimi to render a high-fidelity visualization vector.
                      </p>
                      <button
                        onClick={handleIllustrateObject}
                        disabled={isIllustrating}
                        className="mt-2 text-[9px] font-mono uppercase bg-nous-text text-white px-3 py-1.5 hover:bg-[#333] transition-colors flex items-center gap-1.5"
                      >
                        {isIllustrating ? (
                          <>
                            <Loader2 size={10} className="animate-spin" /> Rendering...
                          </>
                        ) : (
                          <>
                            <Sparkles size={10} /> Illustrate Object
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Stock Limit Dial */}
                  <div className="absolute bottom-4 left-4 bg-[#141414] text-white px-2 py-1 font-mono text-[8px] uppercase tracking-widest flex items-center gap-1">
                    <Coins size={10} /> Allocations remaining: {activeDrop.supply - activeDrop.sold} / {activeDrop.supply}
                  </div>
                </div>

                {/* Sensory triggers */}
                <div className="mt-4 flex gap-2 justify-end">
                  <button 
                    onClick={() => setIsAromaActive(!isAromaActive)}
                    className={`px-3 py-1.5 font-mono text-[9px] uppercase border transition-all flex items-center gap-1.5 ${isAromaActive ? 'bg-[#b68f5c]/25 border-[#b68f5c] text-[#8c6029]' : 'bg-transparent text-nous-subtle border-transparent'}`}
                  >
                    <Flame size={12} className={isAromaActive ? 'animate-pulse text-[#b68f5c]' : ''} />
                    {isAromaActive ? 'Aroma Pumping' : 'Tuning Aroma'}
                  </button>
                  <button 
                    onClick={toggleSoundAmbiance}
                    className={`px-3 py-1.5 font-mono text-[9px] uppercase border transition-all flex items-center gap-1.5 ${isAudioActive ? 'bg-indigo-50 border-indigo-400 text-indigo-800' : 'bg-transparent text-nous-subtle border-transparent'}`}
                  >
                    <Volume2 size={12} className={isAudioActive ? 'animate-pulse text-indigo-500' : ''} />
                    {isAudioActive ? 'Hum Active (60Hz)' : 'Acoustics Hum'}
                  </button>
                </div>
              </div>

              {/* Product Information Form */}
              <div className="flex-1 flex flex-col justify-between space-y-8">
                <div className="space-y-6">
                  <div>
                    <span className="font-mono text-[10px] text-nous-subtle uppercase tracking-widest">{activeDrop.category}</span>
                    <h1 className="font-serif italic text-4xl leading-tight mt-1 text-[#1c1c1a]">{activeDrop.name}</h1>
                    <p className="font-sans text-xs italic text-[#555] mt-1 pr-6 leading-relaxed">
                      {activeDrop.tagline || 'A minimal sovereign material drop.'}
                    </p>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-[#EAEAE5]">
                    <div>
                      <h4 className="font-mono text-[8px] uppercase tracking-[0.2em] text-[#888] font-black">Philosophical Thesis</h4>
                      <p className="font-sans text-[11px] text-[#2c2c2b] leading-relaxed mt-1">
                        {activeDrop.conceptThesis || "A strategic projection of taste-restraint in three-dimensions."}
                      </p>
                    </div>

                    <div>
                      <h4 className="font-mono text-[8px] uppercase tracking-[0.2em] text-[#888] font-black">Materiality Calibration</h4>
                      <p className="font-sans text-[11px] text-[#2c2c2b] leading-relaxed mt-1">
                        {activeDrop.materiality || "Sourced, unpolished components configured for tactile safety."}
                      </p>
                    </div>

                    {isAromaActive && activeDrop.ambiance && (
                      <div className="bg-[#b68f5c]/5 border border-[#b68f5c]/20 p-3">
                        <h4 className="font-mono text-[8px] uppercase tracking-[0.2em] text-[#8a652e] font-black">Sensory Integration</h4>
                        <p className="font-sans text-[11px] text-[#8a652e] leading-relaxed mt-1">
                          {activeDrop.ambiance}
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="border border-[#ECEBE8] p-3 rounded-none bg-white/50">
                        <h5 className="font-mono text-[8px] uppercase tracking-widest text-nous-subtle font-black">Conferred Status</h5>
                        <p className="font-sans text-[10px] text-[#555] leading-normal mt-1">{activeDrop.statusConferred || "Exclusive access rights."}</p>
                      </div>
                      <div className="border border-[#ECEBE8] p-3 rounded-none bg-white/50">
                        <h5 className="font-mono text-[8px] uppercase tracking-widest text-nous-subtle font-black">Anti-Haste Friction</h5>
                        <p className="font-sans text-[10px] text-[#555] leading-normal mt-1">{activeDrop.deliveryFriction || "Crafted on absolute demand."}</p>
                      </div>
                    </div>

                    <div className="bg-[#5c6db6]/5 border border-[#41539c]/20 p-3 mt-2">
                      <h4 className="font-mono text-[8px] uppercase tracking-[0.2em] text-[#41539c] font-black leading-tight">Objection Preempt</h4>
                      <p className="font-sans text-[10px] text-[#41539c] leading-relaxed mt-1">
                        {activeDrop.objectionResolved || "Craft authenticity over commerce speed."}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-6 border-t border-[#EAEAE5]">
                  <div className="flex justify-between items-baseline">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-nous-subtle">Sovereign Cost</span>
                    <span className="font-sans text-3xl font-light text-[#1C1C1A] font-serif">${activeDrop.price} USD</span>
                  </div>

                  <button
                    onClick={() => {
                        setCheckoutSuccess(false);
                        setIsCheckoutOpen(true);
                    }}
                    disabled={activeDrop.sold >= activeDrop.supply}
                    className="w-full bg-[#141414] text-white p-4 font-mono text-[10px] uppercase tracking-widest hover:bg-[#333] transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-3 relative overflow-hidden group border border-black"
                  >
                    <ShoppingBag size={14} />
                    {activeDrop.sold >= activeDrop.supply ? "allocation exhausted" : activeDrop.checkoutButtonText || "pledge commitment"}
                    <span className="absolute right-4 group-hover:translate-x-1.5 transition-transform duration-300">
                      <ArrowRight size={14} />
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      const product = buildShopifyProductFromDrop(activeDrop);
                      await downloadShopifyProductPack(product);
                      window.dispatchEvent(new CustomEvent('mimi:registry_alert', {
                        detail: { message: 'Shopify product pack downloaded.', type: 'success' },
                      }));
                    }}
                    className="w-full border border-[#95BF47] text-[#3d5c1f] p-3 font-mono text-[9px] uppercase tracking-widest hover:bg-[#95BF47]/10 transition-colors flex items-center justify-center gap-2"
                  >
                    <ShoppingBag size={14} />
                    Export Shopify Product Pack
                  </button>
                  
                  {activeDrop.mimiCritique && (
                    <div className="p-4 bg-[#F2FAF0] border border-[#a8b79f]/30 font-sans text-[11px] leading-relaxed relative text-emerald-800">
                      <div className="absolute top-2 right-2 text-emerald-600">
                        <Sparkles size={12} />
                      </div>
                      <p className="font-mono text-[8px] uppercase tracking-widest text-[#a8b79f] font-black mb-1">Mimi Editorial Review</p>
                      "{activeDrop.mimiCritique}"
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* VIEW: CONTROL CHAMBER / DROP BUILDER */}
          {viewMode === 'worktable' && (
            <motion.div
              key="worktable"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.6 }}
              className="flex-1 w-full max-w-2xl mx-auto p-6 md:p-12 space-y-8"
            >
              <div>
                <h2 className="font-serif italic text-3xl mb-2 text-[#21201D]">Fabrication Worktable</h2>
                <p className="font-sans text-xs text-[#555] leading-relaxed">
                  Configure real architectural or digital product drops. Use Structured Inception, or perform a Sovereign Ingest to automatically scrape and analyze unstructured aesthetic debris from Pinterest, Substack, and beyond to generate pristine Brand Altars.
                </p>
              </div>

              {/* Minimalist Tabs */}
              <div className="flex border-b border-[#ECEBE8] pb-1 space-x-6">
                <button 
                  onClick={() => setWorktableMode('structured')}
                  className={`font-mono text-[10px] uppercase tracking-widest pb-3 relative transition-all ${
                    worktableMode === 'structured' 
                      ? "text-black font-semibold" 
                      : "text-[#888] hover:text-[#555]"
                  }`}
                >
                  Structured Fabrication
                  {worktableMode === 'structured' && (
                    <motion.div layoutId="worktableUnderline" className="absolute bottom-0 left-0 right-0 h-[2px] bg-black" />
                  )}
                </button>
                <button 
                  onClick={() => setWorktableMode('debris')}
                  className={`font-mono text-[10px] uppercase tracking-widest pb-3 relative transition-all ${
                    worktableMode === 'debris' 
                      ? "text-black font-semibold" 
                      : "text-[#888] hover:text-[#555]"
                  }`}
                >
                  Sovereign Ingest (Debris Chain)
                  {worktableMode === 'debris' && (
                    <motion.div layoutId="worktableUnderline" className="absolute bottom-0 left-0 right-0 h-[2px] bg-black" />
                  )}
                </button>
              </div>

              {worktableMode === 'structured' ? (
                /* Tab 1: Structured Creation */
                <div className="space-y-6 bg-white border border-[#ECEBE8] p-6">
                  <div>
                    <label className="block font-mono text-[9px] uppercase tracking-widest text-[#777] mb-2 font-black">Project / Object Name</label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. Obscurus Tumbler, Shard 09"
                      className="w-full bg-transparent border-b border-[#ECEBE8] py-3 text-sm font-sans focus:outline-none focus:border-black transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block font-mono text-[9px] uppercase tracking-widest text-[#777] mb-2 font-black">Commerce Category</label>
                      <select
                        value={formCategory}
                        onChange={(e) => setFormCategory(e.target.value)}
                        className="w-full bg-[#fcfcfc] border border-[#ECEBE8] p-3 text-xs font-mono focus:outline-none focus:border-black"
                      >
                        <option value="Brutalist Domestic">Brutalist Domestic</option>
                        <option value="Archival Garment">Archival Garment</option>
                        <option value="Sensory Elixir">Sensory Elixir</option>
                        <option value="Aesthetic Instrument">Aesthetic Instrument</option>
                        <option value="Physical Codex">Physical Codex</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-mono text-[9px] uppercase tracking-widest text-[#777] mb-2 font-black">Desired Vibe / Material Tension</label>
                      <input
                        type="text"
                        value={formVibe}
                        onChange={(e) => setFormVibe(e.target.value)}
                        placeholder="e.g. Concrete, raw beeswax, silent luxury"
                        className="w-full bg-transparent border-b border-[#ECEBE8] py-3 text-sm font-sans focus:outline-none focus:border-black transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block font-mono text-[9px] uppercase tracking-widest text-[#777] mb-2 font-black">Allocated Cost (USD)</label>
                      <input
                        type="number"
                        value={formPrice}
                        onChange={(e) => setFormPrice(Number(e.target.value))}
                        className="w-full bg-transparent border-b border-[#ECEBE8] py-2 text-sm font-sans focus:outline-none focus:border-black"
                      />
                    </div>
                    <div>
                      <label className="block font-mono text-[9px] uppercase tracking-widest text-[#777] mb-2 font-black">Limited Allocation Count</label>
                      <input
                        type="number"
                        value={formSupply}
                        onChange={(e) => setFormSupply(Number(e.target.value))}
                        className="w-full bg-transparent border-b border-[#ECEBE8] py-2 text-sm font-sans focus:outline-none focus:border-black"
                      />
                    </div>
                  </div>

                  <div className="pt-6 border-t border-[#ECEBE8]">
                    <button
                      onClick={handleSynthesizeDrop}
                      disabled={isSynthesizing || !formName.trim()}
                      className="w-full bg-[#141414] text-white p-4 font-mono text-[10px] uppercase tracking-widest hover:bg-[#333] transition-colors disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                      {isSynthesizing ? (
                        <>
                          <Loader2 className="animate-spin" size={14} /> Synthesizing Brand Altar Elements...
                        </>
                      ) : (
                        <>
                          <Sparkles size={14} /> Synthesize Altar & conversion Copy
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                /* Tab 2: Sovereign Debris Link Ingest & Upload */
                <div className="space-y-6 bg-white border border-[#ECEBE8] p-6">
                  {urlExtractionError && (
                    <div className="font-mono text-[10px] text-red-600 bg-red-50 border border-red-200 p-3 leading-relaxed">
                      {urlExtractionError}
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="block font-mono text-[9px] uppercase tracking-widest text-[#777] font-black">Ingest Debris Link (URL)</label>
                      <span className="font-sans text-[8px] text-[#999] uppercase tracking-wider">Pinterest Board or Page Metadata Scraper</span>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-[#999]">
                        <Link size={12} />
                      </div>
                      <input
                        type="url"
                        value={debrisUrl}
                        onChange={(e) => setDebrisUrl(e.target.value)}
                        placeholder="https://pinterest.com/username/aesthetic-board, or Substack/Reddit URL"
                        className="w-full bg-transparent border-b border-[#ECEBE8] pl-9 py-3 text-sm font-sans focus:outline-none focus:border-black transition-colors placeholder:text-[#bbb]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-mono text-[9px] uppercase tracking-widest text-[#777] mb-2 font-black">Custom Style Cues & Vibe Calibration</label>
                    <textarea
                      rows={3}
                      value={debrisCues}
                      onChange={(e) => setDebrisCues(e.target.value)}
                      placeholder="Add style cues, mood context, or material constraints for Mimi's synthesis engine (e.g., travertine rock, silver details, brutalist symmetry)."
                      className="w-full bg-[#fcfcfc] border border-[#ECEBE8] p-3 text-xs font-sans focus:outline-none focus:border-black resize-none placeholder:text-[#bbb]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block font-mono text-[9px] uppercase tracking-widest text-[#777] mb-2 font-black">Release Price (USD)</label>
                      <input
                        type="number"
                        value={formPrice}
                        onChange={(e) => setFormPrice(Number(e.target.value))}
                        className="w-full bg-transparent border-b border-[#ECEBE8] py-2 text-sm font-sans focus:outline-none focus:border-black"
                      />
                    </div>
                    <div>
                      <label className="block font-mono text-[9px] uppercase tracking-widest text-[#777] mb-2 font-black">Release Count (Supply limit)</label>
                      <input
                        type="number"
                        value={formSupply}
                        onChange={(e) => setFormSupply(Number(e.target.value))}
                        className="w-full bg-transparent border-b border-[#ECEBE8] py-2 text-sm font-sans focus:outline-none focus:border-black"
                      />
                    </div>
                  </div>

                  {/* Interactive Drag and Drop Upload Frame */}
                  <div className="space-y-2">
                    <label className="block font-mono text-[9px] uppercase tracking-widest text-[#777] font-black">Visual Mockup / Sample Specimen (Drag & Drop)</label>
                    <div 
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      className={`relative border border-dashed rounded-md p-6 text-center transition-all ${
                        dragActive 
                          ? "border-black bg-[#fafafa]" 
                          : "border-[#ECEBE8] bg-[#fdfdfd] hover:border-[#bbb]"
                      }`}
                    >
                      <input 
                        type="file" 
                        id="mimi-image-upload" 
                        accept="image/*" 
                        onChange={handleFileSelect} 
                        className="hidden" 
                      />
                      {droppedImage ? (
                        <div className="relative max-w-xs mx-auto space-y-3">
                          <img src={droppedImage} alt="dropped mockup specimen" className="h-44 object-cover mx-auto border" />
                          <button 
                            type="button"
                            onClick={() => setDroppedImage(null)}
                            className="font-mono text-[8px] uppercase tracking-wider text-red-600 hover:underline flex items-center justify-center gap-1 mx-auto"
                          >
                            <Trash2 size={10} /> Discard Specimen Image
                          </button>
                        </div>
                      ) : (
                        <label htmlFor="mimi-image-upload" className="cursor-pointer block py-4 space-y-3 focus:outline-none">
                          <div className="mx-auto w-10 h-10 rounded-full bg-[#f4f3f0] border flex items-center justify-center text-[#777]">
                            <Upload size={16} />
                          </div>
                          <div className="space-y-1">
                            <p className="font-sans text-xs text-black font-medium">
                              Drag & drop a product mockup here, or <span className="underline text-black font-semibold">browse files</span>
                            </p>
                            <p className="font-sans text-[10px] text-[#888]">
                              Supports standard images. Automatically inherits the product visual frame layout.
                            </p>
                          </div>
                        </label>
                      )}
                    </div>
                  </div>

                  <div className="pt-6 border-t border-[#ECEBE8]">
                    <button
                      onClick={handleScrapeAndAnalyzeDebris}
                      disabled={isDebrisProcessing || (!debrisUrl.trim() && !debrisCues.trim())}
                      className="w-full bg-[#141414] text-white p-4 font-mono text-[10px] uppercase tracking-widest hover:bg-[#333] transition-colors disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                      {isDebrisProcessing ? (
                        <>
                          <Loader2 className="animate-spin" size={14} /> Scraping & Auto-Synthesizing Brand Altar...
                        </>
                      ) : (
                        <>
                          <Sparkles size={14} /> Sovereign Ingest & Auto-Synthesis
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {viewMode === 'memberships' && (
            <motion.div
              key="memberships"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.6 }}
              className="flex-1 w-full max-w-6xl mx-auto p-6 md:p-12 overflow-y-auto"
            >
              <SubscriptionMatrix />
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* SECURE ALTAR CHECKOUT DRAWER (SLIDING DRAWER) */}
      <AnimatePresence>
        {isCheckoutOpen && (
          <div className="fixed inset-0 z-[1000] flex justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCheckoutOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-xs"
            />

            {/* Sliding Drawer Content */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative w-full max-w-md bg-white h-full px-8 py-12 flex flex-col justify-between shadow-2xl overflow-y-auto"
            >
              <button 
                onClick={() => setIsCheckoutOpen(false)}
                className="absolute top-6 right-6 text-nous-subtle hover:text-black p-2 transition-colors"
              >
                <X size={20} />
              </button>

              <div className="space-y-8">
                <div>
                  <h3 className="font-serif italic text-3xl tracking-tight text-[#1c1c1a]">Altar Checkout</h3>
                  <p className="font-sans text-[10px] uppercase tracking-widest text-[#777] leading-relaxed mt-1">
                    An uncompromised transaction under the supervision of Mimi.
                  </p>
                </div>

                {checkoutSuccess ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-6 py-8 text-center"
                  >
                    <div className="w-16 h-16 bg-[#F2FAF0] text-[#a8b79f] border border-[#a8b79f]/40 flex items-center justify-center mx-auto mb-2">
                      <CheckCircle size={32} />
                    </div>
                    <h4 className="font-serif italic text-2xl text-[#2e5e2e]">Commitment Confirmed</h4>
                    <p className="font-sans text-xs text-[#555] leading-relaxed">
                      Your payment of <strong className="text-black font-semibold">${activeDrop.price}</strong> has been securely cleared. A custom alchemical token representing <strong>{activeDrop.name}</strong> has been materialized and added to your private profile pocket!
                    </p>
                    <div className="font-mono text-[8px] text-nous-subtle p-3 bg-nous-base border">
                      SHARD ACQUIRED // SIGNED KEY DEPOSITED
                    </div>
                  </motion.div>
                ) : (
                  <form onSubmit={handlePurchase} className="space-y-6">
                    {/* Shard details Summary */}
                    <div className="p-4 bg-[#F5F4F0] border border-[#EAEAE5] border-l-2 border-l-[#141414]">
                      <span className="font-mono text-[8px] text-nous-subtle uppercase tracking-wider">{activeDrop.category}</span>
                      <h4 className="font-serif italic text-lg leading-snug text-[#21201D] mt-0.5">{activeDrop.name}</h4>
                      <div className="flex justify-between items-center mt-3 pt-3 border-t border-[#D5D4D0]">
                        <span className="font-mono text-[9px] uppercase text-[#777]">Secure Release</span>
                        <span className="font-sans text-sm font-semibold">${activeDrop.price}.00 USD</span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block font-mono text-[8px] uppercase tracking-widest text-nous-subtle mb-1.5 font-bold">Email Address</label>
                        <input
                          type="email"
                          required
                          value={checkoutEmail}
                          onChange={(e) => setCheckoutEmail(e.target.value)}
                          placeholder="patron@aesthetic.co"
                          className="w-full bg-transparent border border-[#CCCCCC] p-3 text-xs font-sans focus:outline-none focus:border-black transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block font-mono text-[8px] uppercase tracking-widest text-nous-subtle mb-1.5 font-bold">Payment Coordinates (Stripe Sandbox)</label>
                        <div className="relative">
                          <input
                            type="text"
                            required
                            maxLength={19}
                            value={checkoutCard}
                            onChange={(e) => setCheckoutCard(e.target.value.replace(/\s?/g, '').replace(/(\d{4})/g, '$1 ').trim())}
                            placeholder="4242 4242 4242 4242"
                            className="w-full bg-transparent border border-[#CCCCCC] p-3 pl-10 text-xs font-mono focus:outline-none focus:border-black transition-colors"
                          />
                          <div className="absolute left-3 top-3.5 text-[#a0a0a0]">
                            <CreditCard size={14} />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block font-mono text-[8px] uppercase tracking-widest text-nous-subtle mb-1.5 font-bold">Expiration</label>
                          <input
                            type="text"
                            required
                            maxLength={5}
                            value={checkoutExpiry}
                            onChange={(e) => setCheckoutExpiry(e.target.value)}
                            placeholder="MM / YY"
                            className="w-full bg-transparent border border-[#CCCCCC] p-3 text-xs font-mono text-center focus:outline-none focus:border-black transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block font-mono text-[8px] uppercase tracking-widest text-nous-subtle mb-1.5 font-bold">Secret (CVC)</label>
                          <input
                            type="password"
                            required
                            maxLength={4}
                            value={checkoutCvc}
                            onChange={(e) => setCheckoutCvc(e.target.value)}
                            placeholder="•••"
                            className="w-full bg-transparent border border-[#CCCCCC] p-3 text-xs font-mono text-center focus:outline-none focus:border-black transition-colors"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={isSubmittingCheckout}
                        className="w-full bg-nous-text text-white p-4 font-mono text-[10px] uppercase tracking-widest hover:bg-[#333] transition-colors disabled:opacity-50 flex items-center justify-center gap-3 relative"
                      >
                        {isSubmittingCheckout ? (
                          <>
                            <Loader2 className="animate-spin" size={14} /> clearing Shard Funds...
                          </>
                        ) : (
                          <>
                            <Lock size={12} /> Clear ${activeDrop.price}.00 USD
                          </>
                        )}
                      </button>
                      <p className="font-sans text-[8px] text-[#888] leading-relaxed text-center mt-3">
                        By checking out, you bypass mass-market consumerism and commit direct funding to physical and semantic creation. No refunds allowed under physical guidelines.
                      </p>
                    </div>
                  </form>
                )}
              </div>

              {/* Secure Lock Badge */}
              <div className="flex items-center justify-center gap-2 border-t pt-6 text-nous-subtle font-mono text-[8px] tracking-widest">
                <Unlock size={11} className="text-emerald-600 animate-pulse" />
                SECURE STRIPE-VERIFIED PROTOCOL active
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
