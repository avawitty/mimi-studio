import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  ArrowLeft, 
  Sparkles, 
  FileText, 
  Maximize2, 
  Layout, 
  Edit3, 
  Sliders, 
  Palette, 
  Compass, 
  Download, 
  Upload, 
  History, 
  X, 
  Layers,
  CheckCircle,
  Eye,
  Type as FontIcon
} from 'lucide-react';
import { useUser } from '../contexts/UserContext';

interface ScribeFields {
  artifactTitle: string;
  mode: string;
  coreLine: string;
  emotionalWeather: string;
  primaryConflict: string;
  boundaryStatement: string;
  powerClaim: string;
  noiseSource: string;
  resolutionGesture: string;
}

interface ConstellationNode {
  id: string;
  letter: string;
  name: string;
  description: string;
}

interface VisualParams {
  palette: string[];
  materials: string[];
  texture: string[];
  composition: string[];
  motionLanguage: string[];
  typography: string[];
  avoid: string[];
}

interface ExportLayout {
  p1_title: string;
  p1_subtitle: string;
  p2_lyric_title: string;
  p2_nodes: string[];
  p3_title: string;
  p4_title: string;
  p5_title: string;
  p6_title: string;
  p6_prompt_template: string;
}

export const SolitarianCaseStudy: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const { pocket, setPocket } = useUser();
  const [activeTab, setActiveTab] = useState<'scribe' | 'nodes' | 'visuals' | 'layout' | 'preview'>('preview');
  const [selectedPreviewPage, setSelectedPreviewPage] = useState<number>(0);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // --- PRELOAD: Mind Movie Case Study Data ---
  const [scribe, setScribe] = useState<ScribeFields>({
    artifactTitle: "Mind Movie",
    mode: "Solitarian / cinematic self-extraction",
    coreLine: "If my mind was a movie, you’d be cut from the reel.",
    emotionalWeather: "triggered, sovereign, exhausted, theatrical, lucid",
    primaryConflict: "involuntary inner cinema vs. authorship of perception",
    boundaryStatement: "I burned the film. I locked the door.",
    powerClaim: "I write the ending now.",
    noiseSource: "background commentary, weak lines, decoys, unwanted projection",
    resolutionGesture: "pause, cut, credits, steel, silence"
  });

  const [nodes, setNodes] = useState<ConstellationNode[]>([
    { id: 'a', letter: 'A', name: 'The Reel', description: 'The involuntary film: visuals, voices, scenes, loops, mental projections.' },
    { id: 'b', letter: 'B', name: 'The Decoy', description: 'False plot twists, triangulation, attention traps, people mistaking proximity for meaning.' },
    { id: 'c', letter: 'C', name: 'The Pause', description: 'The sovereign freeze-frame. Stop the movie. Refuse the next scene.' },
    { id: 'd', letter: 'D', name: 'Closing Credits', description: 'Finality, ending, applause, exit, emotional non-participation.' },
    { id: 'e', letter: 'E', name: 'Steel', description: 'Cold protection, industrial boundary, anti-sentimentality, hard surface.' },
    { id: 'f', letter: 'F', name: 'Gold Fade', description: 'The self as documentary, award, survival artifact, authored myth.' }
  ]);

  const [visuals, setVisuals] = useState<VisualParams>({
    palette: ['#0A0A0B', '#1E1E21', '#78716C', '#44403C', '#EAE9E5', '#D4AF37'], // soft blacks, slate, oxidized silver, gold accent
    materials: ['Steel', 'Film Grain', 'Projector Dust', 'Paper Archives', 'Glass', 'Cold Chrome'],
    texture: ['CRT Static', 'Degraded Subtitles', 'Scratched Film Leader', 'Soft Blur', 'Editorial Silence'],
    composition: ['Large Negative Space', 'Centered Still Frame', 'Thin Borders', 'Sparse Captions'],
    motionLanguage: ['Pause', 'Cut', 'Flicker', 'Blackout', 'Slow Fade', 'Locked Door'],
    typography: ['Elegant Serif (Cormorant)', 'Typewriter Mono (JetBrains Mono)', 'Swiss Modern (Inter)'],
    avoid: ['Neon Chaos', 'Horror Gore', 'Overly Witchy Symbolism', 'Melodrama without Control']
  });

  const [layout, setLayout] = useState<ExportLayout>({
    p1_title: "Mind Movie",
    p1_subtitle: "An involuntary cinema translated into authorship.",
    p2_lyric_title: "Raw Lyric Artifact",
    p2_nodes: [
      "I burned the film.",
      "I locked the door.",
      "The reel is melting."
    ],
    p3_title: "Scribe Analysis Matrix",
    p4_title: "Taste Constellation Map",
    p5_title: "Visual System Matrix",
    p6_title: "Synthesis & Activation Prompt",
    p6_prompt_template: "Generate an editorial zine spread: monochrome steel cinema archive, frozen pause frame, sparse serif captions, cold negative space, muted gold survival accent, Solitarian mood, elegant but brutal."
  });

  // Action methods to push data to application
  const injectToScribe = () => {
    // Save to user context or pocket memory
    if (setPocket) {
      // Since pocket is any[], we should safely push or append
      const updatedPocket = Array.isArray(pocket) ? [...pocket] : [];
      updatedPocket.push({
        id: `scribe-study-${Date.now()}`,
        type: 'scribe-intake',
        scribeIntake: scribe,
        activeAestheticPreset: {
          name: "Solitarian (Steel & Gold)",
          visuals
        },
        timestamp: Date.now()
      });
      setPocket(updatedPocket);
    }
    
    triggerSuccess("Case study variables successfully injected to Mimi Scribe system.");
  };

  const syncTasteConstellation = () => {
    triggerSuccess("Taste constellation nodes aligned. Graph coordinates updated.");
  };

  const triggerSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => {
      setSuccessMessage(null);
    }, 4000);
  };

  const exportAsJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
      scribe,
      nodes,
      visuals,
      layout
    }, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${scribe.artifactTitle.toLowerCase().replace(/\s+/g, '_')}_case_study.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    triggerSuccess("Case Study schema exported successfully.");
  };

  return (
    <div className="min-h-screen bg-[#141415] text-[#eae9e5] p-6 md:p-12 relative overflow-hidden flex flex-col md:flex-row gap-8">
      {/* Dynamic Background Grid Pattern to match clinical branding */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f21_1px,transparent_1px),linear-gradient(to_bottom,#1f1f21_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none opacity-40" />

      {/* LEFT PANEL: CONFIGURATION & INTENT FORM */}
      <div className="w-full md:w-1/2 flex flex-col z-10 relative bg-[#1c1c1e] border border-stone-800/80 p-6 md:p-8 shadow-2xl overflow-y-auto max-h-[90vh] no-scrollbar rounded-none">
        
        {/* Header containing name and thesis details */}
        <div className="flex justify-between items-start border-b border-stone-800 pb-6 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-[8px] tracking-[0.3em] text-[#78716C] uppercase font-bold">[ SOLITARIAN PROTOCOL ]</span>
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
            </div>
            <h1 className="font-serif text-3xl font-light italic tracking-tight text-[#eae9e5]">
              Case Study Compiler
            </h1>
            <p className="font-sans text-[10px] text-[#78716C] tracking-wide mt-1 uppercase">
              Translating Involuntary Cinema into Systems Authorship
            </p>
          </div>
          {onClose && (
            <button 
              onClick={onClose}
              className="p-1 text-stone-500 hover:text-stone-300 transition-colors border border-stone-800 hover:bg-stone-800/50"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Success Alert Banner */}
        <AnimatePresence>
          {successMessage && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 bg-stone-900 border-l border-yellow-500 font-mono text-[9px] text-[#eae9e5]/90 flex items-center gap-3 uppercase tracking-widest leading-relaxed"
            >
              <CheckCircle size={14} className="text-yellow-500" />
              <span>{successMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab Selection */}
        <div className="flex border-b border-stone-800 mb-6 font-mono text-[9px] uppercase tracking-widest overflow-x-auto no-scrollbar gap-2">
          <button 
            onClick={() => { setActiveTab('preview'); setSelectedPreviewPage(0); }}
            className={`pb-3 px-2 flex items-center gap-1.5 border-b-2 transition-all ${activeTab === 'preview' ? 'border-[#EAE9E5] text-[#EAE9E5] font-bold' : 'border-transparent text-stone-500 hover:text-stone-300'}`}
          >
            <Eye size={12} /> Live Deck
          </button>
          <button 
            onClick={() => setActiveTab('scribe')}
            className={`pb-3 px-2 flex items-center gap-1.5 border-b-2 transition-all ${activeTab === 'scribe' ? 'border-[#EAE9E5] text-[#EAE9E5] font-bold' : 'border-transparent text-stone-500 hover:text-stone-300'}`}
          >
            <Edit3 size={12} /> Scribe Fields
          </button>
          <button 
            onClick={() => setActiveTab('nodes')}
            className={`pb-3 px-2 flex items-center gap-1.5 border-b-2 transition-all ${activeTab === 'nodes' ? 'border-[#EAE9E5] text-[#EAE9E5] font-bold' : 'border-transparent text-stone-500 hover:text-stone-300'}`}
          >
            <Compass size={12} /> Taste Nodes
          </button>
          <button 
            onClick={() => setActiveTab('visuals')}
            className={`pb-3 px-2 flex items-center gap-1.5 border-b-2 transition-all ${activeTab === 'visuals' ? 'border-[#EAE9E5] text-[#EAE9E5] font-bold' : 'border-transparent text-stone-500 hover:text-stone-300'}`}
          >
            <Palette size={12} /> Aesthetics
          </button>
          <button 
            onClick={() => setActiveTab('layout')}
            className={`pb-3 px-2 flex items-center gap-1.5 border-b-2 transition-all ${activeTab === 'layout' ? 'border-[#EAE9E5] text-[#EAE9E5] font-bold' : 'border-transparent text-stone-500 hover:text-stone-300'}`}
          >
            <Layout size={12} /> Structure
          </button>
        </div>

        {/* TAB INTERFACES */}
        <div className="flex-1 space-y-6">
          {activeTab === 'scribe' && (
            <div className="space-y-4">
              <div className="p-4 bg-stone-900/30 border border-stone-800 mb-4 rounded-none">
                <p className="font-mono text-[9px] text-[#78716C] uppercase tracking-widest leading-relaxed">
                  These fields construct the analytical frame for Scribe extraction, translating chaotic lyrics or statements into cold structural parameters.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[8px] font-mono tracking-widest text-stone-500 uppercase mb-1">Title</label>
                  <input 
                    type="text" 
                    value={scribe.artifactTitle} 
                    onChange={e => setScribe({...scribe, artifactTitle: e.target.value})}
                    className="w-full bg-stone-950 border border-stone-800 text-stone-300 rounded-none p-2 text-xs focus:border-stone-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[8px] font-mono tracking-widest text-stone-500 uppercase mb-1">Extraction Mode</label>
                  <input 
                    type="text" 
                    value={scribe.mode} 
                    onChange={e => setScribe({...scribe, mode: e.target.value})}
                    className="w-full bg-stone-950 border border-stone-800 text-stone-300 rounded-none p-2 text-xs focus:border-stone-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[8px] font-mono tracking-widest text-stone-500 uppercase mb-1">Core Line / Focus</label>
                <input 
                  type="text" 
                  value={scribe.coreLine} 
                  onChange={e => setScribe({...scribe, coreLine: e.target.value})}
                  className="w-full bg-stone-950 border border-stone-800 text-stone-300 rounded-none p-2 text-xs focus:border-stone-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[8px] font-mono tracking-widest text-stone-500 uppercase mb-1">Emotional Weather</label>
                <input 
                  type="text" 
                  value={scribe.emotionalWeather} 
                  onChange={e => setScribe({...scribe, emotionalWeather: e.target.value})}
                  className="w-full bg-stone-950 border border-stone-800 text-stone-300 rounded-none p-2 text-xs focus:border-stone-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[8px] font-mono tracking-widest text-stone-500 uppercase mb-1">Primary Conflict</label>
                <input 
                  type="text" 
                  value={scribe.primaryConflict} 
                  onChange={e => setScribe({...scribe, primaryConflict: e.target.value})}
                  className="w-full bg-stone-950 border border-stone-800 text-stone-300 rounded-none p-2 text-xs focus:border-stone-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[8px] font-mono tracking-widest text-stone-500 uppercase mb-1">Boundary Statement</label>
                <input 
                  type="text" 
                  value={scribe.boundaryStatement} 
                  onChange={e => setScribe({...scribe, boundaryStatement: e.target.value})}
                  className="w-full bg-stone-950 border border-stone-800 text-stone-300 rounded-none p-2 text-xs focus:border-stone-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[8px] font-mono tracking-widest text-stone-500 uppercase mb-1">Power Claim</label>
                  <input 
                    type="text" 
                    value={scribe.powerClaim} 
                    onChange={e => setScribe({...scribe, powerClaim: e.target.value})}
                    className="w-full bg-stone-950 border border-stone-800 text-stone-300 rounded-none p-2 text-xs focus:border-stone-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[8px] font-mono tracking-widest text-stone-500 uppercase mb-1">Noise Source</label>
                  <input 
                    type="text" 
                    value={scribe.noiseSource} 
                    onChange={e => setScribe({...scribe, noiseSource: e.target.value})}
                    className="w-full bg-stone-950 border border-stone-800 text-stone-300 rounded-none p-2 text-xs focus:border-stone-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[8px] font-mono tracking-widest text-stone-500 uppercase mb-1">Resolution Gesture</label>
                <input 
                  type="text" 
                  value={scribe.resolutionGesture} 
                  onChange={e => setScribe({...scribe, resolutionGesture: e.target.value})}
                  className="w-full bg-stone-950 border border-stone-800 text-stone-300 rounded-none p-2 text-xs focus:border-stone-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {activeTab === 'nodes' && (
            <div className="space-y-4 text-stone-300">
              <div className="p-4 bg-stone-900/30 border border-stone-800 mb-4 rounded-none">
                <p className="font-mono text-[9px] text-[#78716C] uppercase tracking-widest leading-relaxed">
                  Define the mapping coordinates for the Taste Constellation and mental nodes schema. Replaces raw narrative with precise psychological vertices.
                </p>
              </div>

              {nodes.map((node, i) => (
                <div key={node.id} className="p-4 bg-stone-950 border border-stone-800 flex flex-col gap-2 relative">
                  <div className="absolute right-3 top-3 font-mono text-xs opacity-20 hover:opacity-100 cursor-default">
                    Node {node.letter}
                  </div>
                  <div className="flex gap-4 items-center">
                    <div className="w-8 h-8 rounded-none border border-stone-700 font-mono text-xs flex items-center justify-center bg-stone-900">
                      {node.letter}
                    </div>
                    <div className="flex-1">
                      <input 
                        type="text" 
                        value={node.name} 
                        onChange={e => {
                          const updated = [...nodes];
                          updated[i].name = e.target.value;
                          setNodes(updated);
                        }}
                        className="bg-transparent border-b border-stone-800 text-stone-100 font-serif font-light text-base focus:outline-none focus:border-stone-500 px-1 py-0.5 w-full"
                      />
                    </div>
                  </div>
                  <textarea 
                    value={node.description} 
                    onChange={e => {
                      const updated = [...nodes];
                      updated[i].description = e.target.value;
                      setNodes(updated);
                    }}
                    rows={2}
                    className="w-full bg-stone-900/40 border border-stone-850 p-2 text-xs text-stone-400 font-sans focus:outline-none focus:border-stone-800 resize-none mt-2"
                  />
                </div>
              ))}
            </div>
          )}

          {activeTab === 'visuals' && (
            <div className="space-y-5">
              <div className="p-4 bg-stone-900/30 border border-stone-800 rounded-none">
                <p className="font-mono text-[9px] text-[#78716C] uppercase tracking-widest leading-relaxed">
                  Design specifications to lock and control the visual physics of the output spread. Governs palettes, textures, and typographical bounds.
                </p>
              </div>

              {/* Palette */}
              <div>
                <label className="block text-[8px] font-mono tracking-widest text-stone-500 uppercase mb-2">Palette Codes (Hex list, comma separated)</label>
                <div className="flex flex-wrap gap-2 mb-2 p-3 bg-stone-950 border border-stone-800 items-center">
                  {visuals.palette.map((hex, i) => (
                    <div key={i} className="flex items-center gap-1.5 bg-stone-900/80 px-2 py-1 border border-stone-800">
                      <div className="w-4.5 h-4.5" style={{ backgroundColor: hex }} />
                      <span className="font-mono text-[9px]">{hex}</span>
                    </div>
                  ))}
                </div>
                <input 
                  type="text" 
                  value={visuals.palette.join(', ')} 
                  onChange={e => setVisuals({...visuals, palette: e.target.value.split(',').map(s => s.trim())})}
                  className="w-full bg-stone-950 border border-stone-800 text-stone-300 rounded-none p-2 text-xs focus:border-stone-500 focus:outline-none font-mono"
                />
              </div>

              {/* Lists */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[8px] font-mono tracking-widest text-stone-500 uppercase mb-1">Materials</label>
                  <textarea 
                    value={visuals.materials.join(', ')} 
                    onChange={e => setVisuals({...visuals, materials: e.target.value.split(',').map(s => s.trim())})}
                    rows={2}
                    className="w-full bg-stone-950 border border-stone-800 text-stone-300 p-2 text-xs focus:outline-none font-sans"
                  />
                </div>
                <div>
                  <label className="block text-[8px] font-mono tracking-widest text-stone-500 uppercase mb-1">Textures</label>
                  <textarea 
                    value={visuals.texture.join(', ')} 
                    onChange={e => setVisuals({...visuals, texture: e.target.value.split(',').map(s => s.trim())})}
                    rows={2}
                    className="w-full bg-stone-950 border border-stone-800 text-stone-300 p-2 text-xs focus:outline-none font-sans"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[8px] font-mono tracking-widest text-stone-500 uppercase mb-1">Motion Language</label>
                <input 
                  type="text" 
                  value={visuals.motionLanguage.join(', ')} 
                  onChange={e => setVisuals({...visuals, motionLanguage: e.target.value.split(',').map(s => s.trim())})}
                  className="w-full bg-stone-950 border border-stone-800 text-stone-300 rounded-none p-2 text-xs focus:border-stone-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[8px] font-mono tracking-widest text-stone-500 uppercase mb-1">Typography</label>
                <input 
                  type="text" 
                  value={visuals.typography.join(', ')} 
                  onChange={e => setVisuals({...visuals, typography: e.target.value.split(',').map(s => s.trim())})}
                  className="w-full bg-stone-950 border border-stone-800 text-stone-300 rounded-none p-2 text-xs focus:border-stone-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[8px] font-mono tracking-widest text-stone-500 uppercase mb-1">Avoid Vectors (Anti-Slop Directives)</label>
                <input 
                  type="text" 
                  value={visuals.avoid.join(', ')} 
                  onChange={e => setVisuals({...visuals, avoid: e.target.value.split(',').map(s => s.trim())})}
                  className="w-full bg-stone-950 border border-stone-800 text-stone-300 rounded-none p-2 text-xs focus:border-stone-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {activeTab === 'layout' && (
            <div className="space-y-4">
              <div className="p-4 bg-stone-900/30 border border-stone-800 rounded-none">
                <p className="font-mono text-[9px] text-[#78716C] uppercase tracking-widest leading-relaxed">
                  Controls page configurations, structural narratives and prompt activations for compiling zine spreads out of coordinates.
                </p>
              </div>

              <div>
                <label className="block text-[8px] font-mono tracking-widest text-stone-500 uppercase mb-1">Page 1 Theme Description</label>
                <input 
                  type="text" 
                  value={layout.p1_subtitle} 
                  onChange={e => setLayout({...layout, p1_subtitle: e.target.value})}
                  className="w-full bg-stone-950 border border-stone-800 text-stone-300 rounded-none p-2 text-xs focus:border-stone-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[8px] font-mono tracking-widest text-stone-500 uppercase mb-1">Page 2 Raw Fragments (Line fragments separated by comma)</label>
                <input 
                  type="text" 
                  value={layout.p2_nodes.join(', ')} 
                  onChange={e => setLayout({...layout, p2_nodes: e.target.value.split(',').map(s => s.trim())})}
                  className="w-full bg-stone-950 border border-stone-800 text-stone-300 rounded-none p-2 text-xs focus:border-stone-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[8px] font-mono tracking-widest text-stone-500 uppercase mb-1">Synthesis Activator Prompts (Page 6 output)</label>
                <textarea 
                  value={layout.p6_prompt_template} 
                  onChange={e => setLayout({...layout, p6_prompt_template: e.target.value})}
                  rows={4}
                  className="w-full bg-stone-950 border border-stone-800 text-[#eae9e5] p-3 text-xs focus:outline-none focus:border-stone-500 rounded-none font-mono"
                />
              </div>
            </div>
          )}

          {activeTab === 'preview' && (
            <div className="space-y-6">
              <div className="p-4 bg-stone-900/50 border border-stone-800 rounded-none">
                <span className="font-mono text-[9px] text-[#78716C] uppercase tracking-widest block mb-2">[ SOLITARIAN PREVIEW ENGINE ]</span>
                <p className="font-serif italic text-sm text-stone-300 leading-relaxed">
                  This panel previews the computed layout of the 6-page Case Study spread sequence. Select pages to inspect visual alignment prior to local system injection.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 bg-stone-950 p-2 border border-stone-800">
                <div className="font-mono text-[9px] uppercase tracking-wider text-stone-500">
                  Select Spread Slide
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[...Array(6)].map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedPreviewPage(index)}
                      className={`w-7 h-7 border font-mono text-[9px] flex items-center justify-center transition-colors ${selectedPreviewPage === index ? 'bg-[#eae9e5] text-stone-900 font-bold border-[#eae9e5]' : 'border-stone-800 text-stone-500 hover:text-stone-300 hover:border-stone-700'}`}
                    >
                      {index + 1}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-stone-950/20 border border-stone-850 flex flex-col gap-2">
                <div className="font-mono text-[8px] uppercase tracking-widest text-[#78716C] flex justify-between">
                  <span>ACTIVE VIEW: INTERACTIVE SLIDE 0{selectedPreviewPage + 1}</span>
                  <span>{scribe.artifactTitle} ({scribe.mode})</span>
                </div>
                <div className="text-xs text-stone-400">
                  {selectedPreviewPage === 0 && "Page 1 serves as the Title Plate, formulating the main thesis of cinematic extraction."}
                  {selectedPreviewPage === 1 && "Page 2 presents raw lyric or statement fragments translated into historical documents with Scribe notation."}
                  {selectedPreviewPage === 2 && "Page 3 outlines the emotional vectors, resolution parameters, and primary system conflict."}
                  {selectedPreviewPage === 3 && "Page 4 builds the Taste Constellation and mental nodes mapping coordinates."}
                  {selectedPreviewPage === 4 && "Page 5 establishes the micro-specifications of the visual operating physical systems."}
                  {selectedPreviewPage === 5 && "Page 6 presents the ultimate prompt to trigger the Mimi generation engine."}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* CONTROLS BAR */}
        <div className="mt-8 pt-6 border-t border-stone-800 flex flex-col sm:flex-row gap-3">
          <button 
            onClick={injectToScribe}
            className="flex-1 flex items-center justify-center gap-2 bg-[#eae9e5] text-stone-950 px-4 py-3 font-mono text-[10px] uppercase tracking-widest font-black hover:bg-stone-100 transition-colors"
          >
            <Sparkles size={12} /> Inject to Scribe
          </button>
          <button 
            onClick={syncTasteConstellation}
            className="flex-1 flex items-center justify-center gap-2 bg-transparent border border-stone-800 text-stone-300 px-4 py-3 font-mono text-[10px] uppercase tracking-widest font-bold hover:bg-stone-900 transition-colors"
          >
            <Compass size={12} /> Align Constellation
          </button>
          <button 
            onClick={exportAsJSON}
            className="px-4 py-3 border border-stone-800 text-stone-400 hover:text-[#eae9e5] hover:bg-stone-900 transition-colors"
            title="Export Case Study Schema"
          >
            <Download size={12} />
          </button>
        </div>

      </div>

      {/* RIGHT PANEL: IMMERSIVE PREVIEW CARD DEVICE / SLIDESHOW */}
      <div className="w-full md:w-1/2 flex items-center justify-center z-10 relative py-8 md:py-0">
        
        {/* The Card / Slide Mock representing an archival film folder page */}
        <div className="w-full max-w-[500px] aspect-[3/4] bg-[#0c0c0d] border border-stone-800 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] p-8 md:p-12 flex flex-col justify-between relative overflow-hidden ring-1 ring-[#e5e5e5]/10 group transition-transform hover:scale-[1.01] duration-700">
          
          {/* Subtle overlay grid inside the slide to resemble paper / film texture */}
          <div className="absolute inset-0 bg-[#EAE9E5]/[0.02] filter mix-blend-color-dodge opacity-60 pointer-events-none" />
          <div className="absolute top-0 right-0 w-24 h-24 bg-[radial-gradient(ellipse_at_top_right,rgba(212,175,55,0.05),transparent_70%)] pointer-events-none" />
          
          {/* Top Classification Segment */}
          <div className="flex justify-between items-start border-b border-stone-900 pb-4 font-mono text-[8px] uppercase tracking-[0.25em] text-[#78716C] z-10">
            <div>
              <span>Mimi // Case Study</span>
              <br />
              <span className="text-[7px] text-stone-500 font-bold">SOLITARIAN PROTOCOL v0.1</span>
            </div>
            <div className="text-right">
              <span>Artifact 00a</span>
              <br />
              <span className="text-yellow-500/80 font-bold">STATUS: REVEALED</span>
            </div>
          </div>

          {/* Dynamic Content Switching Based on Selected Slide */}
          <div className="flex-1 flex flex-col justify-center my-6 z-10 relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedPreviewPage}
                initial={{ opacity: 0, y: 15, filter: "blur(5px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -15, filter: "blur(5px)" }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="h-full flex flex-col justify-between"
              >
                {selectedPreviewPage === 0 && (
                  <div className="space-y-6 text-center md:text-left">
                    <div className="space-y-2">
                      <div className="inline-block px-2 py-0.5 bg-stone-900 text-stone-500 border border-stone-850 font-mono text-[8px] uppercase tracking-widest font-black">
                        SLIDE 01 // TITLE PLATE
                      </div>
                      <h2 className="font-serif italic text-4xl lg:text-5xl text-[#eae9e5] tracking-tight leading-none pt-4">
                        {layout.p1_title}
                      </h2>
                    </div>
                    
                    <p className="font-sans text-xs text-stone-400 font-light leading-relaxed max-w-sm italic opacity-95">
                      "{layout.p1_subtitle}"
                    </p>

                    <div className="pt-8 border-t border-stone-950 font-mono text-[8px] text-[#78716C] tracking-widest uppercase space-y-2">
                      <div>Focus Subject: {scribe.artifactTitle}</div>
                      <div>Mode: {scribe.mode}</div>
                      <div>Emotional Weight: {scribe.emotionalWeather}</div>
                    </div>
                  </div>
                )}

                {selectedPreviewPage === 1 && (
                  <div className="space-y-6">
                    <div className="space-y-1">
                      <div className="inline-block px-2 py-0.5 bg-stone-900 text-stone-500 border border-stone-850 font-mono text-[8px] uppercase tracking-widest font-bold">
                        SLIDE 02 // RAW FRAGMENTS
                      </div>
                      <h3 className="font-serif italic text-lg text-stone-300 tracking-tight mt-3">
                        {layout.p2_lyric_title}
                      </h3>
                    </div>

                    {/* Simulating code-like lyrics transcript with custom notation lines */}
                    <div className="space-y-4 font-mono text-[11px] bg-stone-950 p-4 border border-stone-900 rounded-none relative">
                      <div className="absolute top-2 right-3 uppercase text-[8px] tracking-widest text-stone-600 font-black">[ LYRIC FRAGMENT TRANSCRIPT ]</div>
                      
                      <div className="text-[#eae9e5]/95 leading-relaxed italic border-l-2 border-yellow-500/40 pl-3">
                        "{scribe.coreLine}"
                      </div>
                      
                      <div className="space-y-1 text-stone-500 text-[10px] uppercase tracking-wider pl-3 border-l border-stone-800">
                        {layout.p2_nodes.map((n, i) => (
                          <div key={i} className="flex gap-2">
                            <span>0{i+1}.</span> <span>{n}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="font-sans text-[10px] text-stone-400 italic">
                      Marginalia: The subject rejects voluntary inner performance. The camera acts as a sovereign boundary against invasive narrative commentary.
                    </div>
                  </div>
                )}

                {selectedPreviewPage === 2 && (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <div className="inline-block px-2 py-0.5 bg-stone-900 text-stone-500 border border-stone-850 font-mono text-[8px] uppercase tracking-widest font-bold">
                        SLIDE 03 // ANALYSIS
                      </div>
                      <h3 className="font-serif italic text-lg text-stone-300 mt-2">
                        {layout.p3_title}
                      </h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2 font-mono text-[9px] uppercase tracking-widest">
                      <div className="space-y-2 p-3 bg-stone-950/70 border border-stone-900">
                        <span className="text-stone-500 block border-b border-stone-800 pb-1 font-bold">[ CORE CONFLICT ]</span>
                        <p className="text-stone-300 lowercase leading-relaxed normal-case first-letter:uppercase">{scribe.primaryConflict}</p>
                      </div>
                      <div className="space-y-2 p-3 bg-stone-950/70 border border-stone-900">
                        <span className="text-stone-500 block border-b border-stone-800 pb-1 font-bold">[ BOUNDARY ]</span>
                        <p className="text-stone-300 lowercase leading-relaxed normal-case first-letter:uppercase">{scribe.boundaryStatement}</p>
                      </div>
                      <div className="space-y-2 p-3 bg-stone-950/70 border border-stone-900">
                        <span className="text-stone-500 block border-b border-stone-800 pb-1 font-bold">[ POWER CLAIM ]</span>
                        <p className="text-stone-300 lowercase leading-relaxed normal-case first-letter:uppercase">{scribe.powerClaim}</p>
                      </div>
                      <div className="space-y-2 p-3 bg-stone-950/70 border border-stone-900">
                        <span className="text-stone-500 block border-b border-stone-800 pb-1 font-bold">[ NOISE SOURCE ]</span>
                        <p className="text-stone-300 lowercase leading-relaxed normal-case first-letter:uppercase">{scribe.noiseSource}</p>
                      </div>
                    </div>

                    <div className="font-mono text-[8px] tracking-widest text-stone-500 uppercase">
                      Resolution Action Code: {scribe.resolutionGesture}
                    </div>
                  </div>
                )}

                {selectedPreviewPage === 3 && (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <div className="inline-block px-2 py-0.5 bg-stone-900 text-stone-500 border border-stone-850 font-mono text-[8px] uppercase tracking-widest font-bold">
                        SLIDE 04 // TASTE MAP
                      </div>
                      <h3 className="font-serif italic text-lg text-stone-300 mt-2">
                        {layout.p4_title}
                      </h3>
                    </div>

                    {/* SVG/CSS graph rendering of the nodes */}
                    <div className="border border-stone-900 bg-stone-950 p-4 flex flex-col gap-3 max-h-[190px] overflow-y-auto no-scrollbar">
                      <div className="grid grid-cols-2 gap-2">
                        {nodes.map((node) => (
                          <div key={node.id} className="flex gap-2 items-start p-2 border border-stone-850 rounded-none bg-stone-900/30">
                            <span className="font-mono text-[9px] w-4 h-4 rounded-none border border-stone-700 bg-stone-950 flex items-center justify-center font-black text-yellow-500/80">{node.letter}</span>
                            <div className="flex-1 min-w-0">
                              <span className="font-mono text-[8px] uppercase tracking-wider block font-black text-[#eae9e5]">{node.name}</span>
                              <span className="font-sans text-[8px] text-stone-500 leading-tight block truncate" title={node.description}>{node.description}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 justify-center font-mono text-[8px] uppercase tracking-widest text-[#78716C]">
                      <span>NODE STEREOTYPES ALIGNED</span>
                      <span className="w-1 h-1 rounded-full bg-green-500" />
                      <span>COORDINATE DRIFT ZEROED</span>
                    </div>
                  </div>
                )}

                {selectedPreviewPage === 4 && (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <div className="inline-block px-2 py-0.5 bg-stone-900 text-stone-500 border border-stone-850 font-mono text-[8px] uppercase tracking-widest font-bold">
                        SLIDE 05 // VISUAL PHYSICS
                      </div>
                      <h3 className="font-serif italic text-lg text-stone-300 mt-2">
                        {layout.p5_title}
                      </h3>
                    </div>

                    <div className="space-y-3 font-mono text-[9px] uppercase tracking-widest">
                      <div className="flex justify-between items-center border-b border-stone-900 pb-1">
                        <span className="text-stone-500 font-bold">Materials Set</span>
                        <span className="text-[#eae9e5]">{visuals.materials.slice(0, 3).join(' • ')}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-stone-900 pb-1">
                        <span className="text-stone-500 font-bold">Textures Matrix</span>
                        <span className="text-[#eae9e5]">{visuals.texture.slice(0, 3).join(' • ')}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-stone-900 pb-1">
                        <span className="text-stone-500 font-bold">Motion Set</span>
                        <span className="text-[#eae9e5]">{visuals.motionLanguage.slice(0, 3).join(' • ')}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-stone-900 pb-1">
                        <span className="text-stone-500 font-bold">Aesthetic Type</span>
                        <span className="text-[#eae9e5]">{visuals.typography.slice(0, 2).join(' / ')}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-stone-900 pb-1">
                        <span className="text-red-500/80 font-bold">Protected Avoidance</span>
                        <span className="text-red-500/60 lowercase italic truncate max-w-[200px] text-right">{visuals.avoid.slice(0, 2).join(', ')}</span>
                      </div>
                    </div>

                    <div className="flex gap-1.5 justify-center pt-2">
                      {visuals.palette.map((color, idx) => (
                        <div key={idx} className="w-6 h-6 border border-stone-800" style={{ backgroundColor: color }} title={color} />
                      ))}
                    </div>
                  </div>
                )}

                {selectedPreviewPage === 5 && (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <div className="inline-block px-2 py-0.5 bg-stone-900 text-stone-500 border border-stone-850 font-mono text-[8px] uppercase tracking-widest font-bold">
                        SLIDE 06 // SYNTHESIS PROMPT
                      </div>
                      <h3 className="font-serif italic text-lg text-[#eae9e5] tracking-tight mt-2">
                        {layout.p6_title}
                      </h3>
                    </div>

                    {/* Highly stylized terminal/code snippet block presenting the ultimate prompt formulation */}
                    <div className="bg-stone-950 p-4 border border-stone-900 font-mono text-[9px] text-stone-300 leading-relaxed relative rounded-none select-all cursor-text max-h-[170px] overflow-y-auto index-terminal">
                      <span className="absolute bottom-2 right-2 text-[7px] text-stone-600 font-black uppercase tracking-widest">[ COPIABLE SYNTACTIC RAW ]</span>
                      <p className="whitespace-pre-wrap">{layout.p6_prompt_template}</p>
                    </div>

                    <div className="font-sans text-[10px] text-yellow-500/80 text-center uppercase tracking-wider font-bold italic animate-pulse">
                      ▲ PROMPT CERTIFIED READY FOR WORKTABLE INGESTION
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Bottom Metrology Segment */}
          <div className="flex justify-between items-center border-t border-stone-900 pt-4 font-mono text-[8px] text-[#78716C] z-10 uppercase tracking-[0.2em]">
            <span>Vol. 00a // Slide 0{selectedPreviewPage + 1}</span>
            <span>Ref: {scribe.artifactTitle.toUpperCase()}</span>
          </div>

        </div>

      </div>

    </div>
  );
};
