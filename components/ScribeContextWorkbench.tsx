import React, { useState, useEffect } from 'react';
import { 
  Check, 
  X, 
  ChevronDown, 
  ChevronUp, 
  Database, 
  ExternalLink, 
  Loader2, 
  Search, 
  Upload, 
  Trash2, 
  Save, 
  Sparkles, 
  Info, 
  ThumbsUp, 
  ThumbsDown, 
  ArrowRight,
  Eye,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { PocketItem } from '../types';
import { 
  approveScribeInference, 
  retrieveScribeContext, 
  askScribeExplainable, 
  saveScribeDecision,
  type ScribeAnswer, 
  type ScribeContextItem 
} from '../services/scribeService';
import { importPinterestPins, previewPinterestBoard, type PinterestBoardPreview } from '../services/pinterestConnector';
import { getProvenanceRecord, type ProvenanceRecord } from '../lib/provenance';
import { updateTasteGraphNodeStatus } from '../services/tasteGraphService';

interface Props { userId: string; pocket: PocketItem[]; }

export const ScribeContextWorkbench: React.FC<Props> = ({ userId, pocket }) => {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<ScribeAnswer | null>(null);
  const [loading, setLoading] = useState(false);
  const [silentRegenerating, setSilentRegenerating] = useState(false);
  const [boardUrl, setBoardUrl] = useState('');
  const [board, setBoard] = useState<PinterestBoardPreview | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [retrievedContext, setRetrievedContext] = useState<ScribeContextItem[]>([]);
  const [isSaving, setIsSaving] = useState<Record<string, boolean>>({});
  
  // Custom interactive states for cross-linking
  const [hoveredEvidenceId, setHoveredEvidenceId] = useState<string | null>(null);
  const [hoveredInferenceId, setHoveredInferenceId] = useState<string | null>(null);
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | null>(null);
  const [selectedInferenceId, setSelectedInferenceId] = useState<string | null>(null);

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    decisions: true,
    dollIdentity: true,
    tasteSignals: true,
    specimens: true,
    research: true,
    memoryAtoms: true
  });

  // Inference status local states
  const [inferenceApprovals, setInferenceApprovals] = useState<Record<string, 'approved' | 'rejected' | null>>({});

  // Inspect context modal state
  const [inspectingItem, setInspectingItem] = useState<ScribeContextItem | null>(null);
  const [provenanceRecord, setProvenanceRecord] = useState<ProvenanceRecord | null>(null);
  const [provenanceLoading, setProvenanceLoading] = useState(false);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const ask = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setAnswer(null);
    setHoveredEvidenceId(null);
    setHoveredInferenceId(null);
    setSelectedEvidenceId(null);
    setSelectedInferenceId(null);
    setInferenceApprovals({});
    try {
      const context = await retrieveScribeContext(userId, question, pocket);
      setRetrievedContext(context);
      const res = await askScribeExplainable(userId, question, context);
      setAnswer(res);
    } catch (err) {
      console.error("MIMI // Workbench Ask failed:", err);
    } finally { setLoading(false); }
  };

  const handleRemoveContextItem = async (id: string) => {
    const updated = retrievedContext.filter(item => item.id !== id);
    setRetrievedContext(updated);
    setSilentRegenerating(true);
    try {
      const res = await askScribeExplainable(userId, question, updated);
      setAnswer(res);
      window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
        detail: { message: "Context updated and answer silently regenerated.", type: 'success' } 
      }));
    } catch (err) {
      console.error("MIMI // Workbench Silent Recalculation failed:", err);
    } finally { setSilentRegenerating(false); }
  };

  const handleApproveInference = async (inf: any) => {
    setIsSaving(prev => ({ ...prev, [inf.id]: true }));
    try {
      // 1. Update Taste Graph Node status in Firestore for any supporting taste signals
      const linkedSignals = getLinkedTasteSignalsForInference(inf);
      for (const sig of linkedSignals) {
        await updateTasteGraphNodeStatus(userId, sig.id, 'accepted');
      }

      // 2. Approve Scribe Inference (adds as Memory Atom)
      await approveScribeInference(userId, 'global', inf.statement);
      
      // Update local states
      setInferenceApprovals(prev => ({ ...prev, [inf.id]: 'approved' }));
      
      // Update local retrievedContext status
      setRetrievedContext(prev => prev.map(item => {
        if (linkedSignals.some(s => s.id === item.id)) {
          return { ...item, approvalStatus: 'approved' };
        }
        return item;
      }));

      window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
        detail: { message: `Inference approved. ${linkedSignals.length} Taste signals accepted in database.`, type: 'success' } 
      }));
    } catch (err) {
      console.error("MIMI // Inference approval failed:", err);
    } finally {
      setIsSaving(prev => ({ ...prev, [inf.id]: false }));
    }
  };

  const handleRejectInference = async (inf: any) => {
    setIsSaving(prev => ({ ...prev, [inf.id]: true }));
    try {
      // 1. Update Taste Graph Node status in Firestore for any supporting taste signals to rejected
      const linkedSignals = getLinkedTasteSignalsForInference(inf);
      for (const sig of linkedSignals) {
        await updateTasteGraphNodeStatus(userId, sig.id, 'rejected');
      }

      // Update local states
      setInferenceApprovals(prev => ({ ...prev, [inf.id]: 'rejected' }));
      
      // Update local retrievedContext status
      setRetrievedContext(prev => prev.map(item => {
        if (linkedSignals.some(s => s.id === item.id)) {
          return { ...item, approvalStatus: 'rejected' };
        }
        return item;
      }));

      window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
        detail: { message: `Inference rejected. ${linkedSignals.length} Taste signals marked rejected.`, type: 'success' } 
      }));
    } catch (err) {
      console.error("MIMI // Inference rejection failed:", err);
    } finally {
      setIsSaving(prev => ({ ...prev, [inf.id]: false }));
    }
  };

  const handleSaveDecision = async (id: string, action: string, rationale: string) => {
    setIsSaving(prev => ({ ...prev, [id]: true }));
    try {
      await saveScribeDecision(userId, 'global', "Scribe Recommendation", action, rationale);
      window.dispatchEvent(new CustomEvent('mimi:registry_alert', { detail: { message: "Strategic recommendation saved as Creative Law.", type: 'success' } }));
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(prev => ({ ...prev, [id]: false }));
    }
  };

  const preview = async () => {
    setLoading(true);
    try {
      const externalIds = pocket.map((item: any) => item.content?.provenance?.externalId).filter(Boolean);
      const result = await previewPinterestBoard(boardUrl, externalIds);
      setBoard(result);
      setSelected(result.pins.filter((pin) => !pin.duplicate).map((pin) => pin.externalId));
    } finally { setLoading(false); }
  };

  const importSelected = async () => {
    if (!board || !selected.length) return;
    setImporting(true);
    try {
      const ids = await importPinterestPins(userId, board, selected);
      window.dispatchEvent(new CustomEvent('mimi:registry_alert', { detail: { message: `${ids.length} Pinterest specimens imported for review.`, type: 'success' } }));
      setSelected([]);
    } finally { setImporting(false); }
  };

  // Helper to find linked Taste Graph signals for an inference statement
  const getLinkedTasteSignalsForInference = (inf: any) => {
    if (!answer) return [];
    const linkedEv = answer.evidence.filter(e => inf.evidenceIds.includes(e.id));
    const linkedCtxIds = linkedEv.flatMap(e => e.contextIds);
    return retrievedContext.filter(item => item.kind === 'taste_signal' && linkedCtxIds.includes(item.id));
  };

  // Fetch provenance dynamically for Inspect Modal
  useEffect(() => {
    if (!inspectingItem) {
      setProvenanceRecord(null);
      return;
    }
    
    const fetchProvenance = async () => {
      setProvenanceLoading(true);
      try {
        const record = await getProvenanceRecord(userId, inspectingItem.id);
        setProvenanceRecord(record);
      } catch (err) {
        console.error("Error fetching provenance:", err);
      } finally {
        setProvenanceLoading(false);
      }
    };

    fetchProvenance();
  }, [inspectingItem, userId]);

  // Group context items for accordion rendering
  const contextGroups = {
    decisions: retrievedContext.filter(item => item.kind === 'approved_decision' || item.kind === 'tailor_intake'),
    dollIdentity: retrievedContext.filter(item => item.kind === 'doll_identity'),
    tasteSignals: retrievedContext.filter(item => item.kind === 'taste_signal'),
    specimens: retrievedContext.filter(item => item.kind === 'specimen'),
    research: retrievedContext.filter(item => item.kind === 'research_record'),
    memoryAtoms: retrievedContext.filter(item => item.kind === 'memory_atom')
  };

  return (
    <div className="h-full relative overflow-hidden bg-stone-50 dark:bg-stone-950 text-stone-950 dark:text-stone-50 flex flex-col">
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        
        {/* Scribe Request Panel */}
        <section className="space-y-3">
          <div>
            <h3 className="font-serif italic text-xl">Explainable Scribe</h3>
            <p className="text-[9px] uppercase tracking-widest text-nous-subtle mt-1">Ask → retrieve → inspect → approve</p>
          </div>
          <textarea 
            value={question} 
            onChange={(e) => setQuestion(e.target.value)} 
            placeholder="Ask about your taste, research, or project direction…" 
            className="w-full min-h-20 border border-nous-border bg-transparent p-3 text-xs outline-none focus:border-stone-900 dark:focus:border-stone-100" 
          />
          <button 
            onClick={ask} 
            disabled={loading || !question.trim()} 
            className="w-full py-3 bg-nous-text text-nous-base text-[9px] uppercase tracking-widest font-black flex justify-center gap-2"
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
            {loading ? 'Retrieving & synthesizing…' : 'Ask Scribe'}
          </button>
        </section>

        {/* Synthesis & Answer */}
        {answer && (
          <section className="space-y-6 border-t border-nous-border pt-5 relative">
            
            {/* Silent Regeneration HUD */}
            {silentRegenerating && (
              <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded font-mono text-[8px] uppercase tracking-widest animate-pulse">
                <Loader2 size={10} className="animate-spin" />
                Regenerating Scribe Response...
              </div>
            )}

            {/* Quick Context Stats / Toggle */}
            <div className="flex justify-between items-center bg-stone-100 dark:bg-stone-900 p-3 border border-stone-200 dark:border-stone-800">
              <span className="font-mono text-[9px] text-stone-500 uppercase">
                Used Context: {retrievedContext.length} items parsed
              </span>
              <button 
                onClick={() => setIsDrawerOpen(true)}
                className="flex items-center gap-1 font-mono text-[9px] text-stone-900 dark:text-stone-100 uppercase font-black hover:underline"
              >
                <Database size={12} />
                Inspect Context Used ({retrievedContext.length}) →
              </button>
            </div>

            {/* Layer I // Grounded Evidence */}
            <div className="space-y-2">
              <h4 className="text-[9px] uppercase tracking-widest font-black text-stone-500">
                Layer I // Grounded Evidence
              </h4>
              <div className="space-y-2">
                {answer.evidence.map((ev, idx) => {
                  const evNum = `E${idx + 1}`;
                  const isHovered = hoveredEvidenceId === ev.id || selectedEvidenceId === ev.id;
                  const isLinkedByHoveredInference = hoveredInferenceId && 
                    answer.inferences.find(inf => inf.id === hoveredInferenceId)?.evidenceIds.includes(ev.id);
                  const isLinkedBySelectedInference = selectedInferenceId && 
                    answer.inferences.find(inf => inf.id === selectedInferenceId)?.evidenceIds.includes(ev.id);
                  
                  const highlightClass = (isHovered || isLinkedByHoveredInference || isLinkedBySelectedInference)
                    ? "border-amber-500/50 bg-amber-500/5 dark:bg-amber-500/5 shadow-sm scale-[1.01]"
                    : "border-stone-200 dark:border-stone-800 bg-white/50 dark:bg-stone-900/10";

                  return (
                    <div 
                      key={ev.id} 
                      className={`text-xs font-serif leading-relaxed p-3 border transition-all duration-200 ${highlightClass}`}
                      onMouseEnter={() => setHoveredEvidenceId(ev.id)}
                      onMouseLeave={() => setHoveredEvidenceId(null)}
                      onClick={() => setSelectedEvidenceId(prev => prev === ev.id ? null : ev.id)}
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="flex-shrink-0 text-[9px] font-mono font-black bg-stone-900 text-stone-100 dark:bg-stone-100 dark:text-stone-900 px-1.5 py-0.5 rounded-sm">
                          {evNum}
                        </span>
                        <div className="flex-1">
                          {ev.statement}
                          <div className="mt-2 flex flex-wrap gap-1 items-center">
                            <span className="text-[8px] font-mono text-stone-400 mr-2">Ref: {ev.id.slice(0, 8)}</span>
                            {ev.contextIds.map(cid => {
                              const foundItem = retrievedContext.find(item => item.id === cid);
                              return (
                                <span 
                                  key={cid} 
                                  className="text-[7px] font-mono bg-stone-100 dark:bg-stone-900 px-1 py-0.5 border border-stone-200 dark:border-stone-800 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (foundItem) {
                                      setInspectingItem(foundItem);
                                    }
                                  }}
                                  title={foundItem?.title || "Inspect source metadata"}
                                >
                                  {foundItem?.title ? `[${foundItem.title.slice(0, 15)}...]` : cid.slice(0, 8)}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Layer II // Aesthetic Inferences */}
            <div className="space-y-2">
              <h4 className="text-[9px] uppercase tracking-widest font-black text-stone-500">
                Layer II // Aesthetic Inferences
              </h4>
              <div className="space-y-3">
                {answer.inferences.map((inf, idx) => {
                  const isHovered = hoveredInferenceId === inf.id || selectedInferenceId === inf.id;
                  const isLinkedByHoveredEvidence = hoveredEvidenceId && inf.evidenceIds.includes(hoveredEvidenceId);
                  const isLinkedBySelectedEvidence = selectedEvidenceId && inf.evidenceIds.includes(selectedEvidenceId);

                  const highlightClass = (isHovered || isLinkedByHoveredEvidence || isLinkedBySelectedEvidence)
                    ? "border-amber-500 bg-amber-500/5 dark:bg-amber-500/5 shadow-md"
                    : "border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/20";

                  const linkedSignals = getLinkedTasteSignalsForInference(inf);
                  const approvalState = inferenceApprovals[inf.id];

                  return (
                    <div 
                      key={inf.id} 
                      className={`border p-4 transition-all duration-200 space-y-3 ${highlightClass} ${approvalState === 'rejected' ? 'opacity-40' : ''}`}
                      onMouseEnter={() => setHoveredInferenceId(inf.id)}
                      onMouseLeave={() => setHoveredInferenceId(null)}
                      onClick={() => setSelectedInferenceId(prev => prev === inf.id ? null : inf.id)}
                    >
                      <div className="flex justify-between items-center text-[8px] font-mono text-stone-400">
                        <span className="font-bold text-stone-500 uppercase">Inference {idx + 1}</span>
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded">
                            Confidence: {inf.confidence}%
                          </span>
                        </div>
                      </div>

                      <p className={`text-xs font-serif italic text-stone-900 dark:text-stone-100 relative pl-4 border-l border-stone-300 dark:border-stone-700 ${approvalState === 'rejected' ? 'line-through' : ''}`}>
                        &ldquo;{inf.statement}&rdquo;
                      </p>

                      {/* Supporting Evidence tags */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[8px] font-mono uppercase tracking-wider text-stone-400">Supporting Evidence:</span>
                        {inf.evidenceIds.map(evId => {
                          const evIdx = answer.evidence.findIndex(e => e.id === evId);
                          const evBadge = evIdx !== -1 ? `E${evIdx + 1}` : evId.slice(0, 4);
                          const isEvActive = hoveredEvidenceId === evId || selectedEvidenceId === evId;
                          return (
                            <button
                              key={evId}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEvidenceId(prev => prev === evId ? null : evId);
                              }}
                              className={`text-[8px] font-mono px-1.5 py-0.5 border rounded transition-colors ${
                                isEvActive 
                                  ? 'bg-amber-500 text-white border-amber-600' 
                                  : 'bg-stone-100 hover:bg-stone-200 dark:bg-stone-900 dark:hover:bg-stone-800 border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400'
                              }`}
                            >
                              {evBadge}
                            </button>
                          );
                        })}
                      </div>

                      {/* Linked Taste Graph Nodes display */}
                      {linkedSignals.length > 0 && (
                        <div className="pt-2 border-t border-stone-100 dark:border-stone-900 flex flex-col gap-1">
                          <span className="text-[8px] font-mono uppercase text-stone-400">Linked Taste Graph Signals:</span>
                          <div className="flex flex-wrap gap-1">
                            {linkedSignals.map(sig => (
                              <span 
                                key={sig.id} 
                                className={`text-[8px] font-mono px-1.5 py-0.5 border flex items-center gap-1 rounded ${
                                  sig.approvalStatus === 'approved'
                                    ? 'bg-green-500/5 text-green-600 border-green-500/20'
                                    : sig.approvalStatus === 'rejected'
                                    ? 'bg-red-500/5 text-red-600 border-red-500/20'
                                    : 'bg-stone-100 dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-stone-500'
                                }`}
                              >
                                {sig.title}
                                <span className="text-[6px] uppercase opacity-70">({sig.approvalStatus})</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="pt-1 flex gap-2">
                        {approvalState === 'approved' ? (
                          <div className="w-full py-1.5 bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20 text-[8px] font-mono uppercase tracking-widest flex items-center justify-center gap-1 rounded-sm">
                            <Check size={10} /> Approved & Saved as Memory Atom
                          </div>
                        ) : approvalState === 'rejected' ? (
                          <div className="w-full py-1.5 bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20 text-[8px] font-mono uppercase tracking-widest flex items-center justify-center gap-1 rounded-sm">
                            <X size={10} /> Rejected (Taste Signal Status Updated)
                          </div>
                        ) : (
                          <>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleApproveInference(inf);
                              }} 
                              disabled={isSaving[inf.id]}
                              className="flex-1 py-1.5 bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-stone-200 text-white dark:text-stone-900 font-mono text-[8px] uppercase tracking-widest flex items-center justify-center gap-1 transition-colors rounded-sm shadow-sm"
                            >
                              {isSaving[inf.id] ? <Loader2 size={10} className="animate-spin" /> : <ThumbsUp size={10} />}
                              Approve
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRejectInference(inf);
                              }} 
                              disabled={isSaving[inf.id]}
                              className="flex-1 py-1.5 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-500/5 font-mono text-[8px] uppercase tracking-widest flex items-center justify-center gap-1 transition-colors rounded-sm"
                            >
                              {isSaving[inf.id] ? <Loader2 size={10} className="animate-spin" /> : <ThumbsDown size={10} />}
                              Reject
                            </button>
                          </>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>

            {/* Layer III // Recommendations */}
            <div className="space-y-2">
              <h4 className="text-[9px] uppercase tracking-widest font-black text-stone-500">
                Layer III // Recommendations
              </h4>
              <div className="space-y-3">
                {answer.recommendations.map((rec) => (
                  <div key={rec.id} className="border border-stone-200 dark:border-stone-800 p-3 bg-stone-50/50 dark:bg-stone-900/10 space-y-2">
                    <p className="text-xs font-sans font-bold text-stone-950 dark:text-stone-50">{rec.action}</p>
                    <p className="text-[11px] font-serif text-stone-500 leading-relaxed">{rec.rationale}</p>
                    <button 
                      onClick={() => handleSaveDecision(rec.id, rec.action, rec.rationale)} 
                      disabled={isSaving[rec.id]}
                      className="w-full py-1.5 bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-stone-200 text-white dark:text-stone-900 font-mono text-[8px] uppercase tracking-widest flex items-center justify-center gap-1 transition-colors rounded-sm"
                    >
                      {isSaving[rec.id] ? <Loader2 size={10} className="animate-spin" /> : <Save size={10}/>}
                      Save Decision
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </section>
        )}

        {/* Pinterest section */}
        <section className="space-y-3 border-t border-nous-border pt-5">
          <div>
            <h3 className="font-serif italic text-lg">Pinterest intake desk</h3>
            <p className="text-[9px] text-nous-subtle mt-1">Preview first. Imported Pins remain unapproved specimens.</p>
          </div>
          <div className="flex gap-2">
            <input 
              value={boardUrl} 
              onChange={(e) => setBoardUrl(e.target.value)} 
              placeholder="Pinterest board URL" 
              className="min-w-0 flex-1 border border-nous-border bg-transparent px-3 text-xs outline-none"
            />
            <button onClick={preview} disabled={!boardUrl || loading} className="px-3 py-3 bg-nous-text text-nous-base">
              <Upload size={13}/>
            </button>
          </div>
          
          {board && (
            <div className="space-y-3">
              <p className="text-[10px] font-bold">{board.title} · {selected.length} selected</p>
              <div className="grid grid-cols-3 gap-2">
                {board.pins.map((pin) => (
                  <button 
                    key={pin.externalId} 
                    disabled={pin.duplicate} 
                    onClick={() => setSelected((current) => current.includes(pin.externalId) ? current.filter((id) => id !== pin.externalId) : [...current, pin.externalId])} 
                    className={`relative aspect-square border ${selected.includes(pin.externalId) ? 'border-nous-text' : 'border-nous-border'} ${pin.duplicate ? 'opacity-30' : ''}`}
                  >
                    <img src={pin.imageUrl} alt={pin.description} className="w-full h-full object-cover"/>
                    {selected.includes(pin.externalId) && <Check size={14} className="absolute top-1 right-1 bg-white text-black"/>}
                  </button>
                ))}
              </div>
              <button 
                onClick={importSelected} 
                disabled={!selected.length || importing} 
                className="w-full py-3 border border-nous-border text-[9px] uppercase tracking-widest font-black flex justify-center gap-2"
              >
                {importing && <Loader2 size={12} className="animate-spin"/>}
                Import selected as specimens
              </button>
            </div>
          )}
        </section>

      </div>

      {/* DEDICATED CONTEXT USED SIDE DRAWER */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="absolute inset-0 bg-black z-40 cursor-pointer"
            />
            
            {/* Drawer Container */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute top-0 right-0 h-full w-[85%] sm:w-[380px] bg-white dark:bg-stone-900 border-l border-stone-200 dark:border-stone-800 shadow-2xl z-50 flex flex-col"
            >
              <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="text-stone-500" size={14} />
                  <span className="font-serif italic text-base">Context Used</span>
                  {silentRegenerating && <Loader2 size={12} className="animate-spin text-stone-400" />}
                </div>
                <button 
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1 text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Drawer Accordion List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                
                {/* 1. Decisions & Intakes */}
                <div className="border border-stone-200 dark:border-stone-800 rounded">
                  <button 
                    onClick={() => toggleSection('decisions')}
                    className="w-full p-3 flex items-center justify-between font-mono text-[9px] uppercase tracking-wider bg-stone-100/50 dark:bg-stone-800/50 font-black border-b border-stone-200 dark:border-stone-800"
                  >
                    <span>Saved Decisions ({contextGroups.decisions.length})</span>
                    {expandedSections.decisions ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                  {expandedSections.decisions && (
                    <div className="p-2 space-y-2 max-h-60 overflow-y-auto">
                      {contextGroups.decisions.length === 0 ? (
                        <div className="text-[10px] italic text-stone-400 p-2">No decision context elements loaded.</div>
                      ) : (
                        contextGroups.decisions.map(item => (
                          <div key={item.id} className="p-2 border border-stone-100 dark:border-stone-800 relative group hover:bg-stone-50 dark:hover:bg-stone-800/30">
                            <button 
                              onClick={() => handleRemoveContextItem(item.id)}
                              className="absolute top-2 right-2 text-stone-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Remove from Answer"
                            >
                              <Trash2 size={11} />
                            </button>
                            <span className="text-[8px] font-mono uppercase bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-1 rounded">
                              {item.kind.replace('_', ' ')}
                            </span>
                            <div className="text-[10px] font-bold text-stone-900 dark:text-stone-100 mt-1">{item.title}</div>
                            <p className="text-[9px] text-stone-500 line-clamp-2 mt-0.5">{item.excerpt}</p>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* 1b. Doll companion identity */}
                <div className="border border-stone-200 dark:border-stone-800 rounded">
                  <button 
                    onClick={() => toggleSection('dollIdentity')}
                    className="w-full p-3 flex items-center justify-between font-mono text-[9px] uppercase tracking-wider bg-stone-100/50 dark:bg-stone-800/50 font-black border-b border-stone-200 dark:border-stone-800"
                  >
                    <span>Doll Companion ({contextGroups.dollIdentity.length})</span>
                    {expandedSections.dollIdentity ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                  {expandedSections.dollIdentity && (
                    <div className="p-2 space-y-2 max-h-60 overflow-y-auto">
                      {contextGroups.dollIdentity.length === 0 ? (
                        <div className="text-[10px] italic text-stone-400 p-2">No active Doll companion. Generate one in Tailor / Mimi Dolls.</div>
                      ) : (
                        contextGroups.dollIdentity.map(item => (
                          <div key={item.id} className="p-2 border border-stone-100 dark:border-stone-800 relative group hover:bg-stone-50 dark:hover:bg-stone-800/30">
                            <button 
                              onClick={() => handleRemoveContextItem(item.id)}
                              className="absolute top-2 right-2 text-stone-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Remove from Answer"
                            >
                              <Trash2 size={11} />
                            </button>
                            <span className="text-[8px] font-mono uppercase bg-rose-500/10 text-rose-600 dark:text-rose-400 px-1 rounded">
                              doll identity
                            </span>
                            <div className="text-[10px] font-bold text-stone-900 dark:text-stone-100 mt-1">{item.title}</div>
                            <p className="text-[9px] text-stone-500 line-clamp-3 mt-0.5">{item.excerpt}</p>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* 2. Taste Signals */}
                <div className="border border-stone-200 dark:border-stone-800 rounded">
                  <button 
                    onClick={() => toggleSection('tasteSignals')}
                    className="w-full p-3 flex items-center justify-between font-mono text-[9px] uppercase tracking-wider bg-stone-100/50 dark:bg-stone-800/50 font-black border-b border-stone-200 dark:border-stone-800"
                  >
                    <span>Taste Signals ({contextGroups.tasteSignals.length})</span>
                    {expandedSections.tasteSignals ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                  {expandedSections.tasteSignals && (
                    <div className="p-2 space-y-2 max-h-60 overflow-y-auto">
                      {contextGroups.tasteSignals.length === 0 ? (
                        <div className="text-[10px] italic text-stone-400 p-2">No Taste Graph signals parsed.</div>
                      ) : (
                        contextGroups.tasteSignals.map(item => (
                          <div key={item.id} className="p-2 border border-stone-100 dark:border-stone-800 relative group hover:bg-stone-50 dark:hover:bg-stone-800/30">
                            <button 
                              onClick={() => handleRemoveContextItem(item.id)}
                              className="absolute top-2 right-2 text-stone-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Remove from Answer"
                            >
                              <Trash2 size={11} />
                            </button>
                            <div className="flex items-center gap-1">
                              <span className="text-[8px] font-mono bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1 rounded">
                                Signal
                              </span>
                              <span className={`text-[7px] font-mono px-1 border rounded uppercase ${
                                item.approvalStatus === 'approved'
                                  ? 'border-green-500/20 text-green-600 bg-green-500/5'
                                  : item.approvalStatus === 'rejected'
                                  ? 'border-red-500/20 text-red-600 bg-red-500/5'
                                  : 'border-stone-200 text-stone-500'
                              }`}>
                                {item.approvalStatus}
                              </span>
                            </div>
                            <div className="text-[10px] font-bold text-stone-900 dark:text-stone-100 mt-1">{item.title}</div>
                            <p className="text-[9px] text-stone-500 line-clamp-2 mt-0.5">{item.excerpt}</p>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* 3. Specimens */}
                <div className="border border-stone-200 dark:border-stone-800 rounded">
                  <button 
                    onClick={() => toggleSection('specimens')}
                    className="w-full p-3 flex items-center justify-between font-mono text-[9px] uppercase tracking-wider bg-stone-100/50 dark:bg-stone-800/50 font-black border-b border-stone-200 dark:border-stone-800"
                  >
                    <span>Specimens ({contextGroups.specimens.length})</span>
                    {expandedSections.specimens ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                  {expandedSections.specimens && (
                    <div className="p-2 space-y-2 max-h-60 overflow-y-auto">
                      {contextGroups.specimens.length === 0 ? (
                        <div className="text-[10px] italic text-stone-400 p-2">No specimen items loaded.</div>
                      ) : (
                        contextGroups.specimens.map(item => (
                          <div 
                            key={item.id} 
                            onClick={() => setInspectingItem(item)}
                            className="p-2 border border-stone-100 dark:border-stone-800 relative group cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-800/30 transition-colors"
                          >
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveContextItem(item.id);
                              }}
                              className="absolute top-2 right-2 text-stone-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Remove from Answer"
                            >
                              <Trash2 size={11} />
                            </button>
                            <div className="flex items-center justify-between">
                              <span className="text-[8px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1 rounded">
                                Specimen
                              </span>
                              <span className="text-[7px] font-mono text-stone-400 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Info size={8} /> Click to Inspect
                              </span>
                            </div>
                            <div className="text-[10px] font-bold text-stone-900 dark:text-stone-100 mt-1 truncate pr-4">{item.title}</div>
                            <p className="text-[9px] text-stone-500 line-clamp-2 mt-0.5">{item.excerpt}</p>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* 4. Research */}
                <div className="border border-stone-200 dark:border-stone-800 rounded">
                  <button 
                    onClick={() => toggleSection('research')}
                    className="w-full p-3 flex items-center justify-between font-mono text-[9px] uppercase tracking-wider bg-stone-100/50 dark:bg-stone-800/50 font-black border-b border-stone-200 dark:border-stone-800"
                  >
                    <span>Research Records ({contextGroups.research.length})</span>
                    {expandedSections.research ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                  {expandedSections.research && (
                    <div className="p-2 space-y-2 max-h-60 overflow-y-auto">
                      {contextGroups.research.length === 0 ? (
                        <div className="text-[10px] italic text-stone-400 p-2">No Research Observations found.</div>
                      ) : (
                        contextGroups.research.map(item => (
                          <div 
                            key={item.id} 
                            onClick={() => setInspectingItem(item)}
                            className="p-2 border border-stone-100 dark:border-stone-800 relative group cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-800/30 transition-colors"
                          >
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveContextItem(item.id);
                              }}
                              className="absolute top-2 right-2 text-stone-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Remove from Answer"
                            >
                              <Trash2 size={11} />
                            </button>
                            <div className="flex items-center justify-between">
                              <span className="text-[8px] font-mono bg-purple-500/10 text-purple-600 dark:text-purple-400 px-1 rounded">
                                Research
                              </span>
                              <span className="text-[7px] font-mono text-stone-400 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Info size={8} /> Click to Inspect
                              </span>
                            </div>
                            <div className="text-[10px] font-bold text-stone-900 dark:text-stone-100 mt-1 truncate pr-4">{item.title}</div>
                            <p className="text-[9px] text-stone-500 line-clamp-2 mt-0.5">{item.excerpt}</p>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* 5. Memory Atoms */}
                <div className="border border-stone-200 dark:border-stone-800 rounded">
                  <button 
                    onClick={() => toggleSection('memoryAtoms')}
                    className="w-full p-3 flex items-center justify-between font-mono text-[9px] uppercase tracking-wider bg-stone-100/50 dark:bg-stone-800/50 font-black border-b border-stone-200 dark:border-stone-800"
                  >
                    <span>Memory Atoms ({contextGroups.memoryAtoms.length})</span>
                    {expandedSections.memoryAtoms ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                  {expandedSections.memoryAtoms && (
                    <div className="p-2 space-y-2 max-h-60 overflow-y-auto">
                      {contextGroups.memoryAtoms.length === 0 ? (
                        <div className="text-[10px] italic text-stone-400 p-2">No Memory Atoms loaded.</div>
                      ) : (
                        contextGroups.memoryAtoms.map(item => (
                          <div key={item.id} className="p-2 border border-stone-100 dark:border-stone-800 relative group hover:bg-stone-50 dark:hover:bg-stone-800/30">
                            <button 
                              onClick={() => handleRemoveContextItem(item.id)}
                              className="absolute top-2 right-2 text-stone-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Remove from Answer"
                            >
                              <Trash2 size={11} />
                            </button>
                            <span className="text-[8px] font-mono bg-pink-500/10 text-pink-600 dark:text-pink-400 px-1 rounded">
                              Memory Atom
                            </span>
                            <div className="text-[10px] font-bold text-stone-900 dark:text-stone-100 mt-1">{item.title}</div>
                            <p className="text-[9px] text-stone-500 line-clamp-2 mt-0.5">{item.excerpt}</p>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

              </div>

              {/* Silent Reg HUD inside Drawer Footer */}
              <div className="p-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50">
                <button 
                  onClick={() => setIsDrawerOpen(false)}
                  className="w-full py-2.5 bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900 text-[9px] uppercase tracking-widest font-black text-center"
                >
                  Done Inspecting
                </button>
              </div>

            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* INSPECT CONTEXT MODAL (PROVENANCE RECORD) */}
      <AnimatePresence>
        {inspectingItem && (
          <div className="fixed inset-0 z-[60000] flex items-center justify-center p-4">
            
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setInspectingItem(null)}
              className="absolute inset-0 bg-stone-950/80 backdrop-blur-sm cursor-pointer"
            />
            
            {/* Modal Box */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xl p-6 z-50 overflow-hidden flex flex-col"
            >
              {/* Close Button */}
              <button 
                onClick={() => setInspectingItem(null)}
                className="absolute top-4 right-4 p-1.5 rounded-full text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              >
                <X size={16} />
              </button>

              {/* Header */}
              <div className="space-y-1 pr-6 pb-4 border-b border-stone-200 dark:border-stone-800">
                <div className="flex items-center gap-2">
                  <Database className="text-amber-500" size={14} />
                  <span className="font-mono text-[9px] uppercase tracking-wider text-stone-400">
                    Inspecting Provenance Record
                  </span>
                </div>
                <h4 className="font-serif italic text-lg text-stone-950 dark:text-stone-50 truncate">
                  {inspectingItem.title}
                </h4>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto py-4 space-y-4 max-h-[350px] scrollbar-thin scrollbar-thumb-stone-200 dark:scrollbar-thumb-stone-800">
                
                {/* Excerpt */}
                <div className="space-y-1.5">
                  <span className="text-[8px] font-mono uppercase tracking-wider text-stone-400">Content Excerpt:</span>
                  <div className="p-3 bg-stone-50 dark:bg-stone-950 border border-stone-100 dark:border-stone-900 text-xs text-stone-700 dark:text-stone-300 rounded font-serif italic leading-relaxed">
                    &ldquo;{inspectingItem.excerpt}&rdquo;
                  </div>
                </div>

                {/* Loading state for Provenance details */}
                {provenanceLoading ? (
                  <div className="py-8 flex flex-col items-center justify-center gap-2 text-stone-400">
                    <Loader2 size={20} className="animate-spin text-stone-500" />
                    <span className="font-mono text-[9px] uppercase tracking-wider">Decoding Provenance Trail...</span>
                  </div>
                ) : provenanceRecord ? (
                  <div className="space-y-4">
                    
                    {/* Source details */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="block text-[8px] font-mono uppercase text-stone-400">Origin Chamber</span>
                        <span className="font-mono text-xs text-stone-800 dark:text-stone-200 font-bold capitalize">
                          {provenanceRecord.originChamber}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[8px] font-mono uppercase text-stone-400">Artifact ID</span>
                        <span className="font-mono text-[10px] text-stone-500 truncate block" title={provenanceRecord.artifactId}>
                          {provenanceRecord.artifactId}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[8px] font-mono uppercase text-stone-400">Collected At</span>
                        <span className="text-xs text-stone-800 dark:text-stone-200">
                          {new Date(provenanceRecord.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[8px] font-mono uppercase text-stone-400">Last Modified</span>
                        <span className="text-xs text-stone-800 dark:text-stone-200">
                          {new Date(provenanceRecord.updatedAt).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Creator Tags */}
                    {provenanceRecord.creatorTags && provenanceRecord.creatorTags.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[8px] font-mono uppercase text-stone-400">Creator Tags:</span>
                        <div className="flex flex-wrap gap-1">
                          {provenanceRecord.creatorTags.map((t, idx) => (
                            <span key={idx} className="text-[8px] font-mono bg-stone-100 dark:bg-stone-800 px-1.5 py-0.5 rounded text-stone-500">
                              #{t}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Origin Metadata */}
                    {provenanceRecord.originMetadata && Object.keys(provenanceRecord.originMetadata).length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[8px] font-mono uppercase text-stone-400">Origin Metadata:</span>
                        <div className="p-3 bg-stone-50 dark:bg-stone-950 border border-stone-100 dark:border-stone-900 rounded font-mono text-[9px] text-stone-600 dark:text-stone-400 space-y-1 max-h-32 overflow-y-auto">
                          {Object.entries(provenanceRecord.originMetadata).map(([k, v]) => (
                            <div key={k} className="flex justify-between items-start gap-4">
                              <span className="font-bold text-stone-500">{k}:</span>
                              {k === 'sourceUrl' || k === 'url' ? (
                                <a 
                                  href={String(v)} 
                                  target="_blank" 
                                  rel="noreferrer noopener" 
                                  className="text-[#a8b79f] underline break-all font-black flex items-center gap-0.5"
                                >
                                  {String(v)} <ExternalLink size={8} />
                                </a>
                              ) : (
                                <span className="break-all text-right">{JSON.stringify(v)}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Transformation history timeline */}
                    {provenanceRecord.transformationHistory && provenanceRecord.transformationHistory.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[8px] font-mono uppercase text-stone-400">Transformation & Chain of Custody:</span>
                        <div className="relative border-l border-stone-200 dark:border-stone-800 ml-2 pl-4 space-y-3">
                          {provenanceRecord.transformationHistory.map((tr, index) => (
                            <div key={index} className="relative">
                              {/* Dot */}
                              <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-amber-500 ring-4 ring-white dark:ring-stone-900" />
                              <div className="text-[9px] font-mono text-stone-400">
                                {new Date(tr.at).toLocaleString()}
                              </div>
                              <div className="text-[10px] font-bold text-stone-800 dark:text-stone-200">
                                Transfer from <span className="capitalize font-black text-amber-600">{tr.from}</span> to <span className="capitalize font-black text-amber-600">{tr.to}</span>
                              </div>
                              {tr.note && (
                                <p className="text-[9px] italic text-stone-500 font-serif mt-0.5">
                                  &ldquo;{tr.note}&rdquo;
                                </p>
                              )}
                              {tr.actor && (
                                <div className="text-[8px] font-mono text-stone-400 mt-0.5">
                                  Actor: {tr.actor}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                ) : (
                  <div className="py-6 flex flex-col items-center justify-center text-center text-stone-400 gap-1.5">
                    <AlertCircle size={16} />
                    <p className="font-mono text-[9px] uppercase tracking-wider">No explicit provenance record found in DB.</p>
                    {inspectingItem.sourceUrl && (
                      <div className="mt-2 text-[10px]">
                        <span className="text-stone-500 mr-1 font-mono uppercase text-[8px]">Source URL:</span>
                        <a 
                          href={inspectingItem.sourceUrl} 
                          target="_blank" 
                          rel="noreferrer noopener" 
                          className="text-[#a8b79f] underline font-bold"
                        >
                          {inspectingItem.sourceUrl}
                        </a>
                      </div>
                    )}
                  </div>
                )}

              </div>

              {/* Close Footer */}
              <div className="pt-4 border-t border-stone-200 dark:border-stone-800 flex justify-end gap-2">
                {inspectingItem.sourceUrl && (
                  <a
                    href={inspectingItem.sourceUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="px-4 py-2 border border-stone-200 dark:border-stone-800 font-mono text-[8px] uppercase tracking-widest flex items-center gap-1 hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-400"
                  >
                    Open Source Link <ExternalLink size={10} />
                  </a>
                )}
                <button 
                  onClick={() => setInspectingItem(null)}
                  className="px-4 py-2 bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 font-mono text-[8px] uppercase tracking-widest"
                >
                  Dismiss
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
