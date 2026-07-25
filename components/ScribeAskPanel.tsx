import React, { useState, useEffect } from "react";
import { 
  Loader2, 
  MessageSquare, 
  Save, 
  Sparkles, 
  Database, 
  HelpCircle, 
  Trash2, 
  Check, 
  X, 
  Compass, 
  CheckCircle2, 
  AlertCircle 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useUser } from "../contexts/UserContext";
import { 
  retrieveScribeContext, 
  askScribeExplainable, 
  approveScribeInference, 
  saveScribeDecision, 
  type ScribeAnswer, 
  type ScribeContextItem 
} from "../services/scribeService";
import { listTailorProjects } from "../services/tailorService";
import type { TailorProject } from "../types";

export const ScribeAskPanel: React.FC = () => {
  const { user, pocket } = useUser();
  const [query, setQuery] = useState("");
  const [projects, setProjects] = useState<TailorProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  
  const [isRetrieving, setIsRetrieving] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const [isSaving, setIsSaving] = useState<Record<string, boolean>>({});
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Active answer state
  const [retrievedContext, setRetrievedContext] = useState<ScribeContextItem[]>([]);
  const [answer, setAnswer] = useState<ScribeAnswer | null>(null);

  // Load projects and check query params for default project
  useEffect(() => {
    if (!user?.uid) return;
    listTailorProjects(user.uid).then((list) => {
      setProjects(list);
      const params = new URLSearchParams(window.location.search);
      const urlProj = params.get("project");
      if (urlProj && list.some(p => p.id === urlProj)) {
        setSelectedProjectId(urlProj);
      } else if (list.length > 0) {
        setSelectedProjectId(list[0].id);
      }
    }).catch(err => console.error("MIMI // Failed to load tailor projects for scoper:", err));
  }, [user?.uid]);

  const triggerNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleRetrieveAndAsk = async () => {
    if (!user?.uid || !query.trim()) return;
    
    setIsRetrieving(true);
    setAnswer(null);
    try {
      // Step 1: Retrieve project-scoped context according to the Retrieval Authority model
      const context = await retrieveScribeContext(
        user.uid, 
        query.trim(), 
        pocket as any, 
        selectedProjectId || undefined
      );
      setRetrievedContext(context);
      
      // Step 2: Generate multi-layered explainable answer using Gemini
      setIsAsking(true);
      setIsRetrieving(false);
      const res = await askScribeExplainable(
        user.uid, 
        query.trim(), 
        context, 
        selectedProjectId || undefined
      );
      setAnswer(res);
    } catch (err) {
      console.error("MIMI // Scribe Explainable Ask failed:", err);
      triggerNotification("Scribe failed to synthesize memory. Check connection.", "error");
    } finally {
      setIsRetrieving(false);
      setIsAsking(false);
    }
  };

  // Regeneration triggered when context is removed/rejected
  const handleRegenerateWithRemainingContext = async (remaining: ScribeContextItem[]) => {
    if (!user?.uid || !query.trim()) return;
    setIsAsking(true);
    try {
      const res = await askScribeExplainable(
        user.uid,
        query.trim(),
        remaining,
        selectedProjectId || undefined
      );
      setAnswer(res);
      triggerNotification("Answer recalculated using remaining context.");
    } catch (err) {
      console.error("MIMI // Scribe Recalculation failed:", err);
      triggerNotification("Failed to recalculate response.", "error");
    } finally {
      setIsAsking(false);
    }
  };

  const handleRemoveContextItem = (id: string) => {
    const updated = retrievedContext.filter(item => item.id !== id);
    setRetrievedContext(updated);
    if (answer) {
      setAnswer({
        ...answer,
        usedContext: updated
      });
    }
    // Automatically trigger recalculation/regeneration
    handleRegenerateWithRemainingContext(updated);
  };

  const handleApproveInference = async (inferenceId: string, statement: string) => {
    if (!user?.uid) return;
    setIsSaving(prev => ({ ...prev, [inferenceId]: true }));
    try {
      await approveScribeInference(user.uid, selectedProjectId || 'global', statement);
      triggerNotification("Inference validated & stored as Memory Atom.");
    } catch (err) {
      console.error("MIMI // Approve inference failed:", err);
      triggerNotification("Failed to save memory atom.", "error");
    } finally {
      setIsSaving(prev => ({ ...prev, [inferenceId]: false }));
    }
  };

  const handleSaveDecision = async (recId: string, action: string, rationale: string) => {
    if (!user?.uid || !selectedProjectId) {
      triggerNotification("Please select a project scope to save strategic decisions.", "error");
      return;
    }
    setIsSaving(prev => ({ ...prev, [recId]: true }));
    try {
      await saveScribeDecision(
        user.uid, 
        selectedProjectId, 
        "Scribe Recommendation", 
        action, 
        rationale
      );
      triggerNotification("Strategic Recommendation saved as Approved Creative Law.");
    } catch (err) {
      console.error("MIMI // Save strategic decision failed:", err);
      triggerNotification("Failed to save strategic decision.", "error");
    } finally {
      setIsSaving(prev => ({ ...prev, [recId]: false }));
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 bg-[#FAF9F5] dark:bg-[#0D0C0A] min-h-0 text-[#292524] dark:text-[#E7E5E4] transition-colors duration-300">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-50 p-4 border flex items-center gap-2 font-sans text-xs uppercase tracking-widest shadow-md ${
              notification.type === 'error' 
                ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-900 text-red-700 dark:text-red-300' 
                : 'bg-stone-50 dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-stone-800 dark:text-stone-200'
            }`}
          >
            {notification.type === 'error' ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scribe Portal Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-stone-200 dark:border-stone-800 pb-5 gap-4">
        <div>
          <h2 className="font-serif italic text-2xl md:text-3xl font-normal tracking-tight text-stone-900 dark:text-stone-100 flex items-center gap-2.5">
            The Scribe
          </h2>
          <p className="font-mono text-[9px] uppercase tracking-widest text-stone-500 mt-1">
            Explainable Aesthetic Intelligence &amp; Semantic Portal
          </p>
        </div>

        {/* Project Scope Selector */}
        <div className="flex items-center gap-2">
          <span className="font-mono text-[9px] uppercase tracking-widest text-stone-400">
            Scope:
          </span>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="border border-stone-300 dark:border-stone-700 bg-transparent px-3 py-1.5 font-mono text-[10px] text-stone-800 dark:text-stone-200 outline-none hover:border-stone-400 dark:hover:border-stone-600 focus:border-stone-900 dark:focus:border-stone-100 transition-colors"
          >
            <option value="">Global / Unscoped</option>
            {projects.map((proj) => (
              <option key={proj.id} value={proj.id}>
                {proj.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Input Area */}
      <div className="space-y-4">
        <div className="relative border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 focus-within:border-stone-900 dark:focus-within:border-stone-100 transition-colors p-4">
          <span className="absolute top-2.5 right-3 font-mono text-[8px] uppercase tracking-widest text-stone-400 flex items-center gap-1">
            <HelpCircle size={10} /> Query Reservoir
          </span>
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            rows={4}
            placeholder="Ask about your taste vectors, project directions, visual motifs, or strategic compromises..."
            className="w-full bg-transparent font-serif text-sm leading-relaxed outline-none resize-none pt-2 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-600"
          />
        </div>

        <button
          type="button"
          disabled={!query.trim() || isRetrieving || isAsking || !user?.uid}
          onClick={handleRetrieveAndAsk}
          className="w-full md:w-auto px-6 py-3 bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-stone-200 text-white dark:text-stone-900 font-mono text-[9px] uppercase tracking-[0.2em] font-black transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {isRetrieving ? (
            <>
              <Loader2 size={12} className="animate-spin" /> Querying Reservoir...
            </>
          ) : isAsking ? (
            <>
              <Loader2 size={12} className="animate-spin" /> Synthesizing Grounded Insights...
            </>
          ) : (
            <>
              <Sparkles size={12} /> Consult Scribe
            </>
          )}
        </button>
      </div>

      {/* Structured Output Grid */}
      <AnimatePresence>
        {(isRetrieving || isAsking || answer) && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="space-y-8"
          >
            {/* Loading Placeholder */}
            {(isRetrieving || isAsking) && (
              <div className="border border-stone-200 dark:border-stone-800 p-8 text-center space-y-4 bg-stone-50/50 dark:bg-stone-900/10">
                <Loader2 size={24} className="animate-spin mx-auto text-stone-400 dark:text-stone-600" />
                <p className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
                  {isRetrieving ? "Aligning retrieval authority vectors..." : "Structuring evidence & inferences..."}
                </p>
              </div>
            )}

            {/* Answer Content */}
            {answer && !isRetrieving && !isAsking && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                
                {/* Left Columns: Evidence and Insights (2/3 width) */}
                <div className="lg:col-span-2 space-y-8">
                  
                  {/* Layer 1: Evidence Layer */}
                  <div className="border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-900 pb-3">
                      <h4 className="font-mono text-[10px] uppercase tracking-widest text-stone-800 dark:text-stone-200 font-bold flex items-center gap-1.5">
                        <Database size={11} className="text-stone-400" /> Layer I // Grounded Evidence
                      </h4>
                      <span className="font-mono text-[8px] uppercase tracking-widest text-[#a8b79f] bg-[#a8b79f]/10 px-2 py-0.5">
                        Verifiable Sources Only
                      </span>
                    </div>

                    <div className="space-y-4 divide-y divide-stone-100 dark:divide-stone-900">
                      {answer.evidence.map((ev, idx) => (
                        <div key={ev.id} className={`pt-4 first:pt-0 group flex flex-col gap-2`}>
                          <p className="font-serif text-sm leading-relaxed text-stone-800 dark:text-stone-200">
                            {ev.statement}
                          </p>
                          <div className="flex flex-wrap gap-1.5 items-center">
                            <span className="font-mono text-[8px] text-stone-400 mr-2">
                              Ref: {ev.id}
                            </span>
                            {ev.contextIds.map(ctxId => {
                              const ctx = retrievedContext.find(c => c.id === ctxId);
                              return (
                                <span 
                                  key={ctxId} 
                                  className="font-mono text-[8px] uppercase tracking-widest bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-500 hover:text-stone-950 dark:hover:text-stone-100 px-2 py-0.5 transition-colors cursor-help"
                                  title={ctx ? `Source excerpt: ${ctx.excerpt}` : "View source details below"}
                                >
                                  {ctx ? `${ctx.kind.replace('_', ' ')}: ${ctx.title}` : `Source ID: ${ctxId}`}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                      {answer.evidence.length === 0 && (
                        <p className="text-xs font-serif italic text-stone-400 py-2">
                          No direct evidence nodes extracted.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Layer 2: Inference Layer */}
                  <div className="border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-900 pb-3">
                      <h4 className="font-mono text-[10px] uppercase tracking-widest text-stone-800 dark:text-stone-200 font-bold flex items-center gap-1.5">
                        <Compass size={11} className="text-stone-400" /> Layer II // Aesthetic Inferences
                      </h4>
                      <span className="font-mono text-[8px] uppercase tracking-widest text-orange-500 bg-orange-500/10 px-2 py-0.5">
                        Requires Confirmation
                      </span>
                    </div>

                    <div className="space-y-6">
                      {answer.inferences.map((inf) => (
                        <div key={inf.id} className="border border-stone-100 dark:border-stone-900 p-4 bg-stone-50/50 dark:bg-stone-900/20 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[9px] uppercase tracking-widest text-stone-400">
                              {inf.id}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[9px] uppercase tracking-widest text-stone-500">
                                Confidence: {inf.confidence}%
                              </span>
                              <div className="w-16 h-1 bg-stone-200 dark:bg-stone-800">
                                <div 
                                  className="h-full bg-stone-900 dark:bg-stone-100 transition-all duration-500" 
                                  style={{ width: `${inf.confidence}%` }} 
                                />
                              </div>
                            </div>
                          </div>

                          <p className="font-serif italic text-sm leading-relaxed text-stone-800 dark:text-stone-100">
                            &ldquo;{inf.statement}&rdquo;
                          </p>

                          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-stone-100 dark:border-stone-900/60">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[8px] uppercase text-stone-400">
                                Supported by:
                              </span>
                              {inf.evidenceIds.map(evId => (
                                <span key={evId} className="font-mono text-[8px] bg-stone-100 dark:bg-stone-900 px-1.5 py-0.5 text-stone-500">
                                  {evId}
                                </span>
                              ))}
                            </div>

                            <button
                              type="button"
                              disabled={isSaving[inf.id]}
                              onClick={() => handleApproveInference(inf.id, inf.statement)}
                              className="font-mono text-[8px] uppercase tracking-widest px-3 py-1.5 border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 hover:bg-stone-100 dark:hover:bg-stone-900 text-stone-700 dark:text-stone-300 flex items-center gap-1 transition-all"
                            >
                              {isSaving[inf.id] ? (
                                <Loader2 size={10} className="animate-spin" />
                              ) : (
                                <Check size={10} />
                              )}
                              Approve as Memory
                            </button>
                          </div>
                        </div>
                      ))}
                      {answer.inferences.length === 0 && (
                        <p className="text-xs font-serif italic text-stone-400 py-2">
                          No pattern inferences synthesized.
                        </p>
                      )}
                    </div>
                  </div>

                </div>

                {/* Right Column: Recommendations and Used Context (1/3 width) */}
                <div className="space-y-8">
                  
                  {/* Layer 3: Strategic Recommendations */}
                  <div className="border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 p-6 space-y-4">
                    <div className="border-b border-stone-100 dark:border-stone-900 pb-3">
                      <h4 className="font-mono text-[10px] uppercase tracking-widest text-stone-800 dark:text-stone-200 font-bold flex items-center gap-1.5">
                        Layer III // Strategic Maneuvers
                      </h4>
                    </div>

                    <div className="space-y-6">
                      {answer.recommendations.map((rec) => (
                        <div key={rec.id} className="space-y-2 border-l-2 border-stone-300 dark:border-stone-700 pl-4 py-1">
                          <p className="font-sans text-xs font-bold uppercase tracking-wider text-stone-900 dark:text-stone-100">
                            {rec.action}
                          </p>
                          <p className="font-serif text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                            {rec.rationale}
                          </p>
                          <div className="flex items-center justify-between gap-2 pt-2">
                            <span className="font-mono text-[8px] text-stone-400">
                              Based on: {rec.inferenceIds.join(', ')}
                            </span>

                            <button
                              type="button"
                              disabled={isSaving[rec.id]}
                              onClick={() => handleSaveDecision(rec.id, rec.action, rec.rationale)}
                              className="font-mono text-[8px] uppercase tracking-widest bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-stone-200 text-white dark:text-stone-900 px-3 py-1.5 transition-colors flex items-center gap-1"
                            >
                              {isSaving[rec.id] ? (
                                <Loader2 size={10} className="animate-spin" />
                              ) : (
                                <Save size={10} />
                              )}
                              Save Decision
                            </button>
                          </div>
                        </div>
                      ))}
                      {answer.recommendations.length === 0 && (
                        <p className="text-xs font-serif italic text-stone-400 py-2">
                          No recommendations synthesized.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Used Context Drawer / List */}
                  <div className="border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 p-6 space-y-4">
                    <div className="border-b border-stone-100 dark:border-stone-900 pb-3 flex items-center justify-between">
                      <h4 className="font-mono text-[10px] uppercase tracking-widest text-stone-800 dark:text-stone-200 font-bold">
                        Used Context ({retrievedContext.length})
                      </h4>
                      <span className="font-mono text-[8px] text-stone-400">
                        Ranked
                      </span>
                    </div>

                    <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-stone-200 dark:scrollbar-thumb-stone-800">
                      {retrievedContext.map((item) => (
                        <div 
                          key={item.id} 
                          className="border border-stone-100 dark:border-stone-900 p-3 bg-stone-50/50 dark:bg-stone-900/10 space-y-2 relative group"
                        >
                          {/* Close/Remove context action */}
                          <button
                            type="button"
                            onClick={() => handleRemoveContextItem(item.id)}
                            className="absolute top-2.5 right-2.5 text-stone-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Remove source and regenerate"
                          >
                            <Trash2 size={11} />
                          </button>

                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[8px] uppercase tracking-wider bg-stone-200/50 dark:bg-stone-800 text-stone-600 dark:text-stone-400 px-1.5 py-0.5">
                              {item.kind.replace('_', ' ')}
                            </span>
                            <span className="font-mono text-[8px] text-stone-400">
                              Rel: {Math.round(item.relevance * 100)}%
                            </span>
                          </div>

                          <h5 className="font-serif text-xs font-bold leading-snug pr-4 text-stone-900 dark:text-stone-100">
                            {item.title}
                          </h5>
                          
                          <p className="font-serif text-[10px] text-stone-500 dark:text-stone-400 leading-normal line-clamp-3">
                            {item.excerpt}
                          </p>

                          <div className="font-mono text-[7px] text-stone-400 uppercase tracking-widest">
                            Reason: {item.retrievalReason}
                          </div>
                        </div>
                      ))}
                      {retrievedContext.length === 0 && (
                        <p className="text-xs font-serif italic text-stone-400 py-4 text-center">
                          No context loaded.
                        </p>
                      )}
                    </div>
                  </div>

                </div>

              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
