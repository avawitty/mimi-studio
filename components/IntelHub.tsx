import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useUser } from '../contexts/UserContext';
import { FounderStrategyMemo } from './FounderStrategyMemo';
import { IntelProjectControl } from './IntelProjectControl';
import { 
  Sparkles, 
  ShieldCheck, 
  UserCircle2, 
  Briefcase, 
  CloudLightning, 
  Search, 
  Lock, 
  Database, 
  Layers, 
  ChevronRight, 
  Zap, 
  Globe, 
  ArrowUpRight, 
  Sliders, 
  FolderSync, 
  FileCheck,
  Check
} from 'lucide-react';

export const IntelHub: React.FC = () => {
  const { profile, user } = useUser();
  const [activeTab, setActiveTab] = useState<'individual' | 'creator' | 'brand'>('individual');
  const [intelMode, setIntelMode] = useState<'control' | 'strategy' | 'capabilities'>('control');

  const navTo = (mode: string) => {
    window.dispatchEvent(new CustomEvent('mimi:change_view', { detail: mode }));
  };

  const handleBackupClick = () => {
    window.dispatchEvent(new CustomEvent('mimi:change_view', { detail: 'profile' }));
  };

  if (intelMode === 'control') {
    return (
      <div className="w-full h-full flex flex-col overflow-hidden bg-[#F2F1ED]">
        <div className="border-b border-stone-300 px-4 md:px-8 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-[#F7F6F2] shrink-0 z-20">
          <span className="font-mono text-[8px] tracking-[0.2em] text-stone-500 uppercase font-bold">
            [ NOUS INTELLIGENCE · APPROVAL ROUTE ]
          </span>
          <div className="flex border border-stone-300 bg-white p-1 overflow-x-auto">
            <button
              onClick={() => setIntelMode('control')}
              className="px-3 py-1.5 font-mono text-[8px] uppercase tracking-wider font-black bg-stone-950 text-white whitespace-nowrap"
            >
              I. Project Control
            </button>
            <button
              onClick={() => setIntelMode('strategy')}
              className="px-3 py-1.5 font-mono text-[8px] uppercase tracking-wider font-bold text-stone-500 hover:text-stone-950 whitespace-nowrap"
            >
              II. Strategy Workspace
            </button>
            <button
              onClick={() => setIntelMode('capabilities')}
              className="px-3 py-1.5 font-mono text-[8px] uppercase tracking-wider font-bold text-stone-500 hover:text-stone-950 whitespace-nowrap"
            >
              III. Capabilities
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <IntelProjectControl
            onOpenStrategy={() => setIntelMode('strategy')}
            onOpenCapabilities={() => setIntelMode('capabilities')}
          />
        </div>
      </div>
    );
  }

  if (intelMode === 'strategy') {
    return (
      <div className="w-full h-full flex flex-col overflow-hidden bg-stone-950">
        {/* Switcher bar */}
        <div className="border-b border-stone-800 px-8 py-3 flex items-center justify-between bg-[#161516] shrink-0 z-20">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[8px] tracking-[0.2em] text-stone-500 uppercase font-bold">[ NOUS INTELLIGENCE SECURE ROUTE ]</span>
          </div>
          <div className="flex bg-stone-900 border border-stone-800 p-1">
            <button
              onClick={() => setIntelMode('control')}
              className="px-3 py-1 font-mono text-[9px] uppercase tracking-wider font-bold transition-all text-stone-500 hover:text-stone-300"
            >
              I. Project Control
            </button>
            <button 
              onClick={() => setIntelMode('strategy')}
              className="px-3 py-1 font-mono text-[9px] uppercase tracking-wider font-bold transition-all bg-[#EAE9E5] text-stone-950 font-black"
            >
              II. Strategy Workspace
            </button>
            <button 
              onClick={() => setIntelMode('capabilities')}
              className="px-3 py-1 font-mono text-[9px] uppercase tracking-wider font-bold transition-all text-stone-500 hover:text-stone-300"
            >
              III. Capabilities
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <FounderStrategyMemo />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-y-auto no-scrollbar bg-nous-base text-nous-text p-6 md:p-12 relative">
      {/* Switcher bar in capabilities mode */}
      <div className="absolute top-6 right-6 z-30 flex bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-850 p-1">
        <button
          onClick={() => setIntelMode('control')}
          className="px-3 py-1 font-mono text-[8px] uppercase tracking-wider font-bold text-stone-500 hover:text-stone-700 dark:hover:text-stone-300"
        >
          Project Control
        </button>
        <button 
          onClick={() => setIntelMode('strategy')}
          className="px-3 py-1 font-mono text-[8px] uppercase tracking-wider font-bold text-stone-500 hover:text-stone-700 dark:hover:text-stone-300"
        >
          Strategy Workspace
        </button>
      </div>

      {/* Absolute background accent lines for structured blueprints style */}
      <div className="absolute inset-x-0 top-0 h-px bg-current opacity-[0.06] pointer-events-none" />
      <div className="absolute inset-y-0 left-12 w-px bg-current opacity-[0.03] pointer-events-none hidden md:block" />
      <div className="absolute inset-y-0 right-12 w-px bg-current opacity-[0.03] pointer-events-none hidden md:block" />

      <header className="max-w-6xl mx-auto mb-12 relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-stone-900 border border-stone-800 text-stone-300 rounded-sm mb-4">
          <Sparkles size={10} className="text-stone-400 animate-pulse" />
          <span className="text-[9px] uppercase tracking-widest font-black">Private Intelligence Core</span>
        </div>
        
        <h1 className="font-serif text-4xl md:text-6xl tracking-tighter leading-none mb-4 text-balance">
          Mimi turns taste into <span className="italic block md:inline font-serif font-medium">usable creative, social, and commercial assets</span> — without selling out your private identity.
        </h1>
        
        <p className="font-sans text-[11px] md:text-xs uppercase tracking-[0.25em] text-nous-subtle font-bold max-w-3xl leading-relaxed">
          Sovereignty in the AI-Search Era // Map your DNA, curate visually, optimize for machine algorithms, and retain 100% data ownership.
        </p>
      </header>

      {/* Main Structural Proposition Grid */}
      <section className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12 relative z-10">
        
        {/* Value Prop Filter Left Rail */}
        <div className="lg:col-span-4 flex flex-col gap-3">
          <p className="font-sans text-[10px] uppercase tracking-widest text-nous-subtle font-black pb-2 border-b border-nous-border">
            Workspace Perspectives
          </p>
          
          <button 
            onClick={() => setActiveTab('individual')}
            className={`w-full text-left p-5 transition-all flex flex-col gap-1.5 border ${
              activeTab === 'individual' 
                ? 'bg-white border-nous-text shadow-sm' 
                : 'border-nous-border bg-transparent hover:bg-[#EAE8E4]/40'
            }`}
          >
            <div className="flex items-center gap-3">
              <UserCircle2 size={16} className={activeTab === 'individual' ? 'text-nous-text' : 'text-nous-subtle'} />
              <span className="font-mono text-xs uppercase tracking-widest font-bold">I. For Individuals</span>
            </div>
            <p className="font-serif italic text-xs text-nous-subtle pl-7">
              Your decentralized aesthetic vault. Synchronize your styles, capsulize wardrobe metrics, and secure standard local archives.
            </p>
          </button>

          <button 
            onClick={() => setActiveTab('creator')}
            className={`w-full text-left p-5 transition-all flex flex-col gap-1.5 border ${
              activeTab === 'creator' 
                ? 'bg-white border-nous-text shadow-sm' 
                : 'border-nous-border bg-transparent hover:bg-[#EAE8E4]/40'
            }`}
          >
            <div className="flex items-center gap-3">
              <Sparkles size={16} className={activeTab === 'creator' ? 'text-nous-text' : 'text-nous-subtle'} />
              <span className="font-mono text-xs uppercase tracking-widest font-bold">II. For Creators & Stylists</span>
            </div>
            <p className="font-serif italic text-xs text-nous-subtle pl-7">
              Your visual director & copy editor. Weave disparate shards into professional layouts, PDF briefs, captions, and narrative threads.
            </p>
          </button>

          <button 
            onClick={() => setActiveTab('brand')}
            className={`w-full text-left p-5 transition-all flex flex-col gap-1.5 border ${
              activeTab === 'brand' 
                ? 'bg-white border-nous-text shadow-sm' 
                : 'border-nous-border bg-transparent hover:bg-[#EAE8E4]/40'
            }`}
          >
            <div className="flex items-center gap-3">
              <Briefcase size={16} className={activeTab === 'brand' ? 'text-nous-text' : 'text-nous-subtle'} />
              <span className="font-mono text-xs uppercase tracking-widest font-bold">III. For Brands & Agencies</span>
            </div>
            <p className="font-serif italic text-xs text-nous-subtle pl-7">
              Semantic Brand Kits & AI Search Optimization. Audit brand clarity in the era of ChatGPT, Perplexity, and Gemini search grids.
            </p>
          </button>

          {/* Core App Mandate Card */}
          <div className="mt-4 p-5 bg-stone-900 text-stone-300 border border-stone-800 space-y-4">
            <div className="flex items-center gap-2">
              <Lock size={12} className="text-emerald-500 animate-pulse" />
              <span className="font-sans text-[9px] uppercase tracking-widest font-bold text-stone-400">Trust Guarantee</span>
            </div>
            <p className="font-sans text-[10px] tracking-wide text-stone-400 leading-relaxed uppercase">
              "We never train base models on your creative uploads. Your saved moodboards, closet items, and text journals belong entirely to your private key space."
            </p>
            <button 
              onClick={() => navTo('architecture')}
              className="font-mono text-[9px] uppercase tracking-widest text-[#dccca9] hover:text-[#fdfdfb] flex items-center gap-1 hover:underline pt-1"
            >
              Verify System Sandbox <ArrowUpRight size={10} />
            </button>
          </div>
        </div>

        {/* Actionable Capability Cards Map */}
        <div className="lg:col-span-8">
          <div className="p-1 px-4 border-b border-nous-border mb-6 flex items-center justify-between">
            <span className="font-sans text-[10px] uppercase tracking-widest text-nous-subtle font-black">
              Available Modules & Engines
            </span>
            <span className="font-mono text-[10px] tracking-widest text-nous-subtle uppercase">
              Active Session System Nodes
            </span>
          </div>

          <motion.div 
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {activeTab === 'individual' && (
              <>
                {/* Taste Graph / DNA */}
                <div className="border border-nous-border p-5 bg-white flex flex-col justify-between group hover:border-nous-text transition-all">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] text-nous-subtle uppercase tracking-widest">Aesthetic Alignment</span>
                      <Sliders size={14} className="text-nous-subtle" />
                    </div>
                    <h3 className="font-serif italic text-xl text-nous-text">Taste DNA & Constellations</h3>
                    <p className="font-sans text-xs text-nous-subtle leading-relaxed pb-4">
                      Map visual references across multi-dimensional aesthetic coordinates. Connect color weight, tone parameters, and silhouette values to visualize architectural style drift.
                    </p>
                  </div>
                  <button 
                    onClick={() => navTo('taste-graph')}
                    className="w-full py-2.5 border border-nous-border text-[9px] uppercase tracking-widest font-bold group-hover:bg-nous-text group-hover:text-nous-base transition-colors flex items-center justify-center gap-2"
                  >
                    Load Taste DNA <ChevronRight size={10} />
                  </button>
                </div>

                {/* Wardrobe Capsules */}
                <div className="border border-nous-border p-5 bg-white flex flex-col justify-between group hover:border-nous-text transition-all">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] text-nous-subtle uppercase tracking-widest">Capsule Curation</span>
                      <Layers size={14} className="text-nous-subtle" />
                    </div>
                    <h3 className="font-serif italic text-xl text-nous-text">Wardrobe Curation</h3>
                    <p className="font-sans text-xs text-nous-subtle leading-relaxed pb-4">
                      Catalog garments, silhouette cuts, and textile weights. Generate coherent daily capsule recommendations, evaluate investment liquidity, and identify closet holes based on your style baselines.
                    </p>
                  </div>
                  <button 
                    onClick={() => navTo('wardrobe')}
                    className="w-full py-2.5 border border-nous-border text-[9px] uppercase tracking-widest font-bold group-hover:bg-nous-text group-hover:text-nous-base transition-colors flex items-center justify-center gap-2"
                  >
                    Inspect Closet <ChevronRight size={10} />
                  </button>
                </div>

                {/* Decentralized Storage & Backup */}
                <div className="border border-nous-border p-5 bg-white flex flex-col justify-between group hover:border-nous-text transition-all">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] text-nous-subtle uppercase tracking-widest">Sovereignty Vault</span>
                      <FolderSync size={14} className="text-emerald-600" />
                    </div>
                    <h3 className="font-serif italic text-xl text-nous-text">Sovereign Backup Core</h3>
                    <p className="font-sans text-xs text-nous-subtle leading-relaxed pb-4">
                      Integrates direct JSON archives and Google Drive synchronization. Retain independent control of your files; back up all zines and shards to your personal cloud, with single-tap database sanitization.
                    </p>
                  </div>
                  <button 
                    onClick={handleBackupClick}
                    className="w-full py-2.5 border border-nous-border text-[9px] uppercase tracking-widest font-bold group-hover:bg-nous-text group-hover:text-nous-base transition-colors flex items-center justify-center gap-2"
                  >
                    Sync Backup Engine <ChevronRight size={10} />
                  </button>
                </div>

                {/* Sanctuary (Confidence & Vibe Vault) */}
                <div className="border border-nous-border p-5 bg-white flex flex-col justify-between group hover:border-nous-text transition-all">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] text-nous-subtle uppercase tracking-widest">Private Space</span>
                      <Lock size={14} className="text-nous-subtle" />
                    </div>
                    <h3 className="font-serif italic text-xl text-nous-text">Sanctuary Vibe Rooms</h3>
                    <p className="font-sans text-xs text-nous-subtle leading-relaxed pb-4">
                      A quiet, secure enclosure built to log stylistic anxieties, core desires, and personal identity notes. Calibrate confidence scores and receive supportive aesthetic adjustments.
                    </p>
                  </div>
                  <button 
                    onClick={() => navTo('sanctuary')}
                    className="w-full py-2.5 border border-nous-border text-[9px] uppercase tracking-widest font-bold group-hover:bg-nous-text group-hover:text-nous-base transition-colors flex items-center justify-center gap-2"
                  >
                    Ascend to Sanctuary <ChevronRight size={10} />
                  </button>
                </div>
              </>
            )}

            {activeTab === 'creator' && (
              <>
                {/* Creative Worktable */}
                <div className="border border-nous-border p-5 bg-white flex flex-col justify-between group hover:border-nous-text transition-all">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] text-nous-subtle uppercase tracking-widest">Generative Field</span>
                      <Zap size={14} className="text-nous-subtle" />
                    </div>
                    <h3 className="font-serif italic text-xl text-nous-text">Publishing Workspace</h3>
                    <p className="font-sans text-xs text-nous-subtle leading-relaxed pb-4">
                      The core interface for translating raw moodboards and shards into print-ready digital zines. Create, refine prompts with visual treatments, and design bespoke typography sets.
                    </p>
                  </div>
                  <button 
                    onClick={() => navTo('studio')}
                    className="w-full py-2.5 border border-nous-border text-[9px] uppercase tracking-widest font-bold group-hover:bg-nous-text group-hover:text-nous-base transition-colors flex items-center justify-center gap-2"
                  >
                    Open Worktable <ChevronRight size={10} />
                  </button>
                </div>

                {/* The Loom (Distribution Strategies) */}
                <div className="border border-nous-border p-5 bg-white flex flex-col justify-between group hover:border-nous-text transition-all">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] text-nous-subtle uppercase tracking-widest">Distribution Curation</span>
                      <Globe size={14} className="text-nous-subtle" />
                    </div>
                    <h3 className="font-serif italic text-xl text-nous-text">The Loom Platform Planner</h3>
                    <p className="font-sans text-xs text-nous-subtle leading-relaxed pb-4">
                      Your automated creative director. Outlines campaign briefs, translates editorial visual themes into platform copy structures (Insta sets, TikTok structures), and generates high-converting briefs.
                    </p>
                  </div>
                  <button 
                    onClick={() => navTo('loom')}
                    className="w-full py-2.5 border border-nous-border text-[9px] uppercase tracking-widest font-bold group-hover:bg-nous-text group-hover:text-nous-base transition-colors flex items-center justify-center gap-2"
                  >
                    Weave Layouts & Calendars <ChevronRight size={10} />
                  </button>
                </div>

                {/* Canvas Dossier */}
                <div className="border border-nous-border p-5 bg-white flex flex-col justify-between group hover:border-nous-text transition-all">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] text-nous-subtle uppercase tracking-widest">Infinite Curation</span>
                      <Layers size={14} className="text-nous-subtle" />
                    </div>
                    <h3 className="font-serif italic text-xl text-nous-text">Creative Dossiers</h3>
                    <p className="font-sans text-xs text-nous-subtle leading-relaxed pb-4">
                      Infinite board for collecting visual assets, notes, product listings, and digital clippings. Organize spatial relationships and export to PDF or high-resolution images instantly.
                    </p>
                  </div>
                  <button 
                    onClick={() => navTo('dossier')}
                    className="w-full py-2.5 border border-nous-border text-[9px] uppercase tracking-widest font-bold group-hover:bg-nous-text group-hover:text-nous-base transition-colors flex items-center justify-center gap-2"
                  >
                    Launch Dossier <ChevronRight size={10} />
                  </button>
                </div>

                {/* Scribe / Oracle (Copywriting) */}
                <div className="border border-nous-border p-5 bg-white flex flex-col justify-between group hover:border-nous-text transition-all">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] text-nous-subtle uppercase tracking-widest">Copy & Research</span>
                      <FileCheck size={14} className="text-nous-subtle" />
                    </div>
                    <h3 className="font-serif italic text-xl text-nous-text">The Scribe & Oracle Core</h3>
                    <p className="font-sans text-xs text-nous-subtle leading-relaxed pb-4">
                      Write search-ready descriptions, Instagram story narratives, style briefs, and long-form aesthetic commentaries in collaboration with the Mimi and Cyrus AI personalities.
                    </p>
                  </div>
                  <button 
                    onClick={() => navTo('oracle')}
                    className="w-full py-2.5 border border-nous-border text-[9px] uppercase tracking-widest font-bold group-hover:bg-nous-text group-hover:text-nous-base transition-colors flex items-center justify-center gap-2"
                  >
                    Consult Oracle <ChevronRight size={10} />
                  </button>
                </div>
              </>
            )}

            {activeTab === 'brand' && (
              <>
                {/* Brand OS Intake */}
                <div className="border border-nous-border p-5 bg-white flex flex-col justify-between group hover:border-nous-text transition-all">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] text-nous-subtle uppercase tracking-widest">Identity Ingestion</span>
                      <Database size={14} className="text-nous-subtle" />
                    </div>
                    <h3 className="font-serif italic text-xl text-nous-text">Mimi Brand Report Ingestion</h3>
                    <p className="font-sans text-xs text-nous-subtle leading-relaxed pb-4">
                      Ingest your company or agency brand guidelines, brand voice guidelines, and key assets. Creates a prompt-ready memory file that grounds all generation systems in your true brand kit.
                    </p>
                  </div>
                  <button 
                    onClick={() => navTo('brand-intake')}
                    className="w-full py-2.5 border border-nous-border text-[9px] uppercase tracking-widest font-bold group-hover:bg-nous-text group-hover:text-nous-base transition-colors flex items-center justify-center gap-2"
                  >
                    Access Brand OS <ChevronRight size={10} />
                  </button>
                </div>

                {/* GEO Engine */}
                <div className="border border-nous-border p-5 bg-white flex flex-col justify-between group hover:border-nous-text transition-all">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] text-nous-subtle uppercase tracking-widest">AI Search Optimization</span>
                      <Search size={14} className="text-amber-600 animate-pulse" />
                    </div>
                    <h3 className="font-serif italic text-xl text-nous-text">The GEO Engine</h3>
                    <p className="font-sans text-xs text-nous-subtle leading-relaxed pb-4">
                      Audit and optimize your digital properties for LLM search engines. Generate semantic signals, structuring metadata and item listings so ChatGPT, Perplexity, and Gemini identify and recommend your brand.
                    </p>
                  </div>
                  <button 
                    onClick={() => navTo('geo_engine')}
                    className="w-full py-2.5 border border-nous-border text-[9px] uppercase tracking-widest font-bold group-hover:bg-nous-text group-hover:text-nous-base transition-colors flex items-center justify-center gap-2"
                  >
                    Launch GEO Optimizer <ChevronRight size={10} />
                  </button>
                </div>

                {/* Color QC Engine */}
                <div className="border border-nous-border p-5 bg-white flex flex-col justify-between group hover:border-nous-text transition-all">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] text-nous-subtle uppercase tracking-widest">Aesthetic Auditing</span>
                      <Sliders size={14} className="text-nous-subtle" />
                    </div>
                    <h3 className="font-serif italic text-xl text-nous-text">Color QC Engine & Meteorology</h3>
                    <p className="font-sans text-xs text-nous-subtle leading-relaxed pb-4">
                      Analyze visual harmony across product images. Generate color compliance scores, audit image hues against your brand standards, and track weather-correlated style mood metrics.
                    </p>
                  </div>
                  <button 
                    onClick={() => navTo('qc_engine')}
                    className="w-full py-2.5 border border-nous-border text-[9px] uppercase tracking-widest font-bold group-hover:bg-nous-text group-hover:text-nous-base transition-colors flex items-center justify-center gap-2"
                  >
                    Calibrate System QC <ChevronRight size={10} />
                  </button>
                </div>

                {/* Creative Agency Briefs */}
                <div className="border border-nous-border p-5 bg-white flex flex-col justify-between group hover:border-nous-text transition-all">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] text-nous-subtle uppercase tracking-widest">Commercial Briefs</span>
                      <CloudLightning size={14} className="text-nous-subtle" />
                    </div>
                    <h3 className="font-serif italic text-xl text-nous-text">Competitor Niche Maps</h3>
                    <p className="font-sans text-xs text-nous-subtle leading-relaxed pb-4">
                      Identify visual differences, map stylistic niches, and forecast emerging cultural vectors to ensure your client pitches and launches stay distinct and protected from algorithmic saturation.
                    </p>
                  </div>
                  <button 
                    onClick={() => navTo('loom')}
                    className="w-full py-2.5 border border-nous-border text-[9px] uppercase tracking-widest font-bold group-hover:bg-nous-text group-hover:text-nous-base transition-colors flex items-center justify-center gap-2"
                  >
                    Open Campaign Maps <ChevronRight size={10} />
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      </section>

      {/* Structured Value Proposition Matrix (Subscription & Coins) */}
      <section className="max-w-6xl mx-auto border-t border-nous-border pt-12 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <span className="font-mono text-[9px] text-nous-subtle uppercase tracking-[0.25em] block mb-1">Commercial Infrastructure</span>
            <h2 className="font-serif text-3xl italic">Aesthetic Intelligence Subscription Registry</h2>
          </div>
          <p className="font-sans text-[10px] uppercase tracking-widest text-nous-subtle max-w-sm text-left md:text-right leading-relaxed">
            Flexible hybrid tiers designed for independent curators, full-time creators, and design agencies. Powered securely by Stripe Billing protocols.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              name: "The Initiation",
              tagline: "Mimi starts remembering you",
              price: "$12",
              recommended: false,
              cta: "Begin Initiation",
              bullets: [
                "500 credits per cycle",
                "Persistent profile memory",
                "Doubt reports & basic archives",
                "Access to the House chambers",
              ],
            },
            {
              name: "Optioning",
              tagline: "Tailor visual treatments",
              price: "$25",
              recommended: true,
              cta: "Deploy Optioning",
              bullets: [
                "1,500 credits per cycle",
                "Mannequin flat-lay snapping",
                "Outfit logic & styling boards",
                "Wardrobe fragment curation",
              ],
            },
            {
              name: "The Atelier",
              tagline: "Produce the signal",
              price: "$40",
              recommended: false,
              cta: "Open the Atelier",
              bullets: [
                "3,000 credits per cycle",
                "Full campaign zine director",
                "Exportable creative assets",
                "Drops & publishing pipeline",
              ],
            },
            {
              name: "The Lab",
              tagline: "Advanced controls",
              price: "$99",
              recommended: false,
              cta: "Enter the Lab",
              bullets: [
                "10,000 credits per cycle",
                "Likeness Proxy & Style Rules",
                "Approved external Keyring servers",
                "Commercial & client-ready workflows",
              ],
            },
          ].map((tier) => (
            <div
              key={tier.name}
              className={`p-6 space-y-6 flex flex-col justify-between relative ${
                tier.recommended
                  ? "border-2 border-nous-text bg-nous-text/[0.03]"
                  : "border border-nous-border bg-nous-paper"
              }`}
            >
              {tier.recommended && (
                <div className="absolute top-0 right-6 translate-y-[-50%] bg-nous-text text-nous-base text-[8px] uppercase tracking-widest px-3 py-1 font-black">
                  Most Chosen
                </div>
              )}
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-sans text-xs uppercase tracking-widest font-bold text-nous-text">{tier.name}</h4>
                    <p className="font-serif italic text-xs text-nous-subtle mt-1">{tier.tagline}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-serif text-2xl font-light text-nous-text">{tier.price}</span>
                    <span className="font-sans text-[9px] uppercase tracking-widest text-nous-subtle block">/ month</span>
                  </div>
                </div>
                <ul className="font-sans text-[11px] text-nous-subtle space-y-2 list-none pl-0">
                  {tier.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-center gap-2">
                      <Check size={10} className="text-nous-text shrink-0" /> {bullet}
                    </li>
                  ))}
                </ul>
              </div>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('mimi:open_patron_modal'))}
                className={`w-full py-3 min-h-11 font-sans text-[9px] uppercase tracking-widest font-black rounded-none transition-all text-center ${
                  tier.recommended
                    ? "bg-nous-text text-nous-base hover:opacity-80"
                    : "border border-nous-text text-nous-text hover:bg-nous-text hover:text-nous-base"
                }`}
              >
                {tier.cta}
              </button>
            </div>
          ))}
        </div>

        {/* Dynamic Data Value Proposition Alert */}
        <div className="mt-8 p-4 bg-nous-paper border border-nous-border/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShieldCheck size={18} className="text-nous-subtle shrink-0" />
            <p className="font-sans text-[11px] text-nous-subtle font-bold uppercase tracking-wider">
              Mimi operates as a first-party, closed-loop semantic asset sandbox.
            </p>
          </div>
          <span className="font-mono text-[9px] text-nous-text bg-nous-base border border-nous-border px-3 py-1 font-bold uppercase">
            Sovereign Trust Rating: 100% Secure
          </span>
        </div>
      </section>

      {/* Footer metadata */}
      <footer className="max-w-6xl mx-auto border-t border-nous-border mt-16 pt-8 pb-12 flex flex-col sm:flex-row justify-between items-center gap-4 text-nous-subtle font-mono text-[9px] uppercase tracking-[0.2em]">
        <span>© {new Date().getFullYear()} Mimi Zine Logic Registry // Aesthetic Architecture Corporation</span>
        <div className="flex gap-6">
          <a href="/privacy" className="hover:text-nous-text">Privacy Sovereign Protocol</a>
          <a href="/terms" className="hover:text-nous-text">Terms of Curation</a>
        </div>
      </footer>
    </div>
  );
};
