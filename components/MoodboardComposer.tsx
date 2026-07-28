// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PocketItem, DossierElement, TasteAuditReport, MaterialityConfig } from '../types';
import {
  X, Pin, Trash2, ArrowRight, ZoomIn, ZoomOut, Maximize2,
  Compass, ShoppingBag, Music, Link2, Search, SlidersHorizontal,
  AlertCircle, Play,
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
  { id: 'pin_5', url: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=400', title: 'Gilded panopticon corset', board: 'Mimi Core' },
];

// Simulated Shopify products that users can purchase
const SHOPIFY_PRODUCTS = [
  { id: 'sh_1', name: 'Mimi Glossy Vinyl Outerwear', price: '$240.00', image: 'https://picsum.photos/seed/vinyl/200/200' },
  { id: 'sh_2', name: 'Baroque Gilded Neck Collar', price: '$120.00', image: 'https://picsum.photos/seed/collar/200/200' },
  { id: 'sh_3', name: 'Sovereign Pearl Ear Drips', price: '$85.00', image: 'https://picsum.photos/seed/pearls/200/200' },
];

// Simulated Are.na blocks
const ARENA_BLOCKS = [
  { id: 'ar_1', title: 'Brutalist layout design system', channel: 'Brutalist Editorial', author: 'Savant-01' },
  { id: 'ar_2', title: 'Cybernetic lace & semantic telemetry', channel: 'Occult Tech', author: 'LoomMaster' },
];

const parseRoadmapToText = (content: any): string => {
  if (!content || !content.roadmap) return 'Unstructured Roadmap';
  const rm = content.roadmap;
  return `STRATEGIC THESIS\n${rm.strategicThesis || '---'}\n\nPOSITIONING AXIS\n${rm.positioningAxis || '---'}\n\nAUTHORITY ANCHOR\nCore Claim: ${rm.authorityAnchor?.coreClaim || '---'}\nRepetition Vector: ${rm.authorityAnchor?.repetitionVector || '---'}\nExclusion Principle: ${rm.authorityAnchor?.exclusionPrinciple || '---'}`;
};

const triggerSound = (type: string) => {
  try {
    window.dispatchEvent(new CustomEvent('mimi:sound', { detail: { type } }));
  } catch (_) {}
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
    colorScheme: 'monochrome',
  });

  // Integration states
  const [activeTab, setActiveTab] = useState<'pinterest' | 'shopify' | 'arena' | 'spotify'>('pinterest');
  const [pinterestSearch, setPinterestSearch] = useState('');
  const [taggedProducts, setTaggedProducts] = useState<Record<string, any>>({});
  const [arenaUrl, setArenaUrl] = useState('');

  // Spotify Ambient player states
  const [spotifyTrack, setSpotifyTrack] = useState({ name: 'Silent Loom hum', bpm: 72, playing: false });
  const [ambientBpm, setAmbientBpm] = useState(72);

  // Mobile sheet + desktop panel visibility
  const [mobileSheet, setMobileSheet] = useState<'materiality' | 'integrations' | null>(null);
  const [showPanels, setShowPanels] = useState(true);

  // References
  const canvasRef = useRef<HTMLDivElement>(null);
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchRef = useRef<{ dist: number; zoom: number }>({ dist: 0, zoom: 1 });

  // Setup initial elements and grid coordinates
  useEffect(() => {
    const items = selectedItems || [];
    const initialElements: DossierElement[] = items.map((item, idx) => {
      let content = '';
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
        style: { zIndex: idx + 1, isPolaroid: true, hasPin: false },
      };
    });

    if (report) {
      initialElements.unshift({
        id: 'el_report_brief',
        type: 'analysis_pin',
        content: report.design_brief,
        style: { zIndex: 0, hasPin: true },
      });
    }

    setElements(initialElements);

    // Position items in a spacious scattered grid on the infinite plane
    const initialPositions: Record<string, { x: number; y: number }> = {};
    initialElements.forEach((el, idx) => {
      const radius = 350;
      const angle = (idx / Math.max(1, initialElements.length)) * 2 * Math.PI;
      initialPositions[el.id] = {
        x: Math.cos(angle) * radius + (Math.random() - 0.5) * 60,
        y: Math.sin(angle) * radius + (Math.random() - 0.5) * 60,
      };
    });
    setPositions(initialPositions);

    const initialConnections: Array<[string, string]> = [];
    for (let i = 0; i < initialElements.length - 1; i++) {
      initialConnections.push([initialElements[i].id, initialElements[i + 1].id]);
    }
    setConnections(initialConnections);
  }, [JSON.stringify(selectedItems), report]);

  // Actions
  const removeElement = (id: string) => {
    setElements((prev) => prev.filter((el) => el.id !== id));
    setConnections((prev) => prev.filter(([a, b]) => a !== id && b !== id));
    if (selectedElementId === id) setSelectedElementId(null);
  };

  const togglePin = (id: string) => {
    setElements((prev) => prev.map((el) => (el.id === id ? { ...el, style: { ...el.style, hasPin: !el.style.hasPin } } : el)));
  };

  // ---- Unified pointer interaction (mouse + touch + pen) ----
  const getPinchDistance = () => {
    const pts = [...pointersRef.current.values()];
    if (pts.length < 2) return 0;
    return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
  };

  const handleCanvasPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointersRef.current.size === 1) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    } else if (pointersRef.current.size === 2) {
      // Entering pinch: stop panning/dragging and set baseline
      setIsPanning(false);
      setDraggedElement(null);
      pinchRef.current = { dist: getPinchDistance(), zoom };
    }
  };

  const handleCanvasPointerMove = (e: React.PointerEvent) => {
    if (pointersRef.current.has(e.pointerId)) {
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    // Pinch-to-zoom with two pointers
    if (pointersRef.current.size >= 2) {
      const newDist = getPinchDistance();
      if (pinchRef.current.dist > 0 && newDist > 0) {
        const factor = newDist / pinchRef.current.dist;
        setZoom(Math.max(0.2, Math.min(2.5, pinchRef.current.zoom * factor)));
      }
      return;
    }

    if (draggedElement) {
      const dx = (e.clientX - elementDragStart.x) / zoom;
      const dy = (e.clientY - elementDragStart.y) / zoom;
      setPositions((prev) => ({
        ...prev,
        [draggedElement]: { x: (prev[draggedElement]?.x || 0) + dx, y: (prev[draggedElement]?.y || 0) + dy },
      }));
      setElementDragStart({ x: e.clientX, y: e.clientY });
    } else if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    }
  };

  const handleCanvasPointerUp = (e: React.PointerEvent) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current.dist = 0;
    if (pointersRef.current.size === 0) {
      setIsPanning(false);
      setDraggedElement(null);
    }
  };

  const startElementDrag = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    setSelectedElementId(id);
    setDraggedElement(id);
    setElementDragStart({ x: e.clientX, y: e.clientY });
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
  };

  const handleWheel = (e: React.WheelEvent) => {
    const factor = e.deltaY < 0 ? 1.08 : 0.92;
    setZoom((prev) => Math.max(0.2, Math.min(2.5, prev * factor)));
  };

  const handleZoom = (factor: number) => {
    setZoom((prev) => Math.max(0.2, Math.min(2.5, prev * factor)));
  };

  const resetViewport = () => {
    setPan({ x: 200, y: 150 });
    setZoom(0.8);
  };

  const canvasCenterCoords = () => ({
    x: -pan.x / zoom + window.innerWidth / 2 / zoom - 150,
    y: -pan.y / zoom + window.innerHeight / 2 / zoom - 200,
  });

  // Pinterest Inspiration action
  const addPinToCanvas = (pin: any) => {
    const id = `pin_${Date.now()}`;
    const newElement: DossierElement = {
      id,
      type: 'image',
      content: pin.url,
      notes: `Inspiration: "${pin.title}" from Pinterest`,
      style: { zIndex: elements.length + 1, isPolaroid: true, hasPin: true },
    };
    setElements((prev) => [...prev, newElement]);
    setPositions((prev) => ({ ...prev, [id]: canvasCenterCoords() }));
    if (selectedElementId) setConnections((prev) => [...prev, [selectedElementId, id]]);
    setMobileSheet(null);
    window.dispatchEvent(new CustomEvent('mimi:registry_alert', { detail: { message: `Pinned "${pin.title}" to canvas`, type: 'success' } }));
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
      notes: 'Are.na channel block import',
      style: { zIndex: elements.length + 1, isPolaroid: false, hasPin: false },
    };
    setElements((prev) => [...prev, newElement]);
    setPositions((prev) => ({ ...prev, [id]: canvasCenterCoords() }));
    setArenaUrl('');
    if (selectedElementId) setConnections((prev) => [...prev, [selectedElementId, id]]);
    window.dispatchEvent(new CustomEvent('mimi:registry_alert', { detail: { message: 'Imported block from Are.na channel', type: 'success' } }));
  };

  // Shopify Product tag action
  const tagProductToElement = (product: any) => {
    if (!selectedElementId) return;
    setTaggedProducts((prev) => ({ ...prev, [selectedElementId]: product }));
    window.dispatchEvent(new CustomEvent('mimi:registry_alert', { detail: { message: `Tagged "${product.name}" to style fragment`, type: 'success' } }));
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
    switch (materiality.colorScheme) {
      case 'monochrome': return 'bg-[#0a0a0b] text-stone-100';
      case 'high-contrast': return 'bg-[#050505] text-[#FAFAFA]';
      case 'earth-tones': return 'bg-[#161412] text-[#FAFAF9]';
      default: return 'bg-[#0a0a0b] text-stone-200';
    }
  };

  const handleSpotifyPlay = () => {
    setSpotifyTrack((prev) => ({ ...prev, playing: !prev.playing }));
    triggerSound('transition');
  };

  // ---- Reusable panel bodies (shared by desktop panels + mobile sheets) ----
  const materialityBody = (
    <div className="flex flex-col gap-4">
      <MaterialityPanel config={materiality} onChangeConfig={setMateriality} playClickSound={() => triggerSound('click')} />
      <div className="border border-white/10 bg-white/[0.02] p-3">
        <span className="font-mono text-[8px] uppercase tracking-widest text-stone-500 font-bold block mb-1">Canvas Guides</span>
        <p className="text-[10px] text-stone-400 leading-relaxed font-sans">
          Drag the background to pan. Drag an item to reposition. Pinch or scroll to zoom. Select an item to tag Shopify buy-triggers or thread it to imports.
        </p>
      </div>
    </div>
  );

  const integrationTabs = [
    { id: 'pinterest', icon: Compass, label: 'Pins' },
    { id: 'shopify', icon: ShoppingBag, label: 'Shopify' },
    { id: 'arena', icon: Link2, label: 'Are.na' },
    { id: 'spotify', icon: Music, label: 'Music' },
  ] as const;

  const integrationsBody = (
    <div className="flex flex-col h-full min-h-0">
      {/* Tabs */}
      <div className="flex border-b border-white/10 bg-white/[0.02] shrink-0">
        {integrationTabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 min-h-11 py-2.5 text-[8px] uppercase tracking-widest font-black flex flex-col items-center gap-1 border-b-2 transition-all ${
                active ? 'border-amber-400 text-amber-400 bg-white/[0.03]' : 'border-transparent text-stone-500 hover:text-stone-300'
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4 no-scrollbar min-h-0">
        <AnimatePresence mode="wait">
          {activeTab === 'pinterest' && (
            <motion.div key="pinterest" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="space-y-1">
                <span className="font-mono text-[9px] uppercase tracking-widest text-stone-300 font-black flex items-center gap-1.5">
                  <Compass size={12} className="text-amber-400" /> Pinterest Bridge
                </span>
                <p className="text-[10px] text-stone-500 leading-relaxed">
                  Scry live inspiration boards matching the doll's aesthetic. Tap any item to pin it onto the canvas.
                </p>
              </div>

              <div className="flex items-center border border-white/10 bg-black/40 px-2">
                <Search size={12} className="text-stone-600 shrink-0" />
                <input
                  type="text"
                  value={pinterestSearch}
                  onChange={(e) => setPinterestSearch(e.target.value)}
                  placeholder="Search boards (e.g. bjd, lace)"
                  className="flex-1 bg-transparent border-none text-[16px] md:text-[11px] outline-none text-stone-200 placeholder:text-stone-600 px-2 py-2.5 font-mono"
                />
              </div>

              <div className="space-y-2.5 pt-1">
                {PINTEREST_INSPIRATIONS.map((pin) => (
                  <button
                    key={pin.id}
                    onClick={() => addPinToCanvas(pin)}
                    className="group w-full border border-white/10 bg-white/[0.02] p-2 cursor-pointer hover:border-amber-400/40 transition-all flex gap-3 items-center text-left"
                  >
                    <img src={pin.url || '/placeholder.svg'} alt={pin.title} className="w-12 h-16 object-cover grayscale group-hover:grayscale-0 transition-all shrink-0" />
                    <div className="space-y-1 overflow-hidden">
                      <h4 className="font-serif italic text-sm text-stone-300 group-hover:text-amber-400 transition-colors truncate">{pin.title}</h4>
                      <span className="font-mono text-[8px] uppercase tracking-widest text-stone-500 font-bold block truncate">board // {pin.board}</span>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'shopify' && (
            <motion.div key="shopify" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="space-y-1">
                <span className="font-mono text-[9px] uppercase tracking-widest text-stone-300 font-black flex items-center gap-1.5">
                  <ShoppingBag size={12} className="text-amber-400" /> Shopify Buy-Trigger
                </span>
                <p className="text-[10px] text-stone-500 leading-relaxed">
                  Tag runway items from connected Shopify stock. Tagged items inject a live Buy Button onto the card.
                </p>
              </div>

              {selectedElementId ? (
                <div className="space-y-3">
                  <div className="p-3 bg-white/[0.02] border border-white/10">
                    <span className="font-mono text-[7px] uppercase tracking-widest text-stone-500 block mb-1">Selected canvas shard</span>
                    <p className="font-serif italic text-sm text-stone-300 truncate">
                      {elements.find((el) => el.id === selectedElementId)?.notes || 'Aesthetic reference shard'}
                    </p>
                    {taggedProducts[selectedElementId] ? (
                      <div className="mt-3 p-2 bg-amber-400/5 border border-amber-400/20 text-amber-300 font-mono text-[8px] uppercase font-bold flex justify-between items-center gap-2">
                        <span className="truncate">Tagged: {taggedProducts[selectedElementId].name}</span>
                        <button
                          onClick={() => setTaggedProducts((prev) => { const c = { ...prev }; delete c[selectedElementId]; return c; })}
                          className="text-[7px] text-stone-500 hover:text-red-400 shrink-0 min-h-11 flex items-center px-1"
                        >
                          [ CLEAR ]
                        </button>
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-2 pt-2 border-t border-white/10">
                    <span className="font-mono text-[8px] uppercase tracking-widest text-stone-400 font-black block">Available store products</span>
                    {SHOPIFY_PRODUCTS.map((prod) => (
                      <button
                        key={prod.id}
                        onClick={() => tagProductToElement(prod)}
                        className="w-full p-2 border border-white/10 bg-white/[0.02] cursor-pointer hover:border-amber-400/40 transition-all flex justify-between items-center gap-2 text-left"
                      >
                        <div className="flex gap-2 items-center overflow-hidden">
                          <img src={prod.image || '/placeholder.svg'} alt={prod.name} className="w-9 h-9 object-cover shrink-0" />
                          <div className="overflow-hidden">
                            <h4 className="font-mono text-[9px] uppercase font-black text-stone-300 truncate">{prod.name}</h4>
                            <span className="font-mono text-[8px] text-stone-500">{prod.price}</span>
                          </div>
                        </div>
                        <span className="font-mono text-[8px] uppercase tracking-widest bg-amber-400/10 text-amber-300 px-2 py-1 border border-amber-400/20 font-bold shrink-0">TAG</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center border border-dashed border-white/10 bg-white/[0.02]">
                  <AlertCircle size={20} className="mx-auto text-stone-600 mb-2" />
                  <p className="font-mono text-[9px] uppercase text-stone-400 font-black">[ Select an element ]</p>
                  <p className="text-[9px] text-stone-600 px-4 mt-1 leading-relaxed">Select any element on the canvas to tag and configure merchant products.</p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'arena' && (
            <motion.div key="arena" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="space-y-1">
                <span className="font-mono text-[9px] uppercase tracking-widest text-stone-300 font-black flex items-center gap-1.5">
                  <Link2 size={12} className="text-amber-400" /> Are.na Channel Importer
                </span>
                <p className="text-[10px] text-stone-500 leading-relaxed">
                  Import aesthetic reference blocks and editorial citations from public Are.na channels.
                </p>
              </div>

              <div className="space-y-2">
                <input
                  type="text"
                  value={arenaUrl}
                  onChange={(e) => setArenaUrl(e.target.value)}
                  placeholder="https://www.are.na/channel/..."
                  className="w-full bg-black/40 border border-white/10 px-2.5 py-2.5 text-[16px] md:text-[11px] text-stone-200 outline-none focus:border-amber-400 transition-colors font-mono"
                />
                <button
                  onClick={handleArenaImport}
                  className="w-full min-h-11 py-2.5 bg-amber-400/10 border border-amber-400/30 hover:bg-amber-400/20 hover:border-amber-400 text-amber-300 font-mono text-[9px] uppercase tracking-widest font-black transition-all"
                >
                  [ Import Are.na blocks ]
                </button>
              </div>

              <div className="space-y-2.5 pt-2 border-t border-white/10">
                <span className="font-mono text-[8px] uppercase tracking-widest text-stone-400 font-black block">Simulated active feeds</span>
                {ARENA_BLOCKS.map((block) => (
                  <div key={block.id} className="p-3 bg-white/[0.02] border border-white/10 space-y-1">
                    <div className="flex justify-between items-center text-[7px] font-mono uppercase text-stone-500 gap-2">
                      <span className="truncate">Channel: #{block.channel}</span>
                      <span className="shrink-0">By {block.author}</span>
                    </div>
                    <p className="font-serif italic text-sm text-stone-300 leading-tight">"{block.title}"</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'spotify' && (
            <motion.div key="spotify" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="space-y-1">
                <span className="font-mono text-[9px] uppercase tracking-widest text-stone-300 font-black flex items-center gap-1.5">
                  <Music size={12} className="text-amber-400" /> Ambient Player
                </span>
                <p className="text-[10px] text-stone-500 leading-relaxed">
                  Tweak the audio loops. Altering the synthesizer BPM speeds up or slows the canvas respiration lines.
                </p>
              </div>

              <div className="border border-white/10 bg-white/[0.02] p-4 space-y-4 relative overflow-hidden">
                <div className="absolute top-1 right-2 font-mono text-[6px] text-amber-400/40 animate-pulse font-bold uppercase tracking-widest">
                  {spotifyTrack.playing ? 'STREAMING_FEED' : 'STANDBY'}
                </div>
                <div className="flex justify-between items-center gap-3">
                  <div className="space-y-1 overflow-hidden">
                    <h4 className="font-mono text-[9px] uppercase font-black text-amber-300 truncate">{spotifyTrack.name}</h4>
                    <p className="text-[8px] text-stone-500 font-mono tracking-wider">Mimi Occult Loops · {ambientBpm} BPM</p>
                  </div>
                  <button
                    onClick={handleSpotifyPlay}
                    aria-label={spotifyTrack.playing ? 'Pause ambient track' : 'Play ambient track'}
                    className={`w-11 h-11 rounded-full flex items-center justify-center transition-all border shrink-0 ${
                      spotifyTrack.playing ? 'bg-amber-400/10 border-amber-400 text-amber-300' : 'bg-white/[0.03] border-white/10 text-stone-400 hover:border-stone-500'
                    }`}
                  >
                    {spotifyTrack.playing ? (
                      <div className="flex gap-0.5 items-end justify-center h-4">
                        <span className="w-1 bg-amber-400 h-2 animate-[bounce_0.6s_infinite_0.1s]" />
                        <span className="w-1 bg-amber-400 h-4 animate-[bounce_0.6s_infinite_0.3s]" />
                        <span className="w-1 bg-amber-400 h-3 animate-[bounce_0.6s_infinite_0.5s]" />
                      </div>
                    ) : (
                      <Play size={16} className="ml-0.5 fill-current" />
                    )}
                  </button>
                </div>

                <div className="space-y-2 pt-2 border-t border-white/10">
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
                      setSpotifyTrack((prev) => ({ ...prev, bpm: val }));
                      window.dispatchEvent(new CustomEvent('mimi:respiration_speed', { detail: { bpm: val } }));
                    }}
                    className="w-full accent-amber-400 bg-white/10 h-1 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <span className="font-mono text-[8px] uppercase tracking-widest text-stone-500 font-bold block">Aesthetic playlists</span>
                {[
                  { name: 'Monarch Velvet frequencies', tracks: '12 tracks', duration: '48 min' },
                  { name: 'Silken Panopticon synthesis', tracks: '8 tracks', duration: '32 min' },
                  { name: 'Lace transmission telemetry', tracks: '15 tracks', duration: '54 min' },
                ].map((playlist) => (
                  <button
                    key={playlist.name}
                    onClick={() => { setSpotifyTrack({ name: playlist.name, bpm: ambientBpm, playing: true }); triggerSound('transition'); }}
                    className="w-full p-2.5 border border-white/10 hover:border-amber-400/30 bg-white/[0.02] cursor-pointer transition-all flex justify-between items-center gap-2 text-left"
                  >
                    <span className="font-serif italic text-sm text-stone-300 truncate">{playlist.name}</span>
                    <div className="text-[8px] font-mono text-stone-500 text-right shrink-0">
                      <span>{playlist.tracks}</span>
                      <span className="block">{playlist.duration}</span>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[6000] flex flex-col bg-[#050505] text-stone-100 overflow-hidden select-none"
    >
      {/* Top bar */}
      <header className="h-14 md:h-16 border-b border-white/10 px-3 md:px-6 flex justify-between items-center bg-[#0b0b0d] z-50 shrink-0">
        <button onClick={onCancel} className="flex items-center gap-2 md:gap-3 group min-h-11">
          <span className="p-2 border border-white/10 group-hover:bg-white/5 group-hover:text-amber-400 transition-all text-stone-400 flex items-center justify-center">
            <X size={14} />
          </span>
          <span className="hidden sm:block font-mono text-[9px] uppercase tracking-widest font-black text-stone-400 group-hover:text-stone-200">Close workspace</span>
        </button>

        <span className="hidden md:block font-mono text-[9px] uppercase tracking-widest bg-amber-400/10 border border-amber-400/20 text-amber-400 px-3 py-1 font-black">
          Mimi Infinite Studio
        </span>

        <button
          onClick={() => onFinalize(elements, { pan, zoom, positions, materiality, taggedProducts })}
          className="px-3 md:px-5 min-h-11 py-2 border border-amber-400/40 bg-amber-400/10 text-amber-300 hover:bg-amber-400/20 hover:border-amber-400 font-mono text-[9px] uppercase tracking-widest font-black transition-all flex items-center gap-2"
        >
          <span className="hidden sm:inline">Secure artifact</span>
          <span className="sm:hidden">Save</span>
          <ArrowRight size={12} />
        </button>
      </header>

      {/* Main workspace */}
      <div className="flex flex-1 overflow-hidden relative min-h-0">
        {/* Desktop: Left materiality panel */}
        {showPanels && (
          <aside className="hidden md:flex absolute left-4 top-4 z-40 w-72 border border-white/10 p-4 bg-[#0b0b0d]/95 backdrop-blur-md shadow-2xl flex-col gap-3 max-h-[calc(100%-2rem)] overflow-y-auto no-scrollbar">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-widest font-black text-stone-300">
                <SlidersHorizontal size={12} className="text-amber-400" /> Aesthetic Materiality
              </span>
            </div>
            {materialityBody}
          </aside>
        )}

        {/* Desktop: Right integration drawer */}
        {showPanels && (
          <aside className="hidden md:flex absolute right-4 top-4 bottom-4 z-40 w-80 border border-white/10 bg-[#0b0b0d]/95 backdrop-blur-md shadow-2xl flex-col overflow-hidden">
            {integrationsBody}
          </aside>
        )}

        {/* Desktop: viewport controls + panel toggle (bottom-left) */}
        <div className="hidden md:flex absolute left-4 bottom-4 z-40 bg-[#0b0b0d]/95 border border-white/10 p-1.5 items-center gap-1 shadow-2xl">
          <button onClick={() => handleZoom(1.15)} className="p-2 hover:bg-white/5 hover:text-amber-400 text-stone-400 transition-colors" title="Zoom in" aria-label="Zoom in"><ZoomIn size={16} /></button>
          <button onClick={() => handleZoom(0.85)} className="p-2 hover:bg-white/5 hover:text-amber-400 text-stone-400 transition-colors" title="Zoom out" aria-label="Zoom out"><ZoomOut size={16} /></button>
          <button onClick={resetViewport} className="p-2 hover:bg-white/5 hover:text-amber-400 text-stone-400 transition-colors" title="Reset view" aria-label="Reset view"><Maximize2 size={16} /></button>
          <div className="h-4 w-px bg-white/10" />
          <span className="font-mono text-[8px] uppercase tracking-widest text-stone-500 font-bold px-1.5 tabular-nums">{Math.round(zoom * 100)}%</span>
          <div className="h-4 w-px bg-white/10" />
          <button onClick={() => setShowPanels((s) => !s)} className="p-2 hover:bg-white/5 hover:text-amber-400 text-stone-400 transition-colors" title="Toggle panels" aria-label="Toggle panels"><SlidersHorizontal size={16} /></button>
        </div>

        {/* Infinite pannable / zoomable canvas */}
        <main
          ref={canvasRef}
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={handleCanvasPointerMove}
          onPointerUp={handleCanvasPointerUp}
          onPointerCancel={handleCanvasPointerUp}
          onWheel={handleWheel}
          className={`flex-1 relative overflow-hidden transition-colors duration-700 ${getMoodboardStyle()}`}
          style={{ cursor: isPanning ? 'grabbing' : 'grab', touchAction: 'none' }}
        >
          {/* Dot grid background */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.12]"
            style={{
              backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
              backgroundSize: '24px 24px',
              backgroundPosition: `${pan.x}px ${pan.y}px`,
              transform: `scale(${zoom})`,
              transformOrigin: '0 0',
            }}
          />

          {/* Connective thread lines */}
          <svg className="absolute inset-0 pointer-events-none z-0 w-full h-full">
            <g style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}>
              {connections.map(([fromId, toId], idx) => {
                const p1 = positions[fromId];
                const p2 = positions[toId];
                if (!p1 || !p2) return null;
                const midX = (p1.x + p2.x + 300) / 2;
                const midY = (p1.y + p2.y + 200) / 2 + 30;
                const path = `M ${p1.x + 150} ${p1.y + 150} Q ${midX} ${midY} ${p2.x + 150} ${p2.y + 150}`;
                return (
                  <motion.path
                    key={`line_${idx}`}
                    d={path}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="1.2"
                    strokeDasharray="4 2"
                    opacity="0.3"
                    initial={{ strokeDashoffset: 0 }}
                    animate={{ strokeDashoffset: -20 }}
                    transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
                  />
                );
              })}
            </g>
          </svg>

          {/* Transformed element layer */}
          <div
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}
            className="absolute inset-0 pointer-events-none"
          >
            {elements.map((el, idx) => {
              const pos = positions[el.id] || { x: 0, y: 0 };
              const isSelected = selectedElementId === el.id;
              const hasShopifyTag = taggedProducts[el.id];
              return (
                <div
                  key={el.id}
                  onPointerDown={(e) => startElementDrag(e, el.id)}
                  style={{ left: `${pos.x}px`, top: `${pos.y}px`, zIndex: el.style.zIndex + (isSelected ? 500 : 0), touchAction: 'none' }}
                  className={`absolute pointer-events-auto w-72 md:w-80 flex flex-col gap-3 p-4 bg-[#0b0b0d]/95 border transition-shadow ${
                    isSelected ? 'border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.18)]' : 'border-white/10 shadow-md hover:border-white/25'
                  }`}
                >
                  <div className="flex justify-between items-center border-b border-white/10 pb-2">
                    <span className="font-mono text-[8px] uppercase tracking-widest text-stone-500 font-bold truncate">
                      {el.type === 'image' ? `SHRD_0${idx + 1}` : `REF_0${idx + 1}`} // {el.type === 'image' ? 'IMAGE' : el.type === 'analysis_pin' ? 'DEBRIEF' : 'THOUGHT'}
                    </span>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); togglePin(el.id); }}
                        onPointerDown={(e) => e.stopPropagation()}
                        aria-label="Toggle pin"
                        className={`p-2 hover:bg-white/5 transition-colors ${el.style.hasPin ? 'text-amber-400' : 'text-stone-600'}`}
                      >
                        <Pin size={12} fill={el.style.hasPin ? 'currentColor' : 'none'} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeElement(el.id); }}
                        onPointerDown={(e) => e.stopPropagation()}
                        aria-label="Remove element"
                        className="p-2 hover:bg-white/5 text-stone-600 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {el.type === 'image' ? (
                    <div className="space-y-3">
                      <div className={`aspect-[3/4] overflow-hidden border border-white/10 bg-black/40 transition-all duration-700 ${
                        materiality.paperStock === 'newsprint' ? 'grayscale' : materiality.paperStock === 'vellum' ? 'opacity-90 blur-[0.5px]' : materiality.paperStock === 'raw-cardboard' ? 'sepia-[0.3]' : ''
                      }`}>
                        <img src={el.content || '/placeholder.svg'} alt={el.notes || 'Moodboard image'} className="w-full h-full object-cover select-none pointer-events-none" />
                      </div>
                      {el.notes && <p className="font-serif italic text-[11px] text-stone-400 border-l border-white/10 pl-2 leading-relaxed">"{el.notes}"</p>}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="max-h-60 overflow-y-auto no-scrollbar">
                        <p className={`${getTypographyClass()} text-xs text-stone-300 leading-relaxed whitespace-pre-wrap`}>"{el.content}"</p>
                      </div>
                      {el.notes && (
                        <div className="pt-2 border-t border-white/10">
                          <span className="font-mono text-[7px] uppercase tracking-widest text-stone-500 font-bold block mb-0.5">Linked Remark</span>
                          <p className="font-serif italic text-[10px] text-stone-400 leading-relaxed">"{el.notes}"</p>
                        </div>
                      )}
                    </div>
                  )}

                  {hasShopifyTag && (
                    <div className="mt-1 pt-2 border-t border-amber-400/10 flex justify-between items-center bg-amber-400/5 px-2 py-1.5 gap-2">
                      <div className="flex gap-1.5 items-center overflow-hidden">
                        <ShoppingBag size={12} className="text-amber-400 shrink-0" />
                        <span className="font-mono text-[8px] uppercase font-black text-stone-200 truncate">{hasShopifyTag.name}</span>
                      </div>
                      <span className="font-mono text-[8px] font-black text-amber-300 tracking-wider shrink-0">[ {hasShopifyTag.price} ]</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Mobile zoom indicator (top-right of canvas) */}
          <div className="md:hidden absolute top-3 right-3 z-30 bg-[#0b0b0d]/90 border border-white/10 px-2 py-1 font-mono text-[8px] uppercase tracking-widest text-stone-400 font-bold tabular-nums pointer-events-none">
            {Math.round(zoom * 100)}%
          </div>
        </main>

        {/* Mobile: bottom toolbar */}
        <div className="md:hidden absolute bottom-0 left-0 right-0 z-40 bg-[#0b0b0d]/95 border-t border-white/10 backdrop-blur-md flex items-stretch justify-around px-2 py-1.5" style={{ paddingBottom: 'max(0.375rem, env(safe-area-inset-bottom))' }}>
          <button onClick={() => setMobileSheet('materiality')} className="flex-1 min-h-11 flex flex-col items-center justify-center gap-0.5 text-stone-400 active:text-amber-400 transition-colors">
            <SlidersHorizontal size={18} />
            <span className="font-mono text-[7px] uppercase tracking-widest font-black">Materiality</span>
          </button>
          <button onClick={() => setMobileSheet('integrations')} className="flex-1 min-h-11 flex flex-col items-center justify-center gap-0.5 text-stone-400 active:text-amber-400 transition-colors">
            <Compass size={18} />
            <span className="font-mono text-[7px] uppercase tracking-widest font-black">Sources</span>
          </button>
          <button onClick={() => handleZoom(1.2)} className="flex-1 min-h-11 flex flex-col items-center justify-center gap-0.5 text-stone-400 active:text-amber-400 transition-colors">
            <ZoomIn size={18} />
            <span className="font-mono text-[7px] uppercase tracking-widest font-black">In</span>
          </button>
          <button onClick={() => handleZoom(0.8)} className="flex-1 min-h-11 flex flex-col items-center justify-center gap-0.5 text-stone-400 active:text-amber-400 transition-colors">
            <ZoomOut size={18} />
            <span className="font-mono text-[7px] uppercase tracking-widest font-black">Out</span>
          </button>
          <button onClick={resetViewport} className="flex-1 min-h-11 flex flex-col items-center justify-center gap-0.5 text-stone-400 active:text-amber-400 transition-colors">
            <Maximize2 size={18} />
            <span className="font-mono text-[7px] uppercase tracking-widest font-black">Reset</span>
          </button>
        </div>
      </div>

      {/* Mobile: swipe-up bottom sheets */}
      <AnimatePresence>
        {mobileSheet && (
          <motion.div
            className="md:hidden fixed inset-0 z-[6100] flex flex-col justify-end"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button aria-label="Close panel" className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileSheet(null)} />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.4 }}
              onDragEnd={(_, info) => { if (info.offset.y > 120) setMobileSheet(null); }}
              className="relative bg-[#0b0b0d] border-t border-white/10 rounded-t-2xl max-h-[80vh] flex flex-col overflow-hidden shadow-2xl"
            >
              <div className="flex flex-col items-center pt-2 pb-1 shrink-0">
                <span className="w-10 h-1 rounded-full bg-white/20" />
              </div>
              <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 shrink-0">
                <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest font-black text-stone-300">
                  {mobileSheet === 'materiality' ? <><SlidersHorizontal size={13} className="text-amber-400" /> Aesthetic Materiality</> : <><Compass size={13} className="text-amber-400" /> Sources & Integrations</>}
                </span>
                <button onClick={() => setMobileSheet(null)} aria-label="Close" className="p-2 -mr-2 text-stone-400 hover:text-amber-400 min-h-11 flex items-center"><X size={16} /></button>
              </div>
              <div className="flex-1 overflow-y-auto min-h-0 no-scrollbar">
                {mobileSheet === 'materiality' ? <div className="p-4">{materialityBody}</div> : <div className="h-[60vh] flex flex-col">{integrationsBody}</div>}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
