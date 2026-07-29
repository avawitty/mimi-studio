import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChamberShell } from './ChamberShell';
import {
  Plus,
  Trash2,
  Type,
  Palette,
  Upload,
  X,
  FileImage,
  CheckSquare,
  Square,
  Sparkles,
  Layers,
} from 'lucide-react';
import { addToUsedContext } from '../../services/usedContextService';
import type { MemoryAtom } from '../../types';

interface MoodBoardItem {
  id: string;
  type: 'image' | 'text' | 'color';
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  title?: string;
  colorTheme?: string;
}

interface MoodBoardPage {
  id: string;
  name: string;
  items: MoodBoardItem[];
}

interface MoodBoardStore {
  pages: MoodBoardPage[];
  activePageId: string;
}

const STORAGE_KEY = 'mimi_moodboard_store_v2';
const LEGACY_KEY = 'mimi_moodboard_items';

const PRESET_TEMPLATES = [
  {
    name: 'Architectural Noir',
    items: [
      { id: 'p1', type: 'image', x: 10, y: 15, width: 240, height: 300, content: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80', title: 'Brutalist Shadow' },
      { id: 'p2', type: 'text', x: 45, y: 12, width: 220, height: 140, content: 'Form follows silhouette. Deep charcoal textures, brushed concrete, and razor-sharp linear grids.', title: 'Design Manifesto', colorTheme: 'stone' },
      { id: 'p3', type: 'color', x: 45, y: 55, width: 140, height: 160, content: '#1A1A1A', title: 'Carbon Black' },
      { id: 'p4', type: 'color', x: 62, y: 55, width: 140, height: 160, content: '#E5E5E0', title: 'Raw Plaster' },
      { id: 'p5', type: 'image', x: 70, y: 20, width: 220, height: 260, content: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80', title: 'Interior Void' },
    ] as MoodBoardItem[],
  },
  {
    name: 'Tactile Neutral',
    items: [
      { id: 't1', type: 'image', x: 12, y: 10, width: 260, height: 260, content: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=600&q=80', title: 'Linen Drapery' },
      { id: 't2', type: 'color', x: 12, y: 62, width: 130, height: 150, content: '#DFD5C6', title: 'Warm Oat' },
      { id: 't3', type: 'color', x: 27, y: 62, width: 130, height: 150, content: '#CBBFA8', title: 'Soft Travertine' },
      { id: 't4', type: 'text', x: 48, y: 15, width: 240, height: 160, content: 'An exploration of sensory quietude. Heavy linens, raw ceramic edges, unlacquered brass, and daylight filtration.', title: 'Quiet Luxury', colorTheme: 'amber' },
      { id: 't5', type: 'image', x: 48, y: 52, width: 220, height: 280, content: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=600&q=80', title: 'Sculptural Vase' },
    ] as MoodBoardItem[],
  },
];

const newPageId = () => `page_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

function loadStore(): MoodBoardStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as MoodBoardStore;
      if (parsed?.pages?.length && parsed.activePageId) return parsed;
    }
  } catch {
    /* fall through */
  }

  try {
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const items = JSON.parse(legacy) as MoodBoardItem[];
      const page: MoodBoardPage = { id: newPageId(), name: 'Page 1', items: Array.isArray(items) ? items : [] };
      return { pages: [page], activePageId: page.id };
    }
  } catch {
    /* fall through */
  }

  const page: MoodBoardPage = {
    id: newPageId(),
    name: 'Page 1',
    items: PRESET_TEMPLATES[0].items,
  };
  return { pages: [page], activePageId: page.id };
}

function itemToAtom(item: MoodBoardItem, pageName: string): MemoryAtom {
  const content =
    item.type === 'image'
      ? `[Moodboard image] ${item.title || 'Visual reference'}\n${item.content.slice(0, 200)}`
      : item.type === 'color'
        ? `[Swatch] ${item.title || 'Color'} · ${item.content}`
        : item.content;
  return {
    id: `mood_${item.id}_${Date.now()}`,
    projectId: 'moodboard',
    title: item.title || `${item.type} · ${pageName}`,
    content,
    timestamp: Date.now(),
    source: 'moodboard',
    tags: ['moodboard', item.type, pageName],
  };
}

export const MoodBoardChamber: React.FC = () => {
  const [store, setStore] = useState<MoodBoardStore>(() => loadStore());
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [multiSelect, setMultiSelect] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [synthOpen, setSynthOpen] = useState(false);
  const [synthNotice, setSynthNotice] = useState<string | null>(null);

  const dragInfo = useRef<{
    itemId: string;
    startX: number;
    startY: number;
    startLeft: number;
    startTop: number;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const itemsRef = useRef<MoodBoardItem[]>([]);

  const activePage = useMemo(
    () => store.pages.find((p) => p.id === store.activePageId) ?? store.pages[0],
    [store],
  );
  const items = activePage?.items ?? [];

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const persist = (next: MoodBoardStore) => {
    setStore(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const updateActiveItems = (nextItems: MoodBoardItem[]) => {
    const pages = store.pages.map((p) =>
      p.id === store.activePageId ? { ...p, items: nextItems } : p,
    );
    persist({ ...store, pages });
  };

  const addPage = () => {
    const page: MoodBoardPage = {
      id: newPageId(),
      name: `Page ${store.pages.length + 1}`,
      items: [],
    };
    persist({
      pages: [...store.pages, page],
      activePageId: page.id,
    });
    setSelectedIds(new Set());
    setSelectedItemId(null);
  };

  const renamePage = (id: string, name: string) => {
    persist({
      ...store,
      pages: store.pages.map((p) => (p.id === id ? { ...p, name } : p)),
    });
  };

  const deletePage = (id: string) => {
    if (store.pages.length <= 1) return;
    const pages = store.pages.filter((p) => p.id !== id);
    persist({
      pages,
      activePageId: store.activePageId === id ? pages[0].id : store.activePageId,
    });
  };

  const addStickyNote = () => {
    const id = 'sticky_' + Math.random().toString(36).substring(2, 9);
    const newItem: MoodBoardItem = {
      id,
      type: 'text',
      x: 30 + Math.random() * 20,
      y: 30 + Math.random() * 20,
      width: 220,
      height: 150,
      content: 'Double-click to write down your concept, quote, or design guidelines.',
      title: 'Design Note',
      colorTheme: ['stone', 'slate', 'amber', 'rose'][Math.floor(Math.random() * 4)],
    };
    updateActiveItems([...itemsRef.current, newItem]);
    setSelectedItemId(id);
  };

  const addColorSwatch = () => {
    const id = 'color_' + Math.random().toString(36).substring(2, 9);
    const hexColors = ['#1E293B', '#F1F5F9', '#D97706', '#BE123C', '#0F766E', '#475569', '#E2E8F0'];
    const newItem: MoodBoardItem = {
      id,
      type: 'color',
      x: 35 + Math.random() * 20,
      y: 35 + Math.random() * 20,
      width: 140,
      height: 160,
      content: hexColors[Math.floor(Math.random() * hexColors.length)],
      title: 'Palette Accent',
    };
    updateActiveItems([...itemsRef.current, newItem]);
    setSelectedItemId(id);
  };

  const addImageFromUrl = (url: string) => {
    const id = 'img_' + Math.random().toString(36).substring(2, 9);
    const newItem: MoodBoardItem = {
      id,
      type: 'image',
      x: 20 + Math.random() * 20,
      y: 20 + Math.random() * 20,
      width: 240,
      height: 280,
      content: url,
      title: 'Visual Reference',
    };
    updateActiveItems([...itemsRef.current, newItem]);
    setSelectedItemId(id);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files?.[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) addImageFromUrl(event.target.result as string);
      };
      reader.readAsDataURL(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file?.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) addImageFromUrl(event.target.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleItemMouseDown = (e: React.MouseEvent, item: MoodBoardItem) => {
    if (
      (e.target as HTMLElement).closest('.action-btn') ||
      (e.target as HTMLElement).tagName === 'INPUT' ||
      (e.target as HTMLElement).tagName === 'TEXTAREA'
    ) {
      return;
    }
    e.preventDefault();
    if (multiSelect) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(item.id)) next.delete(item.id);
        else next.add(item.id);
        return next;
      });
      return;
    }
    setSelectedItemId(item.id);
    setIsDragging(true);
    if (containerRef.current) {
      dragInfo.current = {
        itemId: item.id,
        startX: e.clientX,
        startY: e.clientY,
        startLeft: item.x,
        startTop: item.y,
      };
    }
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDragging || !dragInfo.current || !containerRef.current) return;
      const info = dragInfo.current;
      const rect = containerRef.current.getBoundingClientRect();
      const dxPercent = ((e.clientX - info.startX) / rect.width) * 100;
      const dyPercent = ((e.clientY - info.startY) / rect.height) * 100;
      const newX = Math.max(0, Math.min(95, info.startLeft + dxPercent));
      const newY = Math.max(0, Math.min(95, info.startTop + dyPercent));
      setStore((prev) => {
        const pages = prev.pages.map((p) => {
          if (p.id !== prev.activePageId) return p;
          const updatedItems = p.items.map((item) =>
            item.id === info.itemId ? { ...item, x: newX, y: newY } : item,
          );
          itemsRef.current = updatedItems;
          return { ...p, items: updatedItems };
        });
        return { ...prev, pages };
      });
    };

    const handleGlobalMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        dragInfo.current = null;
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            ...store,
            pages: store.pages.map((p) =>
              p.id === store.activePageId ? { ...p, items: itemsRef.current } : p,
            ),
          }),
        );
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleGlobalMouseMove, { passive: true });
      window.addEventListener('mouseup', handleGlobalMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, store]);

  const deleteItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    updateActiveItems(items.filter((item) => item.id !== id));
    if (selectedItemId === id) setSelectedItemId(null);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const updateItemContent = (id: string, updates: Partial<MoodBoardItem>) => {
    updateActiveItems(items.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  };

  const clearCanvas = () => {
    if (window.confirm('Clear the current moodboard page?')) {
      updateActiveItems([]);
      setSelectedIds(new Set());
    }
  };

  const loadTemplate = (templateIndex: number) => {
    updateActiveItems(PRESET_TEMPLATES[templateIndex].items);
  };

  const selectedItems = items.filter((i) => selectedIds.has(i.id));

  const synthesize = (target: 'studio' | 'tailor' | 'oracle') => {
    if (!selectedItems.length) return;
    const pageName = activePage?.name || 'Page';
    const atoms = selectedItems.map((item) => itemToAtom(item, pageName));

    if (target === 'studio') {
      atoms.forEach((atom) => addToUsedContext(atom, 'studio'));
      setSynthNotice(`${atoms.length} shard${atoms.length === 1 ? '' : 's'} queued in Studio Used Context.`);
      window.dispatchEvent(
        new CustomEvent('mimi:change_view', { detail: 'studio' }),
      );
    } else if (target === 'tailor') {
      const digest = atoms
        .map((a) => `• ${a.title}: ${a.content.slice(0, 120)}`)
        .join('\n');
      sessionStorage.setItem('mimi_moodboard_evidence_digest', digest);
      setSynthNotice('Selection packed for Evidence Intake.');
      window.dispatchEvent(
        new CustomEvent('mimi:change_view', { detail: 'tailor/evidence' }),
      );
    } else {
      const note = atoms.map((a) => `${a.title}\n${a.content}`).join('\n\n---\n\n');
      sessionStorage.setItem('mimi_oracle_chamber_seed', note);
      setSynthNotice('Selection sent to Oracle Chamber notes.');
      window.dispatchEvent(
        new CustomEvent('mimi:change_view', { detail: 'oracle' }),
      );
    }
    setSynthOpen(false);
    setMultiSelect(false);
    setSelectedIds(new Set());
  };

  return (
    <ChamberShell
      moduleId="mood-board"
      actions={
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setMultiSelect((v) => !v);
              setSelectedIds(new Set());
              setSynthOpen(false);
            }}
            className={`px-3 py-1.5 border font-mono text-[9px] uppercase tracking-wider flex items-center gap-1.5 transition-colors ${
              multiSelect
                ? 'bg-stone-900 text-white border-stone-900'
                : 'bg-white border-nous-border hover:bg-stone-50 text-nous-text'
            }`}
            title="Multi-select"
          >
            {multiSelect ? <CheckSquare size={12} /> : <Square size={12} />}
            <span>Select</span>
          </button>
          {multiSelect && selectedIds.size > 0 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setSynthOpen((v) => !v)}
                className="px-3 py-1.5 bg-stone-900 text-white border border-stone-900 font-mono text-[9px] uppercase tracking-wider flex items-center gap-1.5"
              >
                <Sparkles size={12} />
                Synthesize ({selectedIds.size})
              </button>
              {synthOpen && (
                <div className="absolute right-0 top-full mt-1 z-50 min-w-[200px] border border-nous-border bg-white shadow-lg py-1">
                  {[
                    { id: 'studio' as const, label: 'Studio Used Context' },
                    { id: 'tailor' as const, label: 'Tailor Evidence Intake' },
                    { id: 'oracle' as const, label: 'Oracle Chamber notes' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => synthesize(opt.id)}
                      className="w-full text-left px-3 py-2 font-mono text-[9px] uppercase tracking-wider text-stone-700 hover:bg-stone-50"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={addStickyNote}
            className="px-3 py-1.5 bg-white border border-nous-border hover:bg-stone-50 text-nous-text font-mono text-[9px] uppercase tracking-wider flex items-center gap-1.5 transition-colors"
          >
            <Type size={12} />
            <span>Note</span>
          </button>
          <button
            type="button"
            onClick={addColorSwatch}
            className="px-3 py-1.5 bg-white border border-nous-border hover:bg-stone-50 text-nous-text font-mono text-[9px] uppercase tracking-wider flex items-center gap-1.5 transition-colors"
          >
            <Palette size={12} />
            <span>Color</span>
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 bg-white border border-nous-border hover:bg-stone-50 text-nous-text font-mono text-[9px] uppercase tracking-wider flex items-center gap-1.5 transition-colors"
          >
            <Upload size={12} />
            <span>Upload</span>
          </button>
          <button
            type="button"
            onClick={clearCanvas}
            className="px-3 py-1.5 bg-stone-100 hover:bg-red-50 text-stone-600 hover:text-red-600 border border-nous-border font-mono text-[9px] uppercase tracking-wider flex items-center gap-1.5 transition-colors"
          >
            <Trash2 size={12} />
            <span>Clear</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            className="hidden"
          />
        </div>
      }
    >
      <div className="flex flex-col h-full min-h-0 bg-stone-50">
        {/* Page strip */}
        <div className="flex items-center gap-1 px-3 py-2 border-b border-nous-border bg-white overflow-x-auto no-scrollbar shrink-0">
          <Layers size={12} className="text-nous-subtle shrink-0 mr-1" />
          {store.pages.map((page) => {
            const active = page.id === store.activePageId;
            return (
              <div
                key={page.id}
                className={`flex items-center gap-1 border px-2 py-1 shrink-0 ${
                  active ? 'border-stone-800 bg-stone-900 text-white' : 'border-nous-border bg-stone-50 text-stone-600'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    persist({ ...store, activePageId: page.id });
                    setSelectedIds(new Set());
                    setSelectedItemId(null);
                  }}
                  className="font-mono text-[9px] uppercase tracking-wider"
                >
                  {page.name}
                </button>
                {active && (
                  <input
                    type="text"
                    value={page.name}
                    onChange={(e) => renamePage(page.id, e.target.value)}
                    className="w-16 bg-transparent border-b border-white/30 font-mono text-[8px] focus:outline-none"
                    aria-label="Rename page"
                  />
                )}
                {store.pages.length > 1 && (
                  <button
                    type="button"
                    onClick={() => deletePage(page.id)}
                    className="opacity-60 hover:opacity-100"
                    title="Delete page"
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
            );
          })}
          <button
            type="button"
            onClick={addPage}
            className="px-2 py-1 border border-dashed border-nous-border font-mono text-[9px] uppercase tracking-wider text-stone-500 hover:text-stone-800 flex items-center gap-1 shrink-0"
          >
            <Plus size={10} /> Page
          </button>
          {synthNotice && (
            <span className="ml-auto font-mono text-[8px] uppercase tracking-wider text-amber-700 truncate max-w-[40%]">
              {synthNotice}
            </span>
          )}
        </div>

        <div className="flex flex-col md:flex-row flex-1 min-h-0">
          <div className="w-full md:w-64 shrink-0 max-h-[28vh] md:max-h-none border-b md:border-b-0 md:border-r border-nous-border bg-white flex flex-col min-h-0 select-none overflow-y-auto">
            <div className="p-4 border-b border-nous-border">
              <h3 className="font-serif italic text-base">Mood Board Maker</h3>
              <p className="font-mono text-[8px] uppercase tracking-widest text-nous-subtle mt-1">
                Pages · Select · Synthesize
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              <div>
                <span className="block font-mono text-[8px] uppercase tracking-widest text-nous-subtle mb-3">
                  TEMPLATES
                </span>
                <div className="space-y-2">
                  {PRESET_TEMPLATES.map((tpl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => loadTemplate(idx)}
                      className="w-full text-left p-3 border border-nous-border bg-stone-50 hover:bg-stone-100/50 hover:border-stone-400 transition-all group"
                    >
                      <span className="font-serif italic text-sm text-stone-800 group-hover:text-stone-900 block">
                        {tpl.name}
                      </span>
                      <span className="font-mono text-[8px] text-stone-500 uppercase mt-1 block">
                        {tpl.items.length} Elements
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="block font-mono text-[8px] uppercase tracking-widest text-nous-subtle mb-3">
                  QUICK IMAGES
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    'https://images.unsplash.com/photo-1490730141103-6cac27aaab94?auto=format&fit=crop&w=300&q=80',
                    'https://images.unsplash.com/photo-1511556532299-8f662fc26c06?auto=format&fit=crop&w=300&q=80',
                    'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=300&q=80',
                    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=300&q=80',
                  ].map((url, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => addImageFromUrl(url)}
                      className="aspect-square w-full border border-nous-border overflow-hidden hover:border-stone-400 active:scale-95 transition-all relative group"
                    >
                      <img
                        src={url}
                        alt="Preset"
                        className="object-cover w-full h-full transition-transform group-hover:scale-105"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Plus className="text-white" size={14} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-nous-border bg-stone-50 font-mono text-[9px] text-stone-500 leading-relaxed space-y-1">
              <p>Pages hold separate canvases.</p>
              <p>Select → Synthesize pushes shards out.</p>
            </div>
          </div>

          <div
            ref={containerRef}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="flex-1 min-h-[62vh] md:min-h-0 relative overflow-hidden bg-white bg-[linear-gradient(to_right,rgba(0,0,0,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.04)_1px,transparent_1px)] [background-size:24px_24px] p-4 md:p-8 h-full touch-pan-y"
            onClick={() => {
              if (!multiSelect) setSelectedItemId(null);
              setSynthOpen(false);
            }}
          >
            {items.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center pointer-events-none">
                <FileImage size={40} className="text-stone-300 mb-4 animate-pulse" />
                <h4 className="font-serif italic text-lg text-stone-400">Your Canvas is Waiting</h4>
                <p className="font-mono text-[9px] text-stone-400 uppercase mt-2 max-w-sm leading-relaxed">
                  Add elements, load a template, or drop images onto this page.
                </p>
              </div>
            ) : (
              items.map((item) => {
                const isSelected = multiSelect
                  ? selectedIds.has(item.id)
                  : selectedItemId === item.id;
                return (
                  <div
                    key={item.id}
                    style={{
                      position: 'absolute',
                      left: `${item.x}%`,
                      top: `${item.y}%`,
                      width: `${item.width}px`,
                      zIndex: isSelected ? 40 : 10,
                    }}
                    onMouseDown={(e) => handleItemMouseDown(e, item)}
                    className={`group bg-white border transition-shadow flex flex-col overflow-hidden shadow-sm ${
                      isSelected
                        ? 'border-stone-800 shadow-xl ring-2 ring-stone-800/20'
                        : 'border-nous-border hover:border-stone-400 hover:shadow-md'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (multiSelect) {
                        setSelectedIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(item.id)) next.delete(item.id);
                          else next.add(item.id);
                          return next;
                        });
                      } else {
                        setSelectedItemId(item.id);
                      }
                    }}
                  >
                    <div className="px-3 py-1.5 border-b border-nous-border bg-stone-50 select-none flex items-center justify-between cursor-move">
                      <span className="font-mono text-[8px] uppercase tracking-widest text-nous-subtle font-black flex items-center gap-1.5">
                        {multiSelect && (
                          isSelected ? <CheckSquare size={10} /> : <Square size={10} />
                        )}
                        {item.type}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => deleteItem(item.id, e)}
                        className="action-btn p-0.5 rounded text-stone-400 hover:text-stone-800 hover:bg-stone-100 transition-colors"
                        title="Delete"
                      >
                        <X size={10} />
                      </button>
                    </div>

                    <div className="flex-grow p-1">
                      {item.type === 'image' && (
                        <div className="relative overflow-hidden w-full h-full min-h-[160px]">
                          <img
                            src={item.content}
                            alt={item.title || 'Moodboard image'}
                            className="object-cover w-full h-full pointer-events-none select-none max-h-[400px]"
                            referrerPolicy="no-referrer"
                          />
                          <input
                            type="text"
                            value={item.title || ''}
                            placeholder="Caption..."
                            onChange={(e) => updateItemContent(item.id, { title: e.target.value })}
                            className="w-full text-center py-1 text-[10px] font-sans font-medium bg-white text-stone-700 border-t border-nous-border focus:outline-none focus:bg-stone-50"
                          />
                        </div>
                      )}
                      {item.type === 'text' && (
                        <div
                          className={`p-4 min-h-[100px] flex flex-col justify-between ${
                            item.colorTheme === 'amber'
                              ? 'bg-amber-50/50'
                              : item.colorTheme === 'rose'
                                ? 'bg-rose-50/50'
                                : item.colorTheme === 'slate'
                                  ? 'bg-slate-50'
                                  : 'bg-stone-50/50'
                          }`}
                        >
                          <input
                            type="text"
                            value={item.title || ''}
                            placeholder="Note Title..."
                            onChange={(e) => updateItemContent(item.id, { title: e.target.value })}
                            className="font-serif italic font-semibold text-xs border-b border-transparent focus:border-stone-300 focus:outline-none bg-transparent pb-1 mb-2 text-stone-800 w-full"
                          />
                          <textarea
                            value={item.content}
                            onChange={(e) => updateItemContent(item.id, { content: e.target.value })}
                            placeholder="Write something..."
                            className="font-sans text-[11px] leading-relaxed text-stone-600 bg-transparent resize-none focus:outline-none h-24 w-full"
                          />
                        </div>
                      )}
                      {item.type === 'color' && (
                        <div className="p-3 bg-white">
                          <div
                            className="w-full h-24 border border-nous-border shadow-inner"
                            style={{ backgroundColor: item.content }}
                          />
                          <div className="mt-2.5 space-y-1.5 select-none">
                            <input
                              type="text"
                              value={item.title || ''}
                              placeholder="Color Name..."
                              onChange={(e) => updateItemContent(item.id, { title: e.target.value })}
                              className="font-sans text-[10px] font-semibold tracking-wider text-stone-700 border-b border-transparent focus:border-stone-300 focus:outline-none bg-transparent w-full"
                            />
                            <div className="flex gap-2 items-center">
                              <input
                                type="color"
                                value={item.content}
                                onChange={(e) => updateItemContent(item.id, { content: e.target.value })}
                                className="w-5 h-5 border border-nous-border cursor-pointer bg-transparent"
                              />
                              <span className="font-mono text-[9px] text-stone-400 font-bold uppercase tracking-wider">
                                {item.content}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </ChamberShell>
  );
};
