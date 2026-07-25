import React from 'react';
import { PocketItem, ZineMetadata } from '../types';
import { Eye, Trash2, Image as ImageIcon, Type as TextIcon, Speech, Layers, ExternalLink, Calendar } from 'lucide-react';

interface ArchiveGridListProps {
  items: PocketItem[];
  zines: ZineMetadata[];
  onSelectZine: (zine: ZineMetadata) => void;
  onSelectItem?: (item: PocketItem) => void;
  onDeleteItem?: (id: string) => void;
}

export const ArchiveGridList: React.FC<ArchiveGridListProps> = ({ 
  items, 
  zines, 
  onSelectZine, 
  onSelectItem,
  onDeleteItem 
}) => {
  return (
    <div className="space-y-12">
      {/* SECTION 1: DYNAMIC CLUSTER STACKS */}
      {items.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-stone-200 dark:border-stone-800 pb-2">
            <Layers size={14} className="text-stone-400" />
            <h2 className="font-mono text-[10px] uppercase tracking-widest text-stone-500 font-bold">
              Latent Clusters & Fragments
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {items.map(item => (
              <div 
                key={item.id} 
                onClick={() => onSelectItem?.(item)}
                className="border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#0B0A09] p-5 group flex flex-col justify-between transition-all hover:border-stone-800 dark:hover:border-stone-300 hover:shadow-md cursor-pointer relative"
              >
                <div>
                  {/* CARD METADATA HEADER */}
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-mono text-[7px] text-stone-400 tracking-wider">
                      INDEX // {item.id.slice(-6).toUpperCase()}
                    </span>
                    <span className="font-mono text-[7px] bg-stone-100 dark:bg-stone-900 text-stone-600 dark:text-stone-400 px-2 py-0.5 uppercase tracking-widest flex items-center gap-1">
                      {item.type === 'image' && <ImageIcon size={8} />}
                      {item.type === 'text' && <TextIcon size={8} />}
                      {item.type === 'voicenote' && <Speech size={8} />}
                      {item.type}
                    </span>
                  </div>

                  {/* CARD THUMBNAIL */}
                  {item.type === 'image' && item.content?.imageUrl && (
                    <div className="w-full aspect-[4/3] bg-stone-50 dark:bg-stone-900 overflow-hidden border border-stone-150 dark:border-stone-850 mb-4 relative">
                      <img 
                        src={item.content.imageUrl} 
                        alt={item.title || "Image Shard"} 
                        className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}

                  {/* VOICE NOTE WAVEFORM SIMULATION */}
                  {item.type === 'voicenote' && (
                    <div className="w-full h-12 bg-stone-50 dark:bg-stone-900 border border-stone-100 dark:border-stone-850 mb-4 py-2 px-3 flex items-center justify-between gap-1 overflow-hidden">
                      <div className="flex gap-0.5 items-end h-full">
                        {Array.from({ length: 24 }).map((_, i) => (
                          <div 
                            key={i} 
                            style={{ height: `${20 + Math.sin(i * 0.5) * 60 + Math.random() * 20}%` }}
                            className="w-[2px] bg-stone-400 dark:bg-stone-600 rounded-full" 
                          />
                        ))}
                      </div>
                      <span className="font-mono text-[8px] text-stone-400 tracking-widest">
                        DICT.WAV
                      </span>
                    </div>
                  )}

                  {/* CARD CONTENT NOTES */}
                  <h3 className="font-serif italic text-lg text-stone-900 dark:text-stone-100 group-hover:text-stone-700 dark:group-hover:text-stone-300 transition-colors mb-2 truncate">
                    {item.title || "Untitled Shard"}
                  </h3>
                  
                  {item.content?.notes || item.notes ? (
                    <p className="font-serif text-stone-400 dark:text-stone-500 text-xs line-clamp-3 leading-relaxed mb-4">
                      {item.content?.notes || item.notes}
                    </p>
                  ) : item.type === 'text' && item.content?.text ? (
                    <p className="font-serif text-stone-400 dark:text-stone-500 text-xs line-clamp-3 leading-relaxed mb-4 italic">
                      "{item.content.text}"
                    </p>
                  ) : null}
                </div>

                {/* CLUSTERING CHIP SWATCHES */}
                <div className="pt-4 border-t border-stone-100 dark:border-stone-900 space-y-4">
                  {item.agentEnrichment?.autoTags && item.agentEnrichment.autoTags.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {item.agentEnrichment.autoTags.slice(0, 4).map(tag => (
                        <span key={tag} className="font-mono text-[6px] tracking-widest uppercase text-stone-500 dark:text-stone-400 border border-stone-200 dark:border-stone-800 px-1 py-0.5">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  ) : item.tags && item.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {item.tags.slice(0, 4).map(tag => (
                        <span key={tag} className="font-mono text-[6px] tracking-widest uppercase text-stone-500 dark:text-stone-400 border border-stone-200 dark:border-stone-800 px-1 py-0.5">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {/* EXTRA DETAILS LINE */}
                  <div className="flex justify-between items-center text-[8px] font-mono text-stone-400">
                    <span className="flex items-center gap-1">
                      <Calendar size={10} />
                      {new Date(item.savedAt).toLocaleDateString()}
                    </span>
                    {onDeleteItem && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm("Are you sure you want to delete this shard?")) {
                            onDeleteItem(item.id);
                          }
                        }}
                        className="p-1 hover:text-red-500 transition-colors"
                        title="Delete Shard"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>

                  {/* COGNITIVE CHROMATIC PATTERNS */}
                  {item.content?.palette && item.content.palette.length > 0 && (
                    <div className="flex gap-1 h-1.5 w-full">
                      {item.content.palette.map((color: string) => (
                        <div key={color} className="flex-1 h-full" style={{ backgroundColor: color }} title={color} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 2: COGNITIVE ZINES (Shared Manifestos) */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-stone-200 dark:border-stone-800 pb-2">
          <ExternalLink size={14} className="text-stone-400" />
          <h2 className="font-mono text-[10px] uppercase tracking-widest text-stone-500 font-bold">
            Published Manifests & Zines
          </h2>
        </div>

        {zines.length === 0 ? (
          <div className="py-12 text-center text-stone-400 font-serif italic text-sm">
            No published zines detected in this frequency.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {zines.map(zine => (
              <div 
                key={zine.id}
                onClick={() => onSelectZine(zine)}
                className="group relative border border-stone-200 dark:border-stone-800 hover:border-stone-800 dark:hover:border-stone-200 bg-white dark:bg-[#0B0A09] transition-all duration-300 p-6 flex flex-col justify-between cursor-pointer shadow-sm hover:shadow-lg"
              >
                <div>
                  <div className="flex justify-between items-baseline mb-4">
                    <span className="text-[7px] font-mono tracking-widest uppercase text-stone-400">
                      ZINE // {zine.userHandle || "Curator"}
                    </span>
                    <span className="text-[7px] font-mono bg-stone-100 dark:bg-stone-900 px-2 py-0.5 text-stone-600 dark:text-stone-400 tracking-widest uppercase font-bold">
                      {zine.tone || "Neutral"}
                    </span>
                  </div>

                  {/* ZINE THUMBNAIL IF COVER IMAGE EXISTS */}
                  {zine.coverImageUrl && (
                    <div className="w-full aspect-[16/9] overflow-hidden border border-stone-150 dark:border-stone-850 bg-stone-50 dark:bg-stone-920 mb-4 relative">
                      <img 
                        src={zine.coverImageUrl} 
                        alt={zine.title} 
                        className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}

                  <h3 className="font-serif italic text-2xl text-stone-900 dark:text-stone-100 group-hover:text-stone-700 dark:group-hover:text-stone-300 transition-colors mb-2">
                    {zine.title}
                  </h3>

                  {(zine as any).concept && (
                    <p className="font-serif text-stone-400 dark:text-stone-500 text-xs line-clamp-2 leading-relaxed mb-4">
                      {(zine as any).concept}
                    </p>
                  )}
                </div>

                <div className="pt-4 border-t border-stone-100 dark:border-stone-900 flex justify-between items-center text-[8px] font-mono text-stone-400">
                  <span>CREATED // {new Date(zine.createdAt || (zine as any).savedAt || Date.now()).toLocaleDateString()}</span>
                  <div className="flex items-center gap-1 hover:text-stone-800 dark:hover:text-stone-200 transition-colors">
                    <span>EXPLORE</span>
                    <Eye size={10} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
