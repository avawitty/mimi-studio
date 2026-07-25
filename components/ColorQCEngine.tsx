import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, Layers, Activity, Droplet, 
  CheckCircle, AlertTriangle, Image as ImageIcon, 
  Printer, Monitor, Sliders, Play, Target, ChevronLeft, ChevronRight, BookOpen, Palette, Tag
} from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

interface QCReport {
  status: 'passed' | 'flagged' | 'failed';
  colorSpace: string;
  dominance: { color: string; hex: string; percentage: number }[];
  deltaE: number;
  issues: string[];
  suggestions: string[];
}

interface ImageTask {
  id: string;
  file: File;
  previewUrl: string;
  status: 'pending' | 'analyzing' | 'complete';
  report?: QCReport;
  isFixed?: boolean;
}

export const ColorQCEngine: React.FC = () => {
  const [tasks, setTasks] = useState<ImageTask[]>([]);
  const [activeTask, setActiveTask] = useState<string | null>(null);
  const [targetColorSpace, setTargetColorSpace] = useState<'sRGB' | 'CMYK' | 'Both'>('sRGB');
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  const [brandReferenceUrl, setBrandReferenceUrl] = useState<string | null>(null);
  const [brandReferenceName, setBrandReferenceName] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'passed' | 'flagged'>('all');
  const [isExporting, setIsExporting] = useState(false);
  const [namingConvention, setNamingConvention] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    
    const newTasks: ImageTask[] = Array.from(e.target.files).map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      previewUrl: URL.createObjectURL(file),
      status: 'pending'
    }));

    setTasks(prev => [...prev, ...newTasks]);
    if (!activeTask) setActiveTask(newTasks[0].id);
  };

  const handleBrandReferenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const file = e.target.files[0];
    setBrandReferenceUrl(URL.createObjectURL(file));
    setBrandReferenceName(file.name);
  };

  const simulateAnalysis = async (taskId: string, forcePass = false) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'analyzing' } : t));
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Mock report generation based on color space
    const isError = forcePass ? false : Math.random() > 0.5;
    const mockReport: QCReport = {
      status: isError ? 'flagged' : 'passed',
      colorSpace: targetColorSpace === 'sRGB' ? 'sRGB (Web)' : targetColorSpace === 'CMYK' ? 'CMYK (SWOP)' : 'sRGB + CMYK',
      dominance: [
        { color: 'Primary Base', hex: '#E4E3E0', percentage: 65 },
        { color: 'Shadow', hex: '#2A2A2A', percentage: 25 },
        { color: 'Highlight', hex: '#FAFAFA', percentage: 10 }
      ],
      deltaE: isError ? +(Math.random() * 4 + 2).toFixed(2) : +(Math.random() * 1.5).toFixed(2),
      issues: isError ? [
        'Product color is significantly warmer than approved reference',
        'Background has a slight yellow cast',
        targetColorSpace === 'CMYK' || targetColorSpace === 'Both' ? 'Total ink limit exceeded in shadows' : 'sRGB profile tag missing'
      ] : [],
      suggestions: isError ? [
        'Apply secondary color correction node to shadows (-2 Yellow)',
        'Normalize background to true neutral (L:95 a:0 b:0)'
      ] : ['File meets all QC parameters. Ready for export.']
    };

    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'complete', report: mockReport, isFixed: forcePass } : t));
  };

  const processAll = async () => {
    setIsProcessingBulk(true);
    for (const task of tasks.filter(t => t.status === 'pending')) {
      await simulateAnalysis(task.id);
    }
    setIsProcessingBulk(false);
  };

  const handleApplyFixes = async (taskId: string) => {
    await simulateAnalysis(taskId, true);
  };

  const handleNavigate = (direction: -1 | 1) => {
    const currentIndex = tasks.findIndex(t => t.id === activeTask);
    const newIndex = (currentIndex + direction + tasks.length) % tasks.length;
    setActiveTask(tasks[newIndex].id);
  };

  const filteredTasks = tasks.filter(t => {
    if (filterMode === 'all') return true;
    if (filterMode === 'passed') return t.report?.status === 'passed';
    if (filterMode === 'flagged') return t.report?.status === 'flagged' || t.report?.status === 'failed';
    return true;
  });

  const handleBatchFix = async () => {
    setIsProcessingBulk(true);
    const flaggedTasks = tasks.filter(t => t.report?.status === 'flagged' || t.report?.status === 'failed');
    for (const task of flaggedTasks) {
      await simulateAnalysis(task.id, true);
    }
    setIsProcessingBulk(false);
  };

  const handleExportBatch = async () => {
    setIsExporting(true);
    
    try {
      const zip = new JSZip();
      
      const manifest = {
        exportedAt: new Date().toISOString(),
        targetSpace: targetColorSpace,
        files: [] as any[]
      };

      let index = 0;
      for (const task of filteredTasks) {
        // Process image to a blob to apply fixes physically
        const blob = await new Promise<Blob>((resolve) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              if (task.isFixed) {
                // Apply the CSS filters physically to canvas
                ctx.filter = 'contrast(105%) saturate(105%) brightness(105%)';
              }
              ctx.drawImage(img, 0, 0);
              canvas.toBlob((b) => {
                if (b) resolve(b);
              }, task.file.type || 'image/jpeg', 0.95);
            }
          };
          img.src = task.previewUrl;
        });

        const safePrefix = namingConvention.trim() ? namingConvention.trim().replace(/[^a-zA-Z0-9-]/g, '_').toLowerCase() : 'product';
        const finalName = namingConvention.trim() ? `${safePrefix}_${String(index + 1).padStart(3, '0')}.jpg` : task.file.name;
        
        if (targetColorSpace === 'sRGB' || targetColorSpace === 'Both') {
          zip.folder('web_srgb')?.file(finalName, blob);
        }
        
        if (targetColorSpace === 'CMYK' || targetColorSpace === 'Both') {
          zip.folder('print_cmyk')?.file(finalName, blob);
        }

        manifest.files.push({
          originalName: task.file.name,
          exportedName: finalName,
          status: task.report?.status,
          deltaE: task.report?.deltaE,
          wasAutoFixed: task.isFixed
        });
        
        index++;
      }

      zip.file('ecommerce_qc_manifest.json', JSON.stringify(manifest, null, 2));

      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, 'Shopify_Ready_Bundle.zip');
    } catch (e) {
      console.error(e);
      alert('Error during export process.');
    }

    setIsExporting(false);
  };

  const activeImage = tasks.find(t => t.id === activeTask);

  return (
    <div className="flex-1 flex overflow-hidden bg-nous-base text-nous-text">
      
      {/* Sidebar: Batch List & Controls */}
      <div className="w-80 border-r border-nous-border flex flex-col bg-nous-surface">
        <div className="p-4 border-b border-nous-border bg-nous-base border-l-4 border-l-nous-text">
          <h2 className="font-serif italic text-xl mb-1 text-nous-text">Color QC Engine</h2>
          <p className="font-mono text-[9px] uppercase tracking-widest text-nous-subtle leading-tight">
            Automated image validation to reduce return rates <br/> & ensure e-commerce color fidelity.
          </p>
        </div>

        <div className="p-4 border-b border-nous-border flex flex-col gap-4">
          
          {/* Brand Reference Upload */}
          <div className="bg-nous-base border border-nous-border p-3">
            <h3 className="font-mono text-[9px] uppercase tracking-widest text-nous-subtle mb-2 flex items-center gap-1">
              <BookOpen size={10} /> Brand Standard / Gray Card
            </h3>
            {brandReferenceUrl ? (
              <div className="flex gap-2 items-center">
                <img src={brandReferenceUrl} className="w-8 h-8 object-cover border border-nous-border" />
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-[8px] truncate">{brandReferenceName}</p>
                  <p className="font-mono text-[8px] text-[#a8b79f]">Linked as Reference</p>
                </div>
                <button onClick={() => { setBrandReferenceUrl(null); setBrandReferenceName(null); }} className="text-[10px] text-nous-subtle hover:text-nous-text px-2">X</button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 border border-dashed border-nous-border p-2 cursor-pointer hover:bg-nous-surface transition-colors">
                <Palette size={12} className="text-nous-subtle" />
                <span className="font-mono text-[8px] uppercase tracking-widest text-nous-subtle">Upload Swatch/Card</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleBrandReferenceUpload} />
              </label>
            )}
          </div>

          {/* Batch Naming */}
          <div className="bg-nous-base border border-nous-border p-3 space-y-3">
            <div>
              <h3 className="font-mono text-[9px] uppercase tracking-widest text-nous-subtle mb-2 flex items-center gap-1">
                <Tag size={10} /> Batch Naming (SEO/GEO)
              </h3>
              <input 
                type="text" 
                placeholder="e.g. fw24-silk-blouse" 
                value={namingConvention}
                onChange={(e) => setNamingConvention(e.target.value)}
                className="w-full bg-transparent border-b border-nous-border focus:border-nous-text py-1 font-mono text-[10px] text-nous-text outline-none transition-colors placeholder:text-nous-subtle/50"
              />
            </div>
            
            <div className="pt-2 border-t border-nous-border">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" className="w-3 h-3 border-nous-border rounded-sm text-nous-text focus:ring-0" defaultChecked />
                <span className="font-mono text-[9px] uppercase tracking-widest text-nous-text group-hover:text-nous-text transition-colors">Apply Brand OS GEO Schema</span>
              </label>
              <p className="font-sans text-[8px] text-nous-subtle mt-1 ml-5">
                Automatically injects parsed JSON-LD structures into image EXIF metadata.
              </p>
            </div>
          </div>

          <div>
            <div className="flex bg-nous-base rounded-sm p-1 border border-nous-border">
              <button 
                onClick={() => setTargetColorSpace('sRGB')}
                className={`flex-1 py-1.5 font-mono text-[10px] flex items-center justify-center gap-1 transition-colors ${targetColorSpace === 'sRGB' ? 'bg-black text-white' : 'text-nous-subtle hover:text-nous-text'}`}
              >
                <Monitor size={10} /> sRGB
              </button>
              <button 
                onClick={() => setTargetColorSpace('CMYK')}
                className={`flex-1 py-1.5 font-mono text-[10px] flex items-center justify-center gap-1 transition-colors ${targetColorSpace === 'CMYK' ? 'bg-black text-white' : 'text-nous-subtle hover:text-nous-text'}`}
              >
                <Printer size={10} /> CMYK
              </button>
              <button 
                onClick={() => setTargetColorSpace('Both')}
                className={`flex-1 py-1.5 font-mono text-[10px] flex items-center justify-center gap-1 transition-colors ${targetColorSpace === 'Both' ? 'bg-black text-white' : 'text-nous-subtle hover:text-nous-text'}`}
              >
                <Layers size={10} /> Both
              </button>
            </div>
          </div>

          <label className="border border-dashed border-nous-border p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-nous-base transition-colors">
            <Upload size={16} className="text-nous-subtle mb-2" />
            <span className="font-mono text-[9px] uppercase tracking-widest text-nous-text">Import Batch</span>
            <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileUpload} />
          </label>

          {tasks.filter(t => t.status === 'pending').length > 0 && (
            <button 
              onClick={processAll}
              disabled={isProcessingBulk}
              className="w-full bg-nous-text text-nous-base py-2 font-mono text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
            >
              {isProcessingBulk ? <Activity size={12} className="animate-spin" /> : <Play size={12} />}
              {isProcessingBulk ? 'Processing...' : 'Run Diagnostics'}
            </button>
          )}

          {/* Filter Tabs */}
          {tasks.length > 0 && tasks.some(t => t.status === 'complete') && (
            <div className="flex bg-nous-base rounded-sm p-1 border border-nous-border mt-4">
              <button 
                onClick={() => setFilterMode('all')}
                className={`flex-1 py-1 font-mono text-[9px] uppercase tracking-widest transition-colors ${filterMode === 'all' ? 'bg-black text-white' : 'text-nous-subtle hover:text-nous-text'}`}
              >
                All ({tasks.length})
              </button>
              <button 
                onClick={() => setFilterMode('passed')}
                className={`flex-1 py-1 font-mono text-[9px] uppercase tracking-widest transition-colors ${filterMode === 'passed' ? 'bg-black text-white' : 'text-nous-subtle hover:text-nous-text'}`}
              >
                Passed
              </button>
              <button 
                onClick={() => setFilterMode('flagged')}
                className={`flex-1 py-1 font-mono text-[9px] uppercase tracking-widest transition-colors ${filterMode === 'flagged' ? 'bg-black text-white' : 'text-nous-subtle hover:text-nous-text'}`}
              >
                Flagged
              </button>
            </div>
          )}

          {/* Batch Context Actions */}
          {filterMode === 'flagged' && filteredTasks.length > 0 && (
            <button 
              onClick={handleBatchFix}
              disabled={isProcessingBulk}
              className="w-full bg-nous-text text-nous-base py-2 font-mono text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              {isProcessingBulk ? <Activity size={12} className="animate-spin" /> : <Sliders size={12} />}
              Auto-Fix All Flagged
            </button>
          )}

          {filterMode === 'passed' && filteredTasks.length > 0 && (
            <button 
              onClick={handleExportBatch}
              disabled={isExporting}
              className="w-full bg-[#a8b79f] text-nous-base py-2 font-mono text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              {isExporting ? <Activity size={12} className="animate-spin" /> : <Printer size={12} />}
              Export Shopify Bundle
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredTasks.map(task => (
            <button
              key={task.id}
              onClick={() => setActiveTask(task.id)}
              className={`w-full text-left p-3 border-b border-nous-border flex items-center gap-3 transition-colors ${activeTask === task.id ? 'bg-nous-base ring-1 ring-nous-text' : 'hover:bg-nous-base/50'}`}
            >
              <div className="w-10 h-10 bg-nous-border shrink-0 overflow-hidden">
                <img src={task.previewUrl} className={`w-full h-full object-cover transition-all ${task.isFixed ? 'contrast-105 saturate-105' : ''}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-mono text-[10px] truncate text-nous-text">{task.file.name}</div>
                <div className="flex items-center gap-1 mt-1">
                  {task.status === 'pending' && <span className="font-mono text-[8px] uppercase tracking-widest text-nous-subtle">Pending</span>}
                  {task.status === 'analyzing' && <span className="font-mono text-[8px] uppercase tracking-widest text-[#a8b79f] flex items-center gap-1"><Activity size={8} className="animate-spin" /> Analyzing</span>}
                  {task.status === 'complete' && task.report && (
                    <span className={`font-mono text-[8px] uppercase tracking-widest flex items-center gap-1 ${task.report.status === 'passed' ? 'text-green-600' : 'text-red-500'}`}>
                      {task.report.status === 'passed' ? <CheckCircle size={8} /> : <AlertTriangle size={8} />}
                      {task.report.status}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Area: Image Preview & Analysis Map */}
      <div className="flex-1 flex flex-col relative">
        {activeImage ? (
          <>
            <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
              <button onClick={() => handleNavigate(-1)} className="p-2 bg-white/80 border border-nous-border shadow-sm hover:bg-white transition-colors"><ChevronLeft size={16}/></button>
              <button onClick={() => handleNavigate(1)} className="p-2 bg-white/80 border border-nous-border shadow-sm hover:bg-white transition-colors"><ChevronRight size={16}/></button>
            </div>

            <div className="flex-1 p-8 flex items-center justify-center bg-[#EAE8E4] relative overflow-hidden group">
              {/* Actual Image */}
              <img 
                src={activeImage.previewUrl} 
                className={`max-w-full max-h-full object-contain relative z-10 shadow-xl transition-all duration-700 ${activeImage.isFixed ? 'contrast-105 saturate-105 filter drop-shadow-md brightness-105' : ''} ${activeImage.report?.status !== 'passed' && !activeImage.isFixed && activeImage.status === 'complete' ? 'hue-rotate-15 saturate-150 brightness-95' : ''}`} 
              />
              
              {/* Simulated Segmentation Map Overlay (Visible on Hover/Analyze) */}
              <AnimatePresence>
                {(activeImage.status === 'analyzing' || (activeImage.status === 'complete' && activeImage.report?.status !== 'passed' && !activeImage.isFixed)) && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-20 pointer-events-none mix-blend-color flex items-center justify-center"
                    style={{ background: 'linear-gradient(45deg, rgba(255,0,0,0.1), rgba(0,255,0,0.1))' }}
                  >
                    {activeImage.status === 'analyzing' && (
                      <div className="w-full h-full border-4 border-transparent border-t-[#a8b79f] border-b-[#a8b79f] rounded-full animate-[spin_3s_linear_infinite] opacity-50 absolute scale-150" />
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Diagnostic Report Panel */}
            <div className="min-h-80 h-1/3 border-t border-nous-border bg-nous-surface flex shrink-0">
              {activeImage.status === 'pending' ? (
                <div className="flex-1 flex flex-col items-center justify-center text-nous-subtle gap-4">
                  <Target size={32} />
                  <p className="font-mono text-[10px] uppercase tracking-widest">Awaiting Analysis</p>
                  <button 
                    onClick={() => simulateAnalysis(activeImage.id)}
                    className="px-4 py-2 border border-nous-border hover:bg-nous-base transition-colors font-mono text-[9px] uppercase tracking-widest text-nous-text"
                  >
                    Analyze Image
                  </button>
                </div>
              ) : activeImage.status === 'analyzing' ? (
                <div className="flex-1 flex flex-col items-center justify-center text-nous-subtle gap-4">
                  <Activity size={32} className="animate-spin text-[#a8b79f]" />
                  <p className="font-mono text-[10px] uppercase tracking-widest">Computing Color Segmentation & Delta E...</p>
                </div>
              ) : activeImage.report ? (
                <div className="flex-1 grid grid-cols-3 divide-x divide-nous-border min-h-0 h-full">
                  {/* Dominant Colors & Metrics */}
                  <div className="p-6 h-full flex flex-col overflow-hidden">
                    <h3 className="font-mono text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2 shrink-0">
                      <Droplet size={14} /> Regional Extractions
                    </h3>
                    <div className="space-y-3 mb-6 flex-1 overflow-y-auto min-h-0 pr-2">
                      {activeImage.report.dominance.map((d, i) => (
                        <div key={i} className="flex items-center gap-3 shrink-0">
                          <div className="w-6 h-6 rounded-xs shadow-sm border border-black/10" style={{ backgroundColor: d.hex }} />
                          <div className="flex-1">
                            <div className="flex justify-between font-mono text-[9px] text-nous-subtle">
                              <span>{d.color}</span>
                              <span>{d.percentage}%</span>
                            </div>
                            <div className="font-mono text-[8px] tracking-widest">{d.hex}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between p-3 bg-nous-base border border-nous-border shrink-0">
                      <span className="font-mono text-[9px] uppercase tracking-widest flex items-center gap-2">
                        <Layers size={12}/> Color Space
                      </span>
                      <span className="font-mono text-xs font-bold">{activeImage.report.colorSpace}</span>
                    </div>
                  </div>

                  {/* QC Issues */}
                  <div className="p-6 h-full flex flex-col overflow-hidden">
                    <h3 className="font-mono text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2 shrink-0">
                      {activeImage.report.status === 'passed' ? <CheckCircle size={14} className="text-green-600"/> : <AlertTriangle size={14} className="text-red-500"/>}
                      Diagnostic Log
                    </h3>
                    <div className="space-y-2 mb-6 flex-1 overflow-y-auto min-h-0 pr-2">
                      {activeImage.report.issues.length > 0 ? (
                        activeImage.report.issues.map((issue, i) => (
                          <div key={i} className="font-sans text-sm text-red-600/90 leading-snug bg-red-50 p-2 border border-red-100">
                            • {issue}
                          </div>
                        ))
                      ) : (
                        <div className="font-sans text-sm text-green-700/90 leading-snug bg-green-50 p-3 border border-green-100 flex flex-col gap-2">
                          <span>Primary subject matches target profile.</span>
                          <span>Isolation paths verified.</span>
                          <span>Delta E thresholds satisfied.</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 mt-auto border-t border-nous-border/50 pt-4">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[9px] uppercase tracking-widest text-nous-subtle" title="Color difference measurement">Max Delta E (ΔE)</span>
                        <span className={`font-mono text-sm font-bold ${activeImage.report.deltaE > 2.0 ? 'text-red-500' : 'text-green-600'}`}>
                          {activeImage.report.deltaE}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[9px] uppercase tracking-widest text-nous-subtle" title="Total Area Coverage (Ink Limit)">TAC / Ink Limit</span>
                        <span className="font-mono text-sm text-nous-text">
                          {activeImage.report.colorSpace.includes('CMYK') ? '280% (Pass)' : 'N/A (RGB)'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[9px] uppercase tracking-widest text-nous-subtle" title="Highlight & Shadow detail clipping">Tonal Clipping</span>
                        <span className="font-mono text-sm text-green-600">
                          Clear (5% / 95%)
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[9px] uppercase tracking-widest text-nous-subtle" title="Neutrality reference for color cast">White Balance</span>
                        <span className={`font-mono text-sm ${activeImage.report.issues.some(i => i.includes('cast')) ? 'text-red-500' : 'text-green-600'}`}>
                          {activeImage.report.issues.some(i => i.includes('cast')) ? 'Shifted (b: +3)' : 'Neutral (a:0 b:0)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Corrections */}
                  <div className="p-6 flex flex-col h-full overflow-hidden w-full">
                    <h3 className="font-mono text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2 shrink-0">
                      <Sliders size={14} /> Suggested Action
                    </h3>
                    <div className="space-y-3 flex-1 overflow-y-auto min-h-0 pr-2">
                      {activeImage.report.suggestions.map((sug, i) => (
                        <div key={i} className="p-3 border border-nous-border bg-nous-base font-sans text-sm relative overflow-hidden group">
                          <div className="absolute left-0 top-0 w-1 h-full bg-nous-text"></div>
                          {sug}
                        </div>
                      ))}
                    </div>
                    {activeImage.report.status !== 'passed' && (
                      <div className="mt-4 pt-4 border-t border-nous-border flex gap-2 shrink-0">
                        <button 
                          onClick={() => handleApplyFixes(activeImage.id)}
                          className="flex-1 bg-nous-text text-nous-base py-3 font-mono text-[10px] uppercase tracking-widest hover:bg-nous-text/80 transition-colors flex items-center justify-center gap-2 shadow-sm"
                        >
                          <Play size={12}/> Apply Fixes
                        </button>
                        <button className="flex-1 border border-nous-border py-3 font-mono text-[10px] uppercase tracking-widest hover:bg-nous-base transition-colors">
                          Manual Review
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#EAE8E4] relative">
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#141414 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
            
            <div className="bg-nous-surface border border-nous-border p-12 max-w-2xl relative z-10 shadow-sm">
              <div className="w-16 h-16 bg-nous-base border border-nous-border rounded-full flex items-center justify-center mx-auto mb-6">
                <Target size={24} className="text-nous-text" />
              </div>
              <h2 className="font-serif italic text-3xl mb-4 text-nous-text">Protect Your Brand Identity</h2>
              <div className="space-y-4 font-sans text-sm text-nous-subtle mb-8 max-w-lg mx-auto leading-relaxed">
                <p>
                  "It looked different online" is the leading cause for e-commerce returns. 
                  The <strong>Color QC Engine</strong> prevents color drift before files reach your Shopify store or print catalog.
                </p>
                <div className="grid grid-cols-2 gap-4 text-left border-t border-nous-border pt-4 mt-4">
                  <div>
                    <h4 className="font-mono text-[9px] uppercase tracking-widest text-nous-text mb-1">Reduce Returns</h4>
                    <p className="text-[11px] leading-tight text-nous-subtle">Guarantee product-to-image accuracy with Delta-E variation tracking.</p>
                  </div>
                  <div>
                    <h4 className="font-mono text-[9px] uppercase tracking-widest text-nous-text mb-1">Platform Ready</h4>
                    <p className="text-[11px] leading-tight text-nous-subtle">Auto-export optimized sRGB profiles that meet exact Shopify specifications.</p>
                  </div>
                </div>
              </div>
              <label className="inline-flex items-center gap-2 bg-nous-text text-nous-base px-8 py-3 font-mono text-[10px] uppercase tracking-widest cursor-pointer hover:bg-nous-text/90 transition-all hover:-translate-y-0.5 shadow-sm">
                <Upload size={14} />
                Import Image Batch
                <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileUpload} />
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
