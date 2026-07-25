// @ts-nocheck
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { EditorElement, EditorElementStyle, UserProfile, LayoutConfig } from '../types';
import { Maximize, RotateCw, ChevronUp, ChevronDown, Copy, Trash2, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Visualizer } from './Visualizer';

interface SlideCanvasProps {
  id: string;
  elements: EditorElement[];
  isActive: boolean;
  onUpdate: (elements: EditorElement[]) => void;
  onSelect: () => void;
  onElementSelect?: (id: string | null) => void;
  profile: UserProfile | null;
  layoutConfig?: LayoutConfig;
}

// 1. Sleek Floating Context HUD with Boundary Protection
const SelectedElementHUD: React.FC<{
  el: EditorElement;
  elements: EditorElement[];
  onUpdate: (elements: EditorElement[]) => void;
  onDelete: () => void;
  position?: 'top' | 'bottom';
}> = ({ el, elements, onUpdate, onDelete, position = 'top' }) => {
  
  const bringToFront = (e: React.MouseEvent) => {
    e.stopPropagation();
    const maxZ = elements.reduce((max, item) => Math.max(max, item.style.zIndex || 0), 0);
    onUpdate(elements.map(item => item.id === el.id ? {
      ...item, style: { ...item.style, zIndex: maxZ + 1 }
    } : item));
  };

  const sendToBack = (e: React.MouseEvent) => {
    e.stopPropagation();
    const minZ = elements.reduce((min, item) => Math.min(min, item.style.zIndex || 0), 0);
    onUpdate(elements.map(item => item.id === el.id ? {
      ...item, style: { ...item.style, zIndex: minZ - 1 }
    } : item));
  };

  const duplicate = (e: React.MouseEvent) => {
    e.stopPropagation();
    const copyId = `el_${Date.now()}`;
    const copy: EditorElement = {
      ...el,
      id: copyId,
      style: {
        ...el.style,
        left: Math.min(90, (el.style.left || 0) + 4),
        top: Math.min(90, (el.style.top || 0) + 4),
        zIndex: (el.style.zIndex || 0) + 1
      }
    };
    onUpdate([...elements, copy]);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: position === 'top' ? 10 : -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`absolute ${position === 'top' ? '-top-12' : 'top-full mt-4'} left-1/2 -translate-x-1/2 flex items-center bg-white dark:bg-stone-900 border border-stone-850 dark:border-stone-700 text-stone-900 dark:text-stone-100 px-1 py-1 shadow-lg z-[100] h-9 shrink-0 divide-x divide-stone-200 dark:divide-stone-800`}
      onClick={(e) => e.stopPropagation()}
    >
      <button 
        onClick={bringToFront} 
        className="px-2.5 h-full hover:bg-stone-50 dark:hover:bg-stone-800 text-[8px] font-mono font-black uppercase tracking-widest flex items-center gap-1 transition-colors"
        title="Bring to Front"
      >
        <ChevronUp size={10} /> Front
      </button>
      <button 
        onClick={sendToBack} 
        className="px-2.5 h-full hover:bg-stone-50 dark:hover:bg-stone-800 text-[8px] font-mono font-black uppercase tracking-widest flex items-center gap-1 transition-colors"
        title="Send to Back"
      >
        <ChevronDown size={10} /> Back
      </button>
      <button 
        onClick={duplicate} 
        className="px-2.5 h-full hover:bg-stone-50 dark:hover:bg-stone-800 text-[8px] font-mono font-black uppercase tracking-widest flex items-center gap-1 transition-colors"
        title="Clone Element"
      >
        <Copy size={9} /> Clone
      </button>
      <button 
        onClick={onDelete} 
        className="px-2.5 h-full hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 text-[8px] font-mono font-black uppercase tracking-widest flex items-center gap-1 transition-colors border-l border-stone-200 dark:border-stone-800"
        title="Delete"
      >
        <Trash2 size={9} className="text-red-500" /> Del
      </button>
    </motion.div>
  );
};

export const SlideCanvas: React.FC<SlideCanvasProps> = ({ id, elements, isActive, onUpdate, onSelect, onElementSelect, profile, layoutConfig }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialStyle, setInitialStyle] = useState<EditorElementStyle | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Background Pan & Zoom Mechanics
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [initialPan, setInitialPan] = useState({ x: 0, y: 0 });

  // Grid Snapping & Dynamic Guides
  const [activeGuides, setActiveGuides] = useState<{ x: number | null; y: number | null }>({ x: null, y: null });
  const SNAP_THRESHOLD = 1.5; 
  const SNAP_POINTS_X = [5, 10, 50, 90, 95];
  const SNAP_POINTS_Y = [5, 10, 50, 90, 95];

  const getSnappedValue = (val: number, points: number[]): { snapped: number; activePoint: number | null } => {
    for (const point of points) {
      if (Math.abs(val - point) < SNAP_THRESHOLD) {
        return { snapped: point, activePoint: point };
      }
    }
    return { snapped: val, activePoint: null };
  };

  const startPanning = (e: React.MouseEvent | React.TouchEvent) => {
    if (e.target !== e.currentTarget && !(e.target as HTMLElement).classList.contains('canvas-bg')) return;
    e.stopPropagation();
    setIsPanning(true);
    const clientX = 'touches' in e ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY;
    setPanStart({ x: clientX, y: clientY });
    setInitialPan({ ...pan });
  };

  const handlePointerMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (isPanning) {
      const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;
      setPan({
        x: initialPan.x + (clientX - panStart.x),
        y: initialPan.y + (clientY - panStart.y)
      });
      return;
    }

    if ((!isDragging && !isResizing && !isRotating) || !selectedId || !initialStyle || !containerRef.current) return;
    e.preventDefault();
    const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
    const clientY = 'touches' in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;
    const rect = containerRef.current.getBoundingClientRect();

    if (isDragging) {
      const dX = (((clientX - dragStart.x) / rect.width) * 100) / zoom;
      const dY = (((clientY - dragStart.y) / rect.height) * 100) / zoom;
      
      let targetLeft = initialStyle.left + dX;
      let targetTop = initialStyle.top + dY;

      // Dynamic Peer Alignment Coordinate Projection
      const peerSnapPointsX = [...SNAP_POINTS_X];
      const peerSnapPointsY = [...SNAP_POINTS_Y];

      elements.forEach(item => {
        if (item.id !== selectedId && item.style) {
          if (item.style.left !== undefined) {
            peerSnapPointsX.push(item.style.left);
            if (item.style.width !== undefined) {
              peerSnapPointsX.push(item.style.left + item.style.width);
              peerSnapPointsX.push(item.style.left + item.style.width / 2);
            }
          }
          if (item.style.top !== undefined) {
            peerSnapPointsY.push(item.style.top);
          }
        }
      });

      const snapLeft = getSnappedValue(targetLeft, peerSnapPointsX);
      const snapTop = getSnappedValue(targetTop, peerSnapPointsY);

      const el = elements.find(item => item.id === selectedId);
      const elWidth = el?.style.width || 0;
      const centerLeft = targetLeft + elWidth / 2;
      const snapCenter = getSnappedValue(centerLeft, peerSnapPointsX);

      let finalLeft = snapLeft.activePoint !== null ? snapLeft.snapped : targetLeft;
      let finalTop = snapTop.activePoint !== null ? snapTop.snapped : targetTop;
      
      let guideX: number | null = snapLeft.activePoint;
      let guideY: number | null = snapTop.activePoint;

      if (snapCenter.activePoint !== null && snapLeft.activePoint === null) {
        finalLeft = snapCenter.snapped - elWidth / 2;
        guideX = snapCenter.activePoint;
      }

      setActiveGuides({ x: guideX, y: guideY });

      onUpdate(elements.map(el => el.id === selectedId ? { 
        ...el, 
        style: { 
          ...el.style, 
          left: Math.max(-20, Math.min(110, finalLeft)), 
          top: Math.max(-20, Math.min(110, finalTop)) 
        } 
      } : el));

    } else if (isResizing) {
      const dX = (((clientX - dragStart.x) / rect.width) * 100) / zoom;
      onUpdate(elements.map(el => el.id === selectedId ? { 
        ...el, style: { ...el.style, width: Math.max(5, Math.min(100 - el.style.left, initialStyle.width + dX)) } 
      } : el));

    } else if (isRotating) {
      const el = elements.find(item => item.id === selectedId);
      if (!el) return;
      const centerX = rect.left + ((el.style.left + el.style.width / 2) / 100) * rect.width;
      const centerY = rect.top + ((el.style.top + (el.style.width * (rect.width/rect.height)) / 2) / 100) * rect.height; 
      
      const radians = Math.atan2(clientY - centerY, clientX - centerX);
      const degree = (radians * (180 / Math.PI) + 90) % 360;
      
      onUpdate(elements.map(el => el.id === selectedId ? {
        ...el, style: { ...el.style, rotation: degree }
      } : el));
    }
  }, [isDragging, isResizing, isRotating, isPanning, selectedId, dragStart, initialStyle, elements, onUpdate, zoom, panStart, initialPan]);

  const handlePointerUp = useCallback(() => { 
    setIsDragging(false); 
    setIsResizing(false); 
    setIsRotating(false);
    setIsPanning(false);
    setActiveGuides({ x: null, y: null });
  }, []);

  // Keyboard shortcut listener for micro-nudging
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedId || !isActive) return;

      const activeTag = document.activeElement?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || document.activeElement?.hasAttribute('contenteditable')) {
        return;
      }

      const currentEl = elements.find(item => item.id === selectedId);
      if (!currentEl) return;

      const step = e.shiftKey ? 5 : 1; 

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          onUpdate(elements.map(el => el.id === selectedId ? {
            ...el, style: { ...el.style, top: Math.max(-20, (el.style.top || 0) - step) }
          } : el));
          break;
        case 'ArrowDown':
          e.preventDefault();
          onUpdate(elements.map(el => el.id === selectedId ? {
            ...el, style: { ...el.style, top: Math.min(110, (el.style.top || 0) + step) }
          } : el));
          break;
        case 'ArrowLeft':
          e.preventDefault();
          onUpdate(elements.map(el => el.id === selectedId ? {
            ...el, style: { ...el.style, left: Math.max(-20, (el.style.left || 0) - step) }
          } : el));
          break;
        case 'ArrowRight':
          e.preventDefault();
          onUpdate(elements.map(el => el.id === selectedId ? {
            ...el, style: { ...el.style, left: Math.min(110, (el.style.left || 0) + step) }
          } : el));
          break;
        case 'Delete':
        case 'Backspace':
          e.preventDefault();
          onUpdate(elements.filter(el => el.id !== selectedId));
          setSelectedId(null);
          if (onElementSelect) onElementSelect(null);
          break;
        case 'Escape':
          e.preventDefault();
          setSelectedId(null);
          setEditingId(null);
          if (onElementSelect) onElementSelect(null);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, elements, isActive, onUpdate, onElementSelect]);

  useEffect(() => {
    if (isActive) {
      window.addEventListener('mousemove', handlePointerMove); 
      window.addEventListener('mouseup', handlePointerUp);
      window.addEventListener('touchmove', handlePointerMove, { passive: false });
      window.addEventListener('touchend', handlePointerUp);
      return () => { 
        window.removeEventListener('mousemove', handlePointerMove); 
        window.removeEventListener('mouseup', handlePointerUp);
        window.removeEventListener('touchmove', handlePointerMove);
        window.removeEventListener('touchend', handlePointerUp);
      };
    }
  }, [isActive, handlePointerMove, handlePointerUp]);

  const startDrag = (e: React.MouseEvent | React.TouchEvent, id: string) => {
    e.stopPropagation();
    onSelect(); 
    setSelectedId(id);
    if (onElementSelect) onElementSelect(id);
    
    const clientX = 'touches' in e ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY;
    setIsDragging(true); 
    setDragStart({ x: clientX, y: clientY });
    const el = elements.find(item => item.id === id);
    setInitialStyle({ ...el?.style } as EditorElementStyle);
  };

  const startResize = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    const clientX = 'touches' in e ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY;
    setIsResizing(true); 
    setDragStart({ x: clientX, y: clientY });
    const el = elements.find(item => item.id === selectedId);
    setInitialStyle({ ...el?.style } as EditorElementStyle);
  };

  const startRotate = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    const clientX = 'touches' in e ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY;
    setIsRotating(true);
    setDragStart({ x: clientX, y: clientY });
    const el = elements.find(item => item.id === selectedId);
    setInitialStyle({ ...el?.style } as EditorElementStyle);
  };

  const getElementStyle = (el: EditorElement) => {
    const baseStyle = { ...el.style };
    
    if (el.type === 'text' && layoutConfig) {
      if (baseStyle.fontFamily === 'serif' || !baseStyle.fontFamily) {
        baseStyle.fontFamily = layoutConfig.fontSet[0] || 'Cormorant Garamond';
      } else if (baseStyle.fontFamily === 'sans') {
        baseStyle.fontFamily = layoutConfig.fontSet[1] || 'Space Grotesk';
      }
      if (baseStyle.color === 'inherit' || !baseStyle.color) {
        baseStyle.color = layoutConfig.colorSet[0] || '#1C1917';
      } else if (baseStyle.color === 'secondary') {
        baseStyle.color = layoutConfig.colorSet[1] || '#A8A29E';
      }
    }
    return baseStyle;
  };

  return (
    <div 
      ref={containerRef}
      onMouseDown={startPanning}
      onTouchStart={startPanning}
      onClick={() => { setSelectedId(null); setEditingId(null); onSelect(); if(onElementSelect) onElementSelect(null); }}
      className={`relative w-full aspect-[16/9] transition-all duration-500 overflow-hidden canvas-bg ${isPanning ? 'cursor-grabbing' : 'cursor-grab'} ${isActive ? 'ring-1 ring-stone-500/20 ' : 'border border-nous-border '}`}
      style={{ backgroundColor: layoutConfig?.backgroundStyle || '#FFFFFF' }}
    >
      {/* 2. DYNAMIC WORKSPACE COMPOSITION FRAME (Panning & Scaling) */}
      <motion.div
        className="absolute inset-0 w-full h-full origin-center select-none pointer-events-none"
        animate={{ 
          scale: zoom,
          x: pan.x,
          y: pan.y
        }}
        transition={{ type: 'spring', stiffness: 350, damping: 32 }}
      >
        <div className="absolute top-2 right-2 opacity-10 font-mono text-[8px] pointer-events-none">{id.slice(-4)}</div>
        
        {elements.sort((a,b) => (a.style.zIndex || 0) - (b.style.zIndex || 0)).map(el => {
          const finalStyle = getElementStyle(el);
          const isSelected = selectedId === el.id;
          const renderHudBelow = (el.style.top || 0) < 15;
          
          return (
            <motion.div 
              key={el.id} 
              className={`absolute group/el ${isSelected ? 'z-[90]' : ''} cursor-move pointer-events-auto`}
              style={{ 
                top: `${finalStyle.top}%`, 
                left: `${finalStyle.left}%`, 
                width: `${finalStyle.width}%`, 
                zIndex: finalStyle.zIndex,
                rotate: `${finalStyle.rotation || 0}deg`
              }}
              onMouseDown={(e) => startDrag(e, el.id)}
              onTouchStart={(e) => startDrag(e, el.id)}
            >
              {/* SOURCE LABEL */}
              {el.sourceRef && (
                <div className={`absolute -top-6 left-0 bg-stone-900/10 dark:bg-stone-100/10 text-nous-subtle px-2 py-0.5 text-[6px] uppercase tracking-widest font-black rounded-none border border-nous-border/20 transition-opacity whitespace-nowrap ${isSelected ? 'opacity-100' : 'opacity-0 group-hover/el:opacity-100'}`}>
                  Source: {el.sourceRef}
                </div>
              )}
              {el.type === 'text' && (
                editingId === el.id ? (
                  <textarea
                    defaultValue={el.content}
                    autoFocus
                    onFocus={(e) => {
                      e.currentTarget.style.height = 'auto';
                      e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
                    }}
                    onInput={(e) => {
                      e.currentTarget.style.height = 'auto';
                      e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
                    }}
                    onBlur={(e) => {
                      onUpdate(elements.map(item => item.id === el.id ? { ...item, content: e.target.value } : item));
                      setEditingId(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape' || (e.key === 'Enter' && !e.shiftKey)) {
                        e.currentTarget.blur();
                      }
                      e.stopPropagation();
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full bg-transparent border-none outline-none resize-none overflow-hidden text-inherit font-inherit"
                    style={{
                      fontSize: `${finalStyle.fontSize || 1}vw`,
                      fontFamily: finalStyle.fontFamily,
                      fontWeight: finalStyle.fontWeight,
                      fontStyle: finalStyle.fontStyle,
                      textAlign: finalStyle.textAlign,
                      color: finalStyle.color,
                      lineHeight: layoutConfig?.spacingScale ? `${1.2 * layoutConfig.spacingScale}` : '1.2',
                      padding: `${finalStyle.padding !== undefined ? finalStyle.padding : 8}px`,
                      height: '100%'
                    }}
                  />
                ) : (
                  <div 
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setEditingId(el.id);
                    }}
                    className={`w-full h-full outline-none whitespace-pre-wrap transition-all ${isSelected ? 'ring-1 ring-stone-900/40 dark:ring-stone-100/40' : 'hover:ring-1 hover:ring-stone-500/20'}`}
                    style={{
                      fontSize: `${finalStyle.fontSize || 1}vw`,
                      fontFamily: finalStyle.fontFamily,
                      fontWeight: finalStyle.fontWeight,
                      fontStyle: finalStyle.fontStyle,
                      textAlign: finalStyle.textAlign,
                      color: finalStyle.color,
                      lineHeight: layoutConfig?.spacingScale ? `${1.2 * layoutConfig.spacingScale}` : '1.2',
                      borderStyle: finalStyle.borderStyle || 'none',
                      borderWidth: `${finalStyle.borderWidth || 0}px`,
                      borderColor: finalStyle.borderColor || 'transparent',
                      borderRadius: `${finalStyle.borderRadius || 0}px`,
                      backgroundColor: finalStyle.backgroundColor || 'transparent',
                      padding: `${finalStyle.padding !== undefined ? finalStyle.padding : 8}px`,
                      opacity: finalStyle.opacity !== undefined ? finalStyle.opacity : 1
                    }}
                  >
                    {el.content}
                  </div>
                )
              )}
              {el.type === 'image' && (
                <div 
                  className={`relative w-full ${isSelected ? 'ring-1 ring-stone-500' : ''}`}
                  style={{
                    opacity: finalStyle.opacity !== undefined ? finalStyle.opacity : 1,
                    filter: finalStyle.filter || 'none',
                    borderRadius: finalStyle.borderRadius ? `${finalStyle.borderRadius}px` : undefined,
                    overflow: 'hidden'
                  }}
                >
                  {el.content.startsWith('http') || el.content.startsWith('data:') ? (
                    <img src={el.content} className="w-full h-auto object-cover pointer-events-none"/>
                  ) : (
                    <Visualizer prompt={el.content} defaultAspectRatio="16:9" isArtifact />
                  )}
                </div>
              )}
              {/* INTERACTION HANDLES */}
              {isSelected && (
                <>
                  {/* ROTATE HANDLE */}
                  <div 
                    className="absolute -top-6 left-1/2 -translate-x-1/2 w-5 h-5 bg-white border border-stone-300 rounded-none flex items-center justify-center cursor-grab active:cursor-grabbing z-55 hover:bg-stone-50"
                    onMouseDown={startRotate}
                    onTouchStart={startRotate}
                  >
                    <RotateCw size={10} className="text-stone-600"/>
                  </div>
                  
                  {/* RESIZE HANDLES */}
                  <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-stone-900 rounded-none cursor-se-resize flex items-center justify-center pointer-events-auto z-50 border border-white" onMouseDown={startResize} onTouchStart={startResize}>
                    <Maximize size={8} className="text-white"/>
                  </div>
                  <div className="absolute -bottom-2 -left-2 w-3 h-3 bg-white border border-stone-300 rounded-none cursor-sw-resize z-50" onMouseDown={startResize} onTouchStart={startResize} />
                  <div className="absolute -top-2 -right-2 w-3 h-3 bg-white border border-stone-300 rounded-none cursor-ne-resize z-50" onMouseDown={startResize} onTouchStart={startResize} />
                  <div className="absolute -top-2 -left-2 w-3 h-3 bg-white border border-stone-300 rounded-none cursor-nw-resize z-50" onMouseDown={startResize} onTouchStart={startResize} />
                  {/* FLOATING ACTION HUD (Position Adjusted for Boundary Protection) */}
                  <SelectedElementHUD 
                    el={el} 
                    elements={elements} 
                    onUpdate={onUpdate} 
                    position={renderHudBelow ? 'bottom' : 'top'}
                    onDelete={() => {
                      onUpdate(elements.filter(item => item.id !== el.id));
                      setSelectedId(null);
                      if (onElementSelect) onElementSelect(null);
                    }}
                  />
                </>
              )}
            </motion.div>
          );
        })}
      </motion.div>
      {/* 3. ALIGNMENT Smart Guides Lines (Overlay) */}
      {activeGuides.x !== null && (
        <div 
          className="absolute top-0 bottom-0 border-l border-dashed border-stone-400 dark:border-stone-600 z-50 pointer-events-none"
          style={{ left: `${activeGuides.x}%` }}
        >
          <span className="absolute top-2 left-1 bg-stone-900 text-stone-100 font-mono text-[7px] tracking-widest uppercase px-1 py-0.5 shadow-sm">
            X: {Math.round(activeGuides.x)}%
          </span>
        </div>
      )}
      {activeGuides.y !== null && (
        <div 
          className="absolute left-0 right-0 border-t border-dashed border-stone-400 dark:border-stone-600 z-50 pointer-events-none"
          style={{ top: `${activeGuides.y}%` }}
        >
          <span className="absolute left-2 -top-4 bg-stone-900 text-stone-100 font-mono text-[7px] tracking-widest uppercase px-1 py-0.5 shadow-sm">
            Y: {Math.round(activeGuides.y)}%
          </span>
        </div>
      )}
      {/* 4. DYNAMIC VIEWPORT SCALE HUD Overlay (Bottom Right Corner) */}
      <div 
        className="absolute bottom-3 right-3 z-50 flex items-center bg-white dark:bg-stone-900 border border-stone-850 dark:border-stone-700 text-stone-900 dark:text-stone-100 h-6 shrink-0 text-[8px] font-mono font-black uppercase tracking-widest divide-x divide-stone-200 dark:divide-stone-800 shadow-md rounded-none"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={(e) => { e.stopPropagation(); setZoom(z => Math.max(0.5, z - 0.1)); }} 
          className="px-2 h-full hover:bg-stone-50 dark:hover:bg-stone-800 flex items-center transition-colors"
          title="Zoom Out"
        >
          <ZoomOut size={10} />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); setZoom(1); setPan({ x: 0, y: 0 }); }} 
          className="px-2.5 h-full hover:bg-stone-50 dark:hover:bg-stone-800 flex items-center transition-colors gap-1 text-[8px]"
          title="Reset View"
        >
          <RotateCcw size={8} /> {Math.round(zoom * 100)}%
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); setZoom(z => Math.min(2.0, z + 0.1)); }} 
          className="px-2 h-full hover:bg-stone-50 dark:hover:bg-stone-800 flex items-center transition-colors"
          title="Zoom In"
        >
          <ZoomIn size={10} />
        </button>
      </div>
    </div>
  );
};
