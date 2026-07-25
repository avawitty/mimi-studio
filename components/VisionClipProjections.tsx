import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Crosshair, Eye, Compass, Info, Sliders, RefreshCw, Zap } from 'lucide-react';

export interface ImageNode {
  id: string;
  title: string;
  url: string;
  x: number; // Normalized -1 to 1 (representing Entropy Axis)
  y: number; // Normalized -1 to 1 (representing Material Density Axis)
  tags: string[];
  embeddingsCode: string;
}

const SPECIMENS: ImageNode[] = [
  {
    id: 'img-01',
    title: 'industrial_raw_concrete.jpg',
    url: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=200&auto=format&fit=crop',
    x: -0.65,
    y: 0.82,
    tags: ['Brutalist', 'Heavy Texture', 'Clinical'],
    embeddingsCode: 'CLIP_V8_0x4F19A2'
  },
  {
    id: 'img-02',
    title: 'sterile_lab_telemetry.jpg',
    url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=200&auto=format&fit=crop',
    x: -0.22,
    y: 0.75,
    tags: ['Monospace', 'Technical', 'Low-Contrast'],
    embeddingsCode: 'CLIP_V8_0x9A2F1B'
  },
  {
    id: 'img-03',
    title: 'ethereal_silk_motion.jpg',
    url: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?q=80&w=200&auto=format&fit=crop',
    x: 0.78,
    y: -0.62,
    tags: ['Fluid', 'Ethereal', 'Minimalist'],
    embeddingsCode: 'CLIP_V8_0x11B9D5'
  },
  {
    id: 'img-04',
    title: 'antiquated_parchment_colophon.jpg',
    url: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?q=80&w=200&auto=format&fit=crop',
    x: 0.42,
    y: -0.15,
    tags: ['Historical', 'Fibrous Paper', 'High-Contrast'],
    embeddingsCode: 'CLIP_V8_0x33C8E2'
  },
  {
    id: 'img-05',
    title: 'high_frequency_neon_glitch.jpg',
    url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=200&auto=format&fit=crop',
    x: -0.85,
    y: -0.72,
    tags: ['Entropy', 'Saturated', 'Synthetic'],
    embeddingsCode: 'CLIP_V8_0x77E2A9'
  }
];

export const VisionClipProjections: React.FC = () => {
  const [activeId, setActiveId] = useState<string>('img-01');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [nodes, setNodes] = useState<ImageNode[]>(SPECIMENS);

  // Calculate Euclidean Distance between two points
  const calculateDistance = (n1: ImageNode, n2: ImageNode) => {
    const dx = n1.x - n2.x;
    const dy = n1.y - n2.y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleRandomize = () => {
    setNodes(prev => prev.map(n => ({
      ...n,
      x: Math.max(-0.95, Math.min(0.95, n.x + (Math.random() * 0.3 - 0.15))),
      y: Math.max(-0.95, Math.min(0.95, n.y + (Math.random() * 0.3 - 0.15)))
    })));
  };

  const activeNode = nodes.find(n => n.id === activeId) || nodes[0];
  const hoveredNode = hoveredId ? nodes.find(n => n.id === hoveredId) : null;

  return (
    <div className="w-full border border-nous-border bg-[#FCFCFA] dark:bg-[#070707] p-5 font-mono text-xs text-stone-800 dark:text-stone-300">
      <div className="flex justify-between items-center border-b border-nous-border/40 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <Crosshair className="w-3.5 h-3.5 text-amber-500 animate-spin-slow" />
          <span className="font-sans font-bold tracking-widest text-[#141414] dark:text-[#fcfcfa] uppercase text-[10px]">✥ VISION EMBEDDING PROJECTIONS</span>
        </div>
        <button 
          onClick={handleRandomize} 
          className="p-1 border border-nous-border hover:bg-stone-500/10 transition-all text-[#141414] dark:text-[#fcfcfa]"
          title="Recalibrate Constellation"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* 1. Vision Coordinate Map (2/3 width) */}
        <div className="lg:col-span-2 border border-nous-border bg-white dark:bg-[#0a0a0a] aspect-video relative overflow-hidden select-none">
          {/* Grid Axes Lines */}
          <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
            <div className="w-full h-[0.5px] border-b border-dashed border-nous-border" />
            <div className="h-full w-[0.5px] border-r border-dashed border-nous-border absolute" />
          </div>

          {/* Axes Labels */}
          <span className="absolute top-2 left-1/2 -translate-x-1/2 text-[7px] opacity-40 uppercase tracking-widest font-bold">HIGH ENTROPY (CHAOS)</span>
          <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[7px] opacity-40 uppercase tracking-widest font-bold">LOW ENTROPY (STRUCTURE)</span>
          <span className="absolute left-2 top-1/2 -rotate-90 -translate-y-1/2 text-[7px] opacity-40 uppercase tracking-widest origin-left font-bold">MINIMAL DESATURATED</span>
          <span className="absolute right-2 top-1/2 rotate-90 -translate-y-1/2 text-[7px] opacity-40 uppercase tracking-widest origin-right font-bold">MAXIMAL CHROMATIC</span>

          {/* Render Vector Associations on Hover */}
          {hoveredNode && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 5 }}>
              {nodes.map(n => {
                if (n.id === hoveredId) return null;
                const distance = calculateDistance(hoveredNode, n);
                // Draw similarity connection if closeness is high
                if (distance > 1.2) return null;
                
                const startX = ((hoveredNode.x + 1) / 2) * 100;
                const startY = ((1 - hoveredNode.y) / 2) * 100;
                const endX = ((n.x + 1) / 2) * 100;
                const endY = ((1 - n.y) / 2) * 100;

                return (
                  <g key={n.id}>
                    <line
                      x1={`${startX}%`}
                      y1={`${startY}%`}
                      x2={`${endX}%`}
                      y2={`${endY}%`}
                      className="stroke-amber-500/40 dark:stroke-amber-500/30"
                      strokeWidth="0.75"
                      strokeDasharray="3,3"
                    />
                    <text
                      x={`${(startX + endX) / 2}%`}
                      y={`${(startY + endY) / 2}%`}
                      fill="#f59e0b"
                      className="text-[6.5px] font-bold tracking-tighter opacity-80"
                      dy="-2.5"
                      textAnchor="middle"
                    >
                      {((1 - distance / 2) * 100).toFixed(0)}% SIM
                    </text>
                  </g>
                );
              })}
            </svg>
          )}

          {/* Coordinate Plot Nodes */}
          {nodes.map((node) => {
            const isActive = node.id === activeId;
            const leftPercent = ((node.x + 1) / 2) * 100;
            const topPercent = ((1 - node.y) / 2) * 100; // Invert Y axis for canvas plotting

            return (
              <motion.div
                key={node.id}
                layout
                className="absolute w-12 h-16 origin-center cursor-pointer group"
                style={{
                  left: `${leftPercent}%`,
                  top: `${topPercent}%`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: isActive ? 30 : 10
                }}
                onClick={() => setActiveId(node.id)}
                onMouseEnter={() => setHoveredId(node.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                {/* Vector Crosshair on Target */}
                <div className={`absolute -inset-2 border transition-all ${
                  isActive ? 'border-amber-500 opacity-100 scale-105' : 'border-stone-200 dark:border-stone-900 opacity-0 group-hover:opacity-40'
                }`} />

                {/* Specimen Thumbnail Card */}
                <div className={`w-full h-full border overflow-hidden bg-stone-100 dark:bg-[#111] transition-all p-0.5 ${
                  isActive ? 'border-amber-500 shadow-md' : 'border-nous-border'
                }`}>
                  <img rx-referrer="no-referrer" src={node.url} alt={node.title} className="w-full h-full object-cover grayscale transition-all group-hover:grayscale-0" />
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* 2. SPECIMEN METADATA HUD (1/3 width) */}
        <div className="border border-nous-border bg-white dark:bg-[#0a0a0a] p-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div>
              <span className="text-[8px] uppercase text-stone-400 font-bold block">Selected Specimen</span>
              <h3 className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate mt-1">{activeNode.title}</h3>
              <p className="text-[9px] text-stone-400 font-mono mt-0.5">{activeNode.embeddingsCode}</p>
            </div>

            <div className="border-t border-nous-border/20 pt-2.5">
              <span className="text-[8px] uppercase text-stone-400 font-bold block">Coordinate Weights</span>
              <div className="grid grid-cols-2 gap-2 mt-2 font-mono text-[9px]">
                <div className="bg-stone-500/5 p-1.5 border border-nous-border/40">
                  <div className="text-stone-400 uppercase text-[7px] leading-none mb-1">X-Axis (Entropy)</div>
                  <div className="font-bold text-[#141414] dark:text-[#fcfcfa]">{activeNode.x.toFixed(4)}</div>
                </div>
                <div className="bg-stone-500/5 p-1.5 border border-nous-border/40">
                  <div className="text-stone-400 uppercase text-[7px] leading-none mb-1">Y-Axis (Density)</div>
                  <div className="font-bold text-[#141414] dark:text-[#fcfcfa]">{activeNode.y.toFixed(4)}</div>
                </div>
              </div>
            </div>

            <div className="border-t border-nous-border/20 pt-2.5">
              <span className="text-[8px] uppercase text-stone-400 font-bold block">Extracted Semiotics</span>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {activeNode.tags.map((tag) => (
                  <span key={tag} className="px-1.5 py-0.5 bg-stone-100 dark:bg-stone-900 border border-nous-border text-stone-600 dark:text-stone-400 text-[8px] font-bold">
                    {tag.toUpperCase()}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-nous-border/20 pt-3 mt-4">
            <span className="text-[8px] uppercase text-[#A8A29E] font-bold block mb-1">System Node Telemetry</span>
            <div className="bg-stone-500/5 border border-nous-border/30 p-2 font-mono text-[8.5px] leading-tight text-stone-400 select-none">
              CALIBRATION_COEF: 0.9842<br />
              VECTOR_RESOLUTION: 512D_CLIP_FLOAT16<br />
              COHESION_STATE: LOCK_COMPLETE
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
