import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useUser } from '../contexts/UserContext';
import { MemoryAtom } from '../types';
import { fetchMemoryAtoms, saveMemoryAtom, deleteMemoryAtom, suggestTitleForAtom } from '../services/memoryService';
import { 
  Folder, 
  Plus, 
  Trash2, 
  Copy, 
  Sparkles, 
  Search, 
  BookOpen, 
  Clock, 
  Brain, 
  Layers, 
  Check, 
  Database,
  Edit2,
  X,
  ArrowRight,
  PenLine
} from 'lucide-react';
import { addToUsedContext } from '../services/usedContextService';

interface ResearchMemoryProps {
  mode?: 'manage' | 'retrieve';
  embedded?: boolean;
}

export const ResearchMemory: React.FC<ResearchMemoryProps> = ({ mode = 'manage', embedded = false }) => {
  const { user } = useUser();
  const [atoms, setAtoms] = useState<MemoryAtom[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Project management
  const [projects, setProjects] = useState<string[]>(['Default Project', 'Cultural Synthesis', 'Aesthetic Trajectories']);
  const [selectedProject, setSelectedProject] = useState<string>('Default Project');
  const [newProjectName, setNewProjectName] = useState('');
  const [showNewProjectInput, setShowNewProjectInput] = useState(false);
  
  // Atom filtering & search
  const [searchQuery, setSearchQuery] = useState('');
  
  // Custom manual atom form
  const [manualTitle, setManualTitle] = useState('');
  const [manualContent, setManualContent] = useState('');
  const [manualSource, setManualSource] = useState('Manual Intake');
  const [manualTags, setManualTags] = useState('');
  const [generatingTitle, setGeneratingTitle] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Editing state
  const [editingAtom, setEditingAtom] = useState<MemoryAtom | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  
  // Visual cues
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sentToStudioId, setSentToStudioId] = useState<string | null>(null);
  const [sentToEditId, setSentToEditId] = useState<string | null>(null);

  // Load user memory atoms
  const loadMemory = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const fetched = await fetchMemoryAtoms(user.uid);
      setAtoms(fetched);
      
      // Extract unique project IDs/names to supplement default projects
      const uniqueProjects = Array.from(new Set(fetched.map(a => a.projectId).filter(Boolean)));
      setProjects(prev => {
        const merged = Array.from(new Set([...prev, ...uniqueProjects]));
        return merged.length > 0 ? merged : ['Default Project'];
      });
    } catch (e) {
      console.error("MIMI // Failed to load memory atoms:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMemory();
  }, [user?.uid]);

  // Handle saving memory atom
  const handleCreateAtom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid || !manualContent.trim()) return;

    setIsSubmitting(true);
    try {
      let finalTitle = manualTitle.trim();
      if (!finalTitle) {
        setGeneratingTitle(true);
        finalTitle = await suggestTitleForAtom(manualContent);
        setGeneratingTitle(false);
      }

      const newAtom: MemoryAtom = {
        id: `atom_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        projectId: selectedProject,
        content: manualContent.trim(),
        title: finalTitle,
        timestamp: Date.now(),
        source: manualSource,
        tags: manualTags ? manualTags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean) : []
      };

      await saveMemoryAtom(user.uid, newAtom);
      setAtoms(prev => [newAtom, ...prev]);
      
      // Clear form
      setManualTitle('');
      setManualContent('');
      setManualTags('');
    } catch (e) {
      console.error("MIMI // Failed to create memory atom:", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Gemini Title generation
  const handleAutoTitle = async () => {
    if (!manualContent.trim()) {
      window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
        detail: { message: "Input content first to suggest title.", type: 'warning' } 
      }));
      return;
    }
    setGeneratingTitle(true);
    try {
      const suggested = await suggestTitleForAtom(manualContent);
      setManualTitle(suggested);
    } catch (e) {
      console.error(e);
    } finally {
      setGeneratingTitle(false);
    }
  };

  // Handle delete memory atom
  const handleDeleteAtom = async (atomId: string) => {
    if (!user?.uid) return;
    try {
      await deleteMemoryAtom(user.uid, atomId);
      setAtoms(prev => prev.filter(a => a.id !== atomId));
    } catch (e) {
      console.error("MIMI // Failed to delete memory atom:", e);
    }
  };

  // Handle edit memory atom
  const handleStartEdit = (atom: MemoryAtom) => {
    setEditingAtom(atom);
    setEditTitle(atom.title || '');
    setEditContent(atom.content);
  };

  const handleSaveEdit = async () => {
    if (!user?.uid || !editingAtom) return;
    try {
      const updated: MemoryAtom = {
        ...editingAtom,
        title: editTitle.trim() || "Untitled Atom",
        content: editContent.trim(),
        timestamp: Date.now() // touch timestamp
      };

      await saveMemoryAtom(user.uid, updated);
      setAtoms(prev => prev.map(a => a.id === updated.id ? updated : a));
      setEditingAtom(null);
    } catch (e) {
      console.error(e);
    }
  };

  // Add a new project
  const handleAddProject = (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = newProjectName.trim();
    if (!normalized) return;
    
    if (!projects.includes(normalized)) {
      setProjects(prev => [...prev, normalized]);
      setSelectedProject(normalized);
      window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
        detail: { message: `Container "${normalized}" Initialized.`, type: 'success' } 
      }));
    } else {
      setSelectedProject(normalized);
    }
    setNewProjectName('');
    setShowNewProjectInput(false);
  };

  // Copy to clipboard helper
  const handleCopy = (atom: MemoryAtom) => {
    navigator.clipboard.writeText(atom.content);
    setCopiedId(atom.id);
    setTimeout(() => setCopiedId(null), 2000);
    window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
      detail: { message: "Atom Copied to Clipboard.", type: 'success' } 
    }));
  };

  const handleSendToStudio = (atom: MemoryAtom) => {
    addToUsedContext(atom, 'studio', user?.uid);
    setSentToStudioId(atom.id);
    window.dispatchEvent(
      new CustomEvent("mimi:route-request", { detail: { path: "/studio" } }),
    );
    window.dispatchEvent(
      new CustomEvent("mimi:sound", { detail: { type: "shimmer" } }),
    );
    window.dispatchEvent(new CustomEvent('mimi:registry_alert', {
      detail: { message: "Atom queued in Studio Used Context.", type: 'success' }
    }));
    setTimeout(() => setSentToStudioId(null), 2500);
  };

  const handleSendToEdit = (atom: MemoryAtom) => {
    addToUsedContext(atom, 'the-edit', user?.uid);
    setSentToEditId(atom.id);
    window.dispatchEvent(
      new CustomEvent("mimi:route-request", { detail: { path: "/the-edit" } }),
    );
    window.dispatchEvent(new CustomEvent('mimi:registry_alert', {
      detail: { message: "Atom queued in The Edit Used Context.", type: 'success' }
    }));
    setTimeout(() => setSentToEditId(null), 2500);
  };

  const handleSendAllToStudio = () => {
    filteredAtoms.forEach((atom) => addToUsedContext(atom, 'studio', user?.uid));
    window.dispatchEvent(
      new CustomEvent("mimi:route-request", { detail: { path: "/studio" } }),
    );
  };

  // Filter atoms by project and search query
  const filteredAtoms = atoms.filter(atom => {
    const matchesProject = atom.projectId === selectedProject;
    const matchesSearch = searchQuery 
      ? atom.content.toLowerCase().includes(searchQuery.toLowerCase()) || 
        atom.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        atom.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
      : true;
    return matchesProject && matchesSearch;
  });

  return (
    <div className={`flex flex-col h-full bg-nous-base ${embedded ? 'overflow-hidden' : 'overflow-y-auto pb-32'}`}>
      <div className={`${embedded ? 'p-4 md:p-6 space-y-6 h-full overflow-y-auto' : 'p-4 md:p-8 pt-8 md:pt-12 space-y-8'} max-w-6xl mx-auto w-full`}>
        
        {/* HEADER */}
        {!embedded && (
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-nous-border">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Brain className="text-nous-subtle" size={28} />
              <h1 className="text-3xl md:text-5xl font-serif italic text-nous-text">
                Research Memory
              </h1>
            </div>
            <p className="text-[10px] md:text-xs font-sans uppercase tracking-[0.2em] text-nous-subtle">
              {mode === 'retrieve'
                ? 'Retrieve — search atoms and route to Studio or The Edit'
                : 'The Cognitive Reservoir — Persistent Project-Based Memory Atoms'}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 font-mono text-[10px] text-nous-subtle border border-nous-border/50 px-3 py-1.5 bg-nous-base0/20">
              <Database size={12} className="text-stone-500 animate-pulse" />
              FIRESTORE DURABLE SYNC
            </span>
          </div>
        </div>
        )}

        {/* THREE COLUMN BENTO GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* COLUMN 1: PROJECT SELECTOR (LG: 3 cols) */}
          <div className="lg:col-span-3 space-y-6">
            <div className="p-5 border border-nous-border bg-nous-base0/15 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-nous-subtle">
                  <Folder size={14} />
                  <span className="font-sans text-[9px] uppercase tracking-widest font-black">Containers</span>
                </div>
                {!showNewProjectInput && (
                  <button 
                    onClick={() => setShowNewProjectInput(true)}
                    className="p-1 hover:bg-nous-base0/50 border border-transparent hover:border-nous-border/50 rounded-full transition-all"
                  >
                    <Plus size={14} className="text-nous-text" />
                  </button>
                )}
              </div>

              {showNewProjectInput && (
                <form onSubmit={handleAddProject} className="space-y-2 mt-2">
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="Project Title..."
                    className="w-full px-3 py-2 border border-nous-border bg-nous-base font-serif italic text-sm text-nous-text focus:outline-none focus:border-nous-text"
                    autoFocus
                  />
                  <div className="flex gap-2 justify-end">
                    <button 
                      type="button" 
                      onClick={() => setShowNewProjectInput(false)}
                      className="px-2.5 py-1 border border-nous-border text-[9px] uppercase tracking-wider font-sans text-nous-subtle hover:bg-nous-base0/50"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="px-2.5 py-1 bg-nous-text text-nous-base text-[9px] uppercase tracking-wider font-sans hover:opacity-90"
                    >
                      Create
                    </button>
                  </div>
                </form>
              )}

              <div className="flex flex-col gap-1.5 mt-2 max-h-[300px] overflow-y-auto">
                {projects.map((proj) => {
                  const projectCount = atoms.filter(a => a.projectId === proj).length;
                  const isSelected = selectedProject === proj;
                  return (
                    <button
                      key={proj}
                      onClick={() => setSelectedProject(proj)}
                      className={`w-full text-left flex items-center justify-between px-3.5 py-2.5 transition-all duration-300 ${
                        isSelected 
                          ? 'bg-nous-text text-nous-base font-serif italic' 
                          : 'hover:bg-nous-base0/20 text-nous-subtle hover:text-nous-text font-serif italic'
                      }`}
                    >
                      <span className="truncate text-sm">{proj}</span>
                      <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded-full ${
                        isSelected ? 'bg-nous-base/20 text-nous-base' : 'bg-nous-base0/40 text-nous-subtle'
                      }`}>
                        {projectCount}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-5 border border-nous-border bg-nous-base0/10 space-y-3 font-sans text-[11px] leading-relaxed text-nous-subtle">
              <div className="flex items-center gap-1.5 font-bold uppercase tracking-widest text-nous-text">
                <Brain size={12} />
                Cognitive Synthesis
              </div>
              <p>
                Memory Atoms represent raw fragments of knowledge generated or discovered across your sessions. 
              </p>
              <p>
                Group them into Projects to establish structured context reservoirs for future conceptual synthesis.
              </p>
            </div>
          </div>

          {/* COLUMN 2 & 3: FORM & DRAWER LIST (LG: 9 cols) */}
          <div className="lg:col-span-9 space-y-8">
            
            {/* MANUAL CREATOR */}
            {mode === 'manage' && (
            <form onSubmit={handleCreateAtom} className="p-6 border border-nous-border bg-nous-base0/15 space-y-4">
              <div className="flex items-center justify-between border-b border-nous-border/40 pb-3">
                <div className="flex items-center gap-2 text-nous-subtle">
                  <Sparkles size={14} className="text-stone-500 animate-pulse" />
                  <span className="font-sans text-[9px] uppercase tracking-widest font-black">Atomize Fragment</span>
                </div>
                <span className="font-mono text-[9px] text-nous-subtle italic">
                  Destination Container: {selectedProject}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block font-sans text-[8px] uppercase tracking-wider text-nous-subtle font-black">
                    Content Fragment (Required)
                  </label>
                  <textarea
                    required
                    value={manualContent}
                    onChange={(e) => setManualContent(e.target.value)}
                    placeholder="Paste research, citations, generated outputs, or raw thoughts here..."
                    className="w-full min-h-[100px] p-4 border border-nous-border bg-nous-base text-xs font-sans text-nous-text focus:outline-none focus:border-nous-text placeholder:text-nous-subtle/50 leading-relaxed"
                  />
                </div>

                <div className="space-y-4 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="block font-sans text-[8px] uppercase tracking-wider text-nous-subtle font-black">
                          Conceptual Title (Optional)
                        </label>
                        <button
                          type="button"
                          onClick={handleAutoTitle}
                          disabled={generatingTitle || !manualContent.trim()}
                          className="flex items-center gap-1 font-sans text-[8px] uppercase tracking-wider text-nous-text hover:text-nous-subtle transition-colors disabled:opacity-30 disabled:pointer-events-none"
                        >
                          <Sparkles size={10} className={generatingTitle ? "animate-spin" : ""} />
                          AI Auto-Title
                        </button>
                      </div>
                      <input
                        type="text"
                        value={manualTitle}
                        onChange={(e) => setManualTitle(e.target.value)}
                        placeholder="e.g. Semiotic Dissonance"
                        className="w-full px-3 py-2.5 border border-nous-border bg-nous-base font-serif italic text-sm text-nous-text focus:outline-none focus:border-nous-text placeholder:text-nous-subtle/50"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="block font-sans text-[8px] uppercase tracking-wider text-nous-subtle font-black">
                          Provenance / Source
                        </label>
                        <select
                          value={manualSource}
                          onChange={(e) => setManualSource(e.target.value)}
                          className="w-full px-3 py-2.5 border border-nous-border bg-nous-base font-sans text-[10px] uppercase tracking-widest text-nous-text focus:outline-none focus:border-nous-text"
                        >
                          <option value="Manual Intake">Manual Intake</option>
                          <option value="The Oracle">The Oracle</option>
                          <option value="The Scribe">The Scribe</option>
                          <option value="Web Synthesis">Web Synthesis</option>
                          <option value="Deep Research">Deep Research</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block font-sans text-[8px] uppercase tracking-wider text-nous-subtle font-black">
                          Tags (Comma separated)
                        </label>
                        <input
                          type="text"
                          value={manualTags}
                          onChange={(e) => setManualTags(e.target.value)}
                          placeholder="minimal, aura, trend"
                          className="w-full px-3 py-2.5 border border-nous-border bg-nous-base font-sans text-[10px] text-nous-text focus:outline-none focus:border-nous-text placeholder:text-nous-subtle/50"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || !manualContent.trim()}
                    className="w-full py-3 bg-nous-text hover:bg-nous-text/90 text-nous-base font-sans text-[9px] uppercase tracking-widest font-black transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Layers size={12} className="animate-spin" />
                        INDEXING IN CLOUD...
                      </>
                    ) : (
                      <>
                        <Database size={12} />
                        ATOMIZE & LOCK IN PERSISTENCE
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
            )}

            {/* SEARCH AND DRAWER */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-nous-subtle">
                  <BookOpen size={16} />
                  <h2 className="font-serif italic text-xl text-nous-text">
                    Memory Atoms inside "{selectedProject}"
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  {mode === 'retrieve' && filteredAtoms.length > 0 && (
                    <button
                      type="button"
                      onClick={handleSendAllToStudio}
                      className="px-3 py-2 border border-nous-border font-mono text-[8px] uppercase tracking-widest hover:bg-nous-base0/30 whitespace-nowrap"
                    >
                      Send all to Studio
                    </button>
                  )}
                {/* SEARCH INPUT */}
                <div className="relative max-w-xs w-full">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-nous-subtle" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search atoms..."
                    className="w-full pl-9 pr-4 py-2 border border-nous-border bg-nous-base font-sans text-[11px] text-nous-text focus:outline-none focus:border-nous-text placeholder:text-nous-subtle/50"
                  />
                </div>
                </div>
              </div>

              {/* MEMORY LIST */}
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 border border-nous-border bg-nous-base0/5 gap-3">
                  <Layers className="animate-spin text-nous-subtle" size={24} />
                  <span className="font-sans text-[9px] uppercase tracking-widest text-nous-subtle">
                    Reading Cognitive Archive...
                  </span>
                </div>
              ) : filteredAtoms.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 border border-dashed border-nous-border bg-nous-base0/5 text-center px-6">
                  <Folder className="text-nous-subtle/40 mb-3" size={32} />
                  <p className="font-serif italic text-base text-nous-subtle mb-1">No Atoms Anchored Here</p>
                  <p className="font-sans text-[9px] uppercase tracking-wider text-nous-subtle max-w-sm">
                    {searchQuery 
                      ? "No elements match your search filter." 
                      : `Highlight text anywhere in the app, or use the form above to lock in your first cognitive seed.`
                    }
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <AnimatePresence mode="popLayout">
                    {filteredAtoms.map((atom) => (
                      <motion.div
                        key={atom.id}
                        layoutId={atom.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="border border-nous-border bg-nous-base0/10 p-5 flex flex-col justify-between gap-4 relative group hover:border-nous-text/30 transition-all duration-300"
                      >
                        {/* CARD CONTENT */}
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className="font-serif italic text-lg text-nous-text leading-snug">
                                {atom.title || "Untitled Fragment"}
                              </h3>
                              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                <span className="font-mono text-[8px] text-nous-subtle uppercase border border-nous-border/40 px-1.5 py-0.5 bg-nous-base0/30">
                                  {atom.source || "Intake"}
                                </span>
                                {atom.tags?.map(t => (
                                  <span key={t} className="font-sans text-[8px] text-nous-subtle/80 uppercase">
                                    #{t}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* CARD ACTIONS */}
                            <div className="flex items-center gap-1 opacity-10 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleSendToStudio(atom)}
                                className="p-1.5 border border-nous-border bg-nous-base hover:bg-emerald-500/10 text-nous-subtle hover:text-emerald-400"
                                title="Send to Studio Used Context"
                              >
                                {sentToStudioId === atom.id ? (
                                  <Check size={12} className="text-emerald-500" />
                                ) : (
                                  <ArrowRight size={12} />
                                )}
                              </button>
                              {(mode === 'retrieve' || mode === 'manage') && (
                              <button
                                onClick={() => handleSendToEdit(atom)}
                                className="p-1.5 border border-nous-border bg-nous-base hover:bg-violet-500/10 text-nous-subtle hover:text-violet-400"
                                title="Send to The Edit Used Context"
                              >
                                {sentToEditId === atom.id ? (
                                  <Check size={12} className="text-violet-500" />
                                ) : (
                                  <PenLine size={12} />
                                )}
                              </button>
                              )}
                              <button
                                onClick={() => handleStartEdit(atom)}
                                className="p-1.5 border border-nous-border bg-nous-base hover:bg-nous-base0/50 text-nous-subtle hover:text-nous-text"
                                title="Edit Atom"
                              >
                                <Edit2 size={12} />
                              </button>
                              <button
                                onClick={() => handleCopy(atom)}
                                className="p-1.5 border border-nous-border bg-nous-base hover:bg-nous-base0/50 text-nous-subtle hover:text-nous-text"
                                title="Copy Content"
                              >
                                {copiedId === atom.id ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                              </button>
                              <button
                                onClick={() => handleDeleteAtom(atom.id)}
                                className="p-1.5 border border-nous-border bg-nous-base hover:bg-red-500/10 text-nous-subtle hover:text-red-500"
                                title="Purge Atom"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>

                          <div className="text-xs text-nous-subtle font-sans leading-relaxed whitespace-pre-wrap max-h-[140px] overflow-y-auto pr-1">
                            {atom.content}
                          </div>
                        </div>

                        {/* CARD FOOTER */}
                        <div className="flex items-center justify-between border-t border-nous-border/30 pt-3 text-[8px] font-sans uppercase tracking-widest text-nous-subtle">
                          <span className="flex items-center gap-1">
                            <Clock size={10} />
                            {new Date(atom.timestamp).toLocaleDateString(undefined, { 
                              month: 'short', 
                              day: 'numeric', 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                          <span className="font-mono text-[7px] text-nous-subtle/50">
                            ID: {atom.id.split('_').pop()}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* EDIT MODAL DIALOG */}
      <AnimatePresence>
        {editingAtom && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-nous-base border border-nous-border w-full max-w-lg p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-nous-border pb-3">
                <span className="font-serif italic text-lg text-nous-text">Edit Memory Atom</span>
                <button 
                  onClick={() => setEditingAtom(null)}
                  className="p-1 hover:bg-nous-base0/50 rounded-full text-nous-subtle hover:text-nous-text"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block font-sans text-[8px] uppercase tracking-wider text-nous-subtle font-black">
                    Conceptual Title
                  </label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-nous-border bg-nous-base font-serif italic text-sm text-nous-text focus:outline-none focus:border-nous-text"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block font-sans text-[8px] uppercase tracking-wider text-nous-subtle font-black">
                    Content Fragment
                  </label>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full min-h-[160px] p-4 border border-nous-border bg-nous-base text-xs font-sans text-nous-text focus:outline-none focus:border-nous-text leading-relaxed"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-nous-border">
                <button 
                  onClick={() => setEditingAtom(null)}
                  className="px-4 py-2 border border-nous-border font-sans text-[10px] uppercase tracking-widest text-nous-subtle hover:bg-nous-base0/50"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveEdit}
                  className="px-4 py-2 bg-nous-text text-nous-base font-sans text-[10px] uppercase tracking-widest font-black hover:opacity-90"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
