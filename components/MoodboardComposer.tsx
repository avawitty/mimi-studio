// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PocketItem, DossierElement, TasteAuditReport, MaterialityConfig } from '../types';
import { 
  X, Check, Plus, Image as ImageIcon, Type, Layout, Palette, Pin, 
  Trash2, Layers, Move, SlidersHorizontal, Upload, ArrowRight, 
  LayoutGrid, Quote, Terminal, ZoomIn, ZoomOut, Maximize2, 
  Compass, Radio, Sparkles, ShoppingBag, Music, Link2, Search,
  Share2, Zap, AlertCircle
} from 'lucide-react';
import { MaterialityPanel } from './MaterialityPanel';

interface MoodboardComposerProps {
  selectedItems: PocketItem[];
  report?: TasteAuditReport;
  onCancel: () => void;
  onFinalize: (elements: DossierElement[], layoutConfig: any) => void;
}

// Simulated Pinterest inspirations matching the Mimi / Doll aesthetic
const PINTEREST_INSPIRATIONS = [
  { id: 'pin_1', url: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=400', title: 'Avant-garde vinyl boots', board: 'Mimi Haute Couture' },
  { id: 'pin_2', url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=400', title: 'Chantilly laced veils', board: 'Mimi Visual Shards' },
  { id: 'pin_3', url: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=400', title: 'Monarch velvet collared fitting', board: 'BJD Editorial' },
  { id: 'pin_4', url: 'https://images.unsplash.com/photo-1581044777550-4cfa60707c03?q=80&w=400', title: 'Porcelain skin sheen', board: 'Aesthetic Theory' },
  { id: 'pin_5', url: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=400', title: 'Gilded panopticon corset', board: 'Mimi Core' }
];

// Simulated Shopify products that users can purchase
const SHOPIFY_PRODUCTS = [
  { id: 'sh_1', name: 'Mimi Glossy Vinyl Outerwear', price: '$240.00', image: 'https://picsum.photos/seed/vinyl/200/200' },
  { id: 'sh_2', name: 'Baroque Gilded Neck Collar', price: '$120.00', image: 'https://picsum.photos/seed/collar/200/200' },
  { id: 'sh_3', name: 'Sovereign Pearl Ear Drips', price: '$85.00', image: 'https://picsum.photos/seed/pearls/200/200' }
];

// Simulated Are.na blocks
const ARENA_BLOCKS = [
  { id: 'ar_1', title: 'Brutalist layout design system', channel: 'Brutalist Editorial', author: 'Savant-01' },
  { id: 'ar_2', title: 'Cybernetic lace & semantic telemetry', channel: 'Occult Tech', author: 'LoomMaster' }
];

const parseRoadmapToText = (content: any): string => {
  if (!content || !content.roadmap) return "Unstructured Roadmap";
  const rm = content.roadmap;
  return `STRATEGIC THESIS\n${rm.strategicThesis || '---'}\n\nPOSITIONING AXIS\n${rm.positioningAxis || '---'}\n\nAUTHORITY ANCHOR\nCore Claim: ${rm.authorityAnchor?.coreClaim || '---'}\nRepetition Vector: ${rm.authorityAnchor?.repetitionVector || '---'}\nExclusion Principle: ${rm.authorityAnchor?.exclusionPrinciple || '---'}`;
};

export const MoodboardComposer: React.FC<MoodboardComposerProps> = ({ selectedItems, report, onCancel, onFinalize }) => {
  const [elements, setElements] = useState<DossierElement[]>([]);
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [connections, setConnections] = useState<Array<[string, string]>>([]);
  
  // Viewport states for panning & zooming
  const [pan, setPan] = useState({ x: 150, y: 150 });
  const [zoom, setZoom] = useState(0.85);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [draggedElement, setDraggedElement] = useState<string | null>(null);
  const [elementDragStart, setElementDragStart] = useState({ x: 0, y: 0 });
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  // Materiality State
  const [materiality, setMateriality] = useState<MaterialityConfig>({
    paperStock: 'newsprint',
    typographyLineage: 'brutalist',
    negativeSpaceDensity: 5,
    colorScheme: 'monochrome'
  });

  // Integration states
  const [activeTab, setActiveTab] = useState<'pinterest' | 'shopify' | 'arena' | 'spotify'>('pinterest');
  const [pinterestSearch, setPinterestSearch] = useState('');
  const [taggedProducts, setTaggedProducts] = useState<Record<string, any>>({});
  const [arenaUrl, setArenaUrl] = useState('');
  
  // Spotify Ambient player states
  const [spotifyTrack, setSpotifyTrack] = useState({ name: 'Silent Loom hum', bpm: 72, playing: false });
  const [ambientBpm, setAmbientBpm] = useState(72);

  // References
  const canvasRef = useRef<HTMLDivElement>(null);

  // Setup initial elements and grid coordinates
  useEffect(() => {
    const items = selectedItems || [];
    const initialElements: DossierElement[] = items.map((item, idx) => {
      let content = "";
      let type: 'image' | 'text' | 'analysis_pin' = 'text';

      if (item.type === 'image') {
        type = 'image';
        content = item.content.imageUrl;
      } else if (item.type === 'zine_card') {
        type = 'analysis_pin';
        content = item.content.analysis.design_brief;
      } else if (item.type === 'roadmap') {
        type = 'text';
        content = parseRoadmapToText(item.content);
      } else {
        type = 'text';
        content = item.content.prompt || item.content.name || item.content.omenText || 'Thought';
      }

      return {
        id: `el_${item.id}_${idx}`,
        itemId: item.id,
        type,
        content,
        notes: item.notes || (item.type === 'roadmap' ? `Strategy: ${item.content.title}` : ''),
        style: {
          zIndex: idx + 1,
          isPolaroid: true,
          hasPin: false
        }
      };
    });

    if (report) {
      initialElements.unshift({
        id: 'el_report_brief',
        type: 'analysis_pin',
        content: report.design_brief,
        style: {
          zIndex: 0,
          hasPin: true
        }
      });
    }

    setElements(initialElements);

    // Position items in a spacious circular / scattered grid on the infinite plane
    const initialPositions: Record<string, { x: number; y: number }> = {};
    initialElements.forEach((el, idx) => {
      const radius = 350;
      const angle = (idx / initialElements.length) * 2 * Math.PI;
      initialPositions[el.id] = {
        x: Math.cos(angle) * radius + (Math.random() - 0.5) * 60,
        y: Math.sin(angle) * radius + (Math.random() - 0.5) * 60
      };
    });
    setPositions(initialPositions);

    // Create a initial sequence of connecting threads (connections) between sequential nodes
    const initialConnections: Array<[string, string]> = [];
    for (let i = 0; i < initialElements.length - 1; i++) {
      initialConnections.push([initialElements[i].id, initialElements[i + 1].id]);
    }
    setConnections(initialConnections);
  }, [JSON.stringify(selectedItems), report]);

  // Actions
  const removeElement = (id: string) => {
    setElements(prev => prev.filter(el => el.id !== id));
    setConnections(prev => prev.filter(([a, b]) => a !== id && b !== id));
    if (selectedElementId === id) setSelectedElementId(null);
  };

  const togglePin = (id: string) => {
    setElements(prev => prev.map(el => el.id === id ? { ...el, style: { ...el.style, hasPin: !el.style.hasPin } } : el));
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) { // Left click
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
    } else if (draggedElement) {
      // Scale movement with current zoom
      const dx = (e.clientX - elementDragStart.x) / zoom;
      const dy = (e.clientY - elementDragStart.y) / zoom;
      setPositions(prev => ({
        ...prev,
        [draggedElement]: {
          x: positions[draggedElement].x + dx,
          y: positions[draggedElement].y + dy
        }
      }));
      setElementDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleCanvasMouseUp = () => {
    setIsPanning(false);
    setDraggedElement(null);
  };

  const startElementDrag = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedElementId(id);
    setDraggedElement(id);
    setElementDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleZoom = (factor: number) => {
    setZoom(prev => Math.max(0.2, Math.min(2.5, prev * factor)));
  };

  const resetViewport = () => {
    setPan({ x: 200, y: 150 });
    setZoom(0.8);
  };

  // Pinterest Inspiration action
  const addPinToCanvas = (pin: any) => {
    const id = `pin_${Date.now()}`;
    const newElement: DossierElement = {
      id,
      type: 'image',
      content: pin.url,
      notes: `Inspiration: "${pin.title}" from Pinterest`,
      style: { zIndex: elements.length + 1, isPolaroid: true, hasPin: true }
    };
    
    // Position near the center of the screen
    const centerCoords = {
      x: -pan.x / zoom + (window.innerWidth / 2) / zoom - 150,
      y: -pan.y / zoom + (window.innerHeight / 2) / zoom - 200
    };
    
    setElements(prev => [...prev, newElement]);
    setPositions(prev => ({ ...prev, [id]: centerCoords }));

    // Link connection to the currently selected item if any
    if (selectedElementId) {
      setConnections(prev => [...prev, [selectedElementId, id]]);
    }

    window.dispatchEvent(
      new CustomEvent("mimi:registry_alert", {
        detail: { message: `Pinned "${pin.title}" to Infinite Canvas`, type: "success" },
      })
    );
  };

  // Are.na Importer action
  const handleArenaImport = () => {
    if (!arenaUrl.trim()) return;
    const id = `arena_${Date.now()}`;
    const block = ARENA_BLOCKS[Math.floor(Math.random() * ARENA_BLOCKS.length)];
    const newElement: DossierElement = {
      id,
      type: 'text',
      content: `${block.title}\n\nChannel: #${block.channel}\nCollected by: ${block.author}`,
      notes: `Are.na channel block import`,
      style: { zIndex: elements.length + 1, isPolaroid: false, hasPin: false }
    };

    const centerCoords = {
      x: -pan.x / zoom + (window.innerWidth / 2) / zoom - 150,
      y: -pan.y / zoom + (window.innerHeight / 2) / zoom - 200
    };

    setElements(prev => [...prev, newElement]);
    setPositions(prev => ({ ...prev, [id]: centerCoords }));
    setArenaUrl('');

    if (selectedElementId) {
      setConnections(prev => [...prev, [selectedElementId, id]]);
    }

    window.dispatchEvent(
      new CustomEvent("mimi:registry_alert", {
        detail: { message: "Imported block from Are.na channel", type: "success" },
      })
    );
  };

  // Shopify Product tag action
  const tagProductToElement = (product: any) => {
    if (!selectedElementId) return;
    setTaggedProducts(prev => ({
      ...prev,
      [selectedElementId]: product
    }));
    window.dispatchEvent(
      new CustomEvent("mimi:registry_alert", {
        detail: { message: `Tagged "${product.name}" to style fragment`, type: "success" },
      })
    );
  };

  const getTypographyClass = () => {
    switch (materiality.typographyLineage) {
      case 'brutalist': return 'font-mono uppercase tracking-tight';
      case 'editorial-serif': return 'font-serif italic';
      case 'technical-mono': return 'font-mono';
      default: return 'font-sans';
    }
  };

  const getMoodboardStyle = () => {
    let base = '';
    switch (materiality.colorScheme) {
      case 'monochrome': base = 'bg-stone-950 text-stone-100'; break;
      case 'high-contrast': base = 'bg-[#050505] text-[#FAFAFA]'; break;
      case 'earth-tones': base = 'bg-[#181615] text-[#FAFAF9]'; break;
      default: base = 'bg-[#0A0A0A] text-stone-200';
    }
    return base;
  };

  const handleSpotifyPlay = () => {
    setSpotifyTrack(prev => ({ ...prev, playing: !prev.playing }));
    window.dispatchEvent(new CustomEvent('mimi:sound', { detail: { type: 'transition' } }));
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="fixed inset-0 z-[6000] flex flex-col bg-[#050505] text-stone-100 overflow-hidden select-none"
    >
      {/* Top bar */}
      <header className="h-16 border-b border-stone-850 px-6 flex justify-between items-center bg-[#0C0C0D] z-50">
        <button onClick={onCancel} className="flex items-center gap-3 group">
          <div className="p-1.5 border border-stone-800 group-hover:bg-stone-900 group-hover:text-amber-500 transition-all text-stone-400">
            <X size={14} />
          </div>
          <span className="font-mono text-[9px] uppercase tracking-widest font-black text-stone-400 group-hover:text-stone-200">
            [ CLOSE WORKSPACE ]
          </span>
        </button>

        <div className="flex items-center gap-2">
          <span className="font-mono text-[9px] uppercase tracking-widest bg-amber-500/10 border border-amber-500/20 text-amber-500 px-2 py-1 font-black">
            MIMI INFINITE STUDIO // ACTIVE CANVAS
          </span>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => onFinalize(elements, { pan, zoom, positions, materiality, taggedProducts })} 
            className="px-5 py-2 border border-stone-800 text-stone-300 hover:border-amber-500/50 hover:text-amber-500 font-mono text-[9px] uppercase tracking-widest font-black transition-all flex items-center gap-2"
          >
            [ SECURE WORKSPACE ARTIFACT ] <ArrowRight size={10} />
          </button>
        </div>
      </header>

      {/* Main workspace layout */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* Left Floating Toolpane (Materiality) */}
        <aside className="absolute left-6 top-6 z-40 w-64 border border-stone-850 p-5 bg-[#0C0C0D]/90 backdrop-blur-md shadow-2xl flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-stone-800 pb-2">
            <SlidersHorizontal size={12} className="text-amber-500" />
            <span className="font-mono text-[9px] uppercase tracking-widest font-black text-stone-300">
              Aesthetic Materiality
            </span>
          </div>
          <MaterialityPanel config={materiality} onChange={setMateriality} />
          <div className="border-t border-stone-850 pt-3 flex flex-col gap-2">
            <span className="font-mono text-[8px] uppercase tracking-widest text-stone-500 font-bold">
              Canvas Guides
            </span>
            <p className="text-[9px] text-stone-400 leading-normal font-sans italic">
              Left-click and drag background to pan. Left-click and drag items to position. Select item to tag Shopify buy-triggers or review threads.
            </p>
          </div>
        </aside>

        {/* Viewport Control Bar */}
        <div className="absolute left-6 bottom-6 z-40 bg-[#0C0C0D]/95 border border-stone-850 p-2 flex items-center gap-2 shadow-2xl">
          <button onClick={() => handleZoom(1.15)} className="p-1.5 hover:bg-stone-900 hover:text-amber-500 text-stone-400 transition-colors" title="Zoom In">
            <ZoomIn size={14} />
          </button>
          <button onClick={() => handleZoom(0.85)} className="p-1.5 hover:bg-stone-900 hover:text-amber-500 text-stone-400 transition-colors" title="Zoom Out">
            <ZoomOut size={14} />
          </button>
          <button onClick={resetViewport} className="p-1.5 hover:bg-stone-900 hover:text-amber-500 text-stone-400 transition-colors" title="Reset View">
            <Maximize2 size={14} />
          </button>
          <div className="h-4 w-px bg-stone-850" />
          <span className="font-mono text-[8px] uppercase tracking-widest text-stone-500 font-bold px-1">
            {Math.round(zoom * 100)}%
          </span>
        </div>

        {/* Right Tabbed Integration Drawer */}
        <aside className="absolute right-6 top-6 bottom-6 z-40 w-80 border border-stone-850 bg-[#0C0C0D]/95 backdrop-blur-md shadow-2xl flex flex-col overflow-hidden">
          
          {/* Tabs */}
          <div className="flex border-b border-stone-850 bg-[#121214]">
            {[
              { id: 'pinterest', icon: Compass, label: 'Pins' },
              { id: 'shopify', icon: ShoppingBag, label: 'Shopify' },
              { id: 'arena', icon: Link2, label: 'Are.na' },
              { id: 'spotify', icon: Music, label: 'Music' }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id as any); }}
                  className={`flex-1 py-2.5 text-[8px] uppercase tracking-widest font-black flex flex-col items-center gap-1 border-b-2 transition-all ${
                    activeTab === tab.id 
                      ? 'border-amber-500 text-amber-500 bg-stone-900/40' 
                      : 'border-transparent text-stone-500 hover:text-stone-300'
                  }`}
                >
                  <Icon size={12} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab content area */}
          <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
            <AnimatePresence mode="wait">
              
              {/* Pinterest Tab */}
              {activeTab === 'pinterest' && (
                <motion.div 
                  key="pinterest" 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <div className="space-y-1">
                    <span className="font-mono text-[9px] uppercase tracking-widest text-stone-400 font-black flex items-center gap-1.5">
                      <Compass size={11} className="text-amber-500 animate-spin" /> Pinterest Bridge
                    </span>
                    <p className="text-[10px] text-stone-500 leading-normal">
                      Scry live inspiration boards matching the doll's aesthetic. Click any item to pin it as a physical visual block on the canvas.
                    </p>
                  </div>

                  <div className="flex border border-stone-800 bg-stone-950 p-1.5 rounded-sm">
                    <input 
                      type="text" 
                      value={pinterestSearch}
                      onChange={(e) => setPinterestSearch(e.target.value)}
                      placeholder="Search boards (e.g. bjd, lace)"
                      className="flex-1 bg-transparent border-none text-[10px] outline-none text-stone-200 placeholder:text-stone-600 px-1 font-mono"
                    />
                    <Search size={11} className="text-stone-600" />
                  </div>

                  <div className="space-y-3 pt-2">
                    {PINTEREST_INSPIRATIONS.map(pin => (
                      <div 
                        key={pin.id}
                        onClick={() => addPinToCanvas(pin)}
                        className="group border border-stone-850 bg-stone-950 p-2 rounded-sm cursor-pointer hover:border-amber-500/40 transition-all flex gap-3 items-center"
                      >
                        <img src={pin.url} className="w-12 h-16 object-cover grayscale group-hover:grayscale-0 transition-all" />
                        <div className="space-y-1 overflow-hidden">
                          <h4 className="font-serif italic text-xs text-stone-300 group-hover:text-amber-500 transition-colors truncate">
                            {pin.title}
                          </h4>
                          <span className="font-mono text-[7px] uppercase tracking-widest text-stone-500 font-bold block">
                            board // {pin.board}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Shopify Tab */}
              {activeTab === 'shopify' && (
                <motion.div 
                  key="shopify" 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <div className="space-y-1">
                    <span className="font-mono text-[9px] uppercase tracking-widest text-stone-400 font-black flex items-center gap-1.5">
                      <ShoppingBag size={11} className="text-emerald-500" /> Shopify Buy-Trigger
                    </span>
                    <p className="text-[10px] text-stone-500 leading-normal">
                      Tag physical runway items or clothing wearables from connected Shopify merchant stock. Tagged items inject a real-time Buy Button onto the card!
                    </p>
                  </div>

                  {selectedElementId ? (
                    <div className="space-y-3">
                      <div className="p-3 bg-stone-950 border border-stone-850 rounded-sm">
                        <span className="font-mono text-[7px] uppercase tracking-widest text-stone-500 block mb-1">
                          SELECTED CANVASS SHARD
                        </span>
                        <p className="font-serif italic text-xs text-stone-300 truncate">
                          {elements.find(el => el.id === selectedElementId)?.notes || "Aesthetic reference shard"}
                        </p>
                        {taggedProducts[selectedElementId] ? (
                          <div className="mt-3 p-2 bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 font-mono text-[8px] uppercase font-bold flex justify-between items-center">
                            <span>Tagged: {taggedProducts[selectedElementId].name}</span>
                            <button onClick={() => setTaggedProducts(prev => { const c = {...prev}; delete c[selectedElementId]; return c; })} className="text-[7px] text-stone-500 hover:text-red-400">[ CLEAR ]</button>
                          </div>
                        ) : null}
                      </div>

                      <div className="space-y-2 pt-2 border-t border-stone-850">
                        <span className="font-mono text-[8px] uppercase tracking-widest text-stone-400 font-black block">
                          Available Store Products
                        </span>
                        {SHOPIFY_PRODUCTS.map(prod => (
                          <div 
                            key={prod.id}
                            onClick={() => tagProductToElement(prod)}
                            className="p-2 border border-stone-850 bg-stone-950 rounded-sm cursor-pointer hover:border-emerald-500/40 transition-all flex justify-between items-center"
                          >
                            <div className="flex gap-2 items-center">
                              <img src={prod.image} className="w-8 h-8 object-cover" />
                              <div className="overflow-hidden">
                                <h4 className="font-mono text-[9px] uppercase font-black text-stone-300 truncate max-w-[130px]">
                                  {prod.name}
                                </h4>
                                <span className="font-mono text-[8px] text-stone-500">{prod.price}</span>
                              </div>
                            </div>
                            <span className="font-mono text-[8px] uppercase tracking-widest bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 border border-emerald-500/10 font-bold hover:bg-emerald-500 hover:text-stone-950 transition-colors shrink-0">
                              [ TAG ]
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="py-12 text-center border border-dashed border-stone-850 bg-stone-950/40">
                      <AlertCircle size={20} className="mx-auto text-stone-600 mb-2" />
                      <p className="font-mono text-[9px] uppercase text-stone-500 font-black">
                        [ SELECT AN ELEMENT ]
                      </p>
                      <p className="text-[9px] text-stone-600 px-4 mt-1">
                        Select any element on the infinite canvas to tag and configure merchant products.
                      </p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Are.na Tab */}
              {activeTab === 'arena' && (
                <motion.div 
                  key="arena" 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <div className="space-y-1">
                    <span className="font-mono text-[9px] uppercase tracking-widest text-stone-400 font-black flex items-center gap-1.5">
                      <Link2 size={11} className="text-cyan-500" /> Are.na Channel Importer
                    </span>
                    <p className="text-[10px] text-stone-500 leading-normal">
                      Import aesthetic reference blocks, mood links, and editorial citations from public Are.na channels into your active workspace.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <input 
                      type="text" 
                      value={arenaUrl}
                      onChange={(e) => setArenaUrl(e.target.value)}
                      placeholder="https://www.are.na/channel/..."
                      className="w-full bg-stone-950 border border-stone-800 px-2.5 py-2 text-[9px] text-stone-200 outline-none focus:border-cyan-500 transition-colors font-mono rounded-sm"
                    />
                    <button 
                      onClick={handleArenaImport}
                      className="w-full py-2 bg-cyan-950/40 border border-cyan-800 hover:bg-cyan-900/50 hover:border-cyan-500 text-cyan-400 font-mono text-[8px] uppercase tracking-widest font-black transition-all rounded-sm"
                    >
                      [ IMPORT ARE.NA BLOCKS ]
                    </button>
                  </div>

                  <div className="space-y-2.5 pt-2 border-t border-stone-850">
                    <span className="font-mono text-[8px] uppercase tracking-widest text-stone-400 font-black block">
                      Simulated Active Feeds
                    </span>
                    {ARENA_BLOCKS.map(block => (
                      <div key={block.id} className="p-3 bg-stone-950 border border-stone-850 rounded-sm space-y-1">
                        <div className="flex justify-between items-center text-[7px] font-mono uppercase text-stone-500">
                          <span>Channel: #{block.channel}</span>
                          <span>By {block.author}</span>
                        </div>
                        <p className="font-serif italic text-xs text-stone-300 leading-tight">
                          "{block.title}"
                        </p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Spotify Tab */}
              {activeTab === 'spotify' && (
                <motion.div 
                  key="spotify" 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <div className="space-y-1">
                    <span className="font-mono text-[9px] uppercase tracking-widest text-stone-400 font-black flex items-center gap-1.5">
                      <Music size={11} className="text-rose-500" /> Occult Ambient Player
                    </span>
                    <p className="text-[10px] text-stone-500 leading-normal">
                      Tweak the digital audio loops. Altering the synthesizer BPM speeds up or slows down the canvas grid respiration lines.
                    </p>
                  </div>

                  {/* Tape Deck Player design */}
                  <div className="border border-stone-800 bg-stone-950 p-4 rounded-sm space-y-4 shadow-inner relative overflow-hidden">
                    <div className="absolute top-1 right-2 font-mono text-[6px] text-rose-500/40 animate-pulse font-bold uppercase tracking-widest">
                      {spotifyTrack.playing ? "STREAMING_FEED" : "STANDBY"}
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div className="space-y-1">
                        <h4 className="font-mono text-[9px] uppercase font-black text-rose-500">
                          {spotifyTrack.name}
                        </h4>
                        <p className="text-[8px] text-stone-500 font-mono tracking-wider">
                          Mimi Occult Loops · {ambientBpm} BPM
                        </p>
                      </div>
                      
                      <button 
                        onClick={handleSpotifyPlay}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all border ${
                          spotifyTrack.playing 
                            ? 'bg-rose-500/10 border-rose-500 text-rose-400' 
                            : 'bg-stone-900 border-stone-800 text-stone-400 hover:border-stone-500'
                        }`}
                      >
                        {spotifyTrack.playing ? (
                          <div className="flex gap-0.5 items-end justify-center h-4">
                            <span className="w-1 bg-rose-500 h-2 animate-[bounce_0.6s_infinite_0.1s]" />
                            <span className="w-1 bg-rose-500 h-4 animate-[bounce_0.6s_infinite_0.3s]" />
                            <span className="w-1 bg-rose-500 h-3 animate-[bounce_0.6s_infinite_0.5s]" />
                          </div>
                        ) : (
                          <Play size={14} className="ml-0.5 fill-current" />
                        )}
                      </button>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-stone-900">
                      <div className="flex justify-between text-[8px] font-mono text-stone-500 uppercase">
                        <span>Respiration Tempo</span>
                        <span>{ambientBpm} BPM</span>
                      </div>
                      <input 
                        type="range" 
                        min="40" 
                        max="160" 
                        value={ambientBpm}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setAmbientBpm(val);
                          setSpotifyTrack(prev => ({ ...prev, bpm: val }));
                          // trigger respiration acceleration event
                          window.dispatchEvent(new CustomEvent('mimi:respiration_speed', { detail: { bpm: val } }));
                        }}
                        className="w-full accent-rose-500 bg-stone-800 h-1 outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="font-mono text-[8px] uppercase tracking-widest text-stone-500 font-bold block">
                      Aesthetic Playlists
                    </span>
                    {[
                      { name: "Monarch Velvet frequencies", tracks: "12 tracks", duration: "48 min" },
                      { name: "Silken Panopticon synthesis", tracks: "8 tracks", duration: "32 min" },
                      { name: "Lace transmission telemetry", tracks: "15 tracks", duration: "54 min" }
                    ].map(playlist => (
                      <div 
                        key={playlist.name}
                        onClick={() => {
                          setSpotifyTrack({ name: playlist.name, bpm: ambientBpm, playing: true });
                          triggerSound('transition');
                        }}
                        className="p-2 border border-stone-850 hover:border-rose-500/30 bg-stone-950 rounded-sm cursor-pointer transition-all flex justify-between items-center"
                      >
                        <span className="font-serif italic text-xs text-stone-300 truncate max-w-[150px]">
                          {playlist.name}
                        </span>
                        <div className="text-[8px] font-mono text-stone-500 text-right">
                          <span>{playlist.tracks}</span>
                          <span className="block">{playlist.duration}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </aside>

        {/* Infinite Panning and Zooming Canvas */}
        <main 
          ref={canvasRef}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
          className={`flex-1 relative overflow-hidden transition-colors duration-1000 ${getMoodboardStyle()}`}
          style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
        >
          {/* Canvas coordinate dot grid background */}
          <div 
            className="absolute inset-0 pointer-events-none opacity-[0.06] dark:opacity-[0.15]"
            style={{
              backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
              backgroundSize: '24px 24px',
              backgroundPosition: `${pan.x}px ${pan.y}px`,
              transform: `scale(${zoom})`,
              transformOrigin: '0 0'
            }}
          />

          {/* Connective Thread Lines (Occult Investigation Strings) */}
          <svg className="absolute inset-0 pointer-events-none z-0">
            <g style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}>
              {connections.map(([fromId, toId], idx) => {
                const p1 = positions[fromId];
                const p2 = positions[toId];
                if (!p1 || !p2) return null;
                
                // Draw a beautiful curved bezier string line between cards
                const midX = (p1.x + p2.x + 300) / 2;
                const midY = (p1.y + p2.y + 200) / 2 + 30; // sag
                const path = `M ${p1.x + 150} ${p1.y + 150} Q ${midX} ${midY} ${p2.x + 150} ${p2.y + 150}`;

                return (
                  <motion.path 
                    key={`line_${idx}`}
                    d={path}
                    fill="none"
                    stroke="#D97706"
                    strokeWidth="1.2"
                    strokeDasharray="4 2"
                    opacity="0.35"
                    initial={{ strokeDashoffset: 0 }}
                    animate={{ strokeDashoffset: -20 }}
                    transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                  />
                );
              })}
            </g>
          </svg>

          {/* Dragging Canvas Viewport */}
          <div 
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0'
            }}
            className="absolute inset-0 pointer-events-none"
          >
            {elements.map((el, idx) => {
              const pos = positions[el.id] || { x: 0, y: 0 };
              const isSelected = selectedElementId === el.id;
              const hasShopifyTag = taggedProducts[el.id];
              
              return (
                <div
                  key={el.id}
                  onMouseDown={(e) => startElementDrag(e, el.id)}
                  style={{
                    left: `${pos.x}px`,
                    top: `${pos.y}px`,
                    zIndex: el.style.zIndex + (isSelected ? 500 : 0),
                  }}
                  className={`absolute pointer-events-auto w-80 flex flex-col gap-3 p-4 bg-[#0C0C0D]/90 border transition-shadow rounded-sm select-none ${
                    isSelected 
                      ? 'border-amber-500 shadow-[0_0_25px_rgba(217,119,6,0.15)]' 
                      : 'border-stone-850 shadow-md hover:border-stone-700'
                  }`}
                >
                  <div className="flex justify-between items-center border-b border-stone-850 pb-2">
                    <span className="font-mono text-[8px] uppercase tracking-widest text-stone-500 font-bold">
                      {el.type === 'image' ? `SHRD_0${idx+1}` : `REF_0${idx+1}`} // {el.type === 'image' ? 'IMAGE' : el.type === 'analysis_pin' ? 'DEBRIEF' : 'THOUGHT'}
                    </span>
                    <div className="flex gap-1.5 pointer-events-auto">
                      <button 
                        onClick={(e) => { e.stopPropagation(); togglePin(el.id); }} 
                        className={`p-1 hover:bg-stone-900 transition-colors ${el.style.hasPin ? 'text-amber-500' : 'text-stone-600'}`}
                      >
                        <Pin size={10} fill={el.style.hasPin ? 'currentColor' : 'none'} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeElement(el.id); }} 
                        className="p-1 hover:bg-stone-900 text-stone-600 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  </div>

                  {el.type === 'image' ? (
                    <div className="space-y-3">
                      <div className={`aspect-[3/4] overflow-hidden border border-stone-800 bg-stone-950 transition-all duration-700 ${
                        materiality.paperStock === 'newsprint' ? 'grayscale' : 
                        materiality.paperStock === 'vellum' ? 'opacity-90 blur-[0.5px]' :
                        materiality.paperStock === 'raw-cardboard' ? 'sepia-[0.3]' : ''
                      }`}>
                        <img src={el.content} className="w-full h-full object-cover select-none pointer-events-none" />
                      </div>
                      {el.notes && (
                        <p className="font-serif italic text-[11px] text-stone-400 border-l border-stone-850 pl-2 leading-relaxed">
                          "{el.notes}"
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="max-h-60 overflow-y-auto no-scrollbar">
                        <p className={`${getTypographyClass()} text-xs text-stone-300 leading-relaxed whitespace-pre-wrap`}>
                          "{el.content}"
                        </p>
                      </div>
                      {el.notes && (
                        <div className="pt-2 border-t border-stone-850/50">
                          <span className="font-mono text-[7px] uppercase tracking-widest text-stone-500 font-bold block mb-0.5">
                            Linked Remark
                          </span>
                          <p className="font-serif italic text-[10px] text-stone-400 leading-relaxed">
                            "{el.notes}"
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Shopify Live Buy Badge overlay */}
                  {hasShopifyTag && (
                    <div className="mt-2 pt-2 border-t border-emerald-500/10 flex justify-between items-center bg-emerald-500/5 px-2 py-1.5 rounded-sm">
                      <div className="flex gap-1.5 items-center">
                        <ShoppingBag size={10} className="text-emerald-400" />
                        <span className="font-mono text-[8px] uppercase font-black text-stone-200 truncate max-w-[130px]">
                          {hasShopifyTag.name}
                        </span>
                      </div>
                      <span className="font-mono text-[8px] font-black text-emerald-400 tracking-wider">
                        [ {hasShopifyTag.price} BUY ]
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </main>
      </div>
    </motion.div>
  );
};
