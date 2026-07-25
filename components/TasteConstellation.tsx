import React, { useState, useEffect } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, Loader2, Link2, GripVertical, X } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { getAllShadowMemory } from '../services/vectorSearch';
import { getConstellations, saveConstellation, deleteConstellation } from '../services/constellationService';
import { generateThreadFromConstellation } from '../services/threadService';
import { Constellation, PocketItem } from '../types';

const ItemTypes = {
 ARTIFACT: 'artifact',
};

const DraggableArtifact: React.FC<{ artifact: PocketItem }> = ({ artifact }) => {
 const [{ isDragging }, drag] = useDrag(() => ({
 type: ItemTypes.ARTIFACT,
 item: { id: artifact.id },
 collect: (monitor) => ({
 isDragging: !!monitor.isDragging(),
 }),
 }));

 return (
 <div
 ref={drag as any}
 className={`p-3 bg-white border border-nous-border rounded-none cursor-grab active:cursor-grabbing flex items-start gap-3 transition-opacity ${isDragging ? 'opacity-50' : 'opacity-100'}`}
 >
 <GripVertical size={16} className="text-nous-subtle mt-1 shrink-0"/>
 <div className="flex-1 min-w-0">
 <h4 className="font-serif italic text-sm truncate">{artifact.title || 'Untitled'}</h4>
 <p className="font-sans text-[10px] text-nous-subtle truncate mt-1">{(artifact as any).url || 'No URL'}</p>
 </div>
 </div>
 );
};

const ConstellationDropZone: React.FC<{
 constellation: Constellation;
 artifacts: PocketItem[];
 onDrop: (artifactId: string, constellationId: string) => void;
 onRemoveArtifact: (artifactId: string, constellationId: string) => void;
 onDelete: (id: string) => void;
 onGenerateThread: (constellation: Constellation, artifacts: PocketItem[]) => void;
 onUpdateDescription: (id: string, description: string) => void;
 onClear: (id: string) => void;
}> = ({ constellation, artifacts, onDrop, onRemoveArtifact, onDelete, onGenerateThread, onUpdateDescription, onClear }) => {
 const [{ isOver }, drop] = useDrop(() => ({
 accept: ItemTypes.ARTIFACT,
 drop: (item: { id: string }) => onDrop(item.id, constellation.id),
 collect: (monitor) => ({
 isOver: !!monitor.isOver(),
 }),
 }));

 const constellationArtifacts = artifacts.filter(a => constellation.artifactIds.includes(a.id));

 return (
 <div
 ref={drop as any}
 className={`p-6 border-2 border-dashed rounded-none transition-colors flex flex-col h-full ${
 isOver ? 'border-nous-border bg-nous-base0/5' : 'border-nous-border bg-white/50 /50'
 }`}
 >
 <div className="flex justify-between items-center mb-4 border-b border-nous-border pb-4 shrink-0">
 <h3 className="font-serif italic text-2xl">{constellation.title}</h3>
 <div className="flex gap-2">
 <button onClick={() => onClear(constellation.id)} className="text-nous-subtle hover:text-nous-subtle transition-colors">
 Clear
 </button>
 <button onClick={() => onDelete(constellation.id)} className="text-nous-subtle hover:text-red-500 transition-colors">
 <Trash2 size={16} />
 </button>
 </div>
 </div>
 
 <textarea
 className="w-full bg-transparent font-sans text-xs text-nous-subtle mb-6 resize-none outline-none"
 placeholder="Add a description..."
 value={constellation.description || ''}
 onChange={(e) => onUpdateDescription(constellation.id, e.target.value)}
 />
 
 <div className="space-y-3 flex-1 overflow-y-auto no-scrollbar min-h-[100px]">
 {constellationArtifacts.length === 0 ? (
 <div className="h-full flex flex-col items-center justify-center text-nous-subtle py-8">
 <Link2 size={24} className="opacity-20 mb-2"/>
 <p className="font-sans text-[10px] uppercase tracking-widest">Drop artifacts here</p>
 </div>
 ) : (
 <AnimatePresence>
 {constellationArtifacts.map(artifact => (
 <motion.div
 key={artifact.id}
 initial={{ opacity: 0, scale: 0.95 }}
 animate={{ opacity: 1, scale: 1 }}
 exit={{ opacity: 0, scale: 0.95 }}
 className="p-3 bg-nous-base border border-nous-border rounded-none flex justify-between items-center group"
 >
 <div className="min-w-0 flex-1">
 <h4 className="font-serif italic text-sm truncate">{artifact.title || 'Untitled'}</h4>
 </div>
 <button 
 onClick={() => onRemoveArtifact(artifact.id, constellation.id)}
 className="opacity-0 group-hover:opacity-100 text-nous-subtle hover:text-red-500 transition-all p-1"
 >
 <X size={14} />
 </button>
 </motion.div>
 ))}
 </AnimatePresence>
 )}
 </div>
 
 {constellationArtifacts.length >= 2 && (
 <div className="mt-4 pt-4 border-t border-nous-border shrink-0">
 <button
 onClick={() => onGenerateThread(constellation, constellationArtifacts)}
 className="w-full py-2 bg-nous-base text-nous-text rounded-none font-sans text-xs uppercase tracking-widest hover:bg-nous-base dark:hover:bg-stone-200 transition-colors"
 >
 Generate Narrative Thread
 </button>
 </div>
 )}
 </div>
 );
};

export const TasteConstellation: React.FC<{ readOnly?: boolean }> = ({ readOnly = false }) => {
 const { user } = useUser();
 const [artifacts, setArtifacts] = useState<PocketItem[]>([]);
 const [constellations, setConstellations] = useState<Constellation[]>([]);
 const [loading, setLoading] = useState(true);
  const [hoveredNode, setHoveredNode] = useState<any>(null);

 useEffect(() => {
 const loadData = async () => {
 if (!user?.uid) return;
 setLoading(true);
 try {
 const [loadedArtifacts, loadedConstellations] = await Promise.all([
 getAllShadowMemory(),
 getConstellations()
 ]);
 setArtifacts(loadedArtifacts as any);
 setConstellations(loadedConstellations);
 } catch (e) {
 console.error("Failed to load data:", e);
 } finally {
 setLoading(false);
 }
 };
 loadData();
 }, [user]);

 const handleCreateConstellation = async () => {
 if (!user?.uid) return;
 const title = prompt("Enter a name for this constellation:");
 if (!title) return;

 const newConstellation: Constellation = {
 id: `constellation_${Date.now()}`,
 userId: user.uid,
 title,
 artifactIds: [],
 createdAt: Date.now(),
 updatedAt: Date.now()
 };

 setConstellations(prev => [...prev, newConstellation]);
 try {
 await saveConstellation(newConstellation);
 } catch (e) {
 console.error("MIMI // Failed to save constellation:", e);
 }
 };

 const handleDeleteConstellation = async (id: string) => {
 if (!confirm("Are you sure you want to delete this constellation?")) return;
 setConstellations(prev => prev.filter(c => c.id !== id));
 try {
 await deleteConstellation(id);
 } catch (e) {
 console.error("MIMI // Failed to delete constellation:", e);
 }
 };

 const handleDropArtifact = async (artifactId: string, constellationId: string) => {
 setConstellations(prev => prev.map(c => {
 if (c.id === constellationId) {
 if (c.artifactIds.includes(artifactId)) return c;
 const updated = { ...c, artifactIds: [...c.artifactIds, artifactId], updatedAt: Date.now() };
 saveConstellation(updated).catch(e => console.error("MIMI // Failed to save constellation:", e));
 return updated;
 }
 return c;
 }));
 };

 const handleRemoveArtifact = async (artifactId: string, constellationId: string) => {
 setConstellations(prev => prev.map(c => {
 if (c.id === constellationId) {
 const updated = { ...c, artifactIds: c.artifactIds.filter(id => id !== artifactId), updatedAt: Date.now() };
 saveConstellation(updated).catch(e => console.error("MIMI // Failed to save constellation:", e));
 return updated;
 }
 return c;
 }));
 };

 const handleUpdateDescription = async (id: string, description: string) => {
 setConstellations(prev => prev.map(c => {
 if (c.id === id) {
 const updated = { ...c, description, updatedAt: Date.now() };
 saveConstellation(updated).catch(e => console.error("MIMI // Failed to save constellation:", e));
 return updated;
 }
 return c;
 }));
 };

 const handleClearConstellation = async (id: string) => {
 if (!confirm("Are you sure you want to clear all artifacts from this constellation?")) return;
 setConstellations(prev => prev.map(c => {
 if (c.id === id) {
 const updated = { ...c, artifactIds: [], updatedAt: Date.now() };
 saveConstellation(updated).catch(e => console.error("MIMI // Failed to save constellation:", e));
 return updated;
 }
 return c;
 }));
 };

 const handleGenerateThread = async (constellation: Constellation, constellationArtifacts: PocketItem[]) => {
 if (!user?.uid) return;
 setLoading(true);
 try {
 const thread = await generateThreadFromConstellation(constellation.id, constellation.title, constellationArtifacts);
 if (thread) {
 window.dispatchEvent(new CustomEvent('mimi:change_view', { detail: 'narrative-threads' }));
 } else {
 alert("Not enough artifacts to generate a thread.");
 }
 } catch (e) {
 console.error("Failed to generate thread:", e);
 alert("Failed to generate thread.");
 } finally {
 setLoading(false);
 }
 };

 if (loading) {
 return (
 <div className="flex-1 flex items-center justify-center text-nous-subtle">
 <Loader2 className="animate-spin"/>
 </div>
 );
 }

  if (readOnly) {
    if (constellations.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-neutral-400 p-6 bg-neutral-950 border border-white/5 select-none w-full min-h-[380px]">
          <Loader2 className="animate-spin opacity-40 mb-3 text-neutral-400 animate-spin" size={24} />
          <p className="font-serif italic text-base text-white">Universe Unformed</p>
          <p className="font-sans text-[8px] uppercase tracking-widest text-neutral-500 mt-1.5 text-center max-w-xs leading-loose">
            Create Manual Taste Constellations in the WORK workspace tab to index cluster nodes.
          </p>
        </div>
      );
    }

    return (
      <div className="relative w-full h-full bg-neutral-950 text-neutral-200 overflow-hidden font-sans select-none flex flex-col md:flex-row p-4 border border-white/10 min-h-[350px]">
        {/* Star map canvas */}
        <div className="relative flex-1 h-full min-h-[300px] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-neutral-900/40 via-neutral-950 to-neutral-950 border border-white/5">
          
          {/* Subtle background grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f1f_1px,transparent_1px),linear-gradient(to_bottom,#1f1f1f_1px,transparent_1px)] bg-[size:3rem_3rem] opacity-25 pointer-events-none" />

          <svg className="absolute inset-0 w-full h-full">
            {/* Draw orbital reference rings */}
            <circle cx="50%" cy="50%" r="20%" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" strokeDasharray="4 4" />
            <circle cx="50%" cy="50%" r="35%" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="1" />
            
            {/* Draw lines from center to each constellation */}
            {constellations.map((c, i) => {
              const angle = (i * 2 * Math.PI) / constellations.length;
              const radius = 28; // % distance
              const cxStr = `${50 + radius * Math.cos(angle)}%`;
              const cyStr = `${50 + radius * Math.sin(angle)}%`;
              return (
                <line
                  key={`line-${c.id}`}
                  x1="50%"
                  y1="50%"
                  x2={cxStr}
                  y2={cyStr}
                  stroke="rgba(255, 255, 255, 0.08)"
                  strokeWidth="1.5"
                  strokeDasharray="1 3"
                />
              );
            })}
          </svg>

          {/* Core Center Node: The Self / The Oracle */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
            <div className="w-6 h-6 rounded-full bg-neutral-900/90 border border-white/40 flex items-center justify-center animate-ping opacity-10 pointer-events-none absolute" />
            <div className="w-4 h-4 rounded-full bg-neutral-950 border border-white/60 flex items-center justify-center relative shadow-lg shadow-white/5 z-20">
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            </div>
            <span className="text-[7px] uppercase tracking-widest text-neutral-400 mt-2 whitespace-nowrap font-black bg-neutral-950/80 px-1.5 py-0.5 border border-white/5">
              THE SELF
            </span>
          </div>

          {/* Constellation Clusters */}
          {constellations.map((c, i) => {
            const angle = (i * 2 * Math.PI) / constellations.length;
            const radius = 28; // distance index
            const lPercent = 50 + radius * Math.cos(angle);
            const tPercent = 50 + radius * Math.sin(angle);
            
            const isHovered = hoveredNode?.id === c.id;

            return (
              <div
                key={c.id}
                style={{ left: `${lPercent}%`, top: `${tPercent}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10 transition-transform duration-300 hover:scale-110 cursor-pointer"
                onMouseEnter={() => setHoveredNode(c)}
                onMouseLeave={() => setHoveredNode(null)}
              >
                {/* Glowing Aura Ring */}
                <div className={`w-10 h-10 rounded-full absolute -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2 border transition-all duration-300 ${
                  isHovered ? 'border-white/20 bg-white/5 scale-125' : 'border-white/5'
                }`} />

                {/* Main Constellation Star */}
                <div className={`w-3 h-3 rounded-full flex items-center justify-center border transition-all duration-300 ${
                  isHovered ? 'bg-white border-white shadow-lg shadow-white/20' : 'bg-neutral-950 border-white/30'
                }`}>
                  <div className={`w-1 h-1 rounded-full ${isHovered ? 'bg-neutral-950' : 'bg-white/70'}`} />
                </div>

                {/* Constellation Title Badge */}
                <span className={`text-[8px] uppercase tracking-wider mt-2.5 whitespace-nowrap px-2 py-0.5 transition-all duration-300 bg-neutral-950/90 border ${
                  isHovered ? 'text-white border-white/30 shrink-0' : 'text-neutral-400 border-white/5'
                }`}>
                  {c.title}
                </span>

                {/* Render Orbiting Artifact Sub-stars */}
                {c.artifactIds.map((artId, aIdx) => {
                  const subAngle = (aIdx * 2 * Math.PI) / c.artifactIds.length + (isHovered ? 0.2 : 0);
                  const subRadius = isHovered ? 24 : 16; // offsetpx
                  const subX = subRadius * Math.cos(subAngle);
                  const subY = subRadius * Math.sin(subAngle);
                  const artItem = artifacts.find(a => a.id === artId);
                  
                  return (
                    <div
                      key={`sub-${artId}`}
                      style={{ transform: `translate(${subX}px, ${subY}px)` }}
                      className="absolute w-1.5 h-1.5 rounded-full bg-white/40 border border-white/20 transition-all duration-300 hover:bg-white hover:scale-150"
                      title={artItem?.title || 'Star'}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Info Overlay Panel: Show details on hover */}
        <div className="w-full md:w-64 border-t md:border-t-0 md:border-l border-white/10 p-4 bg-black/60 md:bg-transparent flex flex-col justify-between shrink-0 h-40 md:h-full overflow-y-auto no-scrollbar">
          <div>
            <span className="text-[7px] uppercase tracking-widest text-white/40 block font-black mb-3">
              Cluster Readings
            </span>
            <AnimatePresence mode="wait">
              {hoveredNode ? (
                <motion.div
                  key={hoveredNode.id}
                  initial={{ opacity: 0, x: 5 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -5 }}
                  className="space-y-4"
                >
                  <div>
                    <h4 className="font-serif italic text-lg text-white leading-snug">{hoveredNode.title}</h4>
                    {hoveredNode.description && (
                      <p className="text-[10px] text-neutral-400 leading-relaxed mt-1.5 font-serif italic">
                        {hoveredNode.description}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[7px] uppercase tracking-widest text-neutral-500 block font-black">
                      Linked Artifact Stars ({hoveredNode.artifactIds.length})
                    </span>
                    <div className="flex flex-col gap-1 max-h-24 overflow-y-auto no-scrollbar">
                      {hoveredNode.artifactIds.map(artId => {
                        const art = artifacts.find(a => a.id === artId);
                        return (
                          <div key={artId} className="flex items-center gap-1.5 truncate">
                            <span className="w-1 h-1 rounded-full bg-white/50" />
                            <span className="text-[9px] text-neutral-300 truncate italic font-serif">
                              {art?.title || 'Unnamed Artifact'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="text-neutral-550 italic font-serif text-xs py-4">
                  Hover over active cluster stars to reveal latent connections.
                </div>
              )}
            </AnimatePresence>
          </div>

          <div className="pt-4 border-t border-white/5 mt-auto hidden md:block">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[7px] uppercase tracking-widest text-neutral-500 font-mono">
                Latent Core Live
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
  <DndProvider backend={HTML5Backend}>
 <div className="flex-1 flex h-full bg dark:bg text-nous-text overflow-hidden">
 
 {/* Sidebar: Artifacts */}
 <div className="w-64 border-r border-nous-border flex flex-col bg-white/50 /20 shrink-0">
 <div className="p-6 border-b border-nous-border">
 <h3 className="font-serif italic text-2xl">Artifacts</h3>
 <p className="font-sans text-[10px] uppercase tracking-widest text-nous-subtle mt-2">Drag to group</p>
 </div>
 <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-3">
 {artifacts.map(artifact => (
 <DraggableArtifact key={artifact.id} artifact={artifact} />
 ))}
 </div>
 </div>

 {/* Main Area: Constellations */}
 <div className="flex-1 flex flex-col overflow-hidden">
 <div className="p-8 md:p-12 border-b border-nous-border flex justify-between items-end shrink-0">
 <div>
 <h2 className="text-4xl md:text-5xl font-serif italic">Taste Constellations</h2>
 <p className="text-nous-subtle font-sans text-[10px] uppercase tracking-[0.2em] mt-4">Manual Semantic Grouping</p>
 </div>
 <button 
 onClick={handleCreateConstellation}
 className="flex items-center gap-2 px-6 py-3 bg-nous-base text-nous-base rounded-none hover:bg-nous-base dark:hover:bg-stone-200 transition-colors font-sans text-[10px] uppercase tracking-widest"
 >
 <Plus size={14} />
 New Constellation
 </button>
 </div>

 <div className="flex-1 overflow-y-auto no-scrollbar p-8 md:p-12">
 {constellations.length === 0 ? (
 <div className="h-full flex flex-col items-center justify-center text-nous-subtle space-y-4">
 <Link2 size={32} className="opacity-20"/>
 <p className="font-serif italic text-xl">No Constellations</p>
 <p className="font-sans text-[10px] uppercase tracking-widest max-w-md text-center">Create a constellation to start grouping your artifacts manually.</p>
 </div>
 ) : (
 <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
 {constellations.map(constellation => (
 <ConstellationDropZone
 key={constellation.id}
 constellation={constellation}
 artifacts={artifacts}
 onDrop={handleDropArtifact}
 onRemoveArtifact={handleRemoveArtifact}
 onDelete={handleDeleteConstellation}
 onGenerateThread={handleGenerateThread}
 onUpdateDescription={handleUpdateDescription}
 onClear={handleClearConstellation}
 />
 ))}
 </div>
 )}
 </div>
 </div>
 </div>
 </DndProvider>
 );
};
