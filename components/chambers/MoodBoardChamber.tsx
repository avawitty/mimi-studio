import React, { useState, useEffect, useRef } from 'react';
import { ChamberShell } from './ChamberShell';
import { 
  Plus, 
  Trash2, 
  Image as ImageIcon, 
  Type, 
  Palette, 
  Maximize2, 
  Sparkles, 
  Download, 
  Upload, 
  FolderPlus,
  RefreshCw,
  X,
  FileImage
} from 'lucide-react';

interface MoodBoardItem {
  id: string;
  type: 'image' | 'text' | 'color';
  x: number; // percentage (0-100)
  y: number; // percentage (0-100)
  width: number; // pixels
  height: number; // pixels
  content: string; // Base64 or Unsplash URL, text, or hex color
  title?: string;
  colorTheme?: string; // for sticky notes
}

const PRESET_TEMPLATES = [
  {
    name: "Architectural Noir",
    items: [
      { id: "p1", type: "image", x: 10, y: 15, width: 240, height: 300, content: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80", title: "Brutalist Shadow" },
      { id: "p2", type: "text", x: 45, y: 12, width: 220, height: 140, content: "Form follows silhouette. Deep charcoal textures, brushed concrete, and razor-sharp linear grids.", title: "Design Manifesto", colorTheme: "stone" },
      { id: "p3", type: "color", x: 45, y: 55, width: 140, height: 160, content: "#1A1A1A", title: "Carbon Black" },
      { id: "p4", type: "color", x: 62, y: 55, width: 140, height: 160, content: "#E5E5E0", title: "Raw Plaster" },
      { id: "p5", type: "image", x: 70, y: 20, width: 220, height: 260, content: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80", title: "Interior Void" }
    ]
  },
  {
    name: "Tactile Neutral",
    items: [
      { id: "t1", type: "image", x: 12, y: 10, width: 260, height: 260, content: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=600&q=80", title: "Linen Drapery" },
      { id: "t2", type: "color", x: 12, y: 62, width: 130, height: 150, content: "#DFD5C6", title: "Warm Oat" },
      { id: "t3", type: "color", x: 27, y: 62, width: 130, height: 150, content: "#CBBFA8", title: "Soft Travertine" },
      { id: "t4", type: "text", x: 48, y: 15, width: 240, height: 160, content: "An exploration of sensory quietude. Heavy linens, raw ceramic edges, unlacquered brass, and daylight filtration.", title: "Quiet Luxury", colorTheme: "amber" },
      { id: "t5", type: "image", x: 48, y: 52, width: 220, height: 280, content: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=600&q=80", title: "Sculptural Vase" }
    ]
  }
];

export const MoodBoardChamber: React.FC = () => {
  const [items, setItems] = useState<MoodBoardItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Dragging state helper
  const dragInfo = useRef<{
    itemId: string;
    startX: number;
    startY: number;
    startLeft: number;
    startTop: number;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('mimi_moodboard_items');
    if (saved) {
      try {
        setItems(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse moodboard items", e);
        setItems(PRESET_TEMPLATES[0].items as MoodBoardItem[]);
      }
    } else {
      setItems(PRESET_TEMPLATES[0].items as MoodBoardItem[]);
    }
  }, []);

  // Save to local storage
  const saveBoard = (newItems: MoodBoardItem[]) => {
    setItems(newItems);
    localStorage.setItem('mimi_moodboard_items', JSON.stringify(newItems));
  };

  // Add Item actions
  const addStickyNote = () => {
    const id = "sticky_" + Math.random().toString(36).substring(2, 9);
    const newItem: MoodBoardItem = {
      id,
      type: 'text',
      x: 30 + Math.random() * 20,
      y: 30 + Math.random() * 20,
      width: 220,
      height: 150,
      content: "Double-click to write down your concept, quote, or design guidelines.",
      title: "Design Note",
      colorTheme: ['stone', 'slate', 'amber', 'rose'][Math.floor(Math.random() * 4)]
    };
    saveBoard([...items, newItem]);
    setSelectedItemId(id);
  };

  const addColorSwatch = () => {
    const id = "color_" + Math.random().toString(36).substring(2, 9);
    const hexColors = ["#1E293B", "#F1F5F9", "#D97706", "#BE123C", "#0F766E", "#475569", "#E2E8F0"];
    const newItem: MoodBoardItem = {
      id,
      type: 'color',
      x: 35 + Math.random() * 20,
      y: 35 + Math.random() * 20,
      width: 140,
      height: 160,
      content: hexColors[Math.floor(Math.random() * hexColors.length)],
      title: "Palette Accent"
    };
    saveBoard([...items, newItem]);
    setSelectedItemId(id);
  };

  const addImageFromUrl = (url: string) => {
    const id = "img_" + Math.random().toString(36).substring(2, 9);
    const newItem: MoodBoardItem = {
      id,
      type: 'image',
      x: 20 + Math.random() * 20,
      y: 20 + Math.random() * 20,
      width: 240,
      height: 280,
      content: url,
      title: "Visual Reference"
    };
    saveBoard([...items, newItem]);
    setSelectedItemId(id);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          addImageFromUrl(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Drag and drop file handling
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            addImageFromUrl(event.target.result as string);
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  // Mouse drag operations for moving cards
  const handleItemMouseDown = (e: React.MouseEvent, item: MoodBoardItem) => {
    if ((e.target as HTMLElement).closest('.action-btn') || (e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') {
      return; // Ignore if clicking button or input
    }
    
    e.preventDefault();
    setSelectedItemId(item.id);
    setIsDragging(true);

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      // Store start position
      dragInfo.current = {
        itemId: item.id,
        startX: e.clientX,
        startY: e.clientY,
        startLeft: item.x,
        startTop: item.y
      };
    }
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDragging || !dragInfo.current || !containerRef.current) return;
      
      const info = dragInfo.current;
      const rect = containerRef.current.getBoundingClientRect();
      
      // Calculate delta in pixels
      const dxPixels = e.clientX - info.startX;
      const dyPixels = e.clientY - info.startY;
      
      // Convert to percentage
      const dxPercent = (dxPixels / rect.width) * 100;
      const dyPercent = (dyPixels / rect.height) * 100;
      
      // Compute new values
      const newX = Math.max(0, Math.min(95, info.startLeft + dxPercent));
      const newY = Math.max(0, Math.min(95, info.startTop + dyPercent));
      
      setItems(prev => prev.map(item => {
        if (item.id === info.itemId) {
          return { ...item, x: newX, y: newY };
        }
        return item;
      }));
    };

    const handleGlobalMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        dragInfo.current = null;
        // Save current positions to local storage
        localStorage.setItem('mimi_moodboard_items', JSON.stringify(items));
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, items]);

  const deleteItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = items.filter(item => item.id !== id);
    saveBoard(filtered);
    if (selectedItemId === id) setSelectedItemId(null);
  };

  const updateItemContent = (id: string, updates: Partial<MoodBoardItem>) => {
    const updated = items.map(item => {
      if (item.id === id) {
        return { ...item, ...updates };
      }
      return item;
    });
    saveBoard(updated);
  };

  const clearCanvas = () => {
    if (window.confirm("Are you sure you want to clear your current mood board?")) {
      saveBoard([]);
    }
  };

  const loadTemplate = (templateIndex: number) => {
    saveBoard(PRESET_TEMPLATES[templateIndex].items as MoodBoardItem[]);
  };

  return (
    <ChamberShell 
      moduleId="mood-board"
      actions={
        <div className="flex items-center gap-2">
          <button 
            onClick={addStickyNote}
            className="px-3 py-1.5 bg-white border border-nous-border hover:bg-stone-50 text-nous-text font-mono text-[9px] uppercase tracking-wider flex items-center gap-1.5 transition-colors"
            title="Add Sticky Note"
          >
            <Type size={12} />
            <span>Note</span>
          </button>
          <button 
            onClick={addColorSwatch}
            className="px-3 py-1.5 bg-white border border-nous-border hover:bg-stone-50 text-nous-text font-mono text-[9px] uppercase tracking-wider flex items-center gap-1.5 transition-colors"
            title="Add Color Swatch"
          >
            <Palette size={12} />
            <span>Color</span>
          </button>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 bg-white border border-nous-border hover:bg-stone-50 text-nous-text font-mono text-[9px] uppercase tracking-wider flex items-center gap-1.5 transition-colors"
            title="Upload Image"
          >
            <Upload size={12} />
            <span>Upload Image</span>
          </button>
          <button 
            onClick={clearCanvas}
            className="px-3 py-1.5 bg-stone-100 hover:bg-red-50 text-stone-600 hover:text-red-600 border border-nous-border font-mono text-[9px] uppercase tracking-wider flex items-center gap-1.5 transition-colors"
            title="Clear Board"
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
      <div className="flex h-full min-h-0 bg-stone-50">
        {/* Left Sidebar - Templates and Gallery */}
        <div className="w-64 border-r border-nous-border bg-white flex flex-col min-h-0 select-none">
          <div className="p-4 border-b border-nous-border">
            <h3 className="font-serif italic text-base">Mood Board Maker</h3>
            <p className="font-mono text-[8px] uppercase tracking-widest text-nous-subtle mt-1">Creative Canvas</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Quick Templates */}
            <div>
              <span className="block font-mono text-[8px] uppercase tracking-widest text-nous-subtle mb-3">TEMPLATES</span>
              <div className="space-y-2">
                {PRESET_TEMPLATES.map((tpl, idx) => (
                  <button
                    key={idx}
                    onClick={() => loadTemplate(idx)}
                    className="w-full text-left p-3 border border-nous-border bg-stone-50 hover:bg-stone-100/50 hover:border-stone-400 transition-all group"
                  >
                    <span className="font-serif italic text-sm text-stone-800 group-hover:text-stone-900 block">{tpl.name}</span>
                    <span className="font-mono text-[8px] text-stone-500 uppercase mt-1 block">{tpl.items.length} Elements</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Presets */}
            <div>
              <span className="block font-mono text-[8px] uppercase tracking-widest text-nous-subtle mb-3">QUICK IMAGES</span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  "https://images.unsplash.com/photo-1490730141103-6cac27aaab94?auto=format&fit=crop&w=300&q=80",
                  "https://images.unsplash.com/photo-1511556532299-8f662fc26c06?auto=format&fit=crop&w=300&q=80",
                  "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=300&q=80",
                  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=300&q=80",
                  "https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=300&q=80",
                  "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=300&q=80"
                ].map((url, i) => (
                  <button
                    key={i}
                    onClick={() => addImageFromUrl(url)}
                    className="aspect-square w-full border border-nous-border overflow-hidden hover:border-stone-400 active:scale-95 transition-all relative group"
                  >
                    <img src={url} alt="Preset image" className="object-cover w-full h-full transition-transform group-hover:scale-105" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Plus className="text-white" size={14} />
                    </div>
                  </button>
                ))}
              </div>
              <p className="font-mono text-[8px] text-stone-400 mt-2 text-center">Click preset to drop on canvas</p>
            </div>
          </div>

          <div className="p-4 border-t border-nous-border bg-stone-50 font-mono text-[9px] text-stone-500 leading-relaxed space-y-1">
            <p>💡 Drag elements to position them.</p>
            <p>💡 Double-click text to edit.</p>
            <p>💡 Drop local images directly onto the canvas.</p>
          </div>
        </div>

        {/* Mood Board Canvas */}
        <div 
          ref={containerRef}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="flex-1 relative overflow-hidden bg-stone-100 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] p-8 h-full"
          onClick={() => setSelectedItemId(null)}
        >
          {items.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center pointer-events-none">
              <FileImage size={40} className="text-stone-300 mb-4 animate-pulse" />
              <h4 className="font-serif italic text-lg text-stone-400">Your Canvas is Waiting</h4>
              <p className="font-mono text-[9px] text-stone-400 uppercase mt-2 max-w-sm leading-relaxed">
                Add elements using the top toolbar, click templates on the left, or drag-and-drop raw images from your desktop.
              </p>
            </div>
          ) : (
            items.map((item) => {
              const isSelected = selectedItemId === item.id;
              
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
                    isSelected ? 'border-stone-800 shadow-xl' : 'border-nous-border hover:border-stone-400 hover:shadow-md'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedItemId(item.id);
                  }}
                >
                  {/* Card Header */}
                  <div className="px-3 py-1.5 border-b border-nous-border bg-stone-50 select-none flex items-center justify-between cursor-move">
                    <span className="font-mono text-[8px] uppercase tracking-widest text-nous-subtle font-black">
                      {item.type}
                    </span>
                    <button
                      onClick={(e) => deleteItem(item.id, e)}
                      className="action-btn p-0.5 rounded text-stone-400 hover:text-stone-800 hover:bg-stone-100 transition-colors"
                      title="Delete"
                    >
                      <X size={10} />
                    </button>
                  </div>

                  {/* Card Body based on item type */}
                  <div className="flex-grow p-1">
                    {item.type === 'image' && (
                      <div className="relative overflow-hidden w-full h-full min-h-[160px]">
                        <img 
                          src={item.content} 
                          alt={item.title || "Moodboard image"} 
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
                      <div className={`p-4 min-h-[100px] flex flex-col justify-between ${
                        item.colorTheme === 'amber' ? 'bg-amber-50/50' :
                        item.colorTheme === 'rose' ? 'bg-rose-50/50' :
                        item.colorTheme === 'slate' ? 'bg-slate-50' : 'bg-stone-50/50'
                      }`}>
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
    </ChamberShell>
  );
};
