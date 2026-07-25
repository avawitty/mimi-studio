import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Trash2, Tag, DollarSign, RefreshCw, 
  Layers, Package, ChevronRight, Info,
  TrendingUp, Ruler, Layout, Filter, Search, Bookmark, Check, Sparkles,
  Shirt, Clapperboard, BookOpen, ArrowUpRight
} from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { WardrobeItem, WardrobeCapsule } from '../types';
import { db } from '../services/firebase';
import { collection, addDoc, query, where, onSnapshot, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { logFirestoreError, OperationType } from '../services/firebaseUtils';
import { archiveManager } from '../services/archiveManager';

export const WardrobeView: React.FC = () => {
  const { user, profile } = useUser();
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [capsules, setCapsules] = useState<WardrobeCapsule[]>([]);
  const [activeTab, setActiveTab] = useState<'items' | 'capsules'>('items');
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [isAddingCapsule, setIsAddingCapsule] = useState(false);
  const [pinnedItemIds, setPinnedItemIds] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');

  const handlePinToPocket = async (item: WardrobeItem, openStudio = false) => {
    const uid = user?.uid || 'ghost';
    try {
      await archiveManager.saveToPocket(uid, 'image', {
        title: item.title,
        imageUrl: item.imageUrl,
        notes: `Wardrobe reference [${item.category?.toUpperCase()}] • Creative tags: ${item.tags.join(', ') || 'untagged'} • Optional cost/wear: $${calculateCostPerWear(item)}`,
        origin: 'Wardrobe / Creative Styling Inventory',
        wardrobeId: item.id,
        worktableContext: {
          role: 'character_outfit_reference',
          category: item.category,
          tags: item.tags,
        },
      });
      setPinnedItemIds(prev => ({ ...prev, [item.id]: true }));
      if (openStudio) {
        localStorage.setItem('mimi_pending_wardrobe_reference', JSON.stringify({
          id: item.id,
          title: item.title,
          imageUrl: item.imageUrl,
          category: item.category,
          tags: item.tags,
        }));
        window.dispatchEvent(new CustomEvent('mimi:change_view', { detail: 'studio' }));
      }
      setTimeout(() => {
        setPinnedItemIds(prev => ({ ...prev, [item.id]: false }));
      }, 3000);
    } catch (e) {
      console.error("Failed to pin wardrobe item to Pocket:", e);
    }
  };

  // New Item State
  const [newItem, setNewItem] = useState<Partial<WardrobeItem>>({
    category: 'top',
    tags: [],
    purchasePrice: 0,
    wearCount: 0,
    isArchived: false
  });
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewItem(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (!user) return;

    const itemsRef = collection(db, 'wardrobe_items');
    const qItems = query(itemsRef, where('userId', '==', user.uid));
    const unsubItems = onSnapshot(qItems, (snapshot) => {
      setItems(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as WardrobeItem)));
    }, (error) => {
      logFirestoreError(error, OperationType.LIST, 'wardrobe_items');
    });

    const capsulesRef = collection(db, 'wardrobe_capsules');
    const qCapsules = query(capsulesRef, where('userId', '==', user.uid));
    const unsubCapsules = onSnapshot(qCapsules, (snapshot) => {
      setCapsules(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as WardrobeCapsule)));
    }, (error) => {
      logFirestoreError(error, OperationType.LIST, 'wardrobe_capsules');
    });

    return () => {
      unsubItems();
      unsubCapsules();
    };
  }, [user]);

  const handleAddItem = async () => {
    if (!user || !newItem.title || !newItem.imageUrl) return;
    
    try {
      await addDoc(collection(db, 'wardrobe_items'), {
        ...newItem,
        userId: user.uid,
        createdAt: Date.now(),
        wearCount: 0,
        isArchived: false
      });
      setIsAddingItem(false);
      setNewItem({ category: 'top', tags: [], purchasePrice: 0, wearCount: 0, isArchived: false });
    } catch (e) {
      console.error("Error adding item:", e);
    }
  };

  const handleIncrementWear = async (item: WardrobeItem) => {
    const itemRef = doc(db, 'wardrobe_items', item.id);
    await updateDoc(itemRef, {
      wearCount: (item.wearCount || 0) + 1
    });
  };

  const calculateCostPerWear = (item: WardrobeItem) => {
    const price = item.purchasePrice || 0;
    const wears = item.wearCount || 0;
    if (wears === 0) return price;
    return (price / wears).toFixed(2);
  };

  const filteredItems = items.filter((item) => {
    const filter = searchTerm.trim().toLowerCase();
    if (!filter) return true;
    return [item.title, item.category, ...item.tags].some((value) =>
      value?.toLowerCase().includes(filter),
    );
  });

  return (
    <div className="w-full h-full min-h-0 overflow-y-auto bg-[#FAF8F5] dark:bg-[#080808] text-stone-900 dark:text-stone-100 font-sans p-6 md:p-12 pb-32 transition-colors">
      <header className="max-w-6xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-stone-200 dark:border-stone-850 pb-7">
        <div className="space-y-2">
          <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-amber-600 dark:text-amber-400 font-black">
            CREATIVE STYLING INVENTORY // CHARACTER & SHOOT REFERENCES
          </p>
          <h1 className="text-5xl md:text-6xl font-serif italic tracking-tight font-light text-stone-900 dark:text-stone-50">The Wardrobe</h1>
          <p className="text-stone-600 dark:text-stone-400 text-sm max-w-xl leading-relaxed">
            Build character looks, shoot capsules, and reusable outfit references. Send any garment or prop into the Worktable as approved visual context.
          </p>
        </div>

        <div className="flex bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-1 rounded-sm">
          {(['items', 'capsules'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 rounded-xs text-[10px] font-mono uppercase tracking-widest font-bold transition-all ${
                activeTab === tab ? 'bg-stone-900 dark:bg-stone-100 text-stone-100 dark:text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              {tab === 'items' ? 'Garments' : 'Shoot capsules'}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-6xl mx-auto">
        <section className="grid grid-cols-1 md:grid-cols-3 border border-stone-200 dark:border-stone-800 mb-8">
          {[
            { step: '01', icon: Shirt, title: 'Index garments', body: 'Save a clean visual, category, and character or scene tags.' },
            { step: '02', icon: Clapperboard, title: 'Assemble a look', body: 'Group pieces into a shoot capsule or recurring character wardrobe.' },
            { step: '03', icon: BookOpen, title: 'Reference in Zine', body: 'Move approved looks into the Worktable without rewriting the brief.' },
          ].map((flow) => {
            const Icon = flow.icon;
            return (
              <div key={flow.step} className="p-4 border-b md:border-b-0 md:border-r last:border-0 border-stone-200 dark:border-stone-800 flex gap-3">
                <div className="w-9 h-9 shrink-0 border border-stone-300 dark:border-stone-700 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="font-mono text-[8px] tracking-[0.2em] text-stone-400">{flow.step}</p>
                  <p className="font-serif italic text-lg">{flow.title}</p>
                  <p className="text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">{flow.body}</p>
                </div>
              </div>
            );
          })}
        </section>

        <AnimatePresence mode="wait">
          {activeTab === 'items' ? (
            <motion.div 
              key="items"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-12"
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-300" />
                    <input 
                      type="text" 
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Filter by character, scene, silhouette, or tag..." 
                      className="bg-white dark:bg-stone-950 border border-black/10 dark:border-white/10 rounded-full pl-10 pr-6 py-2 text-sm focus:border-black dark:focus:border-white outline-none w-72 transition-all"
                    />
                  </div>
                  <button className="p-2 border border-black/5 rounded-full hover:bg-white transition-all">
                    <Filter className="w-4 h-4 text-stone-400" />
                  </button>
                </div>
                <button 
                  onClick={() => setIsAddingItem(true)}
                  className="flex items-center gap-2 bg-black text-white px-6 py-3 rounded-full text-xs font-mono uppercase tracking-widest font-bold hover:scale-105 transition-transform"
                >
                  <Plus className="w-4 h-4" /> Add Garment / Prop
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {filteredItems.map(item => (
                  <motion.div 
                    layoutId={item.id}
                    key={item.id}
                    className="bg-white border border-black/5 overflow-hidden group hover:border-black/20 transition-all"
                  >
                    <div className="aspect-[3/4] relative overflow-hidden bg-stone-100">
                      <img 
                        src={item.imageUrl} 
                        alt={item.title} 
                        className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-4 left-4">
                        <span className="bg-black/80 backdrop-blur text-white px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-widest">
                          {item.category}
                        </span>
                      </div>
                      <button 
                        onClick={() => handleIncrementWear(item)}
                        className="absolute bottom-4 right-4 w-10 h-10 bg-white shadow-xl flex items-center justify-center rounded-full hover:bg-black hover:text-white transition-all translate-y-12 group-hover:translate-y-0 duration-300"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="p-6 space-y-4">
                      <div className="flex justify-between items-start">
                        <h3 className="text-xl font-serif italic truncate pr-4">{item.title}</h3>
                        <div className="text-right">
                          <p className="text-[10px] font-mono uppercase text-stone-400">CPW</p>
                          <p className="text-sm font-semibold">${calculateCostPerWear(item)}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {item.tags.map(tag => (
                          <span key={tag} className="text-[10px] text-stone-400 flex items-center gap-1 border border-stone-100 px-2 py-0.5 rounded">
                            <Tag className="w-2 h-2" /> {tag}
                          </span>
                        ))}
                        {item.synergyScore && (
                          <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-bold">
                            {item.synergyScore}% Alignment
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-stone-50">
                        <div className="flex items-center gap-2 text-stone-300">
                          <Layers className="w-3 h-3" />
                          <span className="text-[10px] font-mono">{item.wearCount} Wears</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handlePinToPocket(item, true)}
                            title="Save to Pocket and add as a visual reference in the Zine Worktable"
                            className={`px-2.5 py-1 rounded text-[10px] font-mono uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                              pinnedItemIds[item.id] 
                                ? 'bg-emerald-600 text-white' 
                                : 'bg-stone-100 hover:bg-black hover:text-white text-stone-600'
                            }`}
                          >
                            {pinnedItemIds[item.id] ? (
                              <>
                                <Check className="w-3 h-3" />
                                Added
                              </>
                            ) : (
                              <>
                                <ArrowUpRight className="w-3 h-3" />
                                Use in zine
                              </>
                            )}
                          </button>
                          <button className="text-stone-300 hover:text-red-500 transition-colors p-1">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}

                {filteredItems.length === 0 && (
                  <div className="col-span-full py-32 text-center border-2 border-dashed border-stone-200 rounded-2xl">
                    <Package className="w-12 h-12 mx-auto mb-4 text-stone-200" />
                    <p className="font-serif italic text-xl text-stone-500">
                      {items.length === 0 ? 'No styling references yet.' : 'No garments match this concept.'}
                    </p>
                    <p className="text-xs text-stone-400 mt-2">
                      {items.length === 0
                        ? 'Add a garment or prop, tag its character and scene, then use it in a Zine.'
                        : 'Try a character, scene, silhouette, material, or mood tag.'}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="capsules"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-8"
            >
              {capsules.map(capsule => (
                <div key={capsule.id} className="bg-white p-10 border border-black/5 hover:border-black/20 transition-all space-y-8">
                  <header className="flex justify-between items-start">
                    <div className="space-y-2">
                      <h3 className="text-3xl font-serif italic">{capsule.name}</h3>
                      <p className="text-stone-400 text-sm">{capsule.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-mono uppercase text-stone-300">Target Vibe</p>
                      <p className="text-xs font-bold uppercase tracking-tighter">{capsule.aestheticGoal}</p>
                    </div>
                  </header>

                  <div className="flex -space-x-4 overflow-hidden">
                    {capsule.itemIds.slice(0, 5).map(itemId => {
                      const item = items.find(i => i.id === itemId);
                      return item ? (
                        <div key={itemId} className="w-16 h-16 rounded-full border-2 border-white overflow-hidden bg-stone-100 ring-1 ring-black/5">
                          <img src={item.imageUrl} className="w-full h-full object-cover grayscale" referrerPolicy="no-referrer" />
                        </div>
                      ) : null;
                    })}
                    {capsule.itemIds.length > 5 && (
                      <div className="w-16 h-16 rounded-full border-2 border-white bg-stone-100 flex items-center justify-center text-xs font-mono ring-1 ring-black/5">
                        +{capsule.itemIds.length - 5}
                      </div>
                    )}
                  </div>

                  <footer className="flex justify-between items-center pt-8 border-t border-stone-50">
                    <div className="flex items-center gap-4 text-stone-400 text-[10px] font-mono uppercase tracking-widest">
                       <span>{capsule.itemIds.length} Items</span>
                       <span>{Math.round((capsule.itemIds.length / capsule.maxItems) * 100)}% Capacity</span>
                    </div>
                    <button className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider group">
                      View Build <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </footer>
                </div>
              ))}
              
              <button 
                onClick={() => setIsAddingCapsule(true)}
                className="group p-10 border-2 border-dashed border-stone-200 rounded-none flex flex-col items-center justify-center text-center gap-4 hover:border-black transition-all"
              >
                <Plus className="w-10 h-10 text-stone-300 group-hover:text-black transition-colors" />
                <div className="space-y-1">
                  <p className="font-serif italic text-2xl group-hover:text-black dark:group-hover:text-white">New Shoot Capsule</p>
                  <p className="text-xs text-stone-400 uppercase tracking-widest">Assemble a character, scene, or campaign look</p>
                </div>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Add Item Modal */}
      <AnimatePresence>
        {isAddingItem && (
          <div className="fixed inset-0 z-[200] flex items-center justify-end">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingItem(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-lg h-full bg-white shadow-2xl p-12 flex flex-col"
            >
              <div className="flex justify-between items-center mb-12">
                <h2 className="text-3xl font-serif italic">Index Garment / Prop</h2>
                <button onClick={() => setIsAddingItem(false)} className="p-2 hover:bg-stone-50 rounded-full transition-colors">
                  <Plus className="rotate-45 w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 space-y-8 overflow-y-auto pr-4 custom-scrollbar">
                <div className="space-y-2">
                  <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-stone-400">Asset Title</label>
                  <input 
                    type="text" 
                    value={newItem.title || ''}
                    onChange={(e) => setNewItem({...newItem, title: e.target.value})}
                    placeholder="e.g. Heavy Merino Overcoat"
                    className="w-full text-2xl font-serif italic border-b border-black/10 focus:border-black outline-none py-2 transition-colors"
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-stone-400">Visual Anchor</label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-video w-full border-2 border-dashed border-stone-200 flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-stone-50 transition-all overflow-hidden relative"
                  >
                    {newItem.imageUrl ? (
                      <img src={newItem.imageUrl} className="w-full h-full object-cover" />
                    ) : (
                      <>
                        <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center">
                          <Plus className="w-5 h-5 text-stone-300" />
                        </div>
                        <p className="text-[10px] font-mono uppercase text-stone-400">Link Image or Upload File</p>
                      </>
                    )}
                    <input 
                      type="file" 
                      className="hidden" 
                      ref={fileInputRef} 
                      onChange={handleFileChange} 
                      accept="image/*" 
                    />
                  </div>
                  <input 
                    type="text" 
                    value={newItem.imageUrl || ''}
                    onChange={(e) => setNewItem({...newItem, imageUrl: e.target.value})}
                    placeholder="...or paste reference image URL"
                    className="w-full text-[10px] font-mono border-b border-black/10 focus:border-black outline-none py-2 transition-colors opacity-50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-stone-400">Category</label>
                    <select 
                      value={newItem.category}
                      onChange={(e) => setNewItem({...newItem, category: e.target.value as any})}
                      className="w-full bg-transparent border-b border-black/10 outline-none py-2 font-mono text-sm"
                    >
                      <option value="top">Top</option>
                      <option value="bottom">Bottom</option>
                      <option value="outerwear">Outerwear</option>
                      <option value="shoe">Shoe</option>
                      <option value="accessory">Accessory</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-stone-400">Purchase Price</label>
                    <div className="relative">
                      <DollarSign className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-3 text-stone-400" />
                      <input 
                        type="number" 
                        value={newItem.purchasePrice || ''}
                        onChange={(e) => setNewItem({...newItem, purchasePrice: Number(e.target.value)})}
                        className="w-full bg-transparent border-b border-black/10 outline-none py-2 pl-4 font-mono text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                   <div className="flex justify-between items-center">
                     <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-stone-400">Creative Reference Tags</label>
                     <span className="text-[10px] font-mono text-stone-300">Comma separated</span>
                   </div>
                   <input 
                    type="text" 
                    placeholder="Character, scene, silhouette, material, shoot..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const val = (e.target as HTMLInputElement).value;
                        if (val) {
                          setNewItem({...newItem, tags: [...(newItem.tags || []), ...val.split(',').map(s => s.trim())]});
                          (e.target as HTMLInputElement).value = '';
                        }
                      }
                    }}
                    className="w-full bg-transparent border-b border-black/10 outline-none py-2 font-mono text-sm"
                   />
                   <div className="flex flex-wrap gap-2">
                     {newItem.tags?.map(tag => (
                       <span key={tag} className="flex items-center gap-2 bg-stone-50 px-3 py-1 text-xs font-mono rounded-full border border-black/5">
                         {tag} <X className="w-3 h-3 cursor-pointer hover:text-red-500" onClick={() => setNewItem({...newItem, tags: newItem.tags?.filter(t => t !== tag)})} />
                       </span>
                     ))}
                   </div>
                </div>
              </div>

              <div className="pt-12 border-t border-black/5 mt-auto">
                <button 
                  onClick={handleAddItem}
                  className="w-full bg-black text-white py-6 text-sm font-mono uppercase tracking-[0.4em] font-black hover:invert transition-all flex items-center justify-center gap-4"
                >
                  Add to Styling Inventory <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const X = ({ className, onClick }: { className?: string, onClick?: () => void }) => (
  <svg 
    onClick={onClick}
    xmlns="http://www.w3.org/2000/svg" 
    width="24" height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
  </svg>
);

const ArrowRight = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
  </svg>
);
