import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, Sparkles, ArrowRight, Lock, Image as ImageIcon, Briefcase, FileText, CheckCircle, Activity, Globe, Download, X, Fingerprint, Loader2 } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { generateRawImage, generateBrandIntakeReport, type ReportCitationFormat } from '../services/geminiService';
import { startTailorFromIntake } from '../services/tailorBridge';

type ParsingStep = 'upload' | 'analyzing' | 'report';

const REPORT_FORMAT_OPTIONS: { value: ReportCitationFormat; label: string; note: string }[] = [
  { value: 'editorial', label: 'Editorial', note: 'Mimi signature — evocative, sensory, high-concept' },
  { value: 'mla', label: 'MLA', note: 'Modern Language Association — cultural humanities framing' },
  { value: 'apa', label: 'APA', note: 'American Psychological Association — behavioral research framing' },
  { value: 'chicago', label: 'Chicago', note: 'Chicago/Turabian — archival, historically contextualised' },
];

export const BrandIntakeView: React.FC = () => {
  const { user, profile } = useUser();
  const [step, setStep] = useState<ParsingStep>('upload');
  
  // Intake Form
  const [brandName, setBrandName] = useState('');
  const [vibeDescription, setVibeDescription] = useState('');
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [reportFormat, setReportFormat] = useState<ReportCitationFormat>('editorial');

  // Brand Kit Customization State
  const [chromaticScale, setChromaticScale] = useState(['#b1a99f', '#e3e1db', '#2a2a2a']);
  const [typography, setTypography] = useState('JetBrains Mono & Inter');
  const [materiality, setMateriality] = useState('Archival Paper, Concrete, Grain');
  
  // Tiny Image Generator State
  const [genPrompt, setGenPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImg, setGeneratedImg] = useState<string | null>(null);
  
  // Scry State
  const [scryWriteup, setScryWriteup] = useState('');
  const [savingToTailor, setSavingToTailor] = useState(false);

  const blobUrlToDataUrl = async (blobUrl: string): Promise<string> => {
    const res = await fetch(blobUrl);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  };

  const handleSendToTailor = async () => {
    if (!user?.uid) return;
    setSavingToTailor(true);
    try {
      const imageDataUrls: string[] = [];
      for (const url of uploadedImages) {
        try {
          imageDataUrls.push(await blobUrlToDataUrl(url));
        } catch {
          // skip invalid blobs
        }
      }
      const { projectId } = await startTailorFromIntake(user.uid, 'brand', {
        title: brandName ? `Brand — ${brandName}` : undefined,
        blurb: vibeDescription || reportData?.positioning_statement,
        imageDataUrls,
        noteTitle: 'Brand intake report',
        noteBody: JSON.stringify(reportData ?? {}, null, 2),
      });
      window.location.href = `/tailor?project=${projectId}`;
    } finally {
      setSavingToTailor(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const urls = Array.from(e.target.files).map(f => URL.createObjectURL(f));
      setUploadedImages(prev => [...prev, ...urls]);
    }
  };

  const handleSimulateIntake = async () => {
    if (!brandName.trim()) return;
    setStep('analyzing');
    setIsProcessing(true);
    try {
      const data = await generateBrandIntakeReport(brandName, vibeDescription, profile, reportFormat);
      if (data) {
        setReportData(data);
        if (data.chromaticScale && Array.isArray(data.chromaticScale) && data.chromaticScale.length >= 3) {
          setChromaticScale(data.chromaticScale.slice(0, 3));
        }
        if (data.typography) setTypography(data.typography);
        if (data.materiality) setMateriality(data.materiality);
      }
    } catch (e) {
      console.error("MIMI // Failed to generate live brand intake report:", e);
    } finally {
      setIsProcessing(false);
      setStep('report');
    }
  };

  const handleGenerateImage = async () => {
    if (!genPrompt.trim()) return;
    setIsGenerating(true);
    try {
      const b64 = await generateRawImage(genPrompt, '1:1', profile);
      setGeneratedImg('data:image/jpeg;base64,' + b64);
    } catch (e) {
      console.error(e);
      setGeneratedImg('https://placehold.co/400x400/ededed/888888?text=Error');
    }
    setIsGenerating(false);
  };

  const handleScryTokens = () => {
    // Faking a scry write-up based on the tokens
    setScryWriteup(`The interplay between ${chromaticScale.join(', ')} creates a tension that is grounded yet elusive. The structural rigidity of ${typography} against the visceral texture of ${materiality} implies a brand that is both deeply engineered and highly organic—avoiding corporate polish in favor of raw semiotic power.`);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#Fdfdfb] text-nous-text flex justify-center w-full h-full pb-32">
      <div className="max-w-4xl w-full p-8 md:p-12">
        <div className="mb-12">
          <h1 className="font-serif italic text-5xl mb-4 text-[#1a1a1a]">Mimi Intelligence Report</h1>
          <p className="font-sans text-sm text-[#555] max-w-xl leading-relaxed">
            Upload your references, fragments, and brand notes. Get an editorial-grade aesthetic intelligence report with positioning, audience psychographics, content pillars, and a customizable style system.
          </p>
        </div>

        <AnimatePresence mode="wait">
          {step === 'upload' && (
            <motion.div 
              key="upload"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div className="space-y-6">
                <div>
                  <label className="block font-mono text-[9px] uppercase tracking-widest text-[#777] mb-2">Project / Brand Name</label>
                  <input 
                    type="text" 
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    placeholder="e.g. Acme Studios, Personal Brand, etc."
                    className="w-full bg-white border border-[#e5e5e5] p-4 text-sm font-sans focus:outline-none focus:border-black transition-colors"
                  />
                </div>

                <div>
                  <label className="block font-mono text-[9px] uppercase tracking-widest text-[#777] mb-2">What is the vibe or current state? (Be honest)</label>
                  <textarea 
                    value={vibeDescription}
                    onChange={(e) => setVibeDescription(e.target.value)}
                    placeholder="I want it to feel expensive but undone. We sell objects, our audience is creative directors but right now it looks too corporate..."
                    className="w-full h-32 bg-white border border-[#e5e5e5] p-4 text-sm font-sans resize-none focus:outline-none focus:border-black transition-colors"
                  />
                </div>

                <div>
                  <label className="block font-mono text-[9px] uppercase tracking-widest text-[#777] mb-3">Report Format / Citation Style</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {REPORT_FORMAT_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setReportFormat(opt.value)}
                        className={`p-3 text-left border transition-colors ${reportFormat === opt.value ? 'bg-black text-white border-black' : 'bg-white border-[#e5e5e5] hover:border-black'}`}
                      >
                        <span className="block font-mono text-[9px] uppercase tracking-widest font-bold mb-1">{opt.label}</span>
                        <span className={`block font-sans text-[9px] leading-tight ${reportFormat === opt.value ? 'text-white/70' : 'text-[#888]'}`}>{opt.note}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-mono text-[9px] uppercase tracking-widest text-[#777] mb-4">Upload Fragments & References</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                     <label className="p-8 border border-dashed border-[#d5d5d5] hover:bg-[#f5f5f5] transition-colors cursor-pointer group flex flex-col items-center justify-center gap-3 text-center bg-white cursor-pointer relative">
                      <ImageIcon size={20} className="text-[#a0a0a0] group-hover:text-black transition-colors" />
                      <span className="font-mono text-[9px] uppercase tracking-widest text-black">Upload Fragments</span>
                      <span className="font-sans text-[10px] text-[#777]">Images or Textures</span>
                      <input type="file" multiple accept="image/*" onChange={handleFileUpload} className="hidden" />
                    </label>

                    <label className="p-8 border border-dashed border-[#d5d5d5] hover:bg-[#f5f5f5] transition-colors cursor-pointer group flex flex-col items-center justify-center gap-3 text-center bg-white">
                      <Globe size={20} className="text-[#a0a0a0] group-hover:text-black transition-colors" />
                      <span className="font-mono text-[9px] uppercase tracking-widest text-black">Add Link</span>
                      <span className="font-sans text-[10px] text-[#777]">Social or Site URL</span>
                    </label>
                  </div>
                  
                  {uploadedImages.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto py-2">
                      {uploadedImages.map((src, i) => (
                        <div key={i} className="w-16 h-16 shrink-0 border border-[#e5e5e5] overflow-hidden bg-[#f0f0f0]">
                          <img src={src} alt="fragment" className="w-full h-full object-cover grayscale opacity-80 mix-blend-multiply" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              <div className="pt-8 border-t border-[#eee]">
                <button 
                  onClick={handleSimulateIntake}
                  disabled={!brandName.trim()}
                  className="w-full sm:w-auto bg-black text-white px-8 py-4 font-mono text-[10px] uppercase tracking-widest hover:bg-[#333] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                  <Sparkles size={14} /> Synthesize Strategy
                </button>
              </div>
            </motion.div>
          )}

          {step === 'analyzing' && (
            <motion.div 
              key="analyzing"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="py-32 flex flex-col items-center justify-center space-y-8 text-center"
            >
              <Activity size={32} className="animate-spin text-[#888]" />
              <div className="space-y-3 font-mono text-[10px] uppercase tracking-widest text-[#555]">
                <p className="animate-pulse">Loading Taste Embeddings...</p>
                <p className="opacity-50">Cross-referencing aesthetic clusters...</p>
                <p className="opacity-30">Generating strategic output...</p>
              </div>
            </motion.div>
          )}

          {step === 'report' && (
            <motion.div 
              key="report"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="space-y-16"
            >
              <div className="flex justify-between items-end border-b border-black/10 pb-6">
                <div>
                  <div className="font-mono text-[9px] uppercase tracking-widest text-[#777] mb-2 flex items-center gap-3">
                    <CheckCircle size={12} className="text-[#a8b79f]" />
                    Intelligence Report
                    <span className="px-2 py-0.5 bg-black text-white text-[8px] tracking-widest uppercase font-bold">
                      {REPORT_FORMAT_OPTIONS.find(o => o.value === reportFormat)?.label ?? 'Editorial'}
                    </span>
                  </div>
                  <h2 className="font-serif italic text-4xl text-black">{brandName}: TasteOS Blueprint</h2>
                </div>
                <button className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-widest text-[#555] hover:text-black transition-colors border border-[#ddd] px-4 py-2 bg-white">
                  <Download size={12} /> Export PDF
                </button>
              </div>

              {/* REPORT SECTIONS */}
              
              {/* 01. Brand Archetype */}
              <section className="space-y-4">
                <h3 className="font-mono text-[10px] uppercase tracking-widest text-[#999] border-b border-[#eee] pb-2">01. Brand Archetype</h3>
                <div className="bg-white border border-[#f0f0f0] p-8 text-[#333] shadow-sm flex items-center gap-6">
                  <div className="text-4xl">{reportData?.archetype_emoji || '🏛️'}</div>
                  <div>
                    <h4 className="font-serif italic text-2xl mb-2">{reportData?.archetype_title || 'The Archival Brutalist'}</h4>
                    <p className="text-sm font-sans text-[#555] leading-relaxed">
                      {reportData?.archetype_description || 'Your brand operates on the tension between cold, hard structure and intimate, decaying history. It is anti-trend by design, acting as an established institution rather than a reactive player.'}
                    </p>
                  </div>
                </div>
              </section>

              {/* 02. Audience Psychographics */}
              <section className="space-y-4">
                <h3 className="font-mono text-[10px] uppercase tracking-widest text-[#999] border-b border-[#eee] pb-2">02. Audience Psychographics</h3>
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="border border-[#e5e5e5] p-6 bg-white shadow-sm">
                    <div className="font-serif text-xl italic mb-2">{reportData?.psychographics?.[0]?.title || 'The Aesthete'}</div>
                    <p className="font-sans text-xs text-[#666] leading-relaxed">
                      {reportData?.psychographics?.[0]?.description || 'Values provenance over logos. They want objects that feel discovered, not marketed. They will pay a premium for a backstory that feels authentic and slightly obscure.'}
                    </p>
                  </div>
                  <div className="border border-[#e5e5e5] p-6 bg-white shadow-sm">
                    <div className="font-serif text-xl italic mb-2">{reportData?.psychographics?.[1]?.title || 'The Curator'}</div>
                    <p className="font-sans text-xs text-[#666] leading-relaxed">
                      {reportData?.psychographics?.[1]?.description || 'Uses your products to signal their own taste level. If your branding is too loud, they won\'t post it. If it is subtle and distinctive, they will champion it quietly.'}
                    </p>
                  </div>
                </div>
              </section>

              {/* 03. Positioning Statement */}
              <section className="space-y-4">
                <h3 className="font-mono text-[10px] uppercase tracking-widest text-[#999] border-b border-[#eee] pb-2">03. Positioning Statement</h3>
                <div className="bg-[#1a1a1a] text-[#ededed] p-8 font-serif italic text-lg leading-relaxed shadow-sm">
                  {reportData?.positioning_statement || `"For those exhausted by algorithmic hyper-color, ${brandName} provides quiet friction—artifacts of undone luxury that demand closer inspection and reject the disposable."`}
                </div>
              </section>

               {/* 04. Visual Language / Custom Brand Kit */}
              <section className="space-y-6">
                <h3 className="font-mono text-[10px] uppercase tracking-widest text-[#999] border-b border-[#eee] pb-2 flex justify-between items-center">
                  <span>04. Visual Language / Brand Kit</span>
                  <span className="text-[#a8b79f] lowercase pr-2">customizable</span>
                </h3>
                
                <div className="bg-[#fcfbf9] border border-[#e5e5e5] p-8 space-y-8 relative shadow-sm">
                  
                  {/* Editable Tokens */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Colors */}
                    <div className="space-y-3">
                      <label className="block font-mono text-[9px] uppercase tracking-widest text-[#555]">Chromatic Scale</label>
                      <div className="flex gap-2 mb-2">
                        {chromaticScale.map((color, i) => (
                           <input 
                             key={i} 
                             type="color" 
                             value={color} 
                             onChange={(e) => {
                               const nw = [...chromaticScale];
                               nw[i] = e.target.value;
                               setChromaticScale(nw);
                             }}
                             className="w-8 h-8 rounded-none border border-[#ccc] p-0 cursor-pointer" 
                           />
                        ))}
                      </div>
                      <input 
                        type="text" 
                        value={chromaticScale.join(', ')} 
                        onChange={(e) => setChromaticScale(e.target.value.split(',').map(s=>s.trim()))}
                        className="w-full bg-white border border-[#ccc] p-2 text-xs font-mono focus-border-black outline-none"
                      />
                    </div>

                    {/* Typography */}
                    <div className="space-y-3">
                      <label className="block font-mono text-[9px] uppercase tracking-widest text-[#555]">Typography</label>
                      <input 
                        type="text" 
                        value={typography} 
                        onChange={(e) => setTypography(e.target.value)}
                        className="w-full bg-white border border-[#ccc] p-2 text-xs font-mono focus:border-black outline-none"
                      />
                      <p className="text-[10px] text-[#777] font-sans">
                        Primary heading & structural mono pairs.
                      </p>
                    </div>

                    {/* Materiality */}
                    <div className="space-y-3">
                      <label className="block font-mono text-[9px] uppercase tracking-widest text-[#555]">Spatial & Materiality</label>
                      <input 
                        type="text" 
                        value={materiality} 
                        onChange={(e) => setMateriality(e.target.value)}
                        className="w-full bg-white border border-[#ccc] p-2 text-xs font-mono focus:border-black outline-none"
                      />
                      <p className="text-[10px] text-[#777] font-sans">
                        Coarse textures, lighting conditions.
                      </p>
                    </div>
                  </div>

                  {/* Scry Writeup */}
                  <div className="border-t border-[#dfdfdf] pt-6 flex flex-col md:flex-row gap-6">
                    <div className="flex-1">
                      <button 
                        onClick={handleScryTokens}
                        className="mb-4 bg-transparent border border-black px-4 py-2 text-[9px] font-mono uppercase tracking-widest hover:bg-black hover:text-white transition-colors"
                      >
                        Scry Aesthetic Tokens
                      </button>
                      {scryWriteup && (
                        <p className="text-xs font-serif italic leading-relaxed text-[#333] border-l-2 border-black pl-4">
                          {scryWriteup}
                        </p>
                      )}
                    </div>
                    
                    {/* Tiny Image Generator */}
                    <div className="w-full md:w-64 space-y-3 bg-white p-4 border border-[#e5e5e5] shadow-sm">
                      <label className="block font-mono text-[9px] uppercase tracking-widest text-[#555]">Brand Asset Generator</label>
                      <textarea 
                        value={genPrompt}
                        onChange={(e) => setGenPrompt(e.target.value)}
                        placeholder={`e.g., A minimalist logo mockup on ${materiality.split(',')[0] || 'stone'}`}
                        className="w-full h-16 bg-[#fafafa] border border-[#eee] p-2 text-[10px] font-mono resize-none focus:border-black outline-none"
                      />
                      <button 
                        onClick={handleGenerateImage}
                        disabled={isGenerating || !genPrompt}
                        className="w-full bg-black text-white py-2 text-[9px] font-mono uppercase tracking-widest hover:bg-[#333] disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isGenerating ? <Loader2 size={12} className="animate-spin" /> : 'Generate Asset'}
                      </button>
                      {generatedImg && (
                        <div className="mt-2 aspect-square border border-[#eee] overflow-hidden">
                          <img src={generatedImg} alt="Brand Asset" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </section>

              {/* 05. Content Pillars */}
              <section className="space-y-4">
                <h3 className="font-mono text-[10px] uppercase tracking-widest text-[#999] border-b border-[#eee] pb-2">05. Content Pillars</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border border-[#eee] bg-white">
                    <h5 className="font-mono text-[9px] uppercase tracking-widest mb-2 font-bold">{reportData?.pillars?.[0]?.title || '1. Material Artifacts'}</h5>
                    <p className="text-xs text-[#666]">{reportData?.pillars?.[0]?.description || 'Extreme close-ups of texture, weave, or raw materials. No logos. Pure tactile signal.'}</p>
                  </div>
                  <div className="p-4 border border-[#eee] bg-white">
                    <h5 className="font-mono text-[9px] uppercase tracking-widest mb-2 font-bold">{reportData?.pillars?.[1]?.title || '2. The Void Space'}</h5>
                    <p className="text-xs text-[#666]">{reportData?.pillars?.[1]?.description || 'Images dominated by negative space. Brutalist architecture, empty rooms, isolation.'}</p>
                  </div>
                  <div className="p-4 border border-[#eee] bg-white">
                    <h5 className="font-mono text-[9px] uppercase tracking-widest mb-2 font-bold">{reportData?.pillars?.[2]?.title || '3. Archival Context'}</h5>
                    <p className="text-xs text-[#666]">{reportData?.pillars?.[2]?.description || 'Reference imagery from specific eras (e.g., 90s minimalism) juxtaposed with current products.'}</p>
                  </div>
                </div>
              </section>

              {/* 06. Caption Style */}
              <section className="space-y-4">
                <h3 className="font-mono text-[10px] uppercase tracking-widest text-[#999] border-b border-[#eee] pb-2">06. Caption Style</h3>
                <div className="bg-[#fcfbf9] p-6 border border-[#e5e5e5]">
                  <p className="text-sm font-sans mb-4">Move away from descriptive "hard sell" captions. Embrace evocative, slightly detached editorial framing.</p>
                  <div className="flex gap-4 items-start">
                    <div className="flex-1 p-4 border border-red-200 bg-red-50 text-xs">
                      <span className="block font-mono text-[9px] text-red-500 uppercase tracking-widest mb-1">Old</span>
                      {reportData?.caption_old || '"Our new luxury vase is perfect for your living room! Shop now at the link in bio 🔥"'}
                    </div>
                    <ArrowRight className="mt-4 text-[#ccc]" />
                    <div className="flex-1 p-4 border border-[#a8b79f] bg-[#f8f9f7] text-xs">
                      <span className="block font-mono text-[9px] text-[#809176] uppercase tracking-widest mb-1">New</span>
                      {reportData?.caption_new || '"Form 02. Extruded concrete, cast in negative space. The friction of silence."'}
                    </div>
                  </div>
                </div>
              </section>

              {/* 07. Prompt Pack */}
              <section className="space-y-4">
                <h3 className="font-mono text-[10px] uppercase tracking-widest text-[#999] border-b border-[#eee] pb-2">07. Prompt Pack</h3>
                <div className="bg-[#111] text-[#00ff41] p-6 font-mono text-xs overflow-x-auto">
                  <p>/* For generating campaign imagery */</p>
                  <p className="mt-2 text-white/90">
                    {reportData?.prompt_pack_campaign || '"Medium format 120mm film photography, harsh directional sunlight, deep shadows, single object isolated in sparse brutalist environment, muted warm neutral palette, slight film grain, editorial fashion lighting --ar 4:3 --v 6.0"'}
                  </p>
                  <p className="mt-4 text-[#888]">/* For generating lifestyle filler */</p>
                  <p className="mt-2 text-white/90">
                    {reportData?.prompt_pack_lifestyle || '"Low light, voyeuristic angle, motion blur, figures in mid-stride wearing structural coats, urban concrete setting at dusk, underexposed, cinematic tension --ar 16:9"'}
                  </p>
                </div>
              </section>
              
              {/* 08. Competitive Adjacency */}
              <section className="space-y-4">
                 <h3 className="font-mono text-[10px] uppercase tracking-widest text-[#999] border-b border-[#eee] pb-2">08. Competitive Adjacency</h3>
                 <div className="bg-white p-6 border border-[#eee] flex flex-wrap gap-4">
                    {reportData?.competitive_adjacency ? (
                      reportData.competitive_adjacency.map((tag: string, idx: number) => (
                        <span key={idx} className="px-3 py-1 border border-black text-xs">{tag}</span>
                      ))
                    ) : (
                      <>
                        <span className="px-3 py-1 border border-black text-xs">Margiela Archive</span>
                        <span className="px-3 py-1 border border-black text-xs">Jil Sander Essentials</span>
                        <span className="px-3 py-1 border border-[#ccc] text-[#888] text-xs">A24 Set Design</span>
                        <span className="px-3 py-1 border border-[#ccc] text-[#888] text-xs">Braun 1960s Design</span>
                      </>
                    )}
                 </div>
              </section>

              {/* 09. Search/AI Visibility */}
              <section className="space-y-4">
                 <h3 className="font-mono text-[10px] uppercase tracking-widest text-[#999] border-b border-[#eee] pb-2">09. Search / AI Visibility Guidelines</h3>
                 <ul className="text-sm space-y-3 font-sans list-disc pl-5 text-[#555]">
                    {reportData?.ai_visibility_guidelines ? (
                      reportData.ai_visibility_guidelines.map((item: string, idx: number) => (
                        <li key={idx}>{item}</li>
                      ))
                    ) : (
                      <>
                        <li>Ensure all site images have alt-text matching the "Visual Language" materiality keywords (e.g., "cast concrete," "archival paper"). LLMs index these heavily.</li>
                        <li>Publish a "Manifesto" page. Agentic search engines prefer indexing brands with definitive POV documents rather than standard "About Us" pages.</li>
                        <li>Use strict semantic HTML architectures. The less JS required to understand your brand identity, the faster an AI constructs your aesthetic vector.</li>
                      </>
                    )}
                 </ul>
              </section>

               {/* 10. Immediate Growth Actions */}
              <section className="space-y-4">
                 <h3 className="font-mono text-[10px] uppercase tracking-widest text-[#999] border-b border-[#eee] pb-2">10. Immediate Growth Actions</h3>
                 <div className="space-y-3">
                    {reportData?.growth_actions ? (
                      reportData.growth_actions.map((item: any, idx: number) => (
                        <div key={idx} className="p-4 bg-white border-l-4 border-black shadow-sm">
                          <strong className="text-sm block mb-1">{item.title}</strong>
                          <p className="text-xs text-[#666]">{item.description}</p>
                        </div>
                      ))
                    ) : (
                      <>
                        <div className="p-4 bg-white border-l-4 border-black shadow-sm">
                          <strong className="text-sm block mb-1">1. Delete or Archive the Middle C</strong>
                          <p className="text-xs text-[#666]">Remove any posts on your grid that use emojis, standard sales copy, or highly saturated lighting. Create a hard aesthetic break.</p>
                        </div>
                        <div className="p-4 bg-white border-l-4 border-black shadow-sm">
                          <strong className="text-sm block mb-1">2. Launch a "Signal" Series</strong>
                          <p className="text-xs text-[#666]">Post 3 visual fragments (just textures or moods) with zero context before your next product drop. Train your audience to look closer.</p>
                        </div>
                        <div className="p-4 bg-white border-l-4 border-black shadow-sm">
                          <strong className="text-sm block mb-1">3. The Typographic Audit</strong>
                          <p className="text-xs text-[#666]">Update your website to entirely strip away secondary brand colors. Rely entirely on typography weight and negative space for hierarchy.</p>
                        </div>
                      </>
                    )}
                 </div>
              </section>

              <div className="pt-12 border-t border-[#eee] text-center flex flex-col sm:flex-row gap-3 justify-center">
                <button 
                  onClick={handleSendToTailor}
                  disabled={savingToTailor}
                  className="bg-black text-white px-8 py-4 font-mono text-[10px] uppercase tracking-widest hover:bg-[#333] transition-colors disabled:opacity-50"
                >
                  {savingToTailor ? 'Sending…' : 'Send to Tailor'}
                </button>
                <button 
                  onClick={() => alert("Report saved to Aesthetic Memory.")}
                  className="border border-black text-black px-8 py-4 font-mono text-[10px] uppercase tracking-widest hover:bg-black/5 transition-colors"
                >
                  Save to Taste Graph
                </button>
              </div>

            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
};





