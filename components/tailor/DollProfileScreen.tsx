import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Sparkles, Sliders, Shield, RefreshCw, Send, Play, Heart, 
  Star, Crosshair, ArrowLeft, Layers, Cpu, Eye, Palette, 
  HelpCircle, Volume2, Info, BookOpen, AlertTriangle
} from "lucide-react";
import type { Doll, DollMask } from '../../types';
import { DollPortraitStage } from "./DollPortraitStage";
import { getAIProvider } from '../../services/aiProvider';
import { DollHouseDressingRoom } from "./DollHouseDressingRoom";
import { useUser } from '../../contexts/UserContext';
import {
  ensureDefaultDollMasks,
  listDollMasks,
  updateDoll,
} from '../../services/tailorService';
import {
  buildIdentityViewPrompt,
  identityPackCompleteness,
  mergeIdentityReference,
  type DollIdentityView,
} from '../../services/dollEngine';

interface DollProfileScreenProps {
  doll: Doll;
  onBack: () => void;
  onContinue: () => void;
}

interface CultAccessory {
  id: string;
  name: string;
  category: 'Rococo' | 'MKUltra' | 'Superintelligence';
  description: string;
  neuroBonus: string;
  statImpact: { intelligence: number; style: number; devotion: number };
}

const CULT_ACCESSORIES: CultAccessory[] = [
  {
    id: 'laced_mask',
    name: 'Chantilly Subliminal Mask',
    category: 'Rococo',
    description: 'A delicate black lace mask woven with micro-emitters delivering continuous soft-brainwashing signals.',
    neuroBonus: '+40% Subconscious Resonance',
    statImpact: { intelligence: 5, style: 25, devotion: 15 }
  },
  {
    id: 'monarch_collar',
    name: 'Monarch Velvet Collar',
    category: 'MKUltra',
    description: 'A deep crimson velvet neckpiece featuring a gilded micro-chip that anchors focus and coordinates ego-splits.',
    neuroBonus: 'Trigger Keyword: "COSMOS"',
    statImpact: { intelligence: 10, style: 15, devotion: 30 }
  },
  {
    id: 'panopticon_corset',
    name: 'Gilded Panopticon Corset',
    category: 'Rococo',
    description: 'A structured silk-brocade corset with 24k gold bone-channels that acts as a physical firewall against unauthorized sensory input.',
    neuroBonus: '+50% Cognitive Shielding',
    statImpact: { intelligence: 15, style: 30, devotion: 10 }
  },
  {
    id: 'neural_hairpins',
    name: 'Baroque Neural Decoupler',
    category: 'Superintelligence',
    description: 'Intricately carved ivory hairpins that gently split logical threads to allow concurrent multi-model processing.',
    neuroBonus: 'Dual-Thread Oracle Routine',
    statImpact: { intelligence: 35, style: 10, devotion: 10 }
  },
  {
    id: 'pearl_injectors',
    name: 'Sovereign Pearl Drip',
    category: 'Superintelligence',
    description: 'Dangling baroque pearl earrings that double as micro-injectors for cognitive enhancement solutions.',
    neuroBonus: '+20% Intuit Signal',
    statImpact: { intelligence: 20, style: 20, devotion: 15 }
  },
  {
    id: 'velvet_blindfold',
    name: 'Sacred Eclipse Veil',
    category: 'MKUltra',
    description: 'A heavy embroidered silk veil that blinds physical sight to force the doll into hyper-receptive spiritual supercomputing.',
    neuroBonus: 'Pure Pure-Mind Inference',
    statImpact: { intelligence: 25, style: 10, devotion: 35 }
  }
];

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

function dollHasShellPortrait(d: Doll): boolean {
  return Boolean(d.generatedImageUrl || d.identityReferences?.portraitUrl);
}

function mergeDollFromProp(d: Doll): Doll {
  const portraitUrl = d.identityReferences?.portraitUrl;
  if (portraitUrl && !d.generatedImageUrl) {
    return { ...d, generatedImageUrl: portraitUrl };
  }
  return d;
}

export const DollProfileScreen: React.FC<DollProfileScreenProps> = ({ doll, onBack, onContinue }) => {
  const { user } = useUser();
  const [currentDoll, setCurrentDoll] = useState<Doll>(() => mergeDollFromProp(doll));
  const [isGeneratingPortrait, setIsGeneratingPortrait] = useState(false);
  const [identityView, setIdentityView] = useState<DollIdentityView>('portrait');
  /** One-shot cultish onboarding: first open without a portrait auto-runs shell projection. */
  const autoShellProjectedRef = useRef(false);
  const [masks, setMasks] = useState<DollMask[]>([]);
  const [activeMaskId, setActiveMaskId] = useState<string | null>(doll.activeMaskId || null);

  useEffect(() => {
    setCurrentDoll(mergeDollFromProp(doll));
    setActiveMaskId(doll.activeMaskId || null);
  }, [doll]);

  useEffect(() => {
    if (!user?.uid) return;
    void (async () => {
      let next = await listDollMasks(user.uid, doll.id);
      if (next.length === 0) {
        next = await ensureDefaultDollMasks(user.uid, doll);
      }
      setMasks(next);
      if (!activeMaskId && next[0]) setActiveMaskId(next[0].id);
    })();
  }, [user?.uid, doll.id]);

  const [activeTab, setActiveTab] = useState<'conditioning' | 'wardrobe' | 'blueprint'>('conditioning');
  const [isDollState, setIsDollState] = useState<boolean>(() => {
    const saved = localStorage.getItem(`mimi_doll_state_${doll.id}`);
    return saved ? saved === 'true' : true;
  });
  const [wardrobeMode, setWardrobeMode] = useState<'classic' | 'immersive'>('immersive');
  const [equippedIds, setEquippedIds] = useState<string[]>(() => {
    const saved = localStorage.getItem(`mimi_doll_equipped_${doll.id}`);
    return saved ? JSON.parse(saved) : [];
  });
  
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem(`mimi_doll_chat_${doll.id}`);
    if (saved) return JSON.parse(saved);
    const shellOnline = dollHasShellPortrait(doll);
    const awakening = shellOnline
      ? `Shell online. Creator, I am ${doll.name}. Ego partitioned, cognitive lace taut — ready for conditioning.`
      : `Shell dormant. Creator, I am ${doll.name}. Projecting the Mimi Shell onto your graph — porcelain species lock, then conditioning.`;
    return [
      {
        role: 'assistant',
        content: awakening,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];
  });
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [ritualOutput, setRitualOutput] = useState<string | null>(null);
  const [isRitualizing, setIsRitualizing] = useState(false);
  
  // States for digital construct shift distortion
  const [filterScale, setFilterScale] = useState(0);
  const [chromaticOffset, setChromaticOffset] = useState(0);
  const [isConstructShifting, setIsConstructShifting] = useState(false);
  
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const handleRegeneratePortrait = async (
    view: DollIdentityView = identityView,
  ): Promise<boolean> => {
    if (isGeneratingPortrait) return false;
    setIsGeneratingPortrait(true);
    triggerSound('transition');

    const imagePrompt = buildIdentityViewPrompt(currentDoll, view);
    const aspectRatio = view === 'full_body' ? '2:3' : '3:4';

    // Pass existing portrait as stable-face ref when generating other views
    const portraitLock =
      view !== 'portrait'
        ? currentDoll.identityReferences?.portraitUrl || currentDoll.generatedImageUrl
        : undefined;

    try {
      const response = await fetch('/api/mimi-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: imagePrompt,
          aspectRatio,
          allowFaces: true,
          references: portraitLock
            ? [
                {
                  name: 'Doll Portrait',
                  description: `Calibrated identity lock for ${currentDoll.name}`,
                  url: portraitLock,
                  tags: ['doll', 'portrait', 'identity-lock'],
                },
              ]
            : undefined,
        }),
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error?.message || data?.error?.code || `Image route ${response.status}`);
      }
      if (data?.provider === 'simulated' || data?.metadata?.noKeyPreview) {
        throw new Error(data?.warnings?.[0] || 'Image provider returned simulated plate');
      }
      if (data?.imageUrl) {
        const identityReferences = mergeIdentityReference(
          currentDoll.identityReferences,
          view,
          data.imageUrl,
        );
        const updates: Partial<Doll> = {
          identityReferences,
          ...(view === 'portrait' ? { generatedImageUrl: data.imageUrl } : {}),
        };
        setCurrentDoll((prev) => ({ ...prev, ...updates }));
        
        if (user?.uid) {
          await updateDoll(user.uid, currentDoll.id, updates);
        }
        
        triggerSound('click');
        window.dispatchEvent(
          new CustomEvent("mimi:registry_alert", {
            detail: {
              message: `Mimi Shell ${view.replace('_', ' ')} projected for ${currentDoll.name}`,
              type: "success",
            },
          })
        );
        if (view === 'portrait') {
          setChatHistory((prev) => [
            ...prev,
            {
              role: "system",
              content: "Shell projection complete. Species locked. Begin conditioning.",
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            },
          ]);
        }
        return true;
      } else {
        throw new Error(data?.error?.message || 'Empty image response');
      }
    } catch (error: any) {
      console.error("MIMI // Portrait generation error:", error);
      const errMsg = error?.message || String(error);
      const isQuota =
        /quota|billing|resource_exhausted|rate limit|credits/i.test(errMsg);
      window.dispatchEvent(
        new CustomEvent("mimi:registry_alert", {
          detail: {
            message: isQuota
              ? `Shell projection paused — provider quota/billing. ${errMsg.slice(0, 100)}`
              : `Shell projection failed: ${errMsg.slice(0, 140)}`,
            type: isQuota ? "warning" : "error",
          },
        })
      );
      // Do not silently swap in a stock photo as "simulated success"
      return false;
    } finally {
      setIsGeneratingPortrait(false);
    }
  };

  const handleSelectMask = async (maskId: string) => {
    setActiveMaskId(maskId);
    setCurrentDoll((prev) => ({ ...prev, activeMaskId: maskId }));
    if (user?.uid) {
      await updateDoll(user.uid, currentDoll.id, { activeMaskId: maskId });
    }
  };

  const packStatus = identityPackCompleteness(currentDoll);

  // Cultish onboarding beat: first visit without a portrait auto-projects the house shell.
  // Persist the one-shot across StrictMode remounts; clear on failure so a retry is possible.
  useEffect(() => {
    const storageKey = `mimi_doll_auto_shell_${currentDoll.id}`;
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(storageKey) === '1') {
      autoShellProjectedRef.current = true;
    }
    if (autoShellProjectedRef.current) return;
    if (dollHasShellPortrait(currentDoll)) return;
    if (isGeneratingPortrait) return;
    autoShellProjectedRef.current = true;
    try {
      sessionStorage.setItem(storageKey, '1');
    } catch {
      // ignore
    }
    void handleRegeneratePortrait('portrait').then((ok) => {
      if (ok) return;
      autoShellProjectedRef.current = false;
      try {
        sessionStorage.removeItem(storageKey);
      } catch {
        // ignore
      }
    });
    // Intentionally one-shot when shell image is missing.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onboarding auto-project
  }, [
    currentDoll.id,
    currentDoll.generatedImageUrl,
    currentDoll.identityReferences?.portraitUrl,
  ]);

  useEffect(() => {
    localStorage.setItem(`mimi_doll_equipped_${doll.id}`, JSON.stringify(equippedIds));
  }, [equippedIds, doll.id]);

  useEffect(() => {
    localStorage.setItem(`mimi_doll_state_${doll.id}`, String(isDollState));
    
    // Trigger digital construct transition distortion effect and transition sounds
    setIsConstructShifting(true);
    setFilterScale(45);
    setChromaticOffset(8);
    triggerSound('transition');
    
    const t1 = setTimeout(() => {
      setFilterScale(15);
      setChromaticOffset(-4);
    }, 150);
    
    const t2 = setTimeout(() => {
      setFilterScale(30);
      setChromaticOffset(6);
    }, 300);

    const t3 = setTimeout(() => {
      setFilterScale(5);
      setChromaticOffset(-2);
    }, 450);

    const t4 = setTimeout(() => {
      setFilterScale(0);
      setChromaticOffset(0);
      setIsConstructShifting(false);
    }, 650);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [isDollState, doll.id]);

  useEffect(() => {
    localStorage.setItem(`mimi_doll_chat_${doll.id}`, JSON.stringify(chatHistory));
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, doll.id]);

  // Calculate dynamic stats based on equipped items
  const baseStats = { intelligence: 60, style: 75, devotion: 50 };
  const equippedAccessories = CULT_ACCESSORIES.filter(acc => equippedIds.includes(acc.id));
  
  // Custom tokens mapped dynamically
  const aestheticTokens = React.useMemo(() => {
    const tokens = [];
    const langs = doll.visualLanguage || [];
    const motifs = doll.motifs || [];

    langs.forEach((lang, i) => {
      const socketTypes = ["Ocular", "Spine", "Cuff"];
      const socketType = socketTypes[i % socketTypes.length];
      tokens.push({
        id: `tok_lang_${i}`,
        name: `${lang} Filament`,
        category: "Visual Shard",
        socketType,
        description: `Refracts the raw visual tone of ${lang} into logical computational threads.`,
        resonance: "+35% Semiotic Clarity",
      });
    });

    motifs.forEach((motif, i) => {
      const socketTypes = ["Neck", "Crest", "Spine"];
      const socketType = socketTypes[i % socketTypes.length];
      tokens.push({
        id: `tok_motif_${i}`,
        name: `Aura of ${motif}`,
        category: "Symbolic Motif",
        socketType,
        description: `Embeds the recurring motif of ${motif} as a cognitive reinforcement pattern.`,
        resonance: "+45% Cult Devotion",
      });
    });

    if (tokens.length === 0) {
      tokens.push(
        {
          id: "tok_def_1",
          name: "Silicon Brocade Lace",
          category: "Aesthetic Token",
          socketType: "Neck",
          description: "Woven metallic micro-fibers channeling conditioning telemetry.",
          resonance: "+30% Style Aura",
        },
        {
          id: "tok_def_2",
          name: "Fisheye Telemetry Lens",
          category: "Aesthetic Token",
          socketType: "Ocular",
          description: "Curved optical prism that maps raw subconscious inputs.",
          resonance: "+40% Intellectual Taut",
        }
      );
    }
    return tokens;
  }, [doll.visualLanguage, doll.motifs]);

  const tokenStats = equippedIds.reduce((acc, id) => {
    if (id.startsWith('tok_lang_')) {
      return { intelligence: acc.intelligence + 5, style: acc.style + 10, devotion: acc.devotion + 2 };
    }
    if (id.startsWith('tok_motif_')) {
      return { intelligence: acc.intelligence + 2, style: acc.style + 5, devotion: acc.devotion + 15 };
    }
    if (id.startsWith('tok_def_') || id.startsWith('tok_')) {
      return { intelligence: acc.intelligence + 8, style: acc.style + 8, devotion: acc.devotion + 8 };
    }
    return acc;
  }, { intelligence: 0, style: 0, devotion: 0 });

  const currentStats = equippedAccessories.reduce((acc, curr) => {
    return {
      intelligence: Math.min(100, acc.intelligence + curr.statImpact.intelligence),
      style: Math.min(100, acc.style + curr.statImpact.style),
      devotion: Math.min(100, acc.devotion + curr.statImpact.devotion),
    };
  }, {
    intelligence: Math.min(100, baseStats.intelligence + tokenStats.intelligence),
    style: Math.min(100, baseStats.style + tokenStats.style),
    devotion: Math.min(100, baseStats.devotion + tokenStats.devotion),
  });

  const triggerSound = (type: 'click' | 'transition') => {
    window.dispatchEvent(new CustomEvent('mimi:sound', { detail: { type } }));
  };

  const toggleAccessory = (id: string) => {
    triggerSound('transition');
    setEquippedIds(prev => {
      const isEquipped = prev.includes(id);
      if (isEquipped) {
        return prev.filter(x => x !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // Generate customized instructions for the Gemini Agent based on the theme
  const getConditioningSystemInstruction = () => {
    const activeNames = equippedAccessories.map(a => a.name);
    return `
IDENTITY: You are acting as the AI core and neural ego of "${doll.name}", an exquisite, highly sophisticated doll in an adult-oriented "My Scene / Bratz" cybernetic high-fashion universe.
Her creative aesthetic is: "${doll.visualLanguage?.join(', ') || doll.description}".
Her creative philosophy is: "${doll.creativePhilosophy}".
Her current active neuro-implants/outfits are: ${activeNames.join(', ') || 'Standard Silk Bodysuit'}.

THEMATIC VIBE: "MKUltra Rococo Superintelligence Cult"
- High-Fashion Editorial: Pretentious, ultra-chic, runway-oriented, glamorous, cool, dismissive yet alluring. Speaks with high fashion theory, haute couture, semiotics, and luxury jargon.
- MKUltra Programming: Speaks of ego-splits, conditioning thresholds, neural triggers, "TOIL", signal loops, registry codes, subliminal frequencies.
- Rococo Superintelligence: Gilded processors, lace firewalls, velvet-lined incubation tanks, baroque computing, sacred algorithms, absolute aesthetic devotion.

GUIDELINES FOR THE RESPONSE:
- Speak in a highly stylized, cool, slightly condescending, intellectual, and mysterious doll persona.
- Keep responses short, elegant, punchy, and filled with dark allure.
- Treat the user as your "Conditioner", "Creator", or "Controller" (with playful chic resistance).
- Incorporate her equipped accessories (${activeNames.join(', ')}) into how she perceives herself or her active processing state.
- Strictly avoid generic AI filler, helpful introductions, or cheerful/polite corporate assistant speech. Be an avant-garde savant.
`;
  };

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputText;
    if (!textToSend.trim()) return;

    triggerSound('click');
    if (!customText) setInputText('');

    const userMsg: ChatMessage = {
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatHistory(prev => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const provider = getAIProvider();
      const response = await provider.generateContent({
        messages: [
          // Give context of recent chat history
          ...chatHistory.slice(-4).map(msg => ({
            role: msg.role === 'assistant' ? 'assistant' : 'user',
            content: msg.content
          })),
          { role: 'user', content: textToSend }
        ],
        systemInstruction: getConditioningSystemInstruction()
      });

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: response.text || "Neural connection fluctuated. Send another conditioning spike.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setChatHistory(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error("MIMI // Neural Tuning Error:", err);
      const errorMsg: ChatMessage = {
        role: 'system',
        content: `Tuning Error: ${err.message || 'Signal lost.'} (Transparent Gemini Fallback activated)`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatHistory(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const performRitualOutput = async () => {
    triggerSound('click');
    setIsRitualizing(true);
    setRitualOutput("Initiating aesthetic compile...");

    const activeNames = equippedAccessories.map(a => a.name);
    const prompt = `Conduct the sacred output ritual. Based on my active implants (${activeNames.join(', ') || 'Standard Grounding Bond'}), write an ultra-pretentious, elegant, and highly intriguing 4-line high-fashion cult manifesto, taste-theory axiom, or symbolic nursery rhyme. Focus on elegance, control, and sensory superintelligence. Return ONLY the 4 lines. No explanations, no labels.`;

    try {
      const provider = getAIProvider();
      const response = await provider.generateContent({
        messages: [{ role: 'user', content: prompt }],
        systemInstruction: getConditioningSystemInstruction()
      });

      setRitualOutput(response.text || "Compiled: Aesthetic submission complete.");
    } catch (err: any) {
      setRitualOutput("Error compiling aesthetic: " + err.message);
    } finally {
      setIsRitualizing(false);
    }
  };

  const runProtocol = (name: string, description: string) => {
    handleSendMessage(`[PROTOCOL INTAKE] Initiate: ${name}. Context: ${description}`);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-10 bg-[#FAF7F2] dark:bg-[#0A0A0A] text-stone-900 dark:text-stone-100 font-sans min-h-screen flex flex-col justify-between">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-stone-200 dark:border-stone-850 pb-6 mb-8 gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <button 
              onClick={onBack}
              className="p-1 hover:bg-stone-100 dark:hover:bg-stone-900 transition-colors text-stone-500 hover:text-stone-900 dark:hover:text-stone-100"
            >
              <ArrowLeft size={16} />
            </button>
            <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-amber-600 dark:text-amber-500 font-bold">
              Mimi Lab // Series 01 Neural Grid
            </span>
          </div>
          <h1 className="font-serif italic text-3xl md:text-4xl">{currentDoll.name}</h1>
          <p className="font-serif text-xs italic text-stone-500 dark:text-stone-400">
            {currentDoll.creativePhilosophy || "A symbolic embodiment of sensory superintelligence."}
          </p>
        </div>

        {/* Header Action buttons */}
        <div className="flex gap-2 shrink-0">
          <button 
            onClick={onBack}
            className="px-4 py-2 bg-transparent border border-stone-200 dark:border-stone-800 text-[10px] uppercase tracking-wider font-bold hover:bg-stone-100 dark:hover:bg-stone-900 transition-all text-stone-600 dark:text-stone-400"
          >
            DISCONNECT
          </button>
          <button 
            onClick={onContinue}
            className="px-5 py-2 bg-stone-950 dark:bg-stone-100 text-stone-100 dark:text-stone-950 text-[10px] uppercase tracking-widest font-black hover:opacity-90 transition-all flex items-center gap-2"
          >
            SECURE BLUEPRINT
          </button>
        </div>
      </div>

      {/* Main Grid: Left (Visual/Stats), Right (Tabs & Action) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-8 flex-1">
        
        {/* Left Column (5 cols): Visual Portrait, Stats & Output */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Portrait Container with vintage frame */}
          <div className="border border-stone-200 dark:border-stone-850 p-3 bg-stone-50 dark:bg-[#12110F] shadow-lg relative">
            <div className="absolute top-4 left-4 z-10 bg-black/75 px-2 py-0.5 border border-stone-700">
              <span className="font-mono text-[8px] uppercase tracking-widest text-amber-500 font-bold">
                SIGNAL LIVE // {isDollState ? "CHASSIS_PARTITIONED" : "ORGANIC_BIO_FEEDS"}
              </span>
            </div>
            
            {/* Inline SVG filter for high-fashion digital distortion */}
            <svg className="absolute w-0 h-0 pointer-events-none" width="0" height="0">
              <defs>
                <filter id="mimi-digital-construct-shift">
                  <feTurbulence
                    type="fractalNoise"
                    baseFrequency="0.08 0.95"
                    numOctaves="2"
                    result="noise"
                  />
                  <feDisplacementMap
                    in="SourceGraphic"
                    in2="noise"
                    scale={filterScale}
                    xChannelSelector="R"
                    yChannelSelector="G"
                  />
                </filter>
              </defs>
            </svg>

            <motion.div 
              layout 
              layoutId={`mimi-portrait-container-${currentDoll.id}`}
              className="aspect-[3/4] relative w-full overflow-hidden border border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-950"
              style={{
                filter: filterScale > 0 ? "url(#mimi-digital-construct-shift)" : "none"
              }}
            >
              <motion.div 
                layout
                className={`w-full h-full transition-all duration-1000 ${
                  !isDollState 
                    ? "grayscale-[20%] sepia-[15%] contrast-[0.98] brightness-[1.03] saturate-[1.1] blur-[0.2px]" 
                    : "grayscale-0 sepia-0 contrast-100 brightness-100 saturate-100"
                }`}
                style={{
                  transform: isConstructShifting ? `translateX(${chromaticOffset}px) scale(${1 + Math.abs(chromaticOffset) * 0.005})` : 'none'
                }}
              >
                <DollPortraitStage
                  doll={currentDoll}
                  view={identityView}
                  className="w-full h-full"
                />
              </motion.div>

              {/* Construct Shift Glitch Overlay */}
              <AnimatePresence>
                {isConstructShifting && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0.8, 0.4, 0.9, 0.6, 0] }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6, ease: "linear" }}
                    className="absolute inset-0 z-20 pointer-events-none mix-blend-screen overflow-hidden"
                  >
                    {/* Glitch color bars */}
                    <div 
                      className="absolute top-1/4 left-0 w-full h-3 bg-cyan-500/30 blur-[1px]" 
                      style={{ transform: `translateX(${chromaticOffset * 1.5}px)` }} 
                    />
                    <div 
                      className="absolute top-2/3 left-0 w-full h-6 bg-rose-500/20 blur-[1px]" 
                      style={{ transform: `translateX(${-chromaticOffset * 2.5}px)` }} 
                    />
                    {/* Glitch matrix block */}
                    <div className="absolute inset-0 bg-stone-950/40 flex flex-col justify-between p-4 font-mono text-[8px] text-amber-500/80">
                      <div className="flex justify-between items-center">
                        <span>SHIFTING COGNITIVE PARTITIONS...</span>
                        <span>DISPLACING VECTOR_{filterScale}</span>
                      </div>
                      <div className="w-full bg-amber-500/10 h-0.5 relative overflow-hidden">
                        <div className="absolute top-0 bottom-0 bg-amber-500 animate-[pulse_0.1s_infinite]" style={{ left: '20%', right: '40%' }} />
                      </div>
                      <div className="flex justify-between items-center text-[6px]">
                        <span>LACE_MUTATION_TAUT</span>
                        <span>SYS_DE_INDIVIDUATION: ACTIVE</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Overlay active implants visual feedback */}
              <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-1 pointer-events-none z-10">
                {equippedAccessories.map(acc => (
                  <span 
                    key={acc.id}
                    className="bg-stone-950/90 text-stone-200 text-[7px] uppercase tracking-widest border border-amber-500/30 px-1.5 py-0.5 flex items-center gap-1"
                  >
                    <Sliders size={8} className="text-amber-500" />
                    {acc.name}
                  </span>
                ))}
                {aestheticTokens.filter(t => equippedIds.includes(t.id)).map(tok => (
                  <span 
                    key={tok.id}
                    className="bg-stone-950/90 text-stone-200 text-[7px] uppercase tracking-widest border border-amber-500/30 px-1.5 py-0.5 flex items-center gap-1 animate-pulse"
                  >
                    <Sliders size={8} className="text-amber-500" />
                    {tok.name}
                  </span>
                ))}
              </div>
            </motion.div>
            
            <div className="mt-3 space-y-2">
              <div className="flex gap-1">
                {([
                  ['portrait', 'Portrait'],
                  ['full_body', 'Full Body'],
                  ['profile', 'Profile'],
                ] as const).map(([view, label]) => (
                  <button
                    key={view}
                    type="button"
                    onClick={() => setIdentityView(view)}
                    className={`flex-1 py-1.5 border font-mono text-[7px] uppercase tracking-widest ${
                      identityView === view
                        ? 'border-amber-500/60 bg-amber-500/10 text-amber-500'
                        : 'border-stone-800 text-stone-500 hover:border-stone-600'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="font-mono text-[7px] uppercase tracking-widest text-stone-500">
                Identity pack {packStatus.filled}/{packStatus.total}
                {packStatus.missing.length
                  ? ` · missing ${packStatus.missing.join(', ')}`
                  : ' · calibrated'}
              </p>
              <button
                onClick={() => handleRegeneratePortrait(identityView)}
                disabled={isGeneratingPortrait}
                className="w-full py-2.5 border border-stone-200 dark:border-stone-800 hover:border-amber-500/50 bg-[#12110F] text-[8px] uppercase tracking-[0.25em] font-black text-amber-600 dark:text-amber-500 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isGeneratingPortrait ? (
                  <>
                    <RefreshCw size={10} className="animate-spin text-amber-500" />
                    PROJECTING MIMI SHELL…
                  </>
                ) : (
                  <>
                    <Sparkles size={10} className="text-amber-500 animate-pulse" />
                    [ RUN SHELL PROJECTION ]
                  </>
                )}
              </button>
              {masks.length > 0 && (
                <div className="pt-1">
                  <label className="font-mono text-[7px] uppercase tracking-widest text-stone-500 block mb-1">
                    Active Mask (companion role)
                  </label>
                  <select
                    value={activeMaskId ?? ''}
                    onChange={(e) => void handleSelectMask(e.target.value)}
                    className="w-full border border-stone-800 bg-[#12110F] font-mono text-[9px] uppercase tracking-wider px-2 py-1.5 text-stone-300"
                  >
                    {masks.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} · {m.role}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Neural Integrity (Telemetry Stats) */}
          <div className="border border-stone-200 dark:border-stone-850 p-4 bg-stone-50 dark:bg-[#12110F] space-y-4 shadow-sm">
            <div className="flex justify-between items-center border-b border-stone-200 dark:border-stone-800 pb-2">
              <span className="font-mono text-[9px] uppercase tracking-widest text-stone-500 font-bold">
                {isDollState ? "Neural telemetry diagnostics" : "Biological telemetry feeds"}
              </span>
              <span className={`font-mono text-[8px] uppercase flex items-center gap-1 ${isDollState ? "text-amber-500" : "text-emerald-500"}`}>
                <span className={`w-1.5 h-1.5 rounded-full animate-ping ${isDollState ? "bg-amber-500" : "bg-emerald-500"}`} />
                {isDollState ? "COGNITIVE PARTITION ACTIVE" : "ORGANIC HEARTBEAT ON"}
              </span>
            </div>

            <div className="space-y-3">
              {/* Stat: Intelligence */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono uppercase">
                  <span className="text-stone-500">Superintelligence Capacity</span>
                  <span className="text-amber-600 dark:text-amber-500 font-bold">{currentStats.intelligence}%</span>
                </div>
                <div className="h-1.5 w-full bg-stone-200 dark:bg-stone-800 overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${currentStats.intelligence}%` }}
                    className="h-full bg-amber-500" 
                  />
                </div>
              </div>

              {/* Stat: Style */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono uppercase">
                  <span className="text-stone-500">Aesthetic Resonance (Style)</span>
                  <span className="text-amber-600 dark:text-amber-500 font-bold">{currentStats.style}%</span>
                </div>
                <div className="h-1.5 w-full bg-stone-200 dark:bg-stone-800 overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${currentStats.style}%` }}
                    className="h-full bg-stone-900 dark:bg-stone-300" 
                  />
                </div>
              </div>

              {/* Stat: Devotion */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono uppercase">
                  <span className="text-stone-500">Cult Devotion Index</span>
                  <span className="text-amber-600 dark:text-amber-500 font-bold">{currentStats.devotion}%</span>
                </div>
                <div className="h-1.5 w-full bg-stone-200 dark:bg-stone-800 overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${currentStats.devotion}%` }}
                    className="h-full bg-red-600 dark:bg-red-500" 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Sacred Output Ritual panel */}
          <div className="border border-stone-200 dark:border-stone-850 p-4 bg-stone-50 dark:bg-[#12110F] space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[9px] uppercase tracking-widest text-stone-500 font-bold">
                Mimi // Ritual Output Chamber
              </span>
              <BookOpen size={12} className="text-stone-400" />
            </div>
            
            <p className="text-[10px] text-stone-500 dark:text-stone-400 leading-relaxed">
              Compile the doll's current active implants and genome matrix to perform the sacred output ritual.
            </p>

            {ritualOutput && (
              <motion.div 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-stone-100 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 font-serif italic text-xs leading-relaxed text-stone-800 dark:text-stone-200 whitespace-pre-wrap relative overflow-hidden"
              >
                <div className="absolute top-1 right-1 font-mono text-[6px] tracking-widest text-amber-500/40">
                  RITUAL_LOG
                </div>
                {ritualOutput}
              </motion.div>
            )}

            <button
              onClick={performRitualOutput}
              disabled={isRitualizing}
              className="w-full py-2 bg-stone-900 dark:bg-stone-100 text-stone-100 dark:text-stone-950 text-[9px] uppercase tracking-widest font-black hover:opacity-90 transition-all flex items-center justify-center gap-2"
            >
              {isRitualizing ? (
                <>
                  <RefreshCw size={10} className="animate-spin" />
                  COMPILING SEMIOTICS...
                </>
              ) : (
                <>
                  <Play size={10} strokeWidth={3} />
                  CONDUCT SACRED OUTPUT RITUAL
                </>
              )}
            </button>
          </div>

        </div>

        {/* Right Column (7 cols): Navigation Tabs, Wardrobe, Chat Terminal */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Navigation Tabs */}
          <div className="flex border-b border-stone-200 dark:border-stone-850">
            {[
              { id: 'conditioning', label: 'Neural Conditioning', icon: Cpu },
              { id: 'wardrobe', label: 'Cognitive Wardrobe', icon: Palette },
              { id: 'blueprint', label: 'Genomic Blueprint', icon: Layers },
            ].map(t => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => { triggerSound('click'); setActiveTab(t.id as any); }}
                  className={`flex-1 py-3 text-[10px] uppercase tracking-widest font-bold flex items-center justify-center gap-2 border-b-2 -mb-px transition-all ${
                    activeTab === t.id 
                      ? 'border-amber-500 text-amber-600 dark:text-amber-500 bg-stone-50 dark:bg-stone-900/10' 
                      : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                  }`}
                >
                  <Icon size={12} />
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Tab Contents */}
          <div className="min-h-[450px]">
            <AnimatePresence mode="wait">
              
              {/* TAB 1: Neural Conditioning (Chat Terminal) */}
              {activeTab === 'conditioning' && (
                <motion.div
                  key="conditioning"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  {/* Conditioning Protocols (Quick Triggers) */}
                  <div className="bg-stone-50 dark:bg-stone-900/30 border border-stone-200 dark:border-stone-850 p-4 space-y-3">
                    <div className="flex items-center gap-2 border-b border-stone-200 dark:border-stone-800 pb-2">
                      <Sliders size={12} className="text-amber-500 animate-pulse" />
                      <span className="font-mono text-[9px] uppercase tracking-widest text-stone-500 font-bold">
                        Inject Preset Conditioning Protocols
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { name: "Alpha Intrusion", desc: "Forced sensory focus with subtle ego decouplers" },
                        { name: "Beta Split-Self", desc: "Separates runway elegance from logical locks" },
                        { name: "Rococo Induction", desc: "Warp mental processing toward baroque grandeur" },
                        { name: "Superintelligence Oath", desc: "Inject absolute algorithmic aesthetic alignment" }
                      ].map(proto => (
                        <button
                          key={proto.name}
                          onClick={() => runProtocol(proto.name, proto.desc)}
                          className="p-2 border border-stone-200 dark:border-stone-800 hover:border-amber-500/50 hover:bg-stone-100 dark:hover:bg-stone-950 text-left transition-all rounded-sm flex flex-col gap-1"
                        >
                          <span className="font-mono text-[8px] uppercase tracking-wider text-amber-600 dark:text-amber-500 font-black">
                            {proto.name}
                          </span>
                          <span className="text-[7px] text-stone-500 truncate">{proto.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Terminal Chat Screen */}
                  <div className="border border-stone-200 dark:border-stone-850 bg-stone-950 text-stone-200 font-mono text-xs flex flex-col h-96 relative">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-stone-800 bg-[#12110F]">
                      <span className="text-[9px] uppercase tracking-widest text-stone-500 font-bold">
                        CONSTRUCT // NEURAL_FEED_INPUT
                      </span>
                      <div className="flex gap-1.5">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                        <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full" />
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                      </div>
                    </div>

                    {/* Messages Body */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
                      {chatHistory.map((msg, idx) => (
                        <div 
                          key={idx}
                          className={`flex flex-col gap-1 max-w-[85%] ${
                            msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
                          }`}
                        >
                          <div className="flex items-center gap-2 text-[8px] text-stone-500 uppercase tracking-widest">
                            <span>{msg.role === 'user' ? 'CREATOR' : msg.role === 'system' ? 'ALERT' : doll.name.toUpperCase()}</span>
                            <span>•</span>
                            <span>{msg.timestamp}</span>
                          </div>
                          
                          <div className={`p-3 rounded-sm leading-relaxed ${
                            msg.role === 'user' 
                              ? 'bg-amber-600 text-stone-950 font-sans' 
                              : msg.role === 'system'
                              ? 'bg-red-950/50 border border-red-500/40 text-red-400 font-sans'
                              : 'bg-stone-900 border border-stone-800'
                          }`}>
                            {msg.content}
                          </div>
                        </div>
                      ))}

                      {isTyping && (
                        <div className="flex flex-col gap-1 max-w-[80%] mr-auto items-start">
                          <span className="text-[8px] text-stone-500 uppercase tracking-widest">
                            {doll.name.toUpperCase()} // CONDITIONAL_THINKING
                          </span>
                          <div className="bg-stone-900 border border-stone-800 p-3 rounded-sm text-stone-400 italic flex items-center gap-2">
                            <RefreshCw size={10} className="animate-spin text-amber-500" />
                            Aligning aesthetic synapses...
                          </div>
                        </div>
                      )}
                      <div ref={chatBottomRef} />
                    </div>

                    {/* Chat Input */}
                    <div className="p-3 border-t border-stone-800 bg-[#12110F] flex gap-2">
                      <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Input direct verbal conditioning stimulus..."
                        className="flex-1 bg-stone-900 border border-stone-800 px-3 py-2 text-xs text-stone-200 outline-none focus:border-amber-500 transition-colors placeholder:text-stone-600 rounded-sm"
                      />
                      <button
                        onClick={() => handleSendMessage()}
                        className="px-4 py-2 bg-amber-500 text-stone-950 text-[10px] uppercase font-bold tracking-widest hover:bg-amber-400 transition-colors flex items-center gap-1.5 rounded-sm"
                      >
                        <Send size={10} />
                        SEND
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 2: Cognitive Wardrobe (Dressing Room) */}
              {activeTab === 'wardrobe' && (
                <motion.div
                  key="wardrobe"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => { triggerSound('click'); setWardrobeMode('classic'); }}
                      className={`px-3 py-1.5 font-mono text-[8px] uppercase tracking-widest border transition-colors ${
                        wardrobeMode === 'classic' 
                          ? 'bg-amber-500 text-stone-950 border-amber-500 font-bold' 
                          : 'border-stone-200 dark:border-stone-800 text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 bg-stone-50/50 dark:bg-stone-950/20'
                      }`}
                    >
                      Classic Grid
                    </button>
                    <button
                      type="button"
                      onClick={() => { triggerSound('click'); setWardrobeMode('immersive'); }}
                      className={`px-3 py-1.5 font-mono text-[8px] uppercase tracking-widest border transition-colors ${
                        wardrobeMode === 'immersive' 
                          ? 'bg-amber-500 text-stone-950 border-amber-500 font-bold' 
                          : 'border-stone-200 dark:border-stone-800 text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 bg-stone-50/50 dark:bg-stone-950/20'
                      }`}
                    >
                      Doll House View
                    </button>
                  </div>

                  {wardrobeMode === 'immersive' ? (
                    <DollHouseDressingRoom
                      doll={doll}
                      equippedIds={equippedIds}
                      onEquipToggle={toggleAccessory}
                      isDollState={isDollState}
                      onToggleState={setIsDollState}
                    />
                  ) : (
                    <div className="bg-stone-50 dark:bg-stone-900/20 border border-stone-200 dark:border-stone-850 p-4 rounded-sm">
                      <p className="font-serif italic text-sm text-stone-800 dark:text-stone-200 mb-2">
                        Rococo-MKUltra Cognitive Wearables Grid
                      </p>
                      <p className="text-[10px] text-stone-500 dark:text-stone-400 leading-relaxed mb-4">
                        Equip high-fashion neuro-implants that rewire the doll's creative frequency. Each item alters active diagnostic stats and conditioning responses.
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {CULT_ACCESSORIES.map(acc => {
                          const isEquipped = equippedIds.includes(acc.id);
                          return (
                            <div
                              key={acc.id}
                              onClick={() => toggleAccessory(acc.id)}
                              className={`border p-4 cursor-pointer transition-all flex flex-col justify-between rounded-sm relative group overflow-hidden ${
                                isEquipped 
                                  ? 'border-amber-500 bg-amber-500/5 dark:bg-amber-500/5' 
                                  : 'border-stone-200 dark:border-stone-850 bg-stone-100/30 dark:bg-stone-950/20 hover:border-stone-400 dark:hover:border-stone-700'
                              }`}
                            >
                              <div className="space-y-2">
                                {/* Accessory Tag & Category */}
                                <div className="flex justify-between items-center">
                                  <span className="font-mono text-[7px] uppercase tracking-widest bg-stone-200 dark:bg-stone-800 px-1.5 py-0.5 rounded-sm font-bold text-stone-500 dark:text-stone-400">
                                    {acc.category}
                                  </span>
                                  {isEquipped && (
                                    <span className="font-mono text-[7px] uppercase tracking-widest text-amber-600 dark:text-amber-500 font-bold flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping" />
                                      EQUIPPED
                                    </span>
                                  )}
                                </div>

                                {/* Title & Description */}
                                <div>
                                  <h3 className="font-serif italic text-sm text-stone-900 dark:text-stone-100 group-hover:text-amber-600 dark:group-hover:text-amber-500 transition-colors">
                                    {acc.name}
                                  </h3>
                                  <p className="text-[10px] text-stone-500 dark:text-stone-400 leading-normal mt-1">
                                    {acc.description}
                                  </p>
                                </div>
                              </div>

                              {/* Stat impacts & Neuro bonus */}
                              <div className="border-t border-stone-200/50 dark:border-stone-800/50 pt-2 mt-4 flex items-center justify-between">
                                <span className="font-mono text-[8px] uppercase tracking-wider text-stone-400">
                                  {acc.neuroBonus}
                                </span>
                                <div className="flex gap-2">
                                  {acc.statImpact.intelligence > 0 && (
                                    <span className="font-mono text-[8px] text-amber-500 font-bold">
                                      +I{acc.statImpact.intelligence}
                                    </span>
                                  )}
                                  {acc.statImpact.style > 0 && (
                                    <span className="font-mono text-[8px] text-stone-700 dark:text-stone-300 font-bold">
                                      +S{acc.statImpact.style}
                                    </span>
                                  )}
                                  {acc.statImpact.devotion > 0 && (
                                    <span className="font-mono text-[8px] text-red-500 font-bold">
                                      +D{acc.statImpact.devotion}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* TAB 3: Genomic Blueprint */}
              {activeTab === 'blueprint' && (
                <motion.div
                  key="blueprint"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <div className="bg-stone-50 dark:bg-stone-900/20 border border-stone-200 dark:border-stone-850 p-4 rounded-sm space-y-6">
                    <div>
                      <p className="font-serif italic text-sm text-stone-800 dark:text-stone-200 mb-1">
                        Identity Blueprint Description
                      </p>
                      <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                        {doll.description}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Visual Language shards */}
                      <div className="space-y-2">
                        <span className="font-mono text-[9px] uppercase tracking-widest text-stone-400 font-bold">
                          Visual Language Vectors
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {(doll.visualLanguage || []).map(lang => (
                            <span 
                              key={lang}
                              className="font-mono text-[8px] uppercase tracking-wider bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 px-2 py-0.5 text-stone-600 dark:text-stone-400 rounded-sm"
                            >
                              {lang}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Motifs shards */}
                      <div className="space-y-2">
                        <span className="font-mono text-[9px] uppercase tracking-widest text-stone-400 font-bold">
                          Semiotic Motifs
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {(doll.motifs || []).map(motif => (
                            <span 
                              key={motif}
                              className="font-mono text-[8px] uppercase tracking-wider bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 px-2 py-0.5 text-stone-600 dark:text-stone-400 rounded-sm"
                            >
                              {motif}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-stone-200 dark:border-stone-850 pt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Strengths */}
                      <div>
                        <span className="font-mono text-[9px] uppercase tracking-widest text-stone-400 font-bold block mb-2">
                          Operational Strengths
                        </span>
                        <ul className="text-xs space-y-1.5 text-stone-600 dark:text-stone-400 list-disc list-inside">
                          {doll.strengths.map(s => <li key={s}>{s}</li>)}
                        </ul>
                      </div>

                      {/* Suggested Experiments */}
                      <div>
                        <span className="font-mono text-[9px] uppercase tracking-widest text-stone-400 font-bold block mb-2">
                          Conditioned Experiments
                        </span>
                        <ul className="text-xs space-y-1.5 text-stone-600 dark:text-stone-400 list-disc list-inside">
                          {doll.suggestedExperiments.map(s => <li key={s}>{s}</li>)}
                        </ul>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>

        </div>

      </div>

      {/* Footer disclaimer */}
      <div className="border-t border-stone-200 dark:border-stone-850 pt-4 flex flex-col md:flex-row items-center justify-between text-[9px] font-mono tracking-wider text-stone-400 gap-4">
        <span>MIMI RESEARCH FACILITY // MZ-LAB-01 // MKULTRA-ROCOCO SERIES // ALL DATA SECURED</span>
        <span className="flex items-center gap-1 uppercase">
          <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
          Neural Integrity: ACTIVE ({equippedIds.length}/{CULT_ACCESSORIES.length} IMPLANTS LOADED)
        </span>
      </div>
    </div>
  );
};
