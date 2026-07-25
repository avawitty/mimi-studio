
// @ts-nocheck
import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, Share2, FileText, LayoutGrid, Layers, Printer, Check, Copy, Shield, Info, Palette, Maximize2, Smartphone, Square, ArrowDown, ChevronDown, CheckCircle2, Terminal, Stamp, Loader2, Zap, Monitor, Scroll, Image, ShoppingBag, Upload } from 'lucide-react';
import { ZineMetadata } from '../types';
import { SocialShareModal } from './SocialShareModal';
import { ZineSyndicationBridge } from './ZineSyndicationBridge';
import {
  buildShopifyProductFromZine,
  downloadShopifyProductPack,
  fetchShopifyConnectionStatus,
  publishProductToShopify,
  type ShopifyConnectionStatus,
} from '../services/shopifyExportService';
import {
  buildExportManifest,
  validateExportManifest,
} from '../services/exportManifestService';
import { generateShopifyEmbedCode } from '../services/shopifyEmbed';
import { resolveZineExportCoverUrl } from '../lib/studioCoverExport';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';

interface ExportChamberProps {
 metadata: ZineMetadata;
 onClose: () => void;
}

const SECTION_DEFS = [
 { id: 'cover', label: 'Invocation', icon: <Shield size={14} /> },
 { id: 'reading', label: 'The Reading', icon: <FileText size={14} /> },
 { id: 'signals', label: 'Archetype', icon: <Layers size={14} /> },
 { id: 'plates', label: 'Plates', icon: <LayoutGrid size={14} /> },
 { id: 'roadmap', label: 'Roadmap', icon: <Terminal size={14} /> },
 { id: 'debris', label: 'Field Debris', icon: <Info size={14} /> }
];

const EXPORT_MODES = [
 { id: 'pdf', label: 'EXPORT AS FLATTENED PDF', desc: 'Standard architectural layout calibrated for physical ink manifestation and archival binding.', icon: <Printer size={16} /> },
 { id: 'assets', label: 'EXTRACT RAW VISUAL ASSETS (.ZIP)', desc: 'Separated high-fidelity cards. Designed for individual saving or social carousel processing.', icon: <Image size={16} /> },
 { id: 'shopify', label: 'SHOPIFY PRODUCT PACK (.ZIP)', desc: 'Product CSV, JSON-LD schema, and theme embed for Shopify Admin import or SEO apps.', icon: <ShoppingBag size={16} /> }
];

const SectionHeader: React.FC<{ label: string; icon: any }> = ({ label, icon: Icon }) => (
 <div className="flex items-center gap-4 mb-8 opacity-50">
 <div className="p-2 bg-nous-base rounded-none text-nous-text ">
 {React.cloneElement(Icon as React.ReactElement, { size: 12 })}
 </div>
 <span className="font-sans text-[8px] uppercase tracking-[0.4em] font-black text-nous-subtle">{label}</span>
 <div className="h-px flex-1 bg-nous-base"/>
 </div>
);

export const ExportChamber: React.FC<ExportChamberProps> = ({ metadata, onClose }) => {
 const [exportMode, setExportMode] = useState<'scroll' | 'assets' | 'pdf' | 'shopify'>('scroll');
 const [shopifyPrice, setShopifyPrice] = useState('0.00');
 const [shopifyPublishState, setShopifyPublishState] = useState<'idle' | 'publishing' | 'done' | 'error'>('idle');
 const [shopifyConnection, setShopifyConnection] = useState<ShopifyConnectionStatus | null>(null);
 const [selectedSections, setSelectedSections] = useState<Set<string>>(new Set(SECTION_DEFS.map(s => s.id)));
 const [isGenerating, setIsGenerating] = useState(false);
  const [progressMessage, setProgressMessage] = useState("Compressing Semiotic Layers...");
  const [isEmbedCopied, setIsEmbedCopied] = useState(false);

  useEffect(() => {
    if (!isGenerating) return;
    const messages = [
      "Compressing Semiotic Layers...",
      "Embedding Font Vectors...",
      "Finalizing Archival Bindings...",
      "Aligning Tactical Spacing Guidelines. Let there be light..."
    ];
    let curr = 0;
    setProgressMessage(messages[0]);
    const handle = setInterval(() => {
      curr = (curr + 1) % messages.length;
      setProgressMessage(messages[curr]);
    }, 2000);
    return () => clearInterval(handle);
  }, [isGenerating]);

 useEffect(() => {
   let active = true;
   void fetchShopifyConnectionStatus()
     .then((status) => {
       if (active) setShopifyConnection(status);
     })
     .catch(() => {
       if (active) setShopifyConnection(null);
     });
   return () => {
     active = false;
   };
 }, []);
 const [hasError, setHasError] = useState(false);

 // Fallback to prevent crash if metadata is incomplete
 if (!metadata || !metadata.content) {
 return (
 <div className="fixed inset-0 z-[20000] bg-nous-base text-nous-text flex items-center justify-center p-8">
 <div className="max-w-md text-center space-y-4">
 <p className="font-serif italic text-xl text-red-400">Artifact Structural Failure</p>
 <p className="font-sans text-xs text-nous-subtle">The metadata for this zine is incomplete or corrupted.</p>
 <button onClick={onClose} className="px-6 py-2 bg-nous-text text-nous-base rounded-none font-sans text-xs font-black">Close</button>
 </div>
 </div>
 );
 }

 const toggleSection = (id: string) => {
 setSelectedSections(prev => {
 const next = new Set(prev);
 if (next.has(id)) next.delete(id);
 else next.add(id);
 return next;
 });
 };

 const handleCopyShopifyEmbed = async () => {
   if (!metadata.isPublic) {
     window.dispatchEvent(new CustomEvent('mimi:registry_alert', {
       detail: {
         message: "Publish this zine before embedding it in Shopify.",
         type: "warning",
       },
     }));
     return;
   }

   try {
     const embedCode = generateShopifyEmbedCode({
       zineId: metadata.id,
       title: metadata.title || "Mimi Editorial Zine",
       baseUrl: window.location.origin,
       aspectRatio: "16/9",
       themeMode: document.documentElement.classList.contains("dark") ? "dark" : "light",
     });
     await navigator.clipboard.writeText(embedCode);
     setIsEmbedCopied(true);
     window.setTimeout(() => setIsEmbedCopied(false), 2400);
     window.dispatchEvent(new CustomEvent('mimi:registry_alert', {
       detail: {
         message: "Shopify Liquid embed copied.",
         type: "success",
       },
     }));
   } catch (error) {
     console.error("Failed to copy Shopify embed", error);
     window.dispatchEvent(new CustomEvent('mimi:registry_alert', {
       detail: {
         message: "Shopify embed could not be copied.",
         type: "error",
       },
     }));
   }
 };

 const convertImagesToBase64 = async (element: HTMLElement) => {
 const images = Array.from(element.querySelectorAll('img'));
 const promises = images.map(async (img) => {
 if (img.src.startsWith('data:')) return;
 try {
 img.crossOrigin ="anonymous";
 const response = await fetch(img.src, { mode: 'cors', cache: 'force-cache' });
 const blob = await response.blob();
 await new Promise<void>((resolve, reject) => {
 const reader = new FileReader();
 reader.onloadend = () => {
 img.srcset =""; 
 img.src = reader.result as string;
 resolve();
 };
 reader.onerror = reject;
 reader.readAsDataURL(blob);
 });
 } catch (e) {
 console.warn("MIMI // Export: Image conversion failed, fallback to CORS", e);
 }
 });
 await Promise.all(promises);
 };

 const waitForImages = async (element: HTMLElement) => {
 const images = Array.from(element.querySelectorAll('img'));
 const promises = images.map(img => {
 if (img.complete) return Promise.resolve();
 return new Promise(resolve => {
 img.onload = resolve;
 img.onerror = resolve;
 });
 });
 await Promise.all(promises);
 };

 
  const urlToBase64 = async (url: string) => {
      if (url.startsWith('data:')) return url.split(',')[1];
      const res = await fetch(url);
      const blob = await res.blob();
      return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
      });
  };

  const generateAssetsZip = async () => {
    try {
      const zip = new JSZip();
      let imgCount = 0;
      
      const exportCoverUrl = await resolveZineExportCoverUrl(metadata);
      if (exportCoverUrl) {
          const b64 = await urlToBase64(exportCoverUrl);
          zip.file('hero_image.jpg', b64, {base64: true});
          imgCount++;
      }
      
      const hypothesisImg = (metadata.content as any).hypothesis_image_url;
      if (hypothesisImg) {
          const b64 = await urlToBase64(hypothesisImg);
          zip.file('strategic_hypothesis.jpg', b64, {base64: true});
          imgCount++;
      }
      
      if (metadata.content.pages) {
          for (let i = 0; i < metadata.content.pages.length; i++) {
              if (metadata.content.pages[i].image_url) {
                  const b64 = await urlToBase64(metadata.content.pages[i].image_url);
                  zip.file('visual_plate_0' + (i+1) + '.jpg', b64, {base64: true});
                  imgCount++;
              }
          }
      }
      
      if (imgCount === 0) throw new Error("No visual assets found.");

      const manifest = buildExportManifest(metadata);
      zip.file('export-manifest.json', JSON.stringify(manifest, null, 2));
      if (manifest.editorialCompileMarkdown) {
        zip.file('editorial-compile.md', manifest.editorialCompileMarkdown);
      }
      if (metadata.usedContextSnapshots?.length) {
        zip.file('used-context.json', JSON.stringify(metadata.usedContextSnapshots, null, 2));
      }
      
      const zipBlob = await zip.generateAsync({type: "blob"});
      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);
      link.download = "Mimi_" + metadata.title.replace(/[^a-z0-9]/gi, '_') + "_Assets.zip";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch(e) {
      console.error(e);
      throw e;
    }
  };

  const generatePDF = async () => {

 const doc = new jsPDF({
 orientation: 'p',
 unit: 'mm',
 format: 'a4'
 });

 const target = document.getElementById('export-target');
 if (!target) throw new Error("Capture target missing");

 // CRITICAL: Convert to Base64 to bypass CORS in html2canvas
 await convertImagesToBase64(target);
 await waitForImages(target);

 const sections = target.querySelectorAll('.export-section');
 const pageWidth = doc.internal.pageSize.getWidth();
 const pageHeight = doc.internal.pageSize.getHeight();

 for (let i = 0; i < sections.length; i++) {
 const section = sections[i] as HTMLElement;
 
 // Ensure visibility for capture
 const originalStyle = section.style.cssText;
 section.style.width = '793px'; // A4 width at 96 DPI approx
  section.style.margin = '0';
  section.style.boxSizing = 'border-box';
  section.style.overflow = 'hidden';
 section.style.height = '1122px'; // A4 height
 
 const canvas = await html2canvas(section, {
 scale: 2,
 useCORS: true,
 logging: false,
 backgroundColor: '#ffffff'
 });
 
 // Restore style
 section.style.cssText = originalStyle;

 const imgData = canvas.toDataURL('image/jpeg', 0.95);
 if (i > 0) doc.addPage();
 doc.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight);
 }
 
 doc.save(`Mimi_${metadata.title.replace(/[^a-z0-9]/gi, '_')}.pdf`);
 };

 const handleExport = async () => {
 if (isGenerating) return;
 setIsGenerating(true);
 setHasError(false);
 
 // Allow UI to update before processing
 await new Promise(r => setTimeout(r, 500));

 if (exportMode === 'link') {
 try {
 await navigator.clipboard.writeText(window.location.href);
 alert('Encrypted Link copied to clipboard.');
 } catch (err) {
 console.error('Failed to copy link:', err);
 alert('Failed to copy link to clipboard. You can copy the URL from your browser address bar.');
 }
 setIsGenerating(false);
 return;
 }

 try {
 const element = document.getElementById('export-target');
 if (!element) throw new Error("Capture target not found");

 // Robust Image Handling for both modes
 await convertImagesToBase64(element);
 await waitForImages(element);

 if (exportMode === 'pdf') {
        await generatePDF();
    } else if (exportMode === 'assets') {
        await generateAssetsZip();
    } else if (exportMode === 'shopify') {
        const manifest = buildExportManifest(metadata);
        const { ok, failures } = validateExportManifest(manifest);
        if (!ok) {
          window.dispatchEvent(new CustomEvent('mimi:registry_alert', {
            detail: { message: `Export blocked: ${failures.join('; ')}`, type: 'error' }
          }));
          setHasError(true);
          return;
        }
        const product = buildShopifyProductFromZine(metadata, { price: shopifyPrice });
        await downloadShopifyProductPack(product, manifest);
    } else {
 // Scroll Mode (PNG/JPG)
 const canvas = await html2canvas(element, {
 scale: 2,
 useCORS: true,
 backgroundColor: exportMode === 'scroll_jpg' ? '#ffffff' : null, 
 logging: false,
 windowWidth: element.scrollWidth,
 windowHeight: element.scrollHeight
 });

 const link = document.createElement('a');
 const ext = exportMode === 'scroll_jpg' ? 'jpg' : 'png';
 const mime = exportMode === 'scroll_jpg' ? 'image/jpeg' : 'image/png';
 link.download = `Mimi_${metadata.title.replace(/[^a-z0-9]/gi, '_')}_scroll.${ext}`;
 link.href = canvas.toDataURL(mime, exportMode === 'scroll_jpg' ? 0.9 : 1.0);
 document.body.appendChild(link);
 link.click();
 document.body.removeChild(link);
 }
 } catch (e) {
 console.error("Export Failed:", e);
 setHasError(true);
 } finally {
 setIsGenerating(false);
 }
 };

 const content = metadata.content;
 
 // Dynamic styles based on mode
 const containerStyle = useMemo(() => {
 // For PDF/Assets generation, we rely on the specific styling in generatePDF logic and CSS classes
 // But for preview, we keep it contained
 return { width: '100%', maxWidth: '420px' };
 }, [exportMode]);

 const blockClass = useMemo(() => {
 const base ="export-section bg-white flex flex-col justify-center overflow-hidden relative";
 // PDF/Print/Asset Mode: Forced Page Dimensions for reliable canvas capture
    if (exportMode === 'pdf' || exportMode === 'assets') {
      return `${base} w-full aspect-[210/297] p-16 mb-8 border border-nous-border `;
    }
 // Scroll Mode: Continuous Flow
 return `${base} py-16 px-10 border-b border-nous-border last:border-0`;
 }, [exportMode]);

 return (
 <motion.div 
 initial={{ opacity: 0 }} 
 animate={{ opacity: 1 }} 
 exit={{ opacity: 0 }} 
 className="fixed inset-0 z-[20000] bg-nous-base flex flex-col md:flex-row overflow-hidden selection:bg-nous-base0"
 >
 
 {/* CONTROLS SIDEBAR */}
 <aside className="w-full md:w-[400px] border-r border-nous-border bg-white flex flex-col p-8 shrink-0 z-20 overflow-y-auto no-scrollbar">
 <div className="flex justify-between items-center mb-12">
 <div className="space-y-1">
 <span className="font-sans text-[8px] uppercase tracking-[0.5em] font-black text-nous-subtle">Extraction Protocol</span>
 <h2 className="font-serif text-3xl italic tracking-tighter text-nous-text text-nous-text">Extract Artifact.</h2>
 </div>
 <button onClick={onClose} className="p-2 text-nous-subtle hover:text-red-500 transition-all rounded-none hover:bg-nous-base"><X size={20}/></button>
 </div>
 
 <div className="space-y-12">
 <section className="space-y-6">
 <span className="font-sans text-[9px] uppercase tracking-widest font-black text-nous-subtle block border-b border-nous-border pb-2">Format Protocol</span>
 <div className="grid gap-3">
 {EXPORT_MODES.map(m => (
 <button key={m.id} onClick={() => setExportMode(m.id as any)} className={`text-left p-5 rounded-none border transition-all ${exportMode === m.id ? 'bg-nous-base /20 border-nous-border ring-1 ring-stone-500/20' : 'text-nous-subtle border-nous-border hover:bg-nous-base '}`}>
 <div className="flex items-center justify-between mb-2">
 <div className="flex items-center gap-3">
 <div className={exportMode === m.id ? 'text-nous-subtle' : 'text-nous-subtle'}>{m.icon}</div>
 <p className={`font-serif italic text-lg ${exportMode === m.id ? 'text-nous-text text-nous-text' : 'text-nous-subtle'}`}>{m.label}</p>
 </div>
 {exportMode === m.id && <CheckCircle2 size={14} className="text-nous-subtle"/>}
 </div>
 <p className="font-sans text-[9px] text-nous-subtle leading-relaxed uppercase tracking-wide opacity-80 pl-9">{m.desc}</p>
 </button>
 ))}
 </div>
 </section>

 <section className="space-y-3 border border-nous-border p-4 bg-nous-base/40">
   <div className="flex items-center justify-between gap-3">
     <span className="font-sans text-[9px] uppercase tracking-widest font-black text-nous-subtle">Shopify Liquid Embed</span>
     <Terminal size={14} className="text-nous-subtle" />
   </div>
   <p className="font-serif italic text-[11px] leading-relaxed text-nous-subtle">
     Copy a responsive Custom Liquid block for theme embedding. Requires a published public zine URL.
   </p>
   <button
     type="button"
     onClick={handleCopyShopifyEmbed}
     className={`w-full py-3 border font-sans text-[9px] uppercase tracking-widest font-black flex items-center justify-center gap-2 transition-all ${
       isEmbedCopied
         ? 'border-emerald-600/40 text-emerald-700 bg-emerald-50'
         : metadata.isPublic
           ? 'border-nous-border text-nous-text hover:bg-nous-base'
           : 'border-nous-border text-nous-subtle opacity-70'
     }`}
     title={
       metadata.isPublic
         ? "Copy a responsive Shopify Custom Liquid embed"
         : "Publish this zine before embedding it"
     }
   >
     {isEmbedCopied ? <Check size={14} /> : <Copy size={14} />}
     {isEmbedCopied ? 'Embed Copied' : metadata.isPublic ? 'Copy Liquid Embed' : 'Publish to Enable Embed'}
   </button>
 </section>

 {exportMode === 'shopify' && (
   <section className="space-y-3 border border-nous-border p-4 bg-nous-base/40">
     <span className="font-sans text-[9px] uppercase tracking-widest font-black text-nous-subtle block">Shopify Variant Price (USD)</span>
     <input
       type="text"
       value={shopifyPrice}
       onChange={(e) => setShopifyPrice(e.target.value)}
       placeholder="0.00"
       className="w-full border border-nous-border bg-white px-3 py-2 font-mono text-[10px] text-nous-text"
     />
     {shopifyConnection?.configured && (
       <button
         type="button"
         disabled={shopifyPublishState === 'publishing'}
         onClick={async () => {
           setShopifyPublishState('publishing');
           try {
             const product = buildShopifyProductFromZine(metadata, { price: shopifyPrice });
             const result = await publishProductToShopify(product);
             setShopifyPublishState('done');
             window.dispatchEvent(new CustomEvent('mimi:registry_alert', {
               detail: { message: `Draft product created in Shopify (#${result.legacyProductId}).`, type: 'success' },
             }));
             window.open(result.adminUrl, '_blank', 'noopener,noreferrer');
           } catch (err) {
             console.error(err);
             setShopifyPublishState('error');
             window.dispatchEvent(new CustomEvent('mimi:registry_alert', {
               detail: { message: 'Shopify draft publish failed. Check the server connection in The Press.', type: 'error' },
             }));
           }
         }}
         className="w-full py-3 border border-[#95BF47] text-[#3d5c1f] font-sans text-[9px] uppercase tracking-widest font-black flex items-center justify-center gap-2 hover:bg-[#95BF47]/10 transition-all disabled:opacity-50"
       >
         {shopifyPublishState === 'publishing' ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
       Publish Draft to Shopify
       </button>
     )}
     {!shopifyConnection?.configured && (
       <p className="font-serif italic text-[10px] leading-relaxed text-nous-subtle">
         Download remains available. Direct draft publishing appears after the server-owned Shopify
         connection is configured in The Press.
       </p>
     )}
   </section>
 )}

 <section className="space-y-4">
 <span className="font-sans text-[9px] uppercase tracking-widest font-black text-nous-subtle block border-b border-nous-border pb-2">Includes</span>
 <div className="grid grid-cols-2 gap-2">
 {SECTION_DEFS.map(s => (
 <button key={s.id} onClick={() => toggleSection(s.id)} className={`flex items-center gap-3 p-3 rounded-none border transition-all ${selectedSections.has(s.id) ? 'bg-nous-base border-nous-border text-nous-text text-nous-text' : 'text-nous-subtle border-transparent hover:bg-nous-base '}`}>
 <div className={selectedSections.has(s.id) ? 'text-nous-subtle' : ''}>{s.icon}</div>
 <span className="font-sans text-[8px] uppercase tracking-widest font-black">{s.label}</span>
 </button>
 ))}
 </div>
 </section>
 </div>

 <div className="mt-auto pt-12 space-y-4">
  <section className="space-y-4 border-t border-nous-border pt-4">
    <ZineSyndicationBridge metadata={metadata} />
  </section>
 {hasError && <p className="text-red-500 text-xs font-mono text-center">Export Handshake Failed. Try refreshing.</p>}
 <button onClick={handleExport} disabled={isGenerating} className="w-full py-5 bg-nous-text text-nous-base rounded-none font-sans text-[10px] tracking-[0.4em] uppercase font-black flex items-center justify-center gap-4 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50">
 {isGenerating ? <Loader2 size={16} className="animate-spin"/> : <Download size={16} />}
 {isGenerating ? 'Rendering...' : exportMode === 'shopify' ? 'Download Shopify Pack' : 'Extract Artifact'}
 </button>
 </div>
 </aside>

 {/* PREVIEW AREA */}
 <main className="flex-1 bg-stone-200/50 dark:bg overflow-y-auto p-4 md:p-12 flex justify-center no-scrollbar">
 <AnimatePresence>
    {isGenerating && (
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        className="absolute inset-0 bg-white/90 dark:bg-[#070707]/90 backdrop-blur-md z-50 flex items-center justify-center"
      >
        <div className="bg-white dark:bg-[#0c0c0c] p-12 rounded-none text-center space-y-6 border border-nous-border max-w-sm">
          <Loader2 size={32} className="animate-spin text-amber-500 mx-auto" />
          <div className="space-y-3">
            <p className="font-serif italic text-2xl text-stone-900 dark:text-stone-100 animate-pulse">
              “{progressMessage}”
            </p>
            <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-stone-400">
              Preparing High-Fidelity Print Output
            </p>
          </div>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
 
 <div id="export-target"className={`transition-all duration-500 ${exportMode === 'scroll' ? 'bg-white ' : ''}`} style={containerStyle}>
 
 {/* 1. COVER */}
 {selectedSections.has('cover') && (
 <div className={blockClass}>
 <div className="flex-1 flex flex-col justify-center space-y-10">
 <div className="space-y-4">
 <span className="font-sans text-[10px] uppercase tracking-[0.6em] font-black text-nous-subtle">Issue Manifest</span>
 <h1 className="font-serif text-6xl md:text-8xl italic tracking-tighter leading-[0.85] uppercase text-nous-text text-nous-text">
 {metadata.title}
 </h1>
 </div>
 <div className="h-px w-24 bg-stone-200"/>
 <div className="space-y-2">
 <p className="font-serif italic text-2xl text-nous-subtle">@{metadata.userHandle}</p>
 <p className="font-sans text-[9px] uppercase tracking-widest text-nous-subtle font-black">{metadata.tone} // {new Date(metadata.timestamp).toLocaleDateString()}</p>
 </div>
 </div>
 {exportMode !== 'scroll' && <div className="absolute bottom-8 right-8"><Stamp size={64} className="text-nous-text -rotate-12"/></div>}
 </div>
 )}

 {/* 2. READING */}
 {selectedSections.has('reading') && (
 <div className={blockClass}>
 <SectionHeader label="The Reading"icon={<FileText />} />
 <div className="flex-1 flex flex-col justify-center">
 <p className="font-serif italic text-3xl md:text-4xl text-nous-text leading-[1.2] text-balance">
"{content.oracular_mirror}"
 </p>
 </div>
 <div className="pt-8 opacity-40">
 <p className="font-sans text-[8px] uppercase tracking-widest font-black">Strategic Hypothesis</p>
 <p className="font-serif italic text-sm mt-2">{content.strategic_hypothesis}</p>
 </div>
 </div>
 )}

 {/* 3. SIGNALS (ARCHETYPE) */}
 {selectedSections.has('signals') && metadata.content.semiotic_signals && (
 <div className={`${blockClass} bg-nous-base text-nous-text `}>
 <SectionHeader label="Archetype Index"icon={<Layers />} />
 <div className="flex-1 flex flex-col justify-center space-y-8">
 {metadata.content.semiotic_signals.slice(0, 4).map((t, i) => (
 <div key={i} className="border-l-2 border-nous-border pl-6 space-y-1">
 <h4 className="font-serif text-2xl italic text-nous-text">{t.motif}</h4>
 <p className="font-sans text-[8px] uppercase tracking-widest text-nous-subtle leading-relaxed">{t.context}</p>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* 4. PLATES */}
 {selectedSections.has('plates') && content.pages?.map((page, i) => (
 <div key={`plate-${i}`} className={blockClass}>
 <div className="flex justify-between items-end mb-6 opacity-50">
 <span className="font-mono text-[9px]">FIG_0{i+1}</span>
 <span className="font-sans text-[7px] uppercase tracking-widest font-black">Visual Plate</span>
 </div>
 <div className="aspect-[3/4] w-full overflow-hidden mb-8 bg-nous-base">
 <img 
 src={page.image_url} 
 className="w-full h-full object-cover grayscale"
 crossOrigin="anonymous"
 />
 </div>
 <h2 className="font-serif text-3xl italic tracking-tight uppercase mb-4 text-nous-text text-nous-text">{page.headline}</h2>
 <p className="font-serif italic text-base text-nous-subtle leading-relaxed">{page.bodyCopy}</p>
 </div>
 ))}

 {/* 5. ROADMAP (NEW) */}
 {selectedSections.has('roadmap') && content.roadmap && (
 <div className={blockClass}>
 <SectionHeader label="The Roadmap"icon={<Terminal />} />
 <div className="flex-1 flex flex-col justify-center gap-8">
 <div className="space-y-2">
 <span className="font-sans text-[7px] uppercase tracking-[0.2em] font-black text-nous-subtle block">Strategic Thesis</span>
 <p className="font-serif italic text-lg text-nous-text text-nous-text leading-snug border-b border-nous-border pb-4">
 {content.roadmap.strategicThesis}
 </p>
 </div>
 <div className="space-y-2">
 <span className="font-sans text-[7px] uppercase tracking-[0.2em] font-black text-nous-subtle block">Positioning Axis</span>
 <p className="font-serif italic text-lg text-nous-text text-nous-text leading-snug border-b border-nous-border pb-4">
 {content.roadmap.positioningAxis}
 </p>
 </div>
 <div className="space-y-2">
 <span className="font-sans text-[7px] uppercase tracking-[0.2em] font-black text-nous-subtle block">Authority Anchor</span>
 <p className="font-serif italic text-sm text-nous-subtle leading-snug border-b border-nous-border pb-4">
 <strong>Core Claim:</strong> {content.roadmap.authorityAnchor?.coreClaim}<br/>
 <strong>Repetition Vector:</strong> {content.roadmap.authorityAnchor?.repetitionVector}<br/>
 <strong>Exclusion Principle:</strong> {content.roadmap.authorityAnchor?.exclusionPrinciple}
 </p>
 </div>
 </div>
 </div>
 )}

 {/* 6. DEBRIS (NEW) */}
 {selectedSections.has('debris') && (metadata.originalInput || metadata.content.meta?.intent) && (
 <div className={`${blockClass} bg-nous-base `}>
 <SectionHeader label="Field Debris"icon={<Info />} />
 <div className="flex-1 flex flex-col justify-center">
 <div className="p-8 border-l-4 border-nous-border">
 <span className="font-mono text-[9px] text-nous-subtle mb-4 block">// RAW_INPUT_LOG</span>
 <p className="font-mono text-xs md:text-sm text-nous-subtle leading-relaxed whitespace-pre-wrap">
 {metadata.originalInput || metadata.content.meta?.intent ||"Debris data obscured."}
 </p>
 </div>
 </div>
 <div className="mt-8 text-center opacity-30">
 <p className="font-serif italic text-[10px]">Mimi Sovereign Registry v4.4</p>
 </div>
 </div>
 )}

 </div>
 </main>
 </motion.div>
 );
};
