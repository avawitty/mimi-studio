import React, { useState, useEffect, useRef } from 'react';
import { PocketItem, ZineMetadata } from '../types';
import { motion } from 'motion/react';
import { Pin, Eye, Image as ImageIcon, BookOpen, Music, Type as TextIcon } from 'lucide-react';

interface ArchiveTactileSandboxProps {
  items: PocketItem[];
  zines: ZineMetadata[];
  onSelectZine: (zine: ZineMetadata) => void;
  onSelectItem?: (item: PocketItem) => void;
}

interface Coordinate {
  x: number;
  y: number;
  rotation: number;
  zIndex: number;
}

export const ArchiveTactileSandbox: React.FC<ArchiveTactileSandboxProps> = ({ 
  items, 
  zines, 
  onSelectZine, 
  onSelectItem 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [positions, setPositions] = useState<Record<string, Coordinate>>({});
  const [activeZIndex, setActiveZIndex] = useState(10);

  // Monitor size of canvas container
  useEffect(() => {
    if (!containerRef.current) return;
    
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width: width || 800, height: height || 600 });
      }
    });
    
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Initialize random polaroid layout positions when items/zines load
  useEffect(() => {
    const allIds = [
      ...items.map(i => ({ id: i.id, type: 'shard' })),
      ...zines.map(z => ({ id: z.id, type: 'zine' }))
    ];

    if (allIds.length === 0) return;

    setPositions(prev => {
      const updated = { ...prev };
      allIds.forEach((entry, idx) => {
        if (!updated[entry.id]) {
          // Columns distribute, keeping within current container dimensions
          const colWidth = 240;
          const colsCount = Math.max(1, Math.floor(dimensions.width / colWidth));
          const colIndex = idx % colsCount;
          const rowIndex = Math.floor(idx / colsCount);

          updated[entry.id] = {
            x: Math.min(colIndex * colWidth + Math.random() * 30 + 20, dimensions.width - 200),
            y: rowIndex * 280 + Math.random() * 40 + 40,
            rotation: Math.random() * 12 - 6, // Random rotation between -6deg and 6deg
            zIndex: idx + 1
          };
        }
      });
      return updated;
    });
  }, [items, zines, dimensions.width]);

  // Handle click on a polaroid to bring it to top
  const handleFocus = (id: string) => {
    setActiveZIndex(prev => {
      const nextZ = prev + 1;
      setPositions(current => {
        if (!current[id]) return current;
        return {
          ...current,
          [id]: {
            ...current[id],
            zIndex: nextZ
          }
        };
      });
      return nextZ;
    });
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full min-h-[75vh] bg-stone-100 dark:bg-stone-920 border border-stone-250 dark:border-stone-850 overflow-hidden cursor-grab active:cursor-grabbing rounded-none shadow-inner select-none bg-[radial-gradient(#dbdbdb_1px,transparent_1px)] dark:bg-[radial-gradient(#252525_1px,transparent_1px)] [background-size:24px_24px]"
    >
      <div className="absolute top-4 left-4 font-mono text-[8px] tracking-[0.2em] text-stone-400 dark:text-stone-500 uppercase z-10 pointer-events-none">
        ✥ Aesthetic Collage Sandbox: Drag Elements & Pile Your Thoughts
      </div>

      {allShardsAndZines().length === 0 ? (
        <div className="absolute inset-0 flex flex-col justify-center items-center opacity-40">
          <BookOpen className="animate-pulse text-stone-400 mb-2" size={32} />
          <span className="font-mono text-[8px] uppercase tracking-widest text-stone-500">
            Sandbox Canvas Empty
          </span>
        </div>
      ) : (
        allShardsAndZines().map(entry => {
          const isZine = entry.vType === 'zine';
          const pos = positions[entry.id] || { x: 50, y: 50, rotation: 0, zIndex: 1 };

          return (
            <motion.div
              key={entry.id}
              drag
              dragMomentum={false}
              dragElastic={0.1}
              onDragStart={() => handleFocus(entry.id)}
              className={`absolute w-48 p-3 shadow-md border hover:shadow-xl transition-shadow cursor-move bg-white dark:bg-[#0E0E0E] ${
                isZine 
                  ? 'border-stone-400 dark:border-stone-600 bg-stone-50 dark:bg-[#121211]' 
                  : 'border-stone-300 dark:border-stone-800'
              }`}
              style={{
                left: `${pos.x}px`,
                top: `${pos.y}px`,
                rotate: `${pos.rotation}deg`,
                zIndex: pos.zIndex
              }}
              whileDrag={{ 
                scale: 1.05, 
                rotate: 0, 
                boxShadow: "0 15px 35px rgba(0,0,0,0.15)" 
              }}
            >
              {/* PUSH PIN */}
              <div 
                className={`absolute -top-2 left-1/2 -translate-x-1/2 opacity-90 z-40 ${
                  isZine ? 'text-stone-800 dark:text-stone-200' : 'text-stone-500 dark:text-stone-600'
                }`}
              >
                <Pin size={12} className="rotate-[25deg] fill-current" />
              </div>

              {/* CARD MEDIA EXPOSURE */}
              {isZine ? (
                // ZINE RENDERING
                <div 
                  onClick={() => onSelectZine(entry as ZineMetadata)}
                  className="space-y-3 cursor-pointer group"
                >
                  {entry.coverImageUrl ? (
                    <div className="w-full aspect-[4/3] bg-stone-50 dark:bg-stone-900 border border-stone-150 dark:border-stone-850 overflow-hidden relative">
                      <img 
                        src={entry.coverImageUrl} 
                        alt={entry.title} 
                        className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-300"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ) : (
                    <div className="w-full aspect-[4/3] bg-stone-100 dark:bg-stone-900 flex items-center justify-center border border-stone-200 dark:border-stone-800">
                      <BookOpen size={20} className="text-stone-400" />
                    </div>
                  )}
                  
                  <div className="space-y-1">
                    <span className="font-mono text-[6px] tracking-widest text-stone-400 dark:text-stone-500 uppercase block">
                      Zines Shelf
                    </span>
                    <h4 className="font-serif italic text-xs truncate text-stone-900 dark:text-stone-100 font-bold group-hover:text-stone-600 dark:group-hover:text-stone-300">
                      {entry.title}
                    </h4>
                    <p className="font-mono text-[5.5px] tracking-wider uppercase text-stone-400 dark:text-stone-500 truncate">
                      BY @{entry.userHandle || "Curator"}
                    </p>
                  </div>
                </div>
              ) : (
                // SHARD RENDERING
                <div 
                  onClick={() => onSelectItem?.(entry as PocketItem)}
                  className="space-y-3 cursor-pointer"
                >
                  {entry.type === 'image' && entry.content?.imageUrl ? (
                    <div className="w-full aspect-square bg-stone-50 dark:bg-stone-900 overflow-hidden border border-stone-100 dark:border-stone-850 relative">
                      <img 
                        src={entry.content.imageUrl} 
                        alt={entry.title} 
                        className="w-full h-full object-cover pointer-events-none"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ) : entry.type === 'voicenote' ? (
                    <div className="w-full aspect-square bg-stone-50 dark:bg-stone-900 border border-stone-150 dark:border-stone-850 flex flex-col items-center justify-center p-3 text-center">
                      <Music className="text-stone-400 dark:text-stone-600 mb-2" size={20} />
                      <p className="font-serif italic text-[10px] text-stone-600 dark:text-stone-400">
                        "Voice Recording"
                      </p>
                    </div>
                  ) : (
                    <div className="w-full aspect-square bg-stone-50 dark:bg-stone-900 border border-stone-150 dark:border-stone-850 flex items-center justify-center p-3 text-center">
                      <p className="font-serif italic text-[10px] text-stone-600 dark:text-stone-400 line-clamp-6">
                        "{entry.content?.notes || entry.content?.text || entry.notes || entry.title}"
                      </p>
                    </div>
                  )}

                  {/* POLAROID STYLING LABELS */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-mono text-[5.5px] tracking-widest uppercase text-stone-400">
                        {entry.type}
                      </span>
                      {entry.type === 'image' && <ImageIcon size={8} className="text-stone-400" />}
                      {entry.type === 'text' && <TextIcon size={8} className="text-stone-400" />}
                    </div>
                    <h4 className="font-serif italic text-xs truncate text-stone-900 dark:text-stone-100">
                      {entry.title || "Untitled Fragment"}
                    </h4>
                    <p className="font-mono text-[5.5px] tracking-wider uppercase text-stone-400">
                      CAPTURED: {new Date(entry.savedAt || Date.now()).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          );
        })
      )}
    </div>
  );

  function allShardsAndZines() {
    return [
      ...items.map(item => ({ ...item, vType: 'shard' as const })),
      ...zines.map(zine => ({ ...zine, vType: 'zine' as const }))
    ];
  }
};
