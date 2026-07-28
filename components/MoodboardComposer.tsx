// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PocketItem, DossierElement, TasteAuditReport, MaterialityConfig } from '../types';
import {
  X, Pin, Trash2, SlidersHorizontal, ArrowRight,
  ZoomIn, ZoomOut, Maximize2, Compass, ShoppingBag, Music, Link2, Search,
  Play, AlertCircle, LayoutGrid
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

const INTEGRATION_TABS = [
  { id: 'pinterest', icon: Compass, label: 'Pins' },
  { id: 'shopify', icon: ShoppingBag, label: 'Shopify' },
  { id: 'arena', icon: Link2, label: 'Are.na' },
  { id: 'spotify', icon: Music, label: 'Music' }
] as const;

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 2.5;
const clampZoom = (z: number) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

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
  const [draggedElement, setDraggedElement] = useState<string | null>(null);
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

  // Responsive + mobile sheet state
  const [isMobile, setIsMobile] = useState(false);
  const [mobileSheet, setMobileSheet] = useState<null | 'materiality' | 'integrations'>(null);

  // References
  const canvasRef = useRef<HTMLDivElement>(null);
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchRef = useRef<{ dist: number; zoom: number } | null>(null);
  const panStartRef = useRef({ x: 0, y: 0 });
  const dragStartRef = useRef({ x: 0, y: 0 });
  const panRef = useRef(pan);
  const zoomRef = useRef(zoom);
  panRef.current = pan;
  zoomRef.current = zoom;

  const triggerSound = (type: string) => {
    try { window.dispatchEvent(new CustomEvent('mimi:sound', { detail: { type } })); } catch (_) {}
  };

  // Detect mobile viewport
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

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
        style: { zIndex: idx + 1, isPolaroid: true, hasPin: false }
      };
    });

    if (report) {
      initialElements.unshift({
        id: 'el_report_brief',
        type: 'analysis_pin',
        content: report.design_brief,
        style: { zIndex: 0, hasPin: true }
      });
    }

    setElements(initialElements);

    const initialPositions: Record<string, { x: number; y: number }> = {};
    initialElements.forEach((el, idx) => {
      const radius = 350;
      const angle = (idx / Math.max(initialElements.length, 1)) * 2 * Math.PI;
      initialPositions[el.id] = {
        x: Math.cos(angle) * radius + (Math.random() - 0.5) * 60,
        y: Math.sin(angle) * radius + (Math.random() - 0.5) * 60
      };
    });
    setPositions(initialPositions);

    const initialConnections: Array<[string, string]> = [];
    for (let i = 0; i < initialElements.length - 1; i++) {
      initialConnections.push([initialElements[i].id, initialElements[i + 1].id]);
    }
    setConnections(initialConnections);
  }, [JSON.stringify(selectedItems), report]);

  // Native, non-passive wheel zoom (focal to cursor)
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      const z = zoomRef.current;
      const nz = clampZoom(z * factor);
      if (nz === z) return;
      const p = panRef.current;
      setPan({ x: cx - (cx - p.x) * (nz / z), y: cy - (cy - p.y) * (nz / z) });
      setZoom(nz);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // Actions
  const removeElement = (id: string) => {
    setElements(prev => prev.filter(el => el.id !== id));
    setConnections(prev => prev.filter(([a, b]) => a !== id && b !== id));
    if (selectedElementId === id) setSelectedElementId(null);
  };

  const togglePin = (id: string) => {
    setElements(prev => prev.map(el => el.id === id ? { ...el, style: { ...el.style, hasPin: !el.style.hasPin } } : el));
  };

  // Unified pointer handlers (mouse + touch + pinch)
  const handleCanvasPointerDown = (e: React.PointerEvent) => {
    canvasRef.current?.setPointerCapture(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size === 2) {
      const pts = [...pointersRef.current.values()];
      pinchRef.current = { dist: dist(pts[0], pts[1]), zoom: zoomRef.current };
      setIsPanning(false);
      setDraggedElement(null);
    } else if (!draggedElement) {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      setSelectedElementId(null);
    }
  };

  const handleCanvasPointerMove = (e: React.PointerEvent) => {
    if (pointersRef.current.has(e.pointerId)) {
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    // Pinch zoom
    if (pointersRef.current.size >= 2 && pinchRef.current) {
      const pts = [...pointersRef.current.values()];
      const newDist = dist(pts[0], pts[1]);
      const z = zoomRef.current;
      const nz = clampZoom(pinchRef.current.zoom * (newDist / pinchRef.current.dist));
      const rect = canvasRef.current!.getBoundingClientRect();
      const mx = (pts[0].x + pts[1].x) / 2 - rect.left;
      const my = (pts[0].y + pts[1].y) / 2 - rect.top;
      const p = panRef.current;
      setPan({ x: mx - (mx - p.x) * (nz / z), y: my - (my - p.y) * (nz / z) });
      setZoom(nz);
      return;
    }

    if (draggedElement) {
      const dx = (e.clientX - dragStartRef.current.x) / zoom;
      const dy = (e.clientY - dragStartRef.current.y) / zoom;
      setPositions(prev => ({
        ...prev,
        [draggedElement]: { x: (prev[draggedElement]?.x || 0) + dx, y: (prev[draggedElement]?.y || 0) + dy }
      }));
      dragStartRef.current = { x: e.clientX, y: e.clientY };
    } else if (isPanning) {
      setPan({ x: e.clientX - panStartRef.current.x, y: e.clientY - panStartRef.current.y });
    }
  };

  const handleCanvasPointerUp = (e: React.PointerEvent) => {
    pointersRef.current.delete(e.pointerId);
    try { canvasRef.current?.releasePointerCapture(e.pointerId); } catch (_) {}
    if (pointersRef.current.size < 2) pinchRef.current = null;
    if (pointersRef.current.size === 0) {
      setIsPanning(false);
      setDraggedElement(null);
    }
  };

  const startElementDrag = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    canvasRef.current?.setPointerCapture(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    setSelectedElementId(id);
    setDraggedElement(id);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleZoom = (factor: number) => setZoom(prev => clampZoom(prev * factor));

  const resetViewport = () => {
    setPan({ x: isMobile ? 40 : 200, y: 120 });
    setZoom(isMobile ? 0.55 : 0.8);
  };

  const centerCoords = () => ({
    x: -panRef.current.x / zoomRef.current + (window.innerWidth / 2) / zoomRef.current - 150,
    y: -panRef.current.y / zoomRef.current + (window.innerHeight / 2) / zoomRef.current - 200
  });

  const addPinToCanvas = (pin: any) => {
    const id = `pin_${Date.now()}`;
    const newElement: DossierElement = {
      id, type: 'image', content: pin.url,
      notes: `Inspiration: "${pin.title}" from Pinterest`,
      style: { zIndex: elements.length + 1, isPolaroid: true, hasPin: true }
    };
    setElements(prev => [...prev, newElement]);
    setPositions(prev => ({ ...prev, [id]: centerCoords() }));
    if (selectedElementId) setConnections(prev => [...prev, [selectedElementId, id]]);
    if (isMobile) setMobileSheet(null);
    window.dispatchEvent(new CustomEvent("mimi:registry_alert", { detail: { message: `Pinned "${pin.title}" to canvas`, type: "success" } }));
  };

  const handleArenaImport = () => {
    if (!arenaUrl.trim()) return;
    const id = `arena_${Date.now()}`;
    const block = ARENA_BLOCKS[Math.floor(Math.random() * ARENA_BLOCKS.length)];
    const newElement: DossierElement = {
      id, type: 'text',
      content: `${block.title}\n\nChannel: #${block.channel}\nCollected by: ${block.author}`,
      notes: `Are.na channel block import`,
      style: { zIndex: elements.length + 1, isPolaroid: false, hasPin: false }
    };
    setElements(prev => [...prev, newElement]);
    setPositions(prev => ({ ...prev, [id]: centerCoords() }));
    setArenaUrl('');
    if (selectedElementId) setConnections(prev => [...prev, [selectedElementId, id]]);
    window.dispatchEvent(new CustomEvent("mimi:registry_alert", { detail: { message: "Imported block from Are.na channel", type: "success" } }));
  };

  const tagProductToElement = (product: any) => {
    if (!selectedElementId) return;
    setTaggedProducts(prev => ({ ...prev, [selectedElementId]: product }));
    window.dispatchEvent(new CustomEvent("mimi:registry_alert", { detail: { message: `Tagged "${product.name}" to style fragment`, type: "success" } }));
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
      case 'monochrome': return 'bg-stone-950 text-stone-100';
      case 'high-contrast': return 'bg-[#050505] text-[#FAFAFA]';
      case 'earth-tones': return 'bg-[#181615] text-[#FAFAF9]';
      default: return 'bg-[#0A0A0A] text-stone-200';
    }
  };

  const handleSpotifyPlay = () => {
    setSpotifyTrack(prev => ({ ...prev, playing: !prev.playing }));
    triggerSound('transition');
  };

  // ---- Reusable panels (shared between desktop rails and mobile sheets) ----
  const renderMateriality = () => (
    <div className="flex flex-col gap-4">
      <MaterialityPanel config={materiality} onChangeConfig={setMateriality} playClickSound={() => triggerSound('click')} />
      <div className="border-t border-stone-850 pt-3 flex flex-col gap-2">
        <span className="font-mono text-[8px] uppercase tracking-widest text-stone-500 font-bold">Canvas Guides</span>
        <p className="text-[10px] text-stone-400 leading-relaxed font-sans italic">
          {isMobile
            ? 'Drag one finger to pan, pinch to zoom, drag a card to reposition. Tap a card to tag Shopify buy-triggers.'
            : 'Drag the background to pan, scroll to zoom, drag cards to position. Select a card to tag Shopify buy-triggers or review threads.'}
        </p>
      </div>
    </div>
  );

  const renderIntegrationTabs = () => (
    <div className="flex border-b border-stone-850 bg-[#121214]">
      {INTEGRATION_TABS.map(tab => {
        const Icon = tab.icon;
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 min-h-11 py-2.5 text-[8px] uppercase tracking-widest font-black flex flex-col items-center justify-center gap-1 border-b-2 transition-all ${
              active ? 'border-amber-500 text-amber-500 bg-stone-900/40' : 'border-transparent text-stone-500 hover:text-stone-300'
            }`}
          >
            <Icon size={14} />
            {tab.label}
          </button>
        );
      })}
    </div>
  );

  const renderIntegrationContent = () => (
    <AnimatePresence mode="wait">
      {activeTab === 'pinterest' && (
        <motion.div key="pinterest" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
          <div className="space-y-1">
            <span className="font-mono text-[9px] uppercase tracking-widest text-stone-400 font-black flex items-center gap-1.5">
              <Compass size={11} className="text-amber-500" /> Pinterest Bridge
            </span>
            <p className="text-[10px] text-stone-500 leading-relaxed">
              Scry live inspiration boards matching the doll aesthetic. Tap any item to pin it as a visual block on the canvas.
            </p>
          </div>
          <div className="flex items-center border border-stone-800 bg-stone-950 p-1.5 rounded-sm">
            <input
              type="text" value={pinterestSearch} onChange={(e) => setPinterestSearch(e.target.value)}
              placeholder="Search boards (e.g. bjd, lace)"
              className="flex-1 bg-transparent border-none text-base md:text-[10px] outline-none text-stone-200 placeholder:text-stone-600 px-1 font-mono"
            />
            <Search size={11} className="text-stone-600" />
          </div>
          <div className="space-y-3 pt-2">
            {PINTEREST_INSPIRATIONS.map(pin => (
              <button
                key={pin.id} onClick={() => addPinToCanvas(pin)}
                className="group w-full text-left border border-stone-850 bg-stone-950 p-2 rounded-sm cursor-pointer hover:border-amber-500/40 transition-all flex gap-3 items-center"
              >
                <img src={pin.url || "/placeholder.svg"} alt={pin.title} className="w-12 h-16 object-cover grayscale group-hover:grayscale-0 transition-all" />
                <div className="space-y-1 overflow-hidden">
                  <h4 className="font-serif italic text-xs text-stone-300 group-hover:text-amber-500 transition-colors truncate">{pin.title}</h4>
                  <span className="font-mono text-[7px] uppercase tracking-widest text-stone-500 font-bold block">board // {pin.board}</span>
                </div>
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {activeTab === 'shopify' && (
        <motion.div key="shopify" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
          <div className="space-y-1">
            <span className="font-mono text-[9px] uppercase tracking-widest text-stone-400 font-black flex items-center gap-1.5">
              <ShoppingBag size={11} className="text-emerald-500" /> Shopify Buy-Trigger
            </span>
            <p className="text-[10px] text-stone-500 leading-relaxed">
              Tag runway items from connected Shopify stock. Tagged items inject a real-time Buy Button onto the card.
            </p>
          </div>
          {selectedElementId ? (
            <div className="space-y-3">
              <div className="p-3 bg-stone-950 border border-stone-850 rounded-sm">
                <span className="font-mono text-[7px] uppercase tracking-widest text-stone-500 block mb-1">Selected canvas shard</span>
                <p className="font-serif italic text-xs text-stone-300 truncate">
                  {elements.find(el => el.id === selectedElementId)?.notes || "Aesthetic reference shard"}
                </p>
                {taggedProducts[selectedElementId] && (
                  <div className="mt-3 p-2 bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 font-mono text-[8px] uppercase font-bold flex justify-between items-center">
                    <span className="truncate">Tagged: {taggedProducts[selectedElementId].name}</span>
                    <button onClick={() => setTaggedProducts(prev => { const c = { ...prev }; delete c[selectedElementId]; return c; })} className="text-[7px] text-stone-500 hover:text-red-400 shrink-0 ml-2">[ CLEAR ]</button>
                  </div>
                )}
              </div>
              <div className="space-y-2 pt-2 border-t border-stone-850">
                <span className="font-mono text-[8px] uppercase tracking-widest text-stone-400 font-black block">Available store products</span>
                {SHOPIFY_PRODUCTS.map(prod => (
                  <button
                    key={prod.id} onClick={() => tagProductToElement(prod)}
                    className="w-full p-2 border border-stone-850 bg-stone-950 rounded-sm cursor-pointer hover:border-emerald-500/40 transition-all flex justify-between items-center gap-2"
                  >
                    <div className="flex gap-2 items-center overflow-hidden">
                      <img src={prod.image || "/placeholder.svg"} alt={prod.name} className="w-8 h-8 object-cover shrink-0" />
                      <div className="overflow-hidden text-left">
                        <h4 className="font-mono text-[9px] uppercase font-black text-stone-300 truncate">{prod.name}</h4>
                        <span className="font-mono text-[8px] text-stone-500">{prod.price}</span>
                      </div>
                    </div>
                    <span className="font-mono text-[8px] uppercase tracking-widest bg-emerald-500/10 text-emerald-400 px-1.5 py-1 border border-emerald-500/10 font-bold shrink-0">[ TAG ]</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-12 text-center border border-dashed border-stone-850 bg-stone-950/40">
              <AlertCircle size={20} className="mx-auto text-stone-600 mb-2" />
              <p className="font-mono text-[9px] uppercase text-stone-500 font-black">[ Select an element ]</p>
              <p className="text-[9px] text-stone-600 px-4 mt-1">Select any element on the canvas to tag and configure merchant products.</p>
            </div>
          )}
        </motion.div>
      )}

      {activeTab === 'arena' && (
        <motion.div key="arena" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
          <div className="space-y-1">
            <span className="font-mono text-[9px] uppercase tracking-widest text-stone-400 font-black flex items-center gap-1.5">
              <Link2 size={11} className="text-amber-500" /> Are.na Channel Importer
            </span>
            <p className="text-[10px] text-stone-500 leading-relaxed">
              Import aesthetic reference blocks and editorial citations from public Are.na channels into your workspace.
            </p>
          </div>
          <div className="space-y-2">
            <input
              type="text" value={arenaUrl} onChange={(e) => setArenaUrl(e.target.value)}
              placeholder="https://www.are.na/channel/..."
              className="w-full bg-stone-950 border border-stone-800 px-2.5 py-2 text-base md:text-[9px] text-stone-200 outline-none focus:border-amber-500 transition-colors font-mono rounded-sm"
            />
            <button onClick={handleArenaImport} className="w-full min-h-11 py-2 bg-amber-500/10 border border-amber-500/40 hover:bg-amber-500/20 hover:border-amber-500 text-amber-400 font-mono text-[8px] uppercase tracking-widest font-black transition-all rounded-sm">
              [ Import Are.na blocks ]
            </button>
          </div>
          <div className="space-y-2.5 pt-2 border-t border-stone-850">
            <span className="font-mono text-[8px] uppercase tracking-widest text-stone-400 font-black block">Simulated active feeds</span>
            {ARENA_BLOCKS.map(block => (
              <div key={block.id} className="p-3 bg-stone-950 border border-stone-850 rounded-sm space-y-1">
                <div className="flex justify-between items-center text-[7px] font-mono uppercase text-stone-500">
                  <span>Channel: #{block.channel}</span>
                  <span>By {block.author}</span>
                </div>
                <p className="font-serif italic text-xs text-stone-300 leading-tight">{block.title}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {activeTab === 'spotify' && (
        <motion.div key="spotify" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
          <div className="space-y-1">
            <span className="font-mono text-[9px] uppercase tracking-widest text-stone-400 font-black flex items-center gap-1.5">
              <Music size={11} className="text-amber-500" /> Ambient Player
            </span>
            <p className="text-[10px] text-stone-500 leading-relaxed">
              Tweak the digital audio loops. Altering the synthesizer BPM speeds up or slows down the canvas respiration lines.
            </p>
          </div>
          <div className="border border-stone-800 bg-stone-950 p-4 rounded-sm space-y-4 shadow-inner relative overflow-hidden">
            <div className="absolute top-1 right-2 font-mono text-[6px] text-amber-500/40 animate-pulse font-bold uppercase tracking-widest">
              {spotifyTrack.playing ? "STREAMING_FEED" : "STANDBY"}
            </div>
            <div className="flex justify-between items-center gap-3">
              <div className="space-y-1 overflow-hidden">
                <h4 className="font-mono text-[9px] uppercase font-black text-amber-500 truncate">{spotifyTrack.name}</h4>
                <p className="text-[8px] text-stone-500 font-mono tracking-wider">Mimi Occult Loops · {ambientBpm} BPM</p>
              </div>
              <button
                onClick={handleSpotifyPlay}
                aria-label={spotifyTrack.playing ? 'Pause ambient loop' : 'Play ambient loop'}
                className={`w-11 h-11 rounded-full flex items-center justify-center transition-all border shrink-0 ${
                  spotifyTrack.playing ? 'bg-amber-500/10 border-amber-500 text-amber-400' : 'bg-stone-900 border-stone-800 text-stone-400 hover:border-stone-500'
                }`}
              >
                {spotifyTrack.playing ? (
                  <div className="flex gap-0.5 items-end justify-center h-4">
                    <span className="w-1 bg-amber-500 h-2 animate-[bounce_0.6s_infinite_0.1s]" />
                    <span className="w-1 bg-amber-500 h-4 animate-[bounce_0.6s_infinite_0.3s]" />
                    <span className="w-1 bg-amber-500 h-3 animate-[bounce_0.6s_infinite_0.5s]" />
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
                type="range" min="40" max="160" value={ambientBpm}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setAmbientBpm(val);
                  setSpotifyTrack(prev => ({ ...prev, bpm: val }));
                  window.dispatchEvent(new CustomEvent('mimi:respiration_speed', { detail: { bpm: val } }));
                }}
                className="w-full accent-amber-500 bg-stone-800 h-1 outline-none"
              />
            </div>
          </div>
          <div className="space-y-2">
            <span className="font-mono text-[8px] uppercase tracking-widest text-stone-500 font-bold block">Aesthetic Playlists</span>
            {[
              { name: "Monarch Velvet frequencies", tracks: "12 tracks", duration: "48 min" },
              { name: "Silken Panopticon synthesis", tracks: "8 tracks", duration: "32 min" },
              { name: "Lace transmission telemetry", tracks: "15 tracks", duration: "54 min" }
            ].map(playlist => (
              <button
                key={playlist.name}
                onClick={() => { setSpotifyTrack({ name: playlist.name, bpm: ambientBpm, playing: true }); triggerSound('transition'); }}
                className="w-full p-2 border border-stone-850 hover:border-amber-500/30 bg-stone-950 rounded-sm cursor-pointer transition-all flex justify-between items-center gap-2"
              >
                <span className="font-serif italic text-xs text-stone-300 truncate">{playlist.name}</span>
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
  );

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="fixed inset-0 z-[6000] flex flex-col bg-[#050505] text-stone-100 overflow-hidden select-none"
    >
      {/* Top bar */}
      <header className="h-14 md:h-16 border-b border-stone-850 px-3 md:px-6 flex justify-between items-center bg-[#0C0C0D] z-50 shrink-0">
        <button onClick={onCancel} className="flex items-center gap-2 md:gap-3 group min-h-11">
          <div className="p-1.5 border border-stone-800 group-hover:bg-stone-900 group-hover:text-amber-500 transition-all text-stone-400">
            <X size={14} />
          </div>
          <span className="font-mono text-[9px] uppercase tracking-widest font-black text-stone-400 group-hover:text-stone-200 hidden sm:inline">
            [ Close Workspace ]
          </span>
        </button>

        <span className="hidden lg:inline font-mono text-[9px] uppercase tracking-widest bg-amber-500/10 border border-amber-500/20 text-amber-500 px-2 py-1 font-black">
          Mimi Infinite Studio // Active Canvas
        </span>

        <button
          onClick={() => onFinalize(elements, { pan, zoom, positions, materiality, taggedProducts })}
          className="px-3 md:px-5 min-h-11 py-2 border border-stone-800 text-stone-300 hover:border-amber-500/50 hover:text-amber-500 font-mono text-[9px] uppercase tracking-widest font-black transition-all flex items-center gap-2"
        >
          <span className="hidden sm:inline">[ Secure Artifact ]</span>
          <span className="sm:hidden">Save</span>
          <ArrowRight size={10} />
        </button>
      </header>

      {/* Main workspace layout */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* Desktop: Left Floating Toolpane (Materiality) */}
        <aside className="hidden md:flex absolute left-6 top-6 z-40 w-64 border border-stone-850 p-5 bg-[#0C0C0D]/90 backdrop-blur-md shadow-2xl flex-col gap-4 max-h-[calc(100%-3rem)] overflow-y-auto no-scrollbar">
          <div className="flex items-center gap-2 border-b border-stone-800 pb-2">
            <SlidersHorizontal size={12} className="text-amber-500" />
            <span className="font-mono text-[9px] uppercase tracking-widest font-black text-stone-300">Aesthetic Materiality</span>
          </div>
          {renderMateriality()}
        </aside>

        {/* Desktop: Viewport Control Bar */}
        <div className="hidden md:flex absolute left-6 bottom-6 z-40 bg-[#0C0C0D]/95 border border-stone-850 p-2 items-center gap-2 shadow-2xl">
          <button onClick={() => handleZoom(1.15)} className="p-1.5 hover:bg-stone-900 hover:text-amber-500 text-stone-400 transition-colors" title="Zoom In"><ZoomIn size={14} /></button>
          <button onClick={() => handleZoom(0.85)} className="p-1.5 hover:bg-stone-900 hover:text-amber-500 text-stone-400 transition-colors" title="Zoom Out"><ZoomOut size={14} /></button>
          <button onClick={resetViewport} className="p-1.5 hover:bg-stone-900 hover:text-amber-500 text-stone-400 transition-colors" title="Reset View"><Maximize2 size={14} /></button>
          <div className="h-4 w-px bg-stone-850" />
          <span className="font-mono text-[8px] uppercase tracking-widest text-stone-500 font-bold px-1">{Math.round(zoom * 100)}%</span>
        </div>

        {/* Desktop: Right Tabbed Integration Drawer */}
        <aside className="hidden md:flex absolute right-6 top-6 bottom-6 z-40 w-80 border border-stone-850 bg-[#0C0C0D]/95 backdrop-blur-md shadow-2xl flex-col overflow-hidden">
          {renderIntegrationTabs()}
          <div className="flex-1 overflow-y-auto p-4 no-scrollbar">{renderIntegrationContent()}</div>
        </aside>

        {/* Infinite Panning and Zooming Canvas */}
        <main
          ref={canvasRef}
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={handleCanvasPointerMove}
          onPointerUp={handleCanvasPointerUp}
          onPointerCancel={handleCanvasPointerUp}
          className={`flex-1 relative overflow-hidden transition-colors duration-1000 ${getMoodboardStyle()}`}
          style={{ cursor: isPanning ? 'grabbing' : 'grab', touchAction: 'none' }}
        >
          {/* Canvas coordinate dot grid background */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.12]"
            style={{
              backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
              backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
              backgroundPosition: `${pan.x}px ${pan.y}px`
            }}
          />

          {/* Connective Thread Lines */}
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
                    key={`line_${idx}`} d={path} fill="none" stroke="#D97706" strokeWidth="1.2"
                    strokeDasharray="4 2" opacity="0.35"
                    initial={{ strokeDashoffset: 0 }} animate={{ strokeDashoffset: -20 }}
                    transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                  />
                );
              })}
            </g>
          </svg>

          {/* Dragging Canvas Viewport */}
          <div style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }} className="absolute inset-0 pointer-events-none">
            {elements.map((el, idx) => {
              const pos = positions[el.id] || { x: 0, y: 0 };
              const isSelected = selectedElementId === el.id;
              const hasShopifyTag = taggedProducts[el.id];
              return (
                <div
                  key={el.id}
                  onPointerDown={(e) => startElementDrag(e, el.id)}
                  style={{ left: `${pos.x}px`, top: `${pos.y}px`, zIndex: el.style.zIndex + (isSelected ? 500 : 0), touchAction: 'none' }}
                  className={`absolute pointer-events-auto w-72 md:w-80 flex flex-col gap-3 p-4 bg-[#0C0C0D]/90 border transition-shadow rounded-sm select-none cursor-grab active:cursor-grabbing ${
                    isSelected ? 'border-amber-500 shadow-[0_0_25px_rgba(217,119,6,0.15)]' : 'border-stone-850 shadow-md hover:border-stone-700'
                  }`}
                >
                  <div className="flex justify-between items-center border-b border-stone-850 pb-2">
                    <span className="font-mono text-[8px] uppercase tracking-widest text-stone-500 font-bold">
                      {el.type === 'image' ? `SHRD_0${idx + 1}` : `REF_0${idx + 1}`} // {el.type === 'image' ? 'IMAGE' : el.type === 'analysis_pin' ? 'DEBRIEF' : 'THOUGHT'}
                    </span>
                    <div className="flex gap-1.5">
                      <button onClick={(e) => { e.stopPropagation(); togglePin(el.id); }} onPointerDown={(e) => e.stopPropagation()} className={`p-1.5 hover:bg-stone-900 transition-colors ${el.style.hasPin ? 'text-amber-500' : 'text-stone-600'}`}>
                        <Pin size={12} fill={el.style.hasPin ? 'currentColor' : 'none'} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); removeElement(el.id); }} onPointerDown={(e) => e.stopPropagation()} className="p-1.5 hover:bg-stone-900 text-stone-600 hover:text-red-500 transition-colors">
                        <Trash2 size={12} />
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
                        <img src={el.content || "/placeholder.svg"} alt={el.notes || 'Moodboard reference'} className="w-full h-full object-cover select-none pointer-events-none" />
                      </div>
                      {el.notes && <p className="font-serif italic text-[11px] text-stone-400 border-l border-stone-850 pl-2 leading-relaxed">{el.notes}</p>}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="max-h-60 overflow-y-auto no-scrollbar">
                        <p className={`${getTypographyClass()} text-xs text-stone-300 leading-relaxed whitespace-pre-wrap`}>{el.content}</p>
                      </div>
                      {el.notes && (
                        <div className="pt-2 border-t border-stone-850/50">
                          <span className="font-mono text-[7px] uppercase tracking-widest text-stone-500 font-bold block mb-0.5">Linked Remark</span>
                          <p className="font-serif italic text-[10px] text-stone-400 leading-relaxed">{el.notes}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {hasShopifyTag && (
                    <div className="mt-2 pt-2 border-t border-emerald-500/10 flex justify-between items-center bg-emerald-500/5 px-2 py-1.5 rounded-sm">
                      <div className="flex gap-1.5 items-center overflow-hidden">
                        <ShoppingBag size={10} className="text-emerald-400 shrink-0" />
                        <span className="font-mono text-[8px] uppercase font-black text-stone-200 truncate">{hasShopifyTag.name}</span>
                      </div>
                      <span className="font-mono text-[8px] font-black text-emerald-400 tracking-wider shrink-0 ml-2">[ {hasShopifyTag.price} BUY ]</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </main>

        {/* Mobile: Bottom Toolbar */}
        <div className="md:hidden absolute bottom-0 inset-x-0 z-40 h-16 border-t border-stone-850 bg-[#0C0C0D]/95 backdrop-blur-md flex items-center justify-around px-2 pb-[env(safe-area-inset-bottom)]">
          <button onClick={() => setMobileSheet('materiality')} className="flex flex-col items-center justify-center gap-1 min-w-11 min-h-11 text-stone-400 active:text-amber-500">
            <SlidersHorizontal size={18} />
            <span className="font-mono text-[7px] uppercase tracking-widest font-black">Material</span>
          </button>
          <button onClick={() => handleZoom(0.83)} aria-label="Zoom out" className="flex items-center justify-center min-w-11 min-h-11 text-stone-400 active:text-amber-500"><ZoomOut size={20} /></button>
          <button onClick={resetViewport} aria-label="Reset view" className="flex flex-col items-center justify-center min-w-11 min-h-11 text-stone-400 active:text-amber-500">
            <Maximize2 size={18} />
            <span className="font-mono text-[7px] uppercase tracking-widest font-bold">{Math.round(zoom * 100)}%</span>
          </button>
          <button onClick={() => handleZoom(1.2)} aria-label="Zoom in" className="flex items-center justify-center min-w-11 min-h-11 text-stone-400 active:text-amber-500"><ZoomIn size={20} /></button>
          <button onClick={() => setMobileSheet('integrations')} className="flex flex-col items-center justify-center gap-1 min-w-11 min-h-11 text-stone-400 active:text-amber-500">
            <LayoutGrid size={18} />
            <span className="font-mono text-[7px] uppercase tracking-widest font-black">Sources</span>
          </button>
        </div>
      </div>

      {/* Mobile: Bottom Sheets */}
      <AnimatePresence>
        {mobileSheet && (
          <div className="md:hidden fixed inset-0 z-[6100]">
            <motion.div className="absolute inset-0 bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileSheet(null)} />
            <motion.div
              className="absolute inset-x-0 bottom-0 max-h-[82vh] bg-[#0C0C0D] border-t border-stone-800 rounded-t-2xl flex flex-col shadow-2xl"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 32, stiffness: 320 }}
              drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={0.2}
              onDragEnd={(_, info) => { if (info.offset.y > 120) setMobileSheet(null); }}
            >
              <div className="pt-3 pb-2 flex flex-col items-center gap-2 border-b border-stone-850 shrink-0">
                <div className="w-10 h-1 rounded-full bg-stone-700" />
                <div className="w-full flex justify-between items-center px-4">
                  <span className="font-mono text-[10px] uppercase tracking-widest font-black text-stone-300 flex items-center gap-2">
                    {mobileSheet === 'materiality' ? <><SlidersHorizontal size={12} className="text-amber-500" /> Aesthetic Materiality</> : <><LayoutGrid size={12} className="text-amber-500" /> Integration Sources</>}
                  </span>
                  <button onClick={() => setMobileSheet(null)} aria-label="Close sheet" className="p-2 -mr-2 text-stone-400 min-w-11 min-h-11 flex items-center justify-end"><X size={16} /></button>
                </div>
              </div>
              {mobileSheet === 'integrations' && <div className="shrink-0">{renderIntegrationTabs()}</div>}
              <div className="flex-1 overflow-y-auto p-4 no-scrollbar overscroll-contain">
                {mobileSheet === 'materiality' ? renderMateriality() : renderIntegrationContent()}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
