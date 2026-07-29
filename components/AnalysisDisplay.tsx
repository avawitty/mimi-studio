
import React, { useEffect, useState, useRef, useMemo } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { ZineMetadata, PocketItem, LineageEntry, NarrativeThread, MemoryAtom } from '../types';
import { generateAudio, animateShardWithVeo, transcribeAudio } from '../services/geminiService';
import { subscribeToPocketItems, fetchLineageEntry, saveNarrativeThread, saveTask } from '../services/firebaseUtils';
import { Loader2, X, Volume2, Orbit, Eye, Target, Layers, Moon, Sparkles, Terminal, Quote, ArrowDown, Grid3X3, Bookmark, Check, Play, Pause, ExternalLink, Download, Share2, Star, FileText, Map, Compass, Zap, RefreshCw, PenTool, Save, Mic, Square, AlertCircle, StickyNote, History, MessageSquareQuote, Radar, Maximize2, Activity, Archive, FolderPlus, Compass as RoadmapIcon, Stars as CelestialIcon, ArrowRight, CornerDownRight, Image as ImageIcon, Film, MousePointer2, Briefcase, BookOpen, ChevronDown, Hash, Search, Menu, Plus, Radio, Heart, MessageSquare, Scissors } from 'lucide-react';
import { ExecutionBlock } from './ExecutionBlock';
import { VisualLanguageReflection } from './VisualLanguageReflection';
import { Visualizer } from './Visualizer';
import { ExportChamber } from './ExportChamber';
import { SocialShareModal } from './SocialShareModal';
import { ZineComments } from './ZineComments';
import { ThreadGraph } from './ThreadGraph';
import { motion, AnimatePresence } from 'motion/react';
import { useUser } from '../contexts/UserContext';
import { resolveApiKey } from '../services/apiKeyService';
import { fetchMemoryAtoms } from '../services/memoryService';
import { hasAccess } from '../constants';
import { coerceToString } from '../lib/utils';
import { useRecorder } from '../hooks/useRecorder';
import { ZineFlipbookShell, type ZineReadingMode } from './ZineFlipbookShell';
import { useZineSEO } from '../utils/seoHelper';

const THEMES = {
  'white editorial': { bg: '#FDFBF7', text: '#1C1917', accent: '#78716c', thread: '#E5E7EB', glow: 'transparent', surface: '#FFFFFF', border: '#F5F5F4', font: 'editorial' },
  'white brutalist': { bg: '#FFFFFF', text: '#000000', accent: '#0000FF', thread: '#000000', glow: 'transparent', surface: '#FFFFFF', border: '#000000', font: 'brutalist' },
  'white minimalist': { bg: '#FAFAFA', text: '#333333', accent: '#999999', thread: '#EEEEEE', glow: 'transparent', surface: '#FFFFFF', border: '#EEEEEE', font: 'minimalist' },
  'black editorial': { bg: '#050510', text: '#E0E7FF', accent: '#06B6D4', thread: '#1E1B4B', glow: '0 0 20px rgba(6, 182, 212, 0.8)', surface: '#020617', border: '#0F172A', font: 'editorial' },
  'black brutalist': { bg: '#000000', text: '#00FF00', accent: '#00FF00', thread: '#00FF00', glow: '0 0 20px rgba(0,255,0,0.8)', surface: '#000000', border: '#00FF00', font: 'brutalist' },
  'black minimalist': { bg: '#0A0A0A', text: '#E5E5E5', accent: '#A855F7', thread: '#262626', glow: '0 0 15px rgba(168, 85, 247, 0.4)', surface: '#0A0A0A', border: '#171717', font: 'minimalist' }
};

const ChromaticDial: React.FC<{ activeTheme: string, onChange: (theme: string) => void, accent: string, className?: string }> = ({ activeTheme, onChange, accent, className }) => {
 const themes = Object.keys(THEMES);
 const currentIndex = themes.indexOf(activeTheme);
 const [isFlipped, setIsFlipped] = React.useState(false);
 
 const handleRotate = () => {
    const availableThemes = themes.filter(t => t !== activeTheme);
    const randomTheme = availableThemes[Math.floor(Math.random() * availableThemes.length)];
    setIsFlipped(!isFlipped);
    onChange(randomTheme);
    window.dispatchEvent(new CustomEvent('mimi:sound', { detail: { type: 'click' } }));
  };

 const rotation = currentIndex * 90;

 return (
 <div className={`flex items-center gap-4 print:hidden ${className || ''}`}>
 <span className="font-mono text-[8px] uppercase tracking-widest text-nous-subtle">Tune</span>
 <div 
 onClick={handleRotate}
 className="w-12 h-12 rounded-none border border-nous-border cursor-pointer relative flex items-center justify-center hover:scale-105 bg-white/5 backdrop-blur-md pointer-events-auto"
 style={{ 
 transform: `rotate(${rotation}deg) rotateY(${isFlipped ? 180 : 0}deg)`, 
 transition: 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)' 
 }}
 >
 {[...Array(12)].map((_, i) => (
 <div key={i} className="absolute w-[1px] h-1.5 bg-stone-400/40"style={{ transform: `rotate(${i * 30}deg) translateY(-20px)` }} />
 ))}
 <div className="absolute w-1.5 h-3 rounded-none"style={{ transform: `translateY(-14px)`, backgroundColor: accent, boxShadow: `0 0 10px ${accent}` }} />
 <div className="w-3 h-3 rounded-none border border-nous-border/50"/>
 </div>
 <span className="font-mono text-[8px] uppercase tracking-widest"style={{ color: accent }}>{activeTheme}</span>
 </div>
 );
};

const SectionHeader: React.FC<{ label: string; icon: any; color?: string; style?: React.CSSProperties }> = ({ label, icon: Icon, color ="text-nous-subtle", style }) => (
 <div className="flex items-center gap-4 mb-12 print:mb-4 opacity-50 hover:opacity-100 transition-opacity duration-700">
 <div className={`p-2 bg-nous-base rounded-none ${!style ? color : ''}`} style={style ? { color: style.color } : {}}>
 <Icon size={14} />
 </div>
 <span className="font-sans text-[9px] uppercase tracking-[0.4em] font-black text-nous-subtle">{label}</span>
 <div className="h-px flex-1 bg-stone-200"/>
 </div>
);

const ZineTextContent: React.FC<{
  content?: string;
  className?: string;
  enableDropCap?: boolean;
  isReadingMode?: boolean;
}> = ({ content, className = '', enableDropCap = true, isReadingMode = false }) => {
  if (!content) return null;

  const paragraphs = coerceToString(content)
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) return null;

  return (
    <div className={`font-serif text-nous-text transition-all duration-300 ${
      isReadingMode
        ? 'space-y-10 md:space-y-14 max-w-3xl md:max-w-4xl leading-[2.2] text-xl md:text-2xl text-stone-900 dark:text-stone-100 tracking-wide'
        : 'space-y-6 max-w-3xl leading-relaxed md:leading-loose text-base md:text-xl'
    } ${className}`}>
      {paragraphs.map((para, idx) => {
        const isBlockquote = para.startsWith('>') || (para.startsWith('"') && para.endsWith('"') && para.length > 50);
        const cleanedPara = para.replace(/^>\s*/, '').replace(/^"|"$/g, '');

        if (isBlockquote) {
          return (
            <blockquote
              key={idx}
              className={`border-l-2 border-stone-400 dark:border-stone-600 italic font-serif text-stone-800 dark:text-stone-200 ${
                isReadingMode 
                  ? 'my-12 pl-8 text-2xl md:text-3xl leading-relaxed' 
                  : 'my-8 pl-6 text-xl md:text-2xl'
              }`}
            >
              “{cleanedPara}”
            </blockquote>
          );
        }

        const isFirst = idx === 0 && enableDropCap;

        return (
          <p
            key={idx}
            className={`transition-colors duration-300 ${
              isFirst
                ? isReadingMode
                  ? 'first-letter:text-6xl md:first-letter:text-7xl first-letter:font-serif first-letter:font-bold first-letter:float-left first-letter:mr-4 font-serif first-letter:leading-none first-letter:text-nous-text'
                  : 'first-letter:text-5xl md:first-letter:text-6xl first-letter:font-serif first-letter:font-bold first-letter:float-left first-letter:mr-3 font-serif first-letter:leading-none first-letter:text-nous-text'
                : ''
            }`}
          >
            {cleanedPara}
          </p>
        );
      })}
    </div>
  );
};

export const AnalysisDisplay: React.FC<{ 
 metadata: ZineMetadata, 
 onReset: () => void, 
 onUpdateMetadata: (updatedMetadata: ZineMetadata) => void,
 onExtractTailorLogic?: (logic: any) => void
}> = ({ metadata, onReset, onUpdateMetadata, onExtractTailorLogic }) => {
 const { user, profile, activePersona, toggleZineStar } = useUser();
  const isOwner = user?.uid === metadata.userId;

 useZineSEO({
   title: metadata.title || 'Untitled Manifestation',
   description:
     metadata.content?.meta?.intent ||
     metadata.content?.the_reading ||
     metadata.content?.vocal_summary_blurb ||
     metadata.theme ||
     'Aesthetic zine created via Mimi Studio.',
   imageUrl:
     metadata.coverImageUrl ||
     metadata.content?.hero_image_url ||
     'https://raw.githubusercontent.com/Aris-A-C/mimi-assets/main/mimi_logo_new.png',
   authorName: metadata.userHandle || profile?.handle || 'Curator',
   publishDate: metadata.createdAt
     ? new Date(metadata.createdAt).toISOString()
     : new Date().toISOString(),
   url: typeof window !== 'undefined' ? window.location.href : undefined,
 });
 const [isPlaying, setIsPlaying] = useState(false);
 const [isVoiceLoading, setIsVoiceLoading] = useState(false);
 const [showExport, setShowExport] = useState(false);
 const [showShare, setShowShare] = useState(false);
 const [showComments, setShowComments] = useState(false);
 const [showNotes, setShowNotes] = useState(false);
 const [showReflection, setShowReflection] = useState(true);
 const [isSaved, setIsSaved] = useState(false);
 const [isAnimatingManifest, setIsAnimatingManifest] = useState(false);
 const [isTranscribing, setIsTranscribing] = useState(false);
 const [dialOpen, setDialOpen] = useState(false);
 const [isBroadcasting, setIsBroadcasting] = useState(false);
 const [isBroadcasted, setIsBroadcasted] = useState(false);
 const [isEditing, setIsEditing] = useState(false);
 const [isExportingPDF, setIsExportingPDF] = useState(false);
 const [isDedicatedReadingMode, setIsDedicatedReadingMode] = useState(false);

 useEffect(() => {
   const handleKeyDown = (e: KeyboardEvent) => {
     if (e.key === "Escape" && isDedicatedReadingMode) {
       setIsDedicatedReadingMode(false);
     }
   };
   window.addEventListener("keydown", handleKeyDown);
   return () => window.removeEventListener("keydown", handleKeyDown);
 }, [isDedicatedReadingMode]);
 const [showReorderModal, setShowReorderModal] = useState(false);
 const [reorderPagesList, setReorderPagesList] = useState<any[]>([]);
 const [lineageEntry, setLineageEntry] = useState<LineageEntry | null>(null);

 useEffect(() => {
   if (showReorderModal && metadata.content?.pages) {
     setReorderPagesList([...metadata.content.pages]);
   }
 }, [showReorderModal, metadata.content?.pages]);
 const [showLineage, setShowLineage] = useState(false);
 const [isSavingThread, setIsSavingThread] = useState(false);
 const [isThreadSaved, setIsThreadSaved] = useState(false);
 const [audioProgress, setAudioProgress] = useState(0);
 const [isToolbarCollapsed, setIsToolbarCollapsed] = useState(false);
 const [flippedSignalIndex, setFlippedSignalIndex] = useState<number | null>(null);
 const [readingMode, setReadingMode] = useState<ZineReadingMode>('flipbook');
 const [scribeFragments, setScribeFragments] = useState<MemoryAtom[]>([]);
 const [isReadingAloud, setIsReadingAloud] = useState(false);
 const [isSynthesizingTTS, setIsSynthesizingTTS] = useState(false);
 const [ttsVoice, setTtsVoice] = useState<'Kore' | 'Koral'>('Kore');
 const ttsAudioRef = useRef<HTMLAudioElement | null>(null);

 const handleReadToMe = async () => {
   if (isReadingAloud) {
     if (ttsAudioRef.current) {
       ttsAudioRef.current.pause();
       ttsAudioRef.current = null;
     }
     if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
       window.speechSynthesis.cancel();
     }
     setIsReadingAloud(false);
     return;
   }

   setIsSynthesizingTTS(true);
   const fullText = [
     metadata.title,
     metadata.content?.headlines?.[0] || '',
     vocalSummary || poeticInterpretation || '',
     metadata.content?.oracular_mirror || metadata.content?.the_reading || '',
     ...(metadata.content?.pages?.map(p => `${p.headline || ''}. ${p.bodyCopy || ''}`) || []),
     metadata.content?.poetic_provocation || ''
   ].filter(Boolean).join('\n\n');

   try {
     const { key: geminiKey } = resolveApiKey('gemini', activePersona?.apiKey, profile?.planStatus);
     const { generateZineSpeech } = await import('../services/geminiService');
     const { audioUrl, rawText } = await generateZineSpeech(metadata.title, fullText, ttsVoice, geminiKey || undefined);

     setIsSynthesizingTTS(false);

     if (audioUrl) {
       const audio = new Audio(audioUrl);
       ttsAudioRef.current = audio;
       audio.onended = () => setIsReadingAloud(false);
       audio.onerror = () => {
         setIsReadingAloud(false);
         fallbackWebSpeech(rawText);
       };
       audio.play().then(() => setIsReadingAloud(true)).catch(() => fallbackWebSpeech(rawText));
     } else {
       fallbackWebSpeech(rawText);
     }
   } catch (err) {
     setIsSynthesizingTTS(false);
     fallbackWebSpeech(fullText);
   }
 };

 const fallbackWebSpeech = (text: string) => {
   if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
   window.speechSynthesis.cancel();
   const utterance = new SpeechSynthesisUtterance(text);
   const voices = window.speechSynthesis.getVoices();
   const chicVoice = voices.find(v => v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Karen') || v.name.includes('Victoria') || v.lang.startsWith('en')) || voices[0];
   if (chicVoice) utterance.voice = chicVoice;
   utterance.rate = 0.95;
   utterance.pitch = 1.05;
   utterance.onend = () => setIsReadingAloud(false);
   utterance.onerror = () => setIsReadingAloud(false);
   window.speechSynthesis.speak(utterance);
   setIsReadingAloud(true);
 };
 const startTimeRef = useRef<number>(0);
 const durationRef = useRef<number>(0);
 const animationRef = useRef<number>(0);
 
 const updateProgress = () => {
 if (!audioCtxRef.current || durationRef.current === 0) return;
 const elapsed = audioCtxRef.current.currentTime - startTimeRef.current;
 const progress = Math.min(elapsed / durationRef.current, 1);
 setAudioProgress(progress);
 if (progress < 1) {
 animationRef.current = requestAnimationFrame(updateProgress);
 }
 };

 useEffect(() => {
 if (isPlaying) {
 animationRef.current = requestAnimationFrame(updateProgress);
 } else {
 cancelAnimationFrame(animationRef.current);
 }
 return () => cancelAnimationFrame(animationRef.current);
 }, [isPlaying]);

 useEffect(() => {
 if (metadata.usedContextSnapshots?.length) {
 setScribeFragments(
 metadata.usedContextSnapshots.map((snap) => ({
 id: snap.atomId,
 projectId: '',
 content: snap.content,
 title: snap.title,
 timestamp: Date.now(),
 source: snap.source,
 })),
 );
 return;
 }
 const ids = metadata.fragmentsUsed;
 if (!ids?.length || !user?.uid) {
 setScribeFragments([]);
 return;
 }
 let cancelled = false;
 fetchMemoryAtoms(user.uid)
 .then((atoms) => {
 if (cancelled) return;
 setScribeFragments(atoms.filter((atom) => ids.includes(atom.id)));
 })
 .catch(() => {
 if (!cancelled) setScribeFragments([]);
 });
 return () => {
 cancelled = true;
 };
 }, [metadata.fragmentsUsed, metadata.usedContextSnapshots, user?.uid]);
 
 const handleResonanceFlip = async () => {
 try {
 if (!showLineage) {
 const entry = await fetchLineageEntry(metadata.id);
 setLineageEntry(entry);
 }
 setShowLineage(!showLineage);
 } catch (e) {
 console.error("MIMI // Error in handleResonanceFlip:", e);
 }
 };
 
 const exportZine = async (format: 'pdf' | 'png') => {
  try {
   const element = document.getElementById('zine-content');
   if (!element) return;
   
   const displayTitle = metadata.content?.headlines?.[0] || metadata.title || "Untitled";
   
   if (format === 'png') {
    const canvas = await html2canvas(element, { useCORS: true, scale: 2 });
    const link = document.createElement('a');
    link.download = `${displayTitle}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    return;
   }

   // For PDF export:
   setIsExportingPDF(true);
   window.dispatchEvent(new CustomEvent('mimi:sound', { detail: { type: 'click' } }));
   window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
    detail: { message: "Preparing high-fidelity pages. Please wait..." } 
   }));

   // Convert images inside the container to base64 to bypass CORS
   const images = Array.from(element.querySelectorAll('img'));
   await Promise.all(images.map(async (img) => {
    if (!img.src || img.src.startsWith('data:')) return;
    try {
     img.crossOrigin = "anonymous";
     const response = await fetch(img.src, { mode: 'cors', cache: 'force-cache' });
     const blob = await response.blob();
     await new Promise<void>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
       img.srcset = ""; 
       img.src = reader.result as string;
       resolve();
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
     });
    } catch (e) {
     console.warn("MIMI // PDF: Image conversion failed, fallback to CORS", e);
    }
   }));

   // Select all section and footer elements
   const sections = element.querySelectorAll(':scope > section, :scope > footer');
   if (sections.length === 0) {
    // Fallback to capturing the whole container
    const canvas = await html2canvas(element, { 
     useCORS: true, 
     scale: 2,
     backgroundColor: null,
     windowWidth: 1200,
     windowHeight: 1600,
     onclone: (clonedDoc) => {
      clonedDoc.documentElement.className = document.documentElement.className;
      clonedDoc.body.className = document.body.className;
     }
    });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`${displayTitle}.pdf`);
    setIsExportingPDF(false);
    return;
   }

   const pdf = new jsPDF('p', 'mm', 'a4');
   const pageWidth = pdf.internal.pageSize.getWidth();
   const pageHeight = pdf.internal.pageSize.getHeight();

   for (let i = 0; i < sections.length; i++) {
    const section = sections[i] as HTMLElement;
    
    // Detect background color and text color dynamically
    const computedStyle = window.getComputedStyle(section);
    const bgColor = computedStyle.backgroundColor || '#ffffff';
    const textColor = computedStyle.color || '#000000';
    
    const canvas = await html2canvas(section, {
     scale: 2,
     useCORS: true,
     logging: false,
     backgroundColor: bgColor,
     windowWidth: 1200,
     windowHeight: 1600,
     onclone: (clonedDoc, clonedElement) => {
      // Ensure cloned document inherits theme context (dark/light, era variables, etc)
      clonedDoc.documentElement.className = document.documentElement.className;
      clonedDoc.body.className = document.body.className;
      clonedDoc.body.style.margin = '0';
      clonedDoc.body.style.padding = '0';
      clonedDoc.body.style.backgroundColor = 'transparent';

      if (clonedElement) {
       clonedElement.style.width = '1200px';
       clonedElement.style.height = '1697px'; // Golden scale matching A4 ratio
       clonedElement.style.margin = '0';
       clonedElement.style.padding = '80px';
       clonedElement.style.boxSizing = 'border-box';
       clonedElement.style.overflow = 'hidden';
       clonedElement.style.display = 'flex';
       clonedElement.style.flexDirection = 'column';
       clonedElement.style.justifyContent = 'center';
       clonedElement.style.backgroundColor = bgColor;
       clonedElement.style.color = textColor;
      }

      const style = clonedDoc.createElement('style');
      style.innerHTML = `
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Public+Sans:wght@300;400;500&family=Inter:wght@200;300;400;500&family=JetBrains+Mono:wght@300;400&family=Bodoni+Moda:ital,opsz,wght@0,6..96,400;0,6..96,700;1,6..96,400&display=swap');
        
        * {
          box-sizing: border-box !important;
        }

        /* Enforce exact print colors and prevent inversion */
        section, footer {
          color: ${textColor} !important;
          background-color: ${bgColor} !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        /* Beautiful display heading style consistency */
        h1 {
          font-size: 5.5rem !important;
          line-height: 1.0 !important;
          margin-bottom: 2rem !important;
          letter-spacing: -0.04em !important;
          text-transform: uppercase !important;
        }
        h2 {
          font-size: 2.75rem !important;
          line-height: 1.1 !important;
          margin-bottom: 1.5rem !important;
          letter-spacing: -0.02em !important;
        }
        p, span, li, blockquote {
          font-size: 1.15rem !important;
          line-height: 1.7 !important;
        }

        /* Prevent layout clipping and overflow */
        .grid, .flex {
          gap: 2rem !important;
        }

        /* High-fidelity layout preservation for lists/sections */
        ul, ol {
          margin-left: 1.5rem !important;
        }

        /* Hide interactive-only elements, button, nav controls, audio toggles, tooltips */
        button, .print\\:hidden, .interactive-only, [role="button"], .voice-btn, .nav-btn, .loader-pulse {
          display: none !important;
        }

        /* Beautiful image rendering and fit */
        img {
          object-fit: cover !important;
          border-radius: 4px !important;
          max-width: 100% !important;
          max-height: 480px !important;
          display: block !important;
          margin: 1rem auto !important;
        }

        /* Border consistency */
        .border, .border-b, .border-t, .border-l, .border-r {
          border-color: var(--nous-border) !important;
          opacity: 0.8 !important;
        }
      `;
      clonedDoc.head.appendChild(style);
     }
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    if (i > 0) pdf.addPage();
    pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight);
   }

   pdf.save(`Mimi_${displayTitle.replace(/[^a-z0-9]/gi, '_')}.pdf`);
   
   window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
    detail: { message: "PDF Export Successful", type: "success" } 
   }));
  } catch (e) {
   console.error("MIMI // Error in exportZine:", e);
   window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
    detail: { message: "PDF Export Failed", type: "error" } 
   }));
  } finally {
   setIsExportingPDF(false);
  }
 };
 
 // TAILOR INTEGRATION: Fetch styling from the active persona's draft
 const [activeTheme, setActiveTheme] = useState<string>('white editorial');
  
  useEffect(() => {
    if (document.documentElement.classList.contains('dark')) {
      setActiveTheme('black editorial');
    }
  }, []);
 const themeConfig = THEMES[activeTheme as keyof typeof THEMES] || THEMES['white editorial'];

 const tailor = activePersona?.tailorDraft || profile?.tailorDraft;
 const accentColor = tailor?.chromaticRegistry?.accentSignal || themeConfig.accent;
 const baseColor = themeConfig.bg;
 
 // Determine dominant font family based on Tailor intent
 const fontFamily = tailor?.typographyIntent?.styleDescription || 'Inter';
 const fontUrl = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/ /g, '+')}&display=swap`;
 const fontStyle = ''; // Inherit from root wrapper

 // Field Notes State - Fallback logic for Debris
 const originalDebris = metadata.originalInput || metadata.content.meta?.intent || '';
 const [noteContent, setNoteContent] = useState(originalDebris);
 const [vocalSummary, setVocalSummary] = useState(metadata.content.vocal_summary_blurb || '');
 const [poeticInterpretation, setPoeticInterpretation] = useState(metadata.content.poetic_interpretation || '');
 
 const handleSaveMetadata = () => {
 const updatedMetadata = {
 ...metadata,
 content: {
 ...metadata.content,
 vocal_summary_blurb: vocalSummary,
 poetic_interpretation: poeticInterpretation
 }
 };
 onUpdateMetadata(updatedMetadata);
 setIsEditing(false);
 };

 const handleHeroImageGenerated = async (base64: string) => {
 if (!user?.uid) return;
 try {
 const { archiveManager } = await import('../services/archiveManager');
 const url = await archiveManager.uploadMedia(user.uid, base64, `zines/${metadata.id}/hero`);
 const updatedMetadata = {
 ...metadata,
 coverImageUrl: url,
 content: {
 ...metadata.content,
 hero_image_url: url
 }
 };
 onUpdateMetadata(updatedMetadata);
 } catch (e) {
 console.error("Failed to upload hero image", e);
 }
 };

 const handlePageImageGenerated = async (base64: string, pageIndex: number) => {
 if (!user?.uid || !metadata.content.pages) return;
 try {
 const { archiveManager } = await import('../services/archiveManager');
 const url = await archiveManager.uploadMedia(user.uid, base64, `zines/${metadata.id}/page_${pageIndex}`);
 const updatedPages = [...metadata.content.pages];
 updatedPages[pageIndex] = {
 ...updatedPages[pageIndex],
 image_url: url
 };
 const updatedMetadata = {
 ...metadata,
 content: {
 ...metadata.content,
 pages: updatedPages
 }
 };
 onUpdateMetadata(updatedMetadata);
 } catch (e) {
 console.error("Failed to upload page image", e);
 }
 };

 const handleHypothesisImageGenerated = async (base64: string) => {
 if (!user?.uid) return;
 try {
 const { archiveManager } = await import('../services/archiveManager');
 const url = await archiveManager.uploadMedia(user.uid, base64, `zines/${metadata.id}/hypothesis`);
 const updatedMetadata = {
 ...metadata,
 content: {
 ...metadata.content,
 hypothesis_image_url: url
 }
 };
 onUpdateMetadata(updatedMetadata);
 } catch (e) {
 console.error("Failed to upload hypothesis image", e);
 }
 };

 const sourceRef = useRef<AudioBufferSourceNode | null>(null);
 const audioCtxRef = useRef<AudioContext | null>(null);
 const { isRecording, startRecording, stopRecording, audioBlob } = useRecorder();

 const movePage = (index: number, direction: 'up' | 'down') => {
   const newPages = [...reorderPagesList];
   const targetIndex = direction === 'up' ? index - 1 : index + 1;
   if (targetIndex < 0 || targetIndex >= newPages.length) return;
   
   // Swap
   const temp = newPages[index];
   newPages[index] = newPages[targetIndex];
   newPages[targetIndex] = temp;
   setReorderPagesList(newPages);
   
   window.dispatchEvent(new CustomEvent('mimi:sound', { detail: { type: 'click' } }));
 };

 const handlePageDragStart = (e: React.DragEvent, index: number) => {
   e.dataTransfer.setData('text/plain', index.toString());
 };

 const handlePageDrop = (e: React.DragEvent, dropIndex: number) => {
   e.preventDefault();
   const dragIndexStr = e.dataTransfer.getData('text/plain');
   if (!dragIndexStr) return;
   const dragIndex = parseInt(dragIndexStr, 10);
   if (dragIndex === dropIndex) return;

   const newPages = [...reorderPagesList];
   const draggedItem = newPages[dragIndex];
   
   newPages.splice(dragIndex, 1);
   newPages.splice(dropIndex, 0, draggedItem);
   
   setReorderPagesList(newPages);
   window.dispatchEvent(new CustomEvent('mimi:sound', { detail: { type: 'transition' } }));
 };

 const handleSavePageOrder = () => {
   if (!metadata.content) return;
   
   const updatedPages = reorderPagesList.map((page, idx) => ({
     ...page,
     pageNumber: idx + 1
   }));

   const updatedMetadata = {
     ...metadata,
     content: {
       ...metadata.content,
       pages: updatedPages
     }
   };

   onUpdateMetadata(updatedMetadata);
   setShowReorderModal(false);
   window.dispatchEvent(new CustomEvent('mimi:registry_alert', { detail: { message: "Page Order Updated Successfully.", type: "success" } }));
 };

 // Handle Voice Transcription for Notes
 useEffect(() => {
 if (audioBlob) {
 const processAudio = async () => {
 setIsTranscribing(true);
 try {
 const reader = new FileReader();
 const base64 = await new Promise<string>((resolve, reject) => {
 reader.onload = () => resolve((reader.result as string).split(',')[1]);
 reader.onerror = reject;
 reader.readAsDataURL(audioBlob);
 });
 const text = await transcribeAudio(base64);
 setNoteContent(prev => prev ? `${prev}\n\n[Voice Note]: ${text}` : `[Voice Note]: ${text}`);
 } catch (e) {
 console.error("Transcription failed", e);
 } finally {
 setIsTranscribing(false);
 }
 };
 processAudio();
 }
 }, [audioBlob]);

 // Check if zine is already saved
 useEffect(() => {
 if (!user?.uid) return;
 
 const unsubscribe = subscribeToPocketItems(user.uid, (items) => {
 const isAlreadySaved = items.some(item => item.content?.zineId === metadata.id);
 setIsSaved(isAlreadySaved);
 });
 
 return () => unsubscribe();
 }, [user?.uid, metadata.id]);
 
 const handleVoiceToggle = async () => {
 if (!hasAccess(profile?.plan, 'core')) {
 window.dispatchEvent(new CustomEvent('mimi:open_patron_modal'));
 return;
 }
 if (isPlaying) { 
 if (sourceRef.current) { try { sourceRef.current.stop(); } catch(e) {} }
 setIsPlaying(false); 
 setAudioProgress(0);
 return; 
 }
 
 setIsVoiceLoading(true);
 try {
 const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
 if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
 audioCtxRef.current = new AudioContextClass();
 }
 
 if (audioCtxRef.current.state === 'suspended') {
 await audioCtxRef.current.resume();
 }
 
 const displayTitle = metadata.content?.headlines?.[0] || metadata.title ||"Untitled";
 const narrationText = (vocalSummary || poeticInterpretation || displayTitle).trim();
 const { key: personaKey } = resolveApiKey('gemini', activePersona?.apiKey, profile?.planStatus);
 const bytes = await generateAudio(narrationText, personaKey);
 
 let audioBuffer: AudioBuffer;
 
 // Check for RIFF header (WAV)
 if (bytes[0] === 82 && bytes[1] === 73 && bytes[2] === 70 && bytes[3] === 70) {
 audioBuffer = await audioCtxRef.current.decodeAudioData(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
 } else {
 // Fallback to raw 16-bit PCM 24kHz
 const length = Math.floor(bytes.byteLength / 2);
 const dataInt16 = new Int16Array(bytes.buffer, bytes.byteOffset, length);
 audioBuffer = audioCtxRef.current.createBuffer(1, length, 24000);
 const channelData = audioBuffer.getChannelData(0);
 for (let i = 0; i < length; i++) { 
 channelData[i] = dataInt16[i] / 32768.0; 
 }
 }

 const source = audioCtxRef.current.createBufferSource();
 source.buffer = audioBuffer;
 source.connect(audioCtxRef.current.destination);
 source.onended = () => {
 setIsPlaying(false);
 setAudioProgress(0);
 };
 source.start(0);
 startTimeRef.current = audioCtxRef.current.currentTime;
 durationRef.current = audioBuffer.duration;
 sourceRef.current = source;
 setIsPlaying(true);
 } catch (e: any) {
 console.error("MIMI // Voice synthesis failed:", e);
 setIsPlaying(false);
 if (e.message?.includes('overloaded') || e.code === 'QUOTA_EXCEEDED') {
 window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
 detail: { 
 message:"Oracle Overloaded. The frequency is too high.", 
 icon: <AlertCircle size={14} className="text-red-500"/> 
 } 
 }));
 }
 } finally { setIsVoiceLoading(false); }
 };

 const handleAnimateManifest = async () => {
 if (isAnimatingManifest) return;
 if (!hasAccess(profile?.plan, 'lab')) {
 window.dispatchEvent(new CustomEvent('mimi:open_patron_modal'));
 return;
 }
 setIsAnimatingManifest(true);
 window.dispatchEvent(new CustomEvent('mimi:registry_alert', { detail: { message:"Manifesting Motion Refraction...", icon: <Film size={14} style={{ color: accentColor }} /> } }));
 try {
 const displayTitle = metadata.content?.headlines?.[0] || metadata.title ||"Untitled";
 const targetImage = metadata.coverImageUrl || metadata.content.pages?.[0]?.image_url;
 const res = await animateShardWithVeo(targetImage, displayTitle, '9:16');
 const { archiveManager } = await import('../services/archiveManager');
 await archiveManager.saveToPocket(user?.uid || 'ghost', 'video', { videoUrl: res, title: `${displayTitle} // Motion`, timestamp: Date.now() });
 } catch (e) {} finally { setIsAnimatingManifest(false); }
 };

 const handleSaveToPocket = async () => {
 if (isSaved) return;
 
 // Optimistic update
 setIsSaved(true);
 
 try {
 const displayTitle = metadata.content?.headlines?.[0] || metadata.title ||"Untitled";
 const { archiveManager } = await import('../services/archiveManager');
 await archiveManager.saveToPocket(user?.uid || 'ghost', 'zine_card', { 
 zineId: metadata.id, 
 title: displayTitle, 
 analysis: {
 ...metadata.content,
 design_brief: metadata.content.strategic_hypothesis || metadata.content.designBrief
 }, 
 timestamp: Date.now(),
 notes: noteContent, // Save the edited/voice-appended notes
 imageUrl: metadata.coverImageUrl,
 originalInput: originalDebris // Explicitly save original debris again
 });
 window.dispatchEvent(new CustomEvent('mimi:registry_alert', { detail: { message:"Manifest Anchored with Field Notes.", icon: <Bookmark size={14} style={{ color: accentColor }} /> } }));
 } catch (e) {
 // Revert on error
 setIsSaved(false);
 console.error("Failed to save to pocket", e);
 window.dispatchEvent(new CustomEvent('mimi:registry_alert', { detail: { message:"Failed to anchor manifest.", icon: <AlertCircle size={14} className="text-red-500"/> } }));
 }
 };

 const handleShareLink = async () => {
 const shareUrl = `${window.location.origin}/s/${metadata.id}`;
 if (navigator.share) {
 try {
 await navigator.share({
 title: metadata.title || 'Mimi Zine',
 text: metadata.content?.strategic_hypothesis || 'View this zine.',
 url: shareUrl
 });
 } catch (err) {
 console.error('Error sharing', err);
 }
 } else {
 try {
 await navigator.clipboard.writeText(shareUrl);
 window.dispatchEvent(new CustomEvent('mimi:registry_alert', { detail: { message: "Link Copied to Clipboard." } }));
 } catch (err) {
 console.error('Failed to copy', err);
 }
 }
 };

 const handleSaveThread = async () => {
 if (isThreadSaved || isSavingThread || !user?.uid) return;
 
 setIsSavingThread(true);
 try {
 const displayTitle = metadata.content?.headlines?.[0] || metadata.title ||"Untitled Thread";
 const thread: NarrativeThread = {
 id: `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
 userId: user.uid,
 title: displayTitle,
 narrative: originalDebris,
 mode: 'influence', // Defaulting to influence for now, could be derived
 createdAt: Date.now(),
 updatedAt: Date.now()
 };
 await saveNarrativeThread(thread);
 setIsThreadSaved(true);
 window.dispatchEvent(new CustomEvent('mimi:registry_alert', { detail: { message:"Thread Anchored.", icon: <Bookmark size={14} style={{ color: accentColor }} /> } }));
 } catch (e) {
 console.error("Failed to save thread", e);
 window.dispatchEvent(new CustomEvent('mimi:registry_alert', { detail: { message:"Failed to anchor thread.", icon: <AlertCircle size={14} className="text-red-500"/> } }));
 } finally {
 setIsSavingThread(false);
 }
 };

 const handleBroadcast = async () => {
 if (isBroadcasted || isBroadcasting) return;
 setIsBroadcasting(true);
 window.dispatchEvent(new CustomEvent('mimi:sound', { detail: { type: 'shimmer' } }));
 try {
 const { collection, addDoc } = await import('firebase/firestore');
 const { db } = await import('../services/firebase');
 
 const displayTitle = metadata.content?.headlines?.[0] || metadata.title ||"Untitled";
 const transmission = {
 userId: user?.uid || 'ghost',
 userHandle: profile?.handle || 'Ghost',
 content: displayTitle,
 imageUrl: metadata.coverImageUrl || metadata.content.hero_image_url || '',
 timestamp: Date.now(),
 type: 'manifest',
 likes: 0,
 zineData: metadata
 };
 
 const cleanTransmission = JSON.parse(JSON.stringify(transmission));
 await addDoc(collection(db, 'public_transmissions'), cleanTransmission);
 
 setIsBroadcasted(true);
 window.dispatchEvent(new CustomEvent('mimi:registry_alert', { detail: { message:"Manifest Broadcasted to Proscenium.", icon: <Radio size={14} style={{ color: accentColor }} /> } }));
 } catch (e) {
 console.error("Broadcast failed", e);
 window.dispatchEvent(new CustomEvent('mimi:registry_alert', { detail: { message:"Broadcast Failed.", type: 'error' } }));
 } finally {
 setIsBroadcasting(false);
 }
 };

 const handleContinuum = () => {
 // Pass provocation AND original artifacts as context to input
 const provocation = metadata.content.poetic_provocation;
 const displayTitle = metadata.content?.headlines?.[0] || metadata.title ||"Untitled";
 window.dispatchEvent(new CustomEvent('mimi:change_view', { 
 detail: 'studio', 
 detail_data: { 
 context: `Continuing thread from"${displayTitle}".\n\nPROVOCATION:"${provocation}"\n\nRESPONSE:`,
 provocation: provocation,
 initialMedia: metadata.artifacts || [] 
 }
 } as any));
 };

 const handleScrySignal = (motif: string) => {
 // Direct pass to Scry View
 window.dispatchEvent(new CustomEvent('mimi:change_view', { 
 detail: 'scry',
 detail_data: { signal: motif }
 } as any));
 };

 useEffect(() => {
 document.body.style.overflow = 'hidden';
 return () => {
 document.body.style.overflow = '';
 };
 }, []);

 return (
 <>
 <link href={fontUrl} rel="stylesheet"/>
 <div 
 className="fixed inset-0 z-[9999] w-screen h-screen flex flex-col overflow-hidden transition-colors duration-1000 print:bg-white zine-theme-root"
 style={{ 
 fontFamily: `'${fontFamily}', sans-serif`,
 '--zine-bg': baseColor, 
 '--zine-text': themeConfig.text, 
 '--zine-accent': accentColor, 
 '--zine-thread': themeConfig.thread, 
 '--zine-glow': themeConfig.glow,
 '--zine-surface': themeConfig.surface,
 '--zine-border': themeConfig.border,
 backgroundColor: 'var(--zine-bg)',
 color: 'var(--zine-text)'
 } as React.CSSProperties}
 >
  {/* Quick Preview Draft Banner */}
  {metadata.isQuickPreview && (
    <div className="bg-stone-900/95 border-b border-stone-700/70 text-stone-100 px-6 py-3.5 flex items-center justify-between gap-4 font-mono text-[10px] tracking-wider z-[11000] relative backdrop-blur-md shrink-0 shadow-xl">
      <div className="flex items-center gap-2.5 min-w-0">
        <Eye size={14} className="text-amber-400 shrink-0" />
        <span className="font-bold truncate">QUICK PREVIEW DRAFT // Layout & Typography Verified</span>
        <span className="hidden md:inline text-stone-400 text-[9px]">(Low-fidelity draft without heavy image generation)</span>
      </div>
      <button
        onClick={() => {
          onReset();
          window.dispatchEvent(new CustomEvent('mimi:develop_highfi', { detail: { originalInput: metadata.originalInput } }));
        }}
        className="px-4 py-1.5 bg-amber-400 hover:bg-amber-300 text-stone-950 font-extrabold rounded-xs transition-colors tracking-widest uppercase shrink-0 cursor-pointer shadow-md"
      >
        Generate Full High-Fi Zine
      </button>
    </div>
  )}

  <div className="fixed top-8 right-8 z-[10000] flex items-center gap-2">
    <button
      onClick={() => setIsDedicatedReadingMode(true)}
      className="font-mono text-[10px] uppercase tracking-[0.2em] font-black text-nous-subtle hover:text-nous-text transition-all bg-white/90 dark:bg-stone-900/90 backdrop-blur-md px-4 md:px-5 py-3 border border-nous-border hover:scale-105 active:scale-95 shadow-lg flex items-center gap-2 cursor-pointer"
      title="Enter dedicated Reading Mode with expanded line height, increased margins, and zero distraction chrome"
    >
      <BookOpen size={13} />
      <span className="hidden sm:inline">[ READING MODE ]</span>
    </button>
    <button 
      onClick={onReset} 
      className="font-mono text-[10px] uppercase tracking-[0.2em] font-black text-nous-subtle hover:text-nous-text transition-all bg-white/80 dark:bg-stone-900/80 backdrop-blur-md px-4 md:px-6 py-3 border border-nous-border hover:scale-105 active:scale-95 shadow-lg cursor-pointer"
    >
      [ X ]
    </button>
  </div>
 <style>{`
  .zine-theme-root section { background-color: transparent !important; }
  .zine-theme-root .bg-white, .zine-theme-root .dark\\:bg-\\[\\#0A0A0A\\], .zine-theme-root .dark\\:bg-nous-base { background-color: var(--zine-surface) !important; }
  .zine-theme-root .border-nous-border, .zine-theme-root .dark\\:border-nous-border, .zine-theme-root .dark\\:border-nous-border { border-color: var(--zine-border) !important; }
  .zine-theme-root .text-nous-text, .zine-theme-root .dark\\:text-nous-text, .zine-theme-root .text-nous-text { color: var(--zine-text) !important; }
  .zine-theme-root .bg-\\[\\#FDFBF7\\], .zine-theme-root .dark\\:bg-\\[\\#080808\\], .zine-theme-root .bg-\\[\\#FAFAFA\\] { background-color: var(--zine-bg) !important; }
  ${themeConfig.font === 'editorial' ? `
    .zine-theme-root .font-serif { font-family: '${fontFamily}', serif !important; }
  ` : themeConfig.font === 'brutalist' ? `
    .zine-theme-root .font-serif, .zine-theme-root .font-sans, .zine-theme-root p, .zine-theme-root h1, .zine-theme-root h2, .zine-theme-root h3, .zine-theme-root h4, .zine-theme-root span { font-family: 'JetBrains Mono', monospace !important; text-transform: uppercase !important; letter-spacing: -0.05em !important; }
  ` : `
    .zine-theme-root .font-serif, .zine-theme-root .font-sans, .zine-theme-root p, .zine-theme-root h1, .zine-theme-root h2, .zine-theme-root h3, .zine-theme-root h4, .zine-theme-root span { font-family: 'Inter', sans-serif !important; font-style: normal !important; letter-spacing: -0.02em !important; }
  `}
  `}</style>
 {/* PORTFOLIO BINDING STITCH & LATENT THREAD */}
 <div className="absolute left-8 top-0 bottom-0 w-8 z-[4000] pointer-events-none flex justify-center">
 {/* The physical stitch (dashed thread) */}
 <div 
 className="w-[2px] h-full transition-colors duration-1000 opacity-60"
 style={{ 
 backgroundImage: `repeating-linear-gradient(to bottom, ${themeConfig.thread} 0, ${themeConfig.thread} 16px, transparent 16px, transparent 32px)`,
 boxShadow: themeConfig.glow 
 }} 
 />
 {/* The fiber optic laser pulse */}
 <motion.div 
 key={activeTheme}
 initial={{ top: 0, height: '0%', opacity: 1 }}
 animate={{ top: '100%', height: '200px', opacity: 0 }}
 transition={{ duration: 1.5, ease:"circOut"}}
 className="absolute w-[4px] rounded-none"
 style={{ backgroundColor: accentColor, boxShadow: `0 0 30px 4px ${accentColor}` }}
 />
 
 {/* The Chromatic Dial positioned relative to the stitch */}
 <ChromaticDial 
 activeTheme={activeTheme} 
 onChange={(t) => setActiveTheme(t as any)} 
 accent={accentColor} 
 className="absolute bottom-8 left-full ml-4"
 />
 </div>

 <AnimatePresence>
 {isExportingPDF && (
  <motion.div 
   initial={{ opacity: 0 }} 
   animate={{ opacity: 1 }} 
   exit={{ opacity: 0 }}
   className="fixed inset-0 bg-white/95 dark:bg-[#070707]/95 backdrop-blur-md z-[25000] flex items-center justify-center pointer-events-auto"
  >
   <div className="bg-white dark:bg-[#0c0c0c] p-12 rounded-none text-center space-y-6 border border-nous-border max-w-sm">
    <Loader2 size={32} className="animate-spin text-amber-500 mx-auto" />
    <div className="space-y-3">
     <p className="font-serif italic text-2xl text-stone-900 dark:text-stone-100 animate-pulse">
      “Extracting Semiotic Layers...”
     </p>
     <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-stone-400">
      Preparing High-Fidelity Client-Side PDF Export
     </p>
    </div>
   </div>
  </motion.div>
 )}
 {showExport && <ExportChamber metadata={metadata} onClose={() => setShowExport(false)} />}
 {showShare && <SocialShareModal metadata={metadata} onClose={() => setShowShare(false)} />}
 {showReorderModal && (
   <motion.div 
     initial={{ opacity: 0 }} 
     animate={{ opacity: 1 }} 
     exit={{ opacity: 0 }}
     className="fixed inset-0 z-[11000] flex items-center justify-center p-6 bg-nous-base/90 backdrop-blur-xl"
   >
     <div className="bg-white dark:bg-[#12110F] text-stone-900 dark:text-stone-100 max-w-4xl w-full border border-stone-200 dark:border-stone-850 p-6 md:p-8 shadow-2xl rounded-none flex flex-col max-h-[90vh]">
       <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-850 pb-4 mb-6">
         <div className="space-y-1">
           <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-amber-500 font-bold">
             Mimi // Editorial Sorter
           </span>
           <h2 className="font-serif italic text-2xl">Reorder Portfolio Spreads</h2>
         </div>
         <button 
           onClick={() => setShowReorderModal(false)}
           className="p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition-colors"
         >
           <X size={18} />
         </button>
       </div>

       <p className="font-sans text-xs text-stone-500 dark:text-stone-400 mb-6">
         Drag and drop the visual plates or use the arrow controls on each card to customize your signature layout sequence before exporting to PDF.
       </p>

       {/* Scrollable drag & drop list */}
       <div className="flex-1 overflow-y-auto no-scrollbar grid grid-cols-2 md:grid-cols-4 gap-4 p-1 mb-6">
         {reorderPagesList.map((page, idx) => (
           <div
             key={idx}
             draggable
             onDragStart={(e) => handlePageDragStart(e, idx)}
             onDragOver={(e) => e.preventDefault()}
             onDrop={(e) => handlePageDrop(e, idx)}
             className="bg-stone-50 dark:bg-stone-900/30 border border-stone-200 dark:border-stone-850 p-3 hover:border-amber-500/50 dark:hover:border-amber-500/50 transition-all group cursor-grab active:cursor-grabbing relative flex flex-col h-64"
           >
             {/* Drag Handle & Label */}
             <div className="flex justify-between items-center mb-2">
               <span className="font-mono text-[8px] uppercase tracking-wider text-stone-400 font-bold">
                 PLATE 0{idx + 1}
               </span>
               <Grid3X3 size={12} className="text-stone-300 group-hover:text-amber-500 transition-colors" />
             </div>

             {/* Thumbnail Container */}
             <div className="flex-1 relative bg-stone-100 dark:bg-stone-950 border border-stone-200/50 dark:border-stone-850 overflow-hidden mb-3 flex items-center justify-center">
               {page.image_url ? (
                 <img
                   src={page.image_url}
                   alt={page.headline || "Plate Thumbnail"}
                   className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                   referrerPolicy="no-referrer"
                 />
               ) : (
                 <div className="flex flex-col items-center justify-center p-4 text-center space-y-2">
                   <ImageIcon size={20} className="text-stone-300 dark:text-stone-700 animate-pulse-slow" />
                   <span className="font-mono text-[8px] uppercase tracking-wider text-stone-400">
                     Visualizing...
                   </span>
                 </div>
               )}
             </div>

             {/* Title / Description */}
             <div className="space-y-1 mb-3">
               <p className="font-serif italic text-xs text-stone-800 dark:text-stone-200 truncate">
                 {page.headline || "Untitled Section"}
               </p>
               <p className="font-sans text-[8px] text-stone-400 truncate">
                 {page.imagePrompt || page.supportingText || "No text description."}
               </p>
             </div>

             {/* Move buttons */}
             <div className="flex justify-between gap-2 border-t border-stone-200/50 dark:border-stone-850/50 pt-2">
               <button
                 disabled={idx === 0}
                 onClick={() => movePage(idx, "up")}
                 className="flex-1 py-1 bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-[9px] uppercase font-bold tracking-wider hover:bg-stone-200 dark:hover:bg-stone-800 disabled:opacity-30 disabled:pointer-events-none rounded-sm transition-colors text-center text-stone-800 dark:text-stone-200"
               >
                 ←
               </button>
               <button
                 disabled={idx === reorderPagesList.length - 1}
                 onClick={() => movePage(idx, "down")}
                 className="flex-1 py-1 bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-[9px] uppercase font-bold tracking-wider hover:bg-stone-200 dark:hover:bg-stone-800 disabled:opacity-30 disabled:pointer-events-none rounded-sm transition-colors text-center text-stone-800 dark:text-stone-200"
               >
                 →
               </button>
             </div>
           </div>
         ))}
       </div>

       {/* Footer controls */}
       <div className="flex justify-end gap-3 border-t border-stone-200 dark:border-stone-850 pt-4 shrink-0">
         <button
           onClick={() => setShowReorderModal(false)}
           className="px-4 py-2 bg-transparent border border-stone-200 dark:border-stone-800 text-[10px] uppercase tracking-wider font-bold hover:bg-red-500/5 hover:border-red-500/30 hover:text-red-500 transition-all rounded-sm text-stone-600 dark:text-stone-400"
         >
           DISCARD CHANGES
         </button>
         <button
           onClick={handleSavePageOrder}
           className="px-5 py-2 bg-stone-900 dark:bg-stone-100 text-stone-100 dark:text-stone-950 text-[10px] uppercase tracking-widest font-black hover:opacity-90 transition-all rounded-sm flex items-center gap-2"
         >
           <Check size={12} strokeWidth={3} />
           SAVE NEW ORDER
         </button>
       </div>
     </div>
   </motion.div>
 )}
 {showComments && (
 <motion.div 
 initial={{ opacity: 0 }} 
 animate={{ opacity: 1 }} 
 exit={{ opacity: 0 }}
 className="fixed inset-0 z-[11000] flex items-center justify-center p-6 bg-nous-base/80 backdrop-blur-xl"
 >
 <ZineComments zineId={metadata.id} onClose={() => setShowComments(false)} />
 </motion.div>
 )}
 </AnimatePresence>

 {/* MAIN CONTENT LAYOUT - SPLIT WITH SIDEBAR */}
 <div className="flex flex-1 overflow-hidden relative">
 
 {/* THE SCROLLABLE / FLIPBOOK ZINE CONTENT */}
 <ZineFlipbookShell mode={readingMode} onModeChange={setReadingMode} accentColor={accentColor}>
 
 {/* 1. HEADLINES (TITLE/TONE) */}
 <motion.section initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease: [0.16,1,0.3,1] }} className="min-h-[100dvh] flex flex-col justify-center snap-start border-b border-nous-border print:min-h-0 print:py-12 bg-nous-base">
 <div className="w-full space-y-10 md:space-y-16 px-6 md:px-24">
 <div className="flex items-center gap-4">
 <span className="font-mono text-[9px] uppercase tracking-[0.5em] text-nous-subtle">Issue_0{Math.floor(Math.random() * 10)}</span>
 {metadata.isDeepThinking && <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-none text-amber-500 font-sans text-[7px] font-black uppercase tracking-widest"><Radar size={10} className="animate-pulse"/> Deep Refraction</div>}
 <button onClick={handleResonanceFlip} className="p-2 bg-nous-base rounded-none hover:bg-nous-base0 transition-colors">
 <Layers size={14} className="text-nous-subtle"/>
 </button>
 </div>
 <h1 className={`${fontStyle} text-5xl sm:text-7xl md:text-8xl lg:text-[9rem] tracking-tight leading-[0.92] text-nous-text uppercase italic max-w-5xl`}>
 {metadata.content?.headlines?.[0] || metadata.title}
 </h1>
 <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-12 pt-8 md:pt-12 border-t border-nous-border">
 <div className="flex flex-col gap-1">
 <span className="font-sans text-[8px] uppercase tracking-[0.3em] font-black text-nous-subtle">Tone</span>
 <span className="font-serif italic text-3xl"style={{ color: accentColor }}>{metadata.tone}</span>
 </div>
 <div className="hidden md:block h-12 w-px bg-stone-200"/>
 <div className="flex flex-col gap-1">
 <span className="font-sans text-[8px] uppercase tracking-[0.3em] font-black text-nous-subtle">Date</span>
 <span className="font-serif italic text-3xl">{new Date(metadata.timestamp).toLocaleDateString()}</span>
 </div>
 <div className="hidden md:block h-12 w-px bg-stone-200"/>
 <div className="flex flex-col gap-1">
 <span className="font-sans text-[8px] uppercase tracking-[0.3em] font-black text-nous-subtle">Author</span>
 <span className="font-serif italic text-3xl">@{metadata.userHandle}</span>
 </div>
 </div>
 </div>
 </motion.section>

 {/* 2. SUMMARY (WITH VOCAL TRANSMISSION) */}
 <motion.section initial={{ opacity: 0, y: 50, filter: 'blur(10px)' }} whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }} viewport={{ once: true, margin: '-10%' }} transition={{ duration: 1, ease: 'easeOut' }} className="min-h-[100dvh] flex flex-col justify-center snap-start bg-nous-base print:min-h-0 print:py-12">
 <div className="w-full space-y-16 px-6 md:px-24">
 <SectionHeader label="Executive Summary"icon={Sparkles} style={{ color: accentColor }} />
 {isOwner && (
  <button onClick={() => setIsEditing(!isEditing)} className="text-[8px] uppercase tracking-widest font-black text-nous-subtle hover:text-nous-text transition-colors">
  {isEditing ? 'Cancel Edit' : 'Edit Summary'}
  </button>
 )}
 {isEditing ? (
 <div className="space-y-4">
 <textarea value={vocalSummary} onChange={e => setVocalSummary(e.target.value)} className="w-full p-4 bg-nous-base rounded-none"placeholder="Vocal Summary Blurb"/>
 <textarea value={poeticInterpretation} onChange={e => setPoeticInterpretation(e.target.value)} className="w-full p-4 bg-nous-base rounded-none"placeholder="Poetic Interpretation"/>
 <button onClick={handleSaveMetadata} className="px-4 py-2 bg-nous-base0 text-white rounded-none font-sans text-[8px] uppercase tracking-widest font-black">Save Changes</button>
 </div>
 ) : (
 <ZineTextContent content={vocalSummary || poeticInterpretation} className="text-xl md:text-2xl" />
 )}
 </div>
 </motion.section>

 {/* 3. HEADER IMAGE */}
 <motion.section initial={{ opacity: 0, y: 50, filter: 'blur(10px)' }} whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }} viewport={{ once: true, margin: '-10%' }} transition={{ duration: 1, ease: 'easeOut' }} className="min-h-[100dvh] flex flex-col justify-center snap-start bg-black overflow-hidden relative group print:min-h-0 print:py-12">
 <Visualizer prompt={metadata.content.hero_image_prompt || metadata.content?.headlines?.[0] || metadata.title} defaultAspectRatio="16:9"defaultImageSize={metadata.isHighFidelity ? '2K' : '1K'} isArtifact isLite={metadata.isLite} initialImage={metadata.coverImageUrl} artifacts={metadata.artifacts} treatmentId={metadata.treatmentId} autoDevelop={false} onImageGenerated={handleHeroImageGenerated} />
 <div className="absolute bottom-12 left-12 p-4 bg-white/5 backdrop-blur-md rounded-none border border-white/10">
 <span className="font-mono text-[7px] text-white uppercase tracking-widest">FIG_01: PRIMARY_VISUAL</span>
 </div>
 </motion.section>

 {/* 4. THE READING (ORACULAR MIRROR) */}
 <motion.section initial={{ opacity: 0, y: 50, filter: 'blur(10px)' }} whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }} viewport={{ once: true, margin: '-10%' }} transition={{ duration: 1, ease: 'easeOut' }} className="min-h-[100dvh] flex flex-col justify-center snap-start bg-nous-base print:min-h-0 print:py-12">
 <div className="w-full space-y-12 px-6 md:px-24">
 <SectionHeader label="Oracular Mirror"icon={Eye} style={{ color: accentColor }} />
 <ZineTextContent content={metadata.content.oracular_mirror || metadata.content.the_reading || "The mirror is silent."} className="text-xl md:text-2xl" />
 </div>
 </motion.section>

 {/* 5. STRATEGIC HYPOTHESIS (VISUALIZED) */}
 <motion.section initial={{ opacity: 0, y: 50, filter: 'blur(10px)' }} whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }} viewport={{ once: true, margin: '-10%' }} transition={{ duration: 1, ease: 'easeOut' }} className="min-h-[100dvh] flex flex-col justify-center snap-start bg-nous-base print:min-h-0 print:py-12">
 <div className="w-full space-y-12 px-6 md:px-24">
 <SectionHeader label="Strategic Hypothesis"icon={Target} style={{ color: accentColor }} />
 <div className="grid md:grid-cols-2 gap-12 items-center">
 <div className="aspect-square w-full relative border border-nous-border rounded-none overflow-hidden bg-nous-base">
 {/* Use Visualizer to render the hypothesis visually */}
 <Visualizer 
 prompt={`Create a visual interpretation of this concept: "${metadata.content.strategic_hypothesis}". Honor palette, medium, lighting, camera, atmosphere, and composition only when they are established by the creator's prompt, approved zine brief, uploaded references, or confirmed Tailor rules. Otherwise leave those dimensions unconstrained. No text or typography.`} 
 defaultAspectRatio="1:1"
 defaultImageSize={metadata.isHighFidelity ? '2K' : '1K'}
 isArtifact 
 isLite={metadata.isLite} 
 delay={400}
 artifacts={metadata.artifacts?.length > 1 ? metadata.artifacts : undefined}
 treatmentId={metadata.treatmentId}
 initialImage={(metadata.content as any).hypothesis_image_url}
                autoDevelop={false}
                onImageGenerated={handleHypothesisImageGenerated}
 />
 <div className="absolute bottom-4 right-4 bg-black/80 text-white px-2 py-1 text-[8px] font-mono rounded-none">FIG 2.1 — ABSTRACT</div>
 </div>
 <div className="p-8 md:p-12 border-l-4"style={{ borderColor: `${accentColor}30` }}>
 <p className="font-serif italic text-2xl md:text-4xl leading-relaxed text-nous-text">
 {metadata.content.strategic_hypothesis}
 </p>
 <div className="mt-8 flex items-center gap-4 text-nous-subtle">
 <Layers size={16} />
 <span className="font-sans text-[9px] uppercase tracking-widest font-black">Visual Perception Generated</span>
 </div>
 <div className="mt-12">
 </div>
 </div>
 </div>
 </div>
 </motion.section>

 {/* 6. SEMIOTIC SIGNALS - REDESIGNED GRID */}
 <motion.section initial={{ opacity: 0, y: 50, filter: 'blur(10px)' }} whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }} viewport={{ once: true, margin: '-10%' }} transition={{ duration: 1, ease: 'easeOut' }} className="min-h-[100dvh] flex flex-col justify-center snap-start bg-nous-base print:min-h-0 print:py-12">
 <div className="w-full space-y-16 px-6 md:px-24">
 <SectionHeader label="Semiotics & Visual Directives"icon={Radar} style={{ color: accentColor }} />
 <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
 {metadata.content.semiotic_signals?.map((t, i) => {
 const Icon = t.type === 'acquisition' ? Briefcase : t.type === 'lexical' ? BookOpen : Sparkles;
 const isCommerce = t.type === 'acquisition';
 const isFlipped = flippedSignalIndex === i;
 const label = isCommerce
   ? (t.commerce_source === 'shopify' ? 'Shopify touchpoint' : 'Commerce reference')
   : t.type === 'lexical'
     ? 'Add to Lexicon'
     : 'Imagine this';
 
 return (
 <div key={i} className="group relative min-h-[390px] overflow-hidden bg-white border border-nous-border rounded-none transition-all hover:border-[var(--hover-accent)]" style={{ '--hover-accent': accentColor, perspective: '1200px' } as React.CSSProperties}>
 <AnimatePresence mode="wait" initial={false}>
 {isFlipped && isCommerce ? (
 <motion.div
 key="commentary"
 initial={{ rotateY: -90, opacity: 0 }}
 animate={{ rotateY: 0, opacity: 1 }}
 exit={{ rotateY: 90, opacity: 0 }}
 transition={{ duration: 0.28, ease: 'easeOut' }}
 className="absolute inset-0 p-7 flex flex-col justify-between bg-[#F7F4EC]"
 >
 <div>
 <div className="flex items-center justify-between gap-3 pb-4 border-b border-nous-border">
 <span className="font-sans text-[8px] uppercase tracking-[0.22em] font-black text-nous-subtle">Semiotic commentary</span>
 <span className="font-mono text-[8px] text-nous-subtle">SIG_0{i+1}</span>
 </div>
 {t.semantic_trigger && (
 <div className="mt-6">
 <span className="font-mono text-[8px] uppercase tracking-wider text-nous-subtle block mb-2">Evidence trigger</span>
 <span className="inline-block font-mono text-[9px] text-[var(--hover-accent)] bg-[var(--hover-accent)]/10 px-2 py-1">{t.semantic_trigger}</span>
 </div>
 )}
 <p className="font-serif text-xl italic leading-relaxed text-nous-text mt-6">
 {t.targeting_rationale || t.context}
 </p>
 <p className="font-sans text-[10px] leading-relaxed text-nous-subtle mt-5">
 This object is included as editorial evidence. It is optional context—not a purchase instruction.
 </p>
 </div>
 <div className="flex items-center justify-between gap-4 pt-6 border-t border-nous-border">
 <button onClick={() => setFlippedSignalIndex(null)} className="font-sans text-[8px] uppercase tracking-widest font-black text-nous-subtle hover:text-nous-text">
 View object
 </button>
 {t.link && (
 <a href={t.link} target="_blank" rel="noreferrer" className="flex items-center gap-2 font-sans text-[8px] uppercase tracking-widest font-black text-nous-text">
 Open source <ExternalLink size={12} />
 </a>
 )}
 </div>
 </motion.div>
 ) : (
 <motion.div
 key="object"
 initial={{ rotateY: 90, opacity: 0 }}
 animate={{ rotateY: 0, opacity: 1 }}
 exit={{ rotateY: -90, opacity: 0 }}
 transition={{ duration: 0.28, ease: 'easeOut' }}
 className="absolute inset-0 p-7 flex flex-col justify-between bg-white"
 >
 <div>
 <div className="flex items-center justify-between gap-3 mb-5">
 <div className="flex items-center gap-2">
 <Icon size={12} className="text-nous-subtle group-hover:text-[var(--hover-accent)] transition-colors"/>
 <span className="font-sans text-[8px] uppercase tracking-[0.2em] font-black text-nous-subtle">{label}</span>
 </div>
 <span className="font-mono text-[8px] text-nous-subtle opacity-50">SIG_0{i+1}</span>
 </div>
 {isCommerce && (
 <div className="aspect-[16/10] mb-5 overflow-hidden border border-nous-border bg-stone-100 flex items-center justify-center">
 {t.image_url ? (
 <img src={t.image_url} alt={`${t.motif} product reference`} loading="lazy" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
 ) : (
 <div className="text-center px-6 text-nous-subtle">
 <Briefcase size={24} strokeWidth={1} className="mx-auto mb-3" />
 <span className="font-mono text-[8px] uppercase tracking-widest">Thumbnail appears with verified Shopify data</span>
 </div>
 )}
 </div>
 )}
 <h4 className="font-serif text-2xl md:text-3xl italic tracking-tighter text-nous-text group-hover:text-[var(--hover-accent)] transition-colors">
 {t.motif}
 </h4>
 {(t.vendor || t.price) && (
 <p className="font-mono text-[8px] uppercase tracking-wider text-nous-subtle mt-2">
 {[t.vendor, t.price].filter(Boolean).join(' · ')}
 </p>
 )}
 <p className="font-serif italic text-sm text-nous-subtle leading-relaxed border-l-2 border-nous-border pl-4 mt-4">
 {t.context}
 </p>
 {!isCommerce && t.visual_directive && (
 <div className="mt-4 pt-4 border-t border-nous-border">
 <span className="font-sans text-[7px] uppercase tracking-widest font-black text-nous-subtle block mb-2">Directive</span>
 <p className="font-mono text-[9px] text-nous-subtle">{t.visual_directive}</p>
 </div>
 )}
 </div>
 <div className="pt-6 flex justify-between items-center gap-4">
 {isCommerce ? (
 <button onClick={() => setFlippedSignalIndex(i)} className="flex items-center gap-2 font-sans text-[8px] uppercase tracking-widest font-black text-nous-text border-b border-current pb-0.5">
 <Target size={10} /> Read why
 </button>
 ) : (
 <button onClick={() => handleScrySignal(t.motif + (t.visual_directive ? ` ${t.visual_directive}` : ''))} className="flex items-center gap-2 font-sans text-[8px] uppercase tracking-widest font-black text-nous-subtle hover:text-[var(--hover-accent)] transition-colors border-b border-transparent hover:border-current pb-0.5">
 <Search size={10} /> Scry signal
 </button>
 )}
 {t.link ? (
 <a href={t.link} target="_blank" rel="noreferrer" className="text-nous-subtle hover:text-[var(--hover-accent)] transition-colors" aria-label={`Open source for ${t.motif}`}>
 <ExternalLink size={14} />
 </a>
 ) : (
 <a href={`https://www.google.com/search?q=${encodeURIComponent(`${t.motif} aesthetic meaning`)}`} target="_blank" rel="noreferrer" className="text-nous-subtle hover:text-[var(--hover-accent)] transition-colors" aria-label={`Research ${t.motif}`}>
 <ExternalLink size={14} />
 </a>
 )}
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 );
 })}
 </div>
 </div>
 </motion.section>

 {/* 7. CELESTIAL CALIBRATION */}
 <motion.section initial={{ opacity: 0, y: 50, filter: 'blur(10px)' }} whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }} viewport={{ once: true, margin: '-10%' }} transition={{ duration: 1, ease: 'easeOut' }} className="min-h-[100dvh] flex flex-col justify-center snap-start bg-stone-950 text-white print:min-h-0 print:py-12">
 <div className="w-full space-y-12 px-6 md:px-24">
 <SectionHeader label="Celestial Calibration"icon={Moon} color="text-white"/>
 <div className="flex flex-col items-center text-center space-y-12">
 <div className="p-8 rounded-none border border-white/10 bg-white/5 animate-pulse-slow">
 <CelestialIcon size={48} style={{ color: accentColor }} />
 </div>
 <p className="font-mono text-xl md:text-3xl text-white uppercase tracking-widest leading-relaxed max-w-2xl border-l-2 pl-6 md:pl-8 text-left" style={{ borderColor: accentColor, color: 'white' }}>
 {metadata.content.celestial_calibration}
 </p>
 </div>
 </div>
 </motion.section>

 {/* 8. VISUAL PLATES - REDESIGNED AS EDITORIAL SPREADS */}
 <div className="bg-white py-32 space-y-32">
 <div className="px-6 md:px-24 w-full">
 <SectionHeader label="Visual Plates"icon={Grid3X3} style={{ color: accentColor }} />
 </div>
 
 {metadata.content.pages?.map((page, i) => {
 const isEven = i % 2 === 0;
 return (
 <motion.section key={i} initial={{ opacity: 0, y: 50, filter: 'blur(10px)' }} whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }} viewport={{ once: true, margin: '-10%' }} transition={{ duration: 1, ease: 'easeOut' }} className="min-h-[100dvh] flex flex-col justify-center snap-start w-full">
 <div className={`flex flex-col ${isEven ? 'md:flex-row' : 'md:flex-row-reverse'} items-stretch md:h-[100dvh]`}>
 
 {/* VISUAL COMPONENT */}
 <div className="w-full md:w-1/2 relative group h-[42dvh] md:h-full flex items-center justify-center p-6 md:p-24">
 <div className="relative w-full h-full max-h-[80vh] border border-nous-border bg-nous-base overflow-hidden">
 <Visualizer 
 prompt={page.imagePrompt} 
 defaultAspectRatio="3:4"
 defaultImageSize={metadata.isHighFidelity ? '2K' : '1K'}
 isArtifact 
 isLite={metadata.isLite} 
 initialImage={page.image_url} 
 delay={800 + (i * 1200)}
 artifacts={metadata.artifacts?.length > 1 ? metadata.artifacts : undefined}
 treatmentId={metadata.treatmentId}
                autoDevelop={false}
                onImageGenerated={(base64) => handlePageImageGenerated(base64, i)}
 />
 {/* PLATE METADATA OVERLAY */}
 <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end pointer-events-none mix-blend-difference text-white opacity-0 group-hover:opacity-100 transition-opacity duration-700">
 <div className="flex flex-col gap-1">
 <span className="font-mono text-[7px] uppercase tracking-widest">FIG. 0{i+1}</span>
 <span className="font-sans text-[7px] font-black uppercase tracking-widest">Aspect: 3:4</span>
 </div>
 <div className="font-mono text-[7px] uppercase tracking-widest">PROMPT_REF_{i+1}</div>
 </div>
 </div>
 </div>

 {/* TEXT COMPONENT */}
 <div className="w-full md:w-1/2 flex flex-col justify-center px-6 py-10 sm:px-8 md:p-24 space-y-6 md:space-y-12">
 <div className="flex items-center gap-4 text-nous-subtle">
 <span className="font-serif italic text-4xl text-nous-text">{i+1}.</span>
 <div className="h-px flex-1 bg-nous-base"/>
 </div>
 <h3 className={`${fontStyle} text-3xl sm:text-4xl md:text-5xl italic tracking-tight leading-snug text-nous-text`}>
 {page.headline}
 </h3>
 <div className="pl-6 border-l-2"style={{ borderColor: `${accentColor}40` }}>
 <ZineTextContent content={page.bodyCopy} className="text-base md:text-lg text-nous-text" />
 {page.supportingText && (
 <div className="mt-6 pt-4 border-t border-stone-200 dark:border-stone-800">
 <ZineTextContent content={page.supportingText} className="text-sm italic text-nous-subtle" enableDropCap={false} />
 </div>
 )}
 </div>
 
 {/* CAPTION STYLE FOOTNOTE */}
 <div className="pt-8 flex gap-4 opacity-40">
 <Hash size={12} />
 <p className="font-mono text-[8px] uppercase leading-relaxed max-w-xs">
 Generative Output • {metadata.tone} • Plate {i+1} of {metadata.content.pages.length}
 </p>
 </div>
 </div>
 </div>
 </motion.section> ); })}
 </div>

 {/* 9. THE ROADMAP (BLUEPRINT) - EDITORIAL JOURNEY */}
 <motion.section initial={{ opacity: 0, y: 50, filter: 'blur(10px)' }} whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }} viewport={{ once: true, margin: '-10%' }} transition={{ duration: 1, ease: 'easeOut' }} className="min-h-[100dvh] snap-start bg-[#F5F2EA] text-stone-950 print:min-h-0 print:py-12 relative overflow-hidden py-24 md:py-32">
 <div className="absolute inset-0 opacity-[0.035] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#111 1px, transparent 1px), linear-gradient(90deg, #111 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
 <div className="w-full relative z-10 px-6 md:px-24">
 <div className="flex items-center gap-4 mb-12 text-stone-900">
 <div className="p-2 border border-stone-300 bg-white"><RoadmapIcon size={16} style={{ color: accentColor }} /></div>
 <div>
 <p className="font-mono text-[9px] uppercase tracking-[0.35em] text-stone-500">From thesis to repeatable action</p>
 <h2 className="font-serif text-3xl md:text-5xl italic">Authority Roadmap</h2>
 </div>
 </div>

 {metadata.content.roadmap ? (
 <div className="space-y-12">
 <div className="grid lg:grid-cols-[1.35fr_0.65fr] border border-stone-300 bg-white shadow-[14px_14px_0_rgba(28,25,23,0.06)]">
 <div className="p-7 md:p-12 border-b lg:border-b-0 lg:border-r border-stone-300">
 <span className="font-mono text-[9px] uppercase tracking-[0.28em] text-stone-500">01 · Strategic thesis</span>
 <p className="font-serif text-2xl md:text-4xl leading-snug mt-5 text-stone-950">{metadata.content.roadmap.strategicThesis}</p>
 </div>
 <div className="p-7 md:p-10 flex flex-col justify-between gap-8">
 <div>
 <span className="font-mono text-[9px] uppercase tracking-[0.28em] text-stone-500">Positioning axis</span>
 <p className="font-serif text-xl md:text-2xl italic leading-snug mt-4 text-stone-900">{metadata.content.roadmap.positioningAxis}</p>
 </div>
 <div className="grid grid-cols-3 gap-2">
 {[
 ['Intensity', metadata.content.roadmap.intensity || '—'],
 ['Density', metadata.content.roadmap.densityLevel ?? '—'],
 ['Timeline', metadata.content.roadmap.timelineMode || '—'],
 ].map(([label, value]) => (
 <div key={String(label)} className="border-t-2 pt-3" style={{ borderColor: accentColor }}>
 <span className="font-mono text-[7px] uppercase tracking-wider text-stone-500 block">{label}</span>
 <span className="font-mono text-xs uppercase text-stone-900 mt-1 block">{value}</span>
 </div>
 ))}
 </div>
 </div>
 </div>

 <div>
 <div className="flex items-center gap-4 mb-5">
 <span className="font-mono text-xs" style={{ color: accentColor }}>02</span>
 <h3 className="font-mono text-[10px] uppercase tracking-[0.25em] font-bold">The authority anchor</h3>
 <div className="h-px flex-1 bg-stone-300" />
 </div>
 <div className="grid lg:grid-cols-3 gap-4">
 {[
 ['Claim', metadata.content.roadmap.authorityAnchor?.coreClaim, 'What must remain true'],
 ['Repeat', metadata.content.roadmap.authorityAnchor?.repetitionVector, 'What builds recognition'],
 ['Refuse', metadata.content.roadmap.authorityAnchor?.exclusionPrinciple, 'What protects integrity'],
 ].map(([label, value, note], index) => (
 <div key={String(label)} className="relative border border-stone-300 bg-white p-7 min-h-[220px] flex flex-col justify-between">
 <span className="absolute top-4 right-4 font-serif italic text-4xl text-stone-200">0{index + 1}</span>
 <div>
 <span className="font-mono text-[9px] uppercase tracking-[0.24em] font-bold" style={{ color: accentColor }}>{label}</span>
 <p className="font-serif text-xl md:text-2xl leading-snug mt-5 text-stone-950">{value}</p>
 </div>
 <p className="font-mono text-[8px] uppercase tracking-wider text-stone-400 mt-7">{note}</p>
 </div>
 ))}
 </div>
 </div>

 {metadata.content.roadmap.phases?.length > 0 && (
 <div>
 <div className="flex items-center gap-4 mb-6">
 <span className="font-mono text-xs" style={{ color: accentColor }}>03</span>
 <h3 className="font-mono text-[10px] uppercase tracking-[0.25em] font-bold">Action sequence</h3>
 <div className="h-px flex-1 bg-stone-300" />
 </div>
 <div className="relative">
 <div className="absolute top-7 left-7 right-7 h-px bg-stone-300 hidden md:block" />
 <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4 relative">
 {metadata.content.roadmap.phases.map((phase, idx) => (
 <article key={idx} className="bg-[#171717] text-stone-50 p-6 min-h-[350px] flex flex-col">
 <div className="w-12 h-12 rounded-full border border-stone-500 bg-[#171717] flex items-center justify-center font-serif italic text-xl relative z-10" style={{ color: accentColor }}>{idx + 1}</div>
 <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-stone-400 mt-7">Phase · {phase.type}</span>
 <h4 className="font-serif text-2xl leading-tight mt-3">{phase.objective}</h4>
 <p className="font-sans text-xs leading-relaxed text-stone-300 mt-5">{phase.strategicMove}</p>
 {phase.artifactOutputs?.length > 0 && (
 <div className="flex flex-wrap gap-1.5 mt-5">
 {phase.artifactOutputs.map((output, outputIndex) => (
 <span key={outputIndex} className="border border-stone-700 px-2 py-1 font-mono text-[7px] uppercase tracking-wider text-stone-300">{output}</span>
 ))}
 </div>
 )}
 <div className="mt-auto pt-6 space-y-3">
 {phase.riskToIntegrity && <p className="font-mono text-[8px] leading-relaxed text-rose-300"><span className="uppercase tracking-wider">Integrity risk</span><br />{phase.riskToIntegrity}</p>}
 {phase.signalToMonitor && <p className="font-mono text-[8px] leading-relaxed text-emerald-300"><span className="uppercase tracking-wider">Watch signal</span><br />{phase.signalToMonitor}</p>}
 </div>
 </article>
 ))}
 </div>
 </div>
 </div>
 )}

 {metadata.content.roadmap.driftForecast && (
 <div className="border-y border-stone-400 py-8 grid md:grid-cols-[0.35fr_1fr] gap-8">
 <div>
 <span className="font-mono text-[9px] uppercase tracking-[0.28em]" style={{ color: accentColor }}>04 · Drift forecast</span>
 <h3 className="font-serif text-3xl italic mt-3">Know when the world is moving—and when to refuse it.</h3>
 </div>
 <div className="grid sm:grid-cols-2 gap-x-8 gap-y-6">
 {[
 ['Predicted shift', metadata.content.roadmap.driftForecast.predictedClusterShift],
 ['Audience evolution', metadata.content.roadmap.driftForecast.audienceEvolution],
 ['Absorption risk', metadata.content.roadmap.driftForecast.absorptionRisk],
 ['Refusal point', metadata.content.roadmap.driftForecast.refusalPoint],
 ].filter(([, value]) => value).map(([label, value]) => (
 <div key={label} className="border-l-2 pl-4" style={{ borderColor: accentColor }}>
 <span className="font-mono text-[8px] uppercase tracking-wider text-stone-500">{label}</span>
 <p className="font-sans text-sm leading-relaxed text-stone-800 mt-2">{value}</p>
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 ) : metadata.content.blueprint ? (
 <div className="grid md:grid-cols-2 gap-4">
 {Object.entries(metadata.content.blueprint).map(([key, val], i) => (
 <div key={i} className="border border-stone-300 bg-white p-7">
 <span className="font-mono text-[9px] uppercase tracking-widest" style={{ color: accentColor }}>0{i+1} · {key.replace('_', ' ')}</span>
 <p className="font-serif text-xl leading-relaxed text-stone-900 mt-4">{String(val)}</p>
 </div>
 ))}
 </div>
 ) : (
 <div className="border border-stone-300 bg-white p-10">
 <p className="font-serif text-2xl text-stone-900">{metadata.content.the_roadmap || "No architectural blueprint detected."}</p>
 </div>
 )}
 </div>
 </motion.section>

 {/* 10. SIGNAL FEED (The Cultural Air) */}
 {metadata.transmissionsUsed && metadata.transmissionsUsed.length > 0 && (
 <motion.section initial={{ opacity: 0, y: 50, filter: 'blur(10px)' }} whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }} viewport={{ once: true, margin: '-10%' }} transition={{ duration: 1, ease: 'easeOut' }} className="min-h-[100dvh] flex flex-col justify-center px-6 md:px-24 snap-start bg-nous-base text-nous-text text-nous-text print:min-h-0 print:py-12">
 <div className="max-w-4xl w-full space-y-16">
 <SectionHeader label="Signal Feed"icon={Radio} style={{ color: accentColor }} />
 <div className="space-y-8">
 <p className="font-serif italic text-2xl text-nous-subtle leading-relaxed">
"The manifest does not exist in a vacuum. It is a refraction of the collective frequency."
 </p>
 <div className="grid gap-6">
 {metadata.transmissionsUsed.map((t, idx) => (
 <div key={idx} className="flex items-start gap-4 p-4 border border-nous-border rounded-none bg-nous-base/50 /30">
 <div className="w-8 h-8 rounded-none bg-stone-200 flex items-center justify-center shrink-0">
 <Radio size={14} className="text-nous-subtle"/>
 </div>
 <div className="space-y-1">
 <div className="flex items-center gap-2">
 <span className="font-sans text-[8px] uppercase tracking-widest font-black text-nous-subtle">@{t.userHandle}</span>
 <span className="font-mono text-[8px] text-nous-subtle">{new Date(t.timestamp).toLocaleTimeString()}</span>
 </div>
 <p className="font-serif italic text-sm text-nous-subtle leading-relaxed">
 {t.content}
 </p>
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>
 </motion.section>
 )}

 {/* 9b. USED CONTEXT (Scribe atoms applied to this issue) */}
 {(scribeFragments.length > 0 || (metadata.fragmentsUsed?.length ?? 0) > 0) && (
 <motion.section initial={{ opacity: 0, y: 50, filter: 'blur(10px)' }} whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }} viewport={{ once: true, margin: '-10%' }} transition={{ duration: 1, ease: 'easeOut' }} className="min-h-[100dvh] flex flex-col justify-center px-6 md:px-24 snap-start bg-nous-base text-nous-text print:min-h-0 print:py-12">
 <div className="max-w-4xl w-full space-y-16">
 <SectionHeader label="Used Context" icon={BookOpen} style={{ color: accentColor }} />
 <div className="space-y-8">
 <p className="font-serif italic text-2xl text-nous-subtle leading-relaxed">
 Scribe atoms the reader approved before this issue was accessioned.
 </p>
 <div className="grid gap-6">
 {scribeFragments.length > 0 ? scribeFragments.map((atom) => (
 <div key={atom.id} className="flex items-start gap-4 p-4 border border-nous-border rounded-none bg-nous-base/50">
 <div className="w-8 h-8 rounded-none bg-stone-200 flex items-center justify-center shrink-0">
 <BookOpen size={14} className="text-nous-subtle"/>
 </div>
 <div className="space-y-1">
 <div className="flex items-center gap-2">
 <span className="font-serif italic text-sm text-nous-text">{atom.title || 'Untitled Fragment'}</span>
 {atom.source && (
 <span className="font-mono text-[8px] uppercase tracking-widest text-nous-subtle border border-nous-border px-1">{atom.source}</span>
 )}
 </div>
 <p className="font-sans text-sm text-nous-subtle leading-relaxed whitespace-pre-wrap">
 {atom.content}
 </p>
 </div>
 </div>
 )) : metadata.fragmentsUsed?.map((id) => (
 <div key={id} className="p-4 border border-nous-border font-mono text-[10px] text-nous-subtle">
 Fragment {id.split('_').pop()}
 </div>
 ))}
 </div>
 </div>
 </div>
 </motion.section>
 )}

 {/* 10. NARRATIVE THREAD (RAW INPUT + ANALYSIS + THUMBNAILS) */}
 <motion.section initial={{ opacity: 0, y: 50, filter: 'blur(10px)' }} whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }} viewport={{ once: true, margin: '-10%' }} transition={{ duration: 1, ease: 'easeOut' }} className="min-h-[100dvh] flex flex-col justify-center snap-start bg-nous-base  text-nous-text text-nous-text print:min-h-0 print:py-12">
 <div className="w-full space-y-16 px-6 md:px-24">
 <SectionHeader label="Narrative Thread"icon={History} style={{ color: accentColor }} />
 {originalDebris ? (
 <div className="space-y-12">
 <div className="space-y-8 pl-8 md:pl-12 border-l-4 border-nous-border">
 <div className="font-mono text-[10px] text-nous-subtle mb-4 uppercase tracking-widest">
 // RAW_INPUT_LOG_{metadata.id.slice(-4)}
 </div>
 <p className="font-mono text-lg md:text-2xl text-nous-subtle leading-relaxed whitespace-pre-wrap tracking-tight">
"{originalDebris}"
 </p>
 
 {/* THUMBNAIL DISPLAY */}
 {metadata.artifacts && metadata.artifacts.length > 0 && (
 <div className="flex flex-wrap gap-4 pt-8 border-t border-nous-border">
 {metadata.artifacts.map((art, idx) => (
 <div key={idx} className="relative w-24 h-24 border border-nous-border bg-white rounded-none overflow-hidden hover:scale-105 transition-transform">
 {art.type === 'image' ? (
 <img src={art.url || `data:${art.mimeType};base64,${art.data}`} className="w-full h-full object-cover"/>
 ) : (
 <div className="w-full h-full flex items-center justify-center text-nous-subtle">
 <Volume2 size={24} />
 </div>
 )}
 </div>
 ))}
 </div>
 )}
 </div>

 {/* ANALYSIS GRAPH */}
 <div className="pt-8">
 <ThreadGraph metadata={metadata} accentColor={accentColor} />
 <div className="mt-8 flex justify-center">
 <button 
 onClick={handleSaveThread} 
 disabled={isThreadSaved || isSavingThread}
 className="font-mono text-[10px] uppercase tracking-[0.2em] font-black text-nous-subtle hover:text-nous-text transition-colors bg-black/50 backdrop-blur-md px-6 py-3 border border-white/10 flex items-center gap-2"
 >
 {isSavingThread ? <Loader2 size={12} className="animate-spin"/> : isThreadSaved ? <Check size={12} /> : <History size={12} />}
 [ {isThreadSaved ? 'APPENDED TO THREAD' : '+ APPEND TO THREAD'} ]
 </button>
 </div>
 </div>
 </div>
 ) : (
 <div className="opacity-30 text-center py-12 border-2 border-dashed border-nous-border rounded-none">
 <p className="font-serif italic text-xl">Debris data lost in transit.</p>
 </div>
 )}
 <div className="pt-12 border-t border-nous-border /5 opacity-40">
 <p className="font-serif italic text-xs">"The debris is the foundation of the manifest."</p>
 </div>
 </div>
 </motion.section>

 {/* 10.5 EXECUTION LAYER */}
 {metadata.executionLayer && (
 <motion.section initial={{ opacity: 0, y: 50, filter: 'blur(10px)' }} whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }} viewport={{ once: true, margin: '-10%' }} transition={{ duration: 1, ease: 'easeOut' }} className="min-h-[100dvh] flex flex-col justify-center snap-start bg-nous-base text-nous-text print:min-h-0 print:py-12">
 <div className="w-full px-6 md:px-24">
 <ExecutionBlock layer={metadata.executionLayer} />
 </div>
 </motion.section>
 )}

 {/* 10.6 GEO BLOCK */}
 {metadata.content.geoBlock && (
 <motion.section initial={{ opacity: 0, y: 50, filter: 'blur(10px)' }} whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }} viewport={{ once: true, margin: '-10%' }} transition={{ duration: 1, ease: 'easeOut' }} className="min-h-[100dvh] flex flex-col justify-center snap-start bg-nous-base text-nous-text print:min-h-0 print:py-12">
 <div className="w-full px-6 md:px-24">
 <SectionHeader label="Structured Output (GEO)" icon={Layers} color={accentColor} />
 <div className="space-y-12">
 {metadata.content.geoBlock.concepts && metadata.content.geoBlock.concepts.length > 0 && (
 <div>
 <h3 className="font-sans text-[10px] uppercase tracking-widest text-nous-subtle mb-4">Named Concepts</h3>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 {metadata.content.geoBlock.concepts.map((concept: any, i: number) => (
 <div key={i} className="border border-nous-border p-6 bg-nous-base0/5">
 <h4 className="font-serif italic text-lg text-nous-text mb-2">{concept.name}</h4>
 <p className="font-mono text-xs text-nous-subtle leading-relaxed">{concept.description}</p>
 </div>
 ))}
 </div>
 </div>
 )}

 {metadata.content.geoBlock.frameworks && metadata.content.geoBlock.frameworks.length > 0 && (
 <div>
 <h3 className="font-sans text-[10px] uppercase tracking-widest text-nous-subtle mb-4">Frameworks</h3>
 <div className="space-y-6">
 {metadata.content.geoBlock.frameworks.map((framework: any, i: number) => (
 <div key={i} className="border border-nous-border p-6 bg-nous-base0/5">
 <h4 className="font-serif italic text-lg text-nous-text mb-4">{framework.title}</h4>
 <ol className="list-decimal list-inside space-y-2 font-mono text-xs text-nous-subtle">
 {framework.steps.map((step: string, j: number) => (
 <li key={j} className="leading-relaxed">{step}</li>
 ))}
 </ol>
 </div>
 ))}
 </div>
 </div>
 )}

 {metadata.content.geoBlock.citableLines && metadata.content.geoBlock.citableLines.length > 0 && (
 <div>
 <h3 className="font-sans text-[10px] uppercase tracking-widest text-nous-subtle mb-4">Citable Lines</h3>
 <div className="space-y-4">
 {metadata.content.geoBlock.citableLines.map((line: string, i: number) => (
 <blockquote key={i} className="border-l-2 border-primary pl-4 py-2 font-serif italic text-md text-nous-text">
 "{line}"
 </blockquote>
 ))}
 </div>
 </div>
 )}
 </div>
 </div>
 </motion.section>
 )}

 {/* 11. THE GOLDEN THREAD - NEXT STEPS */}
 <footer className="min-h-[100dvh] flex flex-col items-center justify-center p-12 snap-start print:hidden text-center space-y-24 bg-white">
   <div className="space-y-6 w-full px-6 md:px-24 max-w-4xl">
     <span className="font-sans text-[10px] uppercase tracking-[0.5em] font-black" style={{ color: accentColor }}>The Golden Thread</span>
     <p className="font-serif italic text-4xl md:text-6xl leading-tight text-balance text-nous-text">
       "{metadata.content.poetic_provocation || "Where does this frequency lead?"}"
     </p>
   </div>

   <div className="w-full max-w-5xl grid md:grid-cols-3 gap-8 px-6">
     <div className="p-10 border border-stone-200 bg-white flex flex-col items-center text-center space-y-6 hover:translate-y-[-4px] transition-all duration-500">
       <div className="w-12 h-12 rounded-full bg-white border border-stone-200 flex items-center justify-center">
         <Zap size={20} style={{ color: accentColor }} />
       </div>
       <div className="space-y-2">
         <h4 className="font-serif italic text-2xl text-nous-text">Forge Signature</h4>
         <p className="font-mono text-[10px] text-nous-subtle uppercase tracking-widest">TRANSLATE INTO GEO SIGNAL</p>
       </div>
       <p className="font-serif italic text-sm text-stone-500 leading-relaxed">
         Inject this editorial drift into your GEO Engine to align all future generations with this specific aesthetic frequency.
       </p>
       <button 
         onClick={() => window.dispatchEvent(new CustomEvent('mimi:change_view', { detail: 'geo_engine' }))}
         className="px-6 py-3 border border-stone-300 font-sans text-[9px] uppercase tracking-widest font-black hover:bg-stone-900 hover:text-white transition-all"
       >
         Access Engine
       </button>
     </div>

     <div className="p-10 border border-stone-200 bg-white flex flex-col items-center text-center space-y-6 hover:translate-y-[-4px] transition-all duration-500">
       <div className="w-12 h-12 rounded-full bg-white border border-stone-200 flex items-center justify-center">
         <Layers size={20} style={{ color: accentColor }} />
       </div>
       <div className="space-y-2">
         <h4 className="font-serif italic text-2xl text-nous-text">The Thimble</h4>
         <p className="font-mono text-[10px] text-nous-subtle uppercase tracking-widest">SOCIALLY-DRIVEN PROCUREMENT</p>
       </div>
       <p className="font-serif italic text-sm text-stone-500 leading-relaxed">
         Source physical artifacts that resonate with this manifest. Find materials, objects, and inspirations in our distributed registry.
       </p>
       <button 
         onClick={() => window.dispatchEvent(new CustomEvent('mimi:change_view', { detail: 'thimble' }))}
         className="px-6 py-3 border border-stone-300 font-sans text-[9px] uppercase tracking-widest font-black hover:bg-stone-900 hover:text-white transition-all"
       >
         Enter Marketplace
       </button>
     </div>

     <div className="p-10 border border-stone-200 bg-white flex flex-col items-center text-center space-y-6 hover:translate-y-[-4px] transition-all duration-500">
       <div className="w-12 h-12 rounded-full bg-white border border-stone-200 flex items-center justify-center">
         <Scissors size={20} style={{ color: accentColor }} />
       </div>
       <div className="space-y-2">
         <h4 className="font-serif italic text-2xl text-nous-text">Tailor Protocol</h4>
         <p className="font-mono text-[10px] text-nous-subtle uppercase tracking-widest">EDITORIAL MATERIALITY</p>
       </div>
       <p className="font-serif italic text-sm text-stone-500 leading-relaxed">
         Deconstruct the layout and visual treatment of this manifest to create a reusable template for your upcoming issues.
       </p>
       <button 
         onClick={() => onExtractTailorLogic?.(metadata.content.blueprint || metadata.content)}
         className="px-6 py-3 border border-stone-300 font-sans text-[9px] uppercase tracking-widest font-black hover:bg-stone-900 hover:text-white transition-all"
       >
         Deconstruct
       </button>
     </div>
   </div>

   <div className="flex flex-col gap-6 w-full max-w-md pt-12">
     <button onClick={onReset} className="w-full py-4 text-stone-400 hover:text-stone-900 border-t border-stone-100 font-sans text-[9px] uppercase tracking-[0.4em] font-black transition-all">
       Purge & Return to Vault
     </button>
   </div>
  </footer>
 </ZineFlipbookShell>
 </div>
  
 {/* FIELD NOTES SIDEBAR */}
 <AnimatePresence>
 {showNotes && (
 <motion.aside 
 initial={{ x:"100%"}}
 animate={{ x: 0 }}
 exit={{ x:"100%"}}
 transition={{ type:"spring", stiffness: 300, damping: 30 }}
 className="w-full md:w-[400px] border-l border-nous-border bg-white z-40 flex flex-col absolute right-0 top-0 bottom-0"
 >
 {/* Header */}
 <div className="h-16 border-b border-nous-border flex items-center justify-between px-6 shrink-0 bg-white/50 /20 backdrop-blur-sm">
 <span className="font-sans text-[10px] uppercase tracking-[0.4em] font-black text-nous-text text-nous-text">FIELD NOTE — 01</span>
 <button onClick={() => setShowNotes(false)} className="p-2 text-nous-subtle hover:text-nous-subtle hover:text-nous-text transition-colors">
 <X size={16} />
 </button>
 </div>

 {/* Metadata Strip */}
 <div className="flex items-center gap-6 px-6 py-4 border-b border-nous-border opacity-60 shrink-0">
 <div className="flex items-center gap-2">
 <span className="font-mono text-[9px] uppercase tracking-widest text-nous-subtle">REF:</span>
 <span className="font-mono text-[9px] uppercase tracking-widest text-nous-text">001.NOTE</span>
 </div>
 <div className="h-3 w-px bg-stone-300 dark:bg-stone-700"/>
 <div className="flex items-center gap-2">
 <span className="font-mono text-[9px] uppercase tracking-widest text-nous-subtle">TONE:</span>
 <span className="font-mono text-[9px] uppercase tracking-widest text-nous-text">{metadata.tone}</span>
 </div>
 <div className="h-3 w-px bg-stone-300 dark:bg-stone-700"/>
 <div className="flex items-center gap-2">
 <span className="font-mono text-[9px] uppercase tracking-widest text-nous-subtle">DATE:</span>
 <span className="font-mono text-[9px] uppercase tracking-widest text-nous-text">{new Date().toLocaleDateString(undefined, { month: '2-digit', day: '2-digit', year: '2-digit' })}</span>
 </div>
 </div>

 {/* Input Area */}
 <div className="flex-1 relative bg-transparent">
 {/* Margin Rule */}
 <div className="absolute left-8 top-0 bottom-0 w-px bg-red-900/10 dark:bg-red-500/10"/>
 
 <textarea 
 value={noteContent} 
 onChange={(e) => setNoteContent(e.target.value)} 
 placeholder="Annotation layer active..."
 className="w-full h-full bg-transparent p-8 pl-12 resize-none outline-none font-serif text-sm leading-relaxed text-nous-subtle placeholder:text-nous-subtle dark:placeholder:text-nous-subtle"
 />

 {/* Voice Trigger (Bottom Right) */}
 <div className="absolute bottom-6 right-6">
 {isTranscribing && (
 <div className="absolute right-full mr-4 bottom-1/2 translate-y-1/2 flex items-center gap-2 bg-white px-3 py-1 rounded-none whitespace-nowrap">
 <Loader2 size={10} className="animate-spin text-nous-subtle"/>
 <span className="font-sans text-[7px] uppercase tracking-widest font-black text-nous-subtle">Parsing...</span>
 </div>
 )}
 <button 
 onClick={isRecording ? stopRecording : startRecording} 
 className={`p-2 transition-all opacity-50 hover:opacity-100 ${isRecording ? 'text-red-500 animate-pulse' : 'text-nous-subtle hover:text-nous-subtle hover:text-nous-text'}`}
 >
 {isRecording ? <Square size={14} fill="currentColor"/> : <Mic size={14} />}
 </button>
 </div>
 </div>

 {/* Footer Actions */}
 <div className="p-6 border-t border-nous-border flex justify-between items-center bg-white/50 /20 backdrop-blur-sm shrink-0">
 <span className="font-mono text-[8px] text-nous-subtle uppercase tracking-widest">Auto-Saved</span>
 <button 
 onClick={handleSaveToPocket}
 disabled={isSaved}
 className={`flex items-center gap-2 font-sans text-[8px] uppercase tracking-[0.2em] font-black transition-all ${isSaved ? 'text-nous-subtle' : 'text-nous-subtle hover:text-nous-subtle hover:text-nous-text'}`}
 >
 {isSaved ? <Check size={12} /> : <Bookmark size={12} />}
 {isSaved ? 'Anchored' : 'Commit Note'}
 </button>
 </div>
 </motion.aside>
 )}
 </AnimatePresence>
    {/* MINIMALIST PILL FOOTER */}
    <motion.div 
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.2}
      onDragEnd={(e, { offset, velocity }) => {
        if (offset.y > 50 || velocity.y > 500) {
          setIsToolbarCollapsed(true);
        }
      }}
      title="Swipe or drag down to minimize"
      initial={false}
      animate={{ y: isToolbarCollapsed ? 100 : 0, opacity: isToolbarCollapsed ? 0 : 1, scale: isToolbarCollapsed ? 0.8 : 1 }}
      className="fixed bottom-5 md:bottom-8 left-1/2 -translate-x-1/2 z-[9999] flex max-w-[calc(100vw-1rem)] items-center gap-3 md:gap-5 px-5 md:px-7 py-3.5 bg-[#F2F1E8]/78 backdrop-blur-2xl border border-white/60 text-[#817D75] font-mono print:hidden shadow-[0_20px_40px_-15px_rgba(0,0,0,0.14)] rounded-full cursor-grab active:cursor-grabbing hover:bg-[#F2F1E8]/94 transition-colors overflow-x-auto"
    >
      <button onClick={handleShareLink} className="flex flex-col items-center gap-2 hover:text-[#1A1A1A] transition-colors group">
        <Share2 size={18} strokeWidth={1.5} className="group-hover:scale-110 transition-transform" />
        <span className="text-[7px] uppercase tracking-[0.2em] font-black">SHARE</span>
      </button>

      <div className="w-[1px] h-6 bg-[#A19D94]/20"/>

      <button onClick={() => setShowExport(true)} className="flex flex-col items-center gap-2 hover:text-[#1A1A1A] transition-colors group" title="Export image or PDF">
        <Download size={18} strokeWidth={1.5} className="group-hover:scale-110 transition-transform" />
        <span className="text-[7px] uppercase tracking-[0.2em] font-black">EXPORT</span>
      </button>

      <div className="w-[1px] h-6 bg-[#A19D94]/20"/>

      <button onClick={() => setShowReorderModal(true)} className="flex flex-col items-center gap-2 hover:text-[#1A1A1A] transition-colors group" title="Reorder pages before exporting">
        <Layers size={18} strokeWidth={1.5} className="group-hover:scale-110 transition-transform text-amber-600 dark:text-amber-500" />
        <span className="text-[7px] uppercase tracking-[0.2em] font-black">REORDER</span>
      </button>

      <div className="w-[1px] h-6 bg-[#A19D94]/20"/>

      <button onClick={handleVoiceToggle} className="flex flex-col items-center gap-2 hover:text-[#1A1A1A] transition-colors group relative">
        {isVoiceLoading ? (
            <Loader2 size={18} strokeWidth={1.5} className="animate-spin text-[#1A1A1A]"/>
        ) : isPlaying ? (
            <Pause size={18} strokeWidth={1.5} className="text-[#1A1A1A]" />
        ) : (
            <Volume2 size={18} strokeWidth={1.5} className="group-hover:scale-110 transition-transform" />
        )}
        {isPlaying && (
          <svg className="absolute -inset-2 w-10 h-10 -rotate-90 pointer-events-none" viewBox="0 0 40 40">
            <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="113" strokeDashoffset={113 - (audioProgress * 113)} className="text-[#1A1A1A] transition-all duration-100"/>
          </svg>
        )}
        <span className="text-[7px] uppercase tracking-[0.2em] font-black">VOICE</span>
      </button>

      <div className="w-[1px] h-6 bg-[#A19D94]/20"/>

      <button onClick={() => setShowNotes(!showNotes)} className={`flex flex-col items-center gap-2 transition-colors group ${showNotes ? 'text-[#1A1A1A]' : 'hover:text-[#1A1A1A]'}`}>
        <Bookmark size={18} strokeWidth={1.5} className="group-hover:scale-110 transition-transform" />
        <span className="text-[7px] uppercase tracking-[0.2em] font-black">NOTES</span>
      </button>

      <div className="w-[1px] h-6 bg-[#A19D94]/20"/>

      <button onClick={handleSaveToPocket} className={`flex flex-col items-center gap-2 transition-colors group ${isSaved ? 'text-green-600' : 'hover:text-[#1A1A1A]'}`}>
        {isSaved ? <Archive className="fill-current" size={18} strokeWidth={1.5} /> : <Archive size={18} strokeWidth={1.5} className="group-hover:scale-110 transition-transform" />}
        <span className="text-[7px] uppercase tracking-[0.2em] font-black">{isSaved ? 'VAULTED' : 'VAULT'}</span>
      </button>
    </motion.div>

    <AnimatePresence>
      {isToolbarCollapsed && (
        <motion.button
          drag
          dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
          dragElastic={0.2}
          onDragEnd={(e, { offset, velocity }) => {
            if (offset.y < -50 || velocity.y < -500) {
              setIsToolbarCollapsed(false);
            }
          }}
          initial={{ y: 100, opacity: 0, scale: 0.8 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 100, opacity: 0, scale: 0.8 }}
          onClick={() => setIsToolbarCollapsed(false)}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999] flex items-center justify-center w-12 h-12 bg-[#1A1A1A] text-white shadow-2xl rounded-full print:hidden hover:scale-110 transition-transform cursor-pointer"
          title="Drag up or click to expand"
        >
          <Menu size={16} />
        </motion.button>
      )}
    </AnimatePresence>

    {/* DEDICATED FULLSCREEN READING MODE */}
    <AnimatePresence>
      {isDedicatedReadingMode && (
        <motion.div
          initial={{ opacity: 0, scale: 0.99 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.99 }}
          className="fixed inset-0 z-[20000] bg-[#FAF9F6] dark:bg-[#09090B] text-stone-900 dark:text-stone-100 overflow-y-auto no-scrollbar selection:bg-purple-200 dark:selection:bg-purple-900/40 p-6 md:p-20"
        >
          {/* Floating Exit Reading Mode Pill */}
          <div className="fixed top-8 right-8 z-[21000]">
            <button
              onClick={() => setIsDedicatedReadingMode(false)}
              className="flex items-center gap-2 px-6 py-3 bg-stone-900/90 dark:bg-stone-100/90 text-stone-100 dark:text-stone-900 rounded-full font-mono text-[9px] uppercase tracking-widest font-extrabold shadow-2xl backdrop-blur-md hover:scale-105 active:scale-95 transition-all cursor-pointer border border-stone-700/30"
            >
              <X size={14} />
              Exit Reading Mode (ESC)
            </button>
          </div>

          {/* Dedicated Reader Column */}
          <article className="max-w-3xl md:max-w-4xl mx-auto py-16 md:py-28 space-y-16 md:space-y-28">
            {/* Editorial Header */}
            <header className="space-y-8 border-b border-stone-200 dark:border-stone-850 pb-16">
              <div className="flex items-center gap-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-purple-600 dark:text-purple-400 font-extrabold">
                  PURE EDITORIAL // READING MODE
                </span>
                <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
              </div>
              <h1 className="font-serif italic text-4xl sm:text-6xl md:text-7xl lg:text-8xl leading-[0.95] text-stone-900 dark:text-stone-100 tracking-tight">
                {metadata.content?.headlines?.[0] || metadata.title}
              </h1>
              <div className="flex items-center gap-6 font-mono text-[10px] uppercase tracking-widest text-stone-500 border-t border-stone-200 dark:border-stone-850 pt-6">
                <span>By @{metadata.userHandle}</span>
                <span>•</span>
                <span>{new Date(metadata.timestamp).toLocaleDateString()}</span>
                <span>•</span>
                <span>{metadata.tone}</span>
              </div>
            </header>

            {/* Executive Summary / Vocal Blurb */}
            {(vocalSummary || poeticInterpretation) && (
              <section className="space-y-6">
                <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-purple-600 dark:text-purple-400 font-extrabold block">
                  // Executive Summary
                </span>
                <ZineTextContent content={vocalSummary || poeticInterpretation} isReadingMode={true} />
              </section>
            )}

            {/* Hero Cover Image */}
            {metadata.coverImageUrl && (
              <figure className="space-y-3">
                <div className="w-full overflow-hidden border border-stone-200 dark:border-stone-850 shadow-2xl">
                  <img
                    src={metadata.coverImageUrl}
                    alt={metadata.title}
                    className="w-full h-auto object-cover max-h-[75vh]"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <figcaption className="font-mono text-[9px] uppercase tracking-widest text-stone-400 text-center">
                  FIG 01 // {metadata.content?.hero_image_prompt || metadata.title}
                </figcaption>
              </figure>
            )}

            {/* Oracular Mirror Analysis */}
            {(metadata.content?.oracular_mirror || metadata.content?.the_reading) && (
              <section className="space-y-8">
                <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-purple-600 dark:text-purple-400 font-extrabold block">
                  // Oracular Mirror
                </span>
                <ZineTextContent content={metadata.content.oracular_mirror || metadata.content.the_reading} isReadingMode={true} />
              </section>
            )}

            {/* Pages / Chapters */}
            {metadata.content?.pages?.map((page, idx) => (
              <section key={idx} className="space-y-10 border-t border-stone-200 dark:border-stone-850 pt-20">
                <div className="space-y-3">
                  <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-stone-400 font-bold block">
                    Chapter 0{idx + 1}
                  </span>
                  <h2 className="font-serif italic text-3xl md:text-5xl text-stone-900 dark:text-stone-100 leading-tight">
                    {page.headline}
                  </h2>
                </div>
                {page.image_url && (
                  <div className="w-full overflow-hidden border border-stone-200 dark:border-stone-850 shadow-xl my-8">
                    <img src={page.image_url} alt={page.headline} className="w-full h-auto object-cover max-h-[70vh]" referrerPolicy="no-referrer" />
                  </div>
                )}
                <ZineTextContent content={page.bodyCopy} isReadingMode={true} />
              </section>
            ))}

            {/* Poetic Provocation */}
            {metadata.content?.poetic_provocation && (
              <footer className="border-t border-stone-200 dark:border-stone-850 pt-20 pb-16 space-y-6 text-center">
                <span className="font-mono text-[9px] uppercase tracking-[0.4em] text-purple-500 font-bold block">
                  Final Provocation
                </span>
                <p className="font-serif italic text-2xl md:text-4xl text-stone-800 dark:text-stone-200 max-w-2xl mx-auto leading-relaxed">
                  “{metadata.content.poetic_provocation}”
                </p>
              </footer>
            )}
          </article>
        </motion.div>
      )}
    </AnimatePresence>
    </div>
  </>
  );
};
