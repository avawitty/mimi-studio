import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Beaker, ScanLine, Activity, Layers, Check, Sparkles, Image as ImageIcon, 
  Save, Trash2, Shield, Eye, Lock, Unlock, Copy, Clipboard, FileText, 
  Sliders, Archive, HelpCircle, User, Loader2, ArrowRight, X, Edit3, CornerDownRight, ExternalLink
} from 'lucide-react';
import { 
  QuietOperation, 
  QuietOperationType, 
  InterpretationLevel, 
  PerspectivePolicy, 
  MemoryWritePolicy, 
  SealedContextPacket, 
  AuthorshipBoundary 
} from '../types';
import { 
  runQuietOperation, 
  saveQuietOperation, 
  fetchQuietOperations, 
  deleteQuietOperation,
  saveSealedContextPacket,
  fetchSealedContextPackets,
  saveAuthorshipBoundary,
  fetchAuthorshipBoundary 
} from '../services/quietStudioService';
import { resolveApiKey } from '../services/apiKeyService';
import { useUser } from '../contexts/UserContext';
import { coerceToString, coerceToStringArray } from '../lib/utils';

export const QuietStudioView: React.FC = () => {
  const { user, profile } = useUser();
  const [inputText, setInputText] = useState('');
  const [contextScope, setContextScope] = useState<'blank' | 'project' | 'sealed'>('blank');
  
  // Policy states
  const [interpretationLevel, setInterpretationLevel] = useState<InterpretationLevel>('develop');
  const [perspectivePolicy, setPerspectivePolicy] = useState<PerspectivePolicy>('creator_only');
  const [memoryWritePolicy, setMemoryWritePolicy] = useState<MemoryWritePolicy>('artifact_only');
  
  // Explicit names list when perspectivePolicy is explicit_named_perspectives
  const [explicitPerspectives, setExplicitPerspectives] = useState('');
  
  // Sealed context packets state
  const [sealedPackets, setSealedPackets] = useState<SealedContextPacket[]>([]);
  const [selectedPacketId, setSelectedPacketId] = useState<string>('');
  
  // Current draft & active state
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeOperation, setActiveOperation] = useState<QuietOperation | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Editable parsed draft values
  const [draftDirectionCard, setDraftDirectionCard] = useState<{
    title: string;
    preservedLanguage: string;
    proposedDirection: string;
    inferredAnchors: string;
    openQuestions: string;
    toneScale: string;
  } | null>(null);

  const [draftImageBrief, setDraftImageBrief] = useState<{
    concept: string;
    subject: string;
    lighting: string;
    composition: string;
    materiality: string;
    styleAndVibe: string;
    rawPrompt: string;
  } | null>(null);

  const [draftDecisionExtract, setDraftDecisionExtract] = useState<{
    coreInquiry: string;
    decisions: string[];
    requirements: string[];
    tactileDirectives: string[];
    nextSteps: string[];
  } | null>(null);

  // History / Saved operations archive
  const [savedOperations, setSavedOperations] = useState<QuietOperation[]>([]);
  const [selectedSavedOp, setSelectedSavedOp] = useState<QuietOperation | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'create' | 'archive' | 'policies'>('create');
  
  // Load saved operations and sealed packets
  useEffect(() => {
    const loadData = async () => {
      try {
        const ops = await fetchQuietOperations();
        setSavedOperations(ops);
        
        const packets = await fetchSealedContextPackets();
        setSealedPackets(packets);
        if (packets.length > 0) {
          setSelectedPacketId(packets[0].id);
        }
      } catch (err) {
        console.error("MIMI // Failed to load Quiet Studio data:", err);
      }
    };
    loadData();
  }, [user]);

  // Handle Sealing Context Packet
  const handleSealContext = async () => {
    const packetId = 'packet_' + Math.random().toString(36).substring(2, 9);
    const newPacket: SealedContextPacket = {
      id: packetId,
      version: 1,
      sources: [
        { sourceId: "project_memories", sourceType: "memory", reasonUsed: "Core brand values and aesthetic tone constraints" }
      ],
      memoryWritePolicy: "none",
      fingerprint: "fp_" + Math.random().toString(36).substring(2, 12),
      state: "sealed",
      createdAt: new Date().toISOString(),
      sealedAt: new Date().toISOString(),
      retrievalVersion: "v1.1"
    };

    try {
      await saveSealedContextPacket(newPacket);
      setSealedPackets(prev => [newPacket, ...prev]);
      setSelectedPacketId(packetId);
      setContextScope('sealed');
      window.dispatchEvent(new CustomEvent('mimi:registry_alert', {
        detail: { type: 'success', message: `Context frozen successfully into packet: ${packetId.toUpperCase()}` }
      }));
    } catch (e) {
      console.error(e);
    }
  };

  // Perform Operation
  const triggerOperation = async (type: QuietOperationType) => {
    if (!inputText.trim()) {
      setError("Please supply some text or fragment to operate on.");
      return;
    }

    setError(null);
    setIsProcessing(true);
    
    // Reset drafts
    setDraftDirectionCard(null);
    setDraftImageBrief(null);
    setDraftDecisionExtract(null);

    const { key: geminiKey } = resolveApiKey('gemini', undefined, profile?.planStatus);
    const opId = 'op_' + Math.random().toString(36).substring(2, 9);
    
    const operationData: QuietOperation = {
      id: opId,
      type,
      inputRef: "raw_text_input",
      inputText: inputText,
      contextPacketId: contextScope === 'sealed' ? selectedPacketId : undefined,
      interactionPolicy: {
        surface: "quiet_canvas",
        interpretationLevel,
        perspectivePolicy,
        memoryWritePolicy
      },
      status: "processing",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setActiveOperation(operationData);

    try {
      const resultJson = await runQuietOperation(operationData, geminiKey || undefined);
      const parsed = JSON.parse(resultJson);
      
      const updatedOp: QuietOperation = {
        ...operationData,
        status: "review",
        generatedContent: resultJson
      };

      setActiveOperation(updatedOp);

      // Populate editable state based on operation type
      if (type === "direction_card") {
        setDraftDirectionCard({
          title: coerceToString(parsed.title) || "Untitled Direction",
          preservedLanguage: coerceToString(parsed.preservedLanguage),
          proposedDirection: coerceToString(parsed.proposedDirection),
          inferredAnchors: coerceToString(parsed.inferredAnchors),
          openQuestions: coerceToString(parsed.openQuestions),
          toneScale: coerceToString(parsed.toneScale) || "Standard"
        });
      } else if (type === "image_brief") {
        setDraftImageBrief({
          concept: coerceToString(parsed.concept),
          subject: coerceToString(parsed.subject),
          lighting: coerceToString(parsed.lighting),
          composition: coerceToString(parsed.composition),
          materiality: coerceToString(parsed.materiality),
          styleAndVibe: coerceToString(parsed.styleAndVibe),
          rawPrompt: coerceToString(parsed.rawPrompt)
        });
      } else if (type === "decision_extract") {
        setDraftDecisionExtract({
          coreInquiry: coerceToString(parsed.coreInquiry),
          decisions: coerceToStringArray(parsed.decisions),
          requirements: coerceToStringArray(parsed.requirements),
          tactileDirectives: coerceToStringArray(parsed.tactileDirectives),
          nextSteps: coerceToStringArray(parsed.nextSteps)
        });
      }

    } catch (err: any) {
      console.error("MIMI // Quiet Operation failed:", err);
      setError(err?.message || "Generation failed. Please verify your API Key setting.");
      setActiveOperation(prev => prev ? { ...prev, status: "failed" } : null);
    } finally {
      setIsProcessing(false);
    }
  };

  // Save the currently reviewed draft
  const handleSaveDraft = async () => {
    if (!activeOperation) return;

    let finalContent = "";
    if (activeOperation.type === "direction_card" && draftDirectionCard) {
      finalContent = JSON.stringify(draftDirectionCard);
    } else if (activeOperation.type === "image_brief" && draftImageBrief) {
      finalContent = JSON.stringify(draftImageBrief);
    } else if (activeOperation.type === "decision_extract" && draftDecisionExtract) {
      finalContent = JSON.stringify(draftDecisionExtract);
    }

    const approvedOp: QuietOperation = {
      ...activeOperation,
      status: "approved",
      generatedContent: finalContent,
      updatedAt: new Date().toISOString()
    };

    try {
      await saveQuietOperation(approvedOp);
      setSavedOperations(prev => [approvedOp, ...prev.filter(op => op.id !== approvedOp.id)]);
      setActiveOperation(null);
      setInputText('');
      
      window.dispatchEvent(new CustomEvent('mimi:registry_alert', {
        detail: { type: 'success', message: "Artifact structured and archived securely." }
      }));
    } catch (err) {
      console.error(err);
    }
  };

  // Discard currently active operation
  const handleDiscardDraft = () => {
    setActiveOperation(null);
    setDraftDirectionCard(null);
    setDraftImageBrief(null);
    setDraftDecisionExtract(null);
  };

  // Delete from archive
  const handleDeleteArchived = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this archived artifact?")) {
      try {
        await deleteQuietOperation(id);
        setSavedOperations(prev => prev.filter(op => op.id !== id));
        if (selectedSavedOp && selectedSavedOp.id === id) {
          setSelectedSavedOp(null);
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Helper to copy content to clipboard
  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const parseJsonSafe = (jsonStr?: string) => {
    if (!jsonStr) return null;
    try {
      return JSON.parse(jsonStr);
    } catch {
      return null;
    }
  };

  return (
    <div id="quiet-studio-root" className="w-full h-full min-h-0 flex flex-col bg-[#FAF9F5] text-[#111111] dark:bg-[#0C0C0A] dark:text-[#E2E2D5] overflow-hidden">
      {/* Visual Subheader / Workspace Details */}
      <div id="quiet-studio-subbar" className="shrink-0 border-b border-[#E2E1D7] dark:border-[#22221E] px-6 py-2.5 flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-[#7C7A6E] dark:text-[#8E8B7F]">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Quiet Studio Online
          </span>
          <span className="hidden md:inline border-l border-[#E2E1D7] dark:border-[#22221E] pl-4">
            Surface: Quiet Canvas
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button 
            id="tab-create"
            onClick={() => setActiveTab('create')}
            className={`px-2.5 py-1 rounded-sm transition-colors ${activeTab === 'create' ? 'bg-[#EEEEEE] text-[#111111] dark:bg-[#1C1C18] dark:text-[#EEEEEE]' : 'hover:opacity-75'}`}
          >
            Worktable
          </button>
          <button 
            id="tab-archive"
            onClick={() => setActiveTab('archive')}
            className={`px-2.5 py-1 rounded-sm transition-colors ${activeTab === 'archive' ? 'bg-[#EEEEEE] text-[#111111] dark:bg-[#1C1C18] dark:text-[#EEEEEE]' : 'hover:opacity-75'}`}
          >
            Archive ({savedOperations.length})
          </button>
          <button 
            id="tab-policies"
            onClick={() => setActiveTab('policies')}
            className={`px-2.5 py-1 rounded-sm transition-colors ${activeTab === 'policies' ? 'bg-[#EEEEEE] text-[#111111] dark:bg-[#1C1C18] dark:text-[#EEEEEE]' : 'hover:opacity-75'}`}
          >
            Governance
          </button>
        </div>
      </div>

      <div id="quiet-studio-body" className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Left Side: Create / Input Studio */}
        {activeTab === 'create' && (
          <div id="quiet-create-pane" className="flex-1 min-h-0 flex flex-col border-r border-[#E2E1D7] dark:border-[#22221E] overflow-y-auto p-6 md:p-8 space-y-6">
            
            {/* Context Governance Banner */}
            <div id="governance-panel" className="bg-[#FAF9F5] dark:bg-[#10100E] border border-[#E2E1D7] dark:border-[#22221E] rounded-md p-4 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#7C7A6E] dark:text-[#8E8B7F] flex items-center gap-1.5 font-bold">
                  <Sliders size={12} />
                  Context & Governance Presets
                </span>
                {contextScope !== 'sealed' ? (
                  <button
                    id="btn-seal-context"
                    onClick={handleSealContext}
                    className="font-mono text-[9px] uppercase tracking-wider text-amber-700 dark:text-amber-400 border border-dashed border-amber-400 dark:border-amber-700 hover:bg-amber-500/10 px-2 py-1 rounded-sm transition-colors flex items-center gap-1"
                  >
                    <Lock size={10} />
                    Seal Context Packet
                  </button>
                ) : (
                  <span className="font-mono text-[9px] uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-sm flex items-center gap-1 font-bold">
                    <Shield size={10} />
                    Context Packet Sealed
                  </span>
                )}
              </div>

              {/* Three Way Context Selector */}
              <div id="context-grid" className="grid grid-cols-1 md:grid-cols-3 gap-3">
                
                <button
                  id="scope-blank"
                  onClick={() => setContextScope('blank')}
                  className={`border rounded-sm p-3 text-left transition-all ${
                    contextScope === 'blank' 
                      ? 'border-[#111111] bg-white dark:border-[#EEEEEE] dark:bg-[#161613]' 
                      : 'border-[#E2E1D7] dark:border-[#22221E] bg-transparent opacity-75 hover:opacity-100'
                  }`}
                >
                  <div className="font-bold text-xs flex items-center gap-1.5">
                    <FileText size={13} className="text-stone-400" />
                    Blank Canvas
                  </div>
                  <div className="text-[10px] text-[#7C7A6E] mt-1">
                    No retrieved context or memories. Clean slate.
                  </div>
                </button>

                <button
                  id="scope-project"
                  onClick={() => setContextScope('project')}
                  className={`border rounded-sm p-3 text-left transition-all ${
                    contextScope === 'project' 
                      ? 'border-[#111111] bg-white dark:border-[#EEEEEE] dark:bg-[#161613]' 
                      : 'border-[#E2E1D7] dark:border-[#22221E] bg-transparent opacity-75 hover:opacity-100'
                  }`}
                >
                  <div className="font-bold text-xs flex items-center gap-1.5">
                    <Activity size={13} className="text-[#96835B]" />
                    Project Memory
                  </div>
                  <div className="text-[10px] text-[#7C7A6E] mt-1">
                    Uses your active, retrieved project state and preferences.
                  </div>
                </button>

                <button
                  id="scope-sealed"
                  onClick={() => {
                    if (sealedPackets.length > 0) {
                      setContextScope('sealed');
                    } else {
                      handleSealContext();
                    }
                  }}
                  className={`border rounded-sm p-3 text-left transition-all ${
                    contextScope === 'sealed' 
                      ? 'border-[#111111] bg-white dark:border-[#EEEEEE] dark:bg-[#161613]' 
                      : 'border-[#E2E1D7] dark:border-[#22221E] bg-transparent opacity-75 hover:opacity-100'
                  }`}
                >
                  <div className="font-bold text-xs flex items-center gap-1.5">
                    <Lock size={13} className="text-amber-500" />
                    Sealed Packet
                  </div>
                  <div className="text-[10px] text-[#7C7A6E] mt-1">
                    {sealedPackets.length > 0 
                      ? `Using: ${selectedPacketId.toUpperCase().slice(0, 10)}`
                      : 'Freeze current context. No future updates.'}
                  </div>
                </button>

              </div>

              {/* Show select packet dropdown if sealed selected */}
              {contextScope === 'sealed' && sealedPackets.length > 0 && (
                <div id="sealed-pack-select" className="flex items-center gap-2 mt-2 pt-2 border-t border-[#E2E1D7] dark:border-[#22221E]">
                  <span className="font-mono text-[9px] text-[#7C7A6E]">Select Packet:</span>
                  <select
                    id="select-packet-id"
                    value={selectedPacketId}
                    onChange={(e) => setSelectedPacketId(e.target.value)}
                    className="font-mono text-[10px] bg-white dark:bg-[#141411] border border-[#E2E1D7] dark:border-[#22221E] rounded-sm px-2 py-0.5"
                  >
                    {sealedPackets.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.id.toUpperCase()} ({new Date(p.createdAt).toLocaleDateString()})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Main Material Input Box */}
            <div id="input-container" className="flex flex-col space-y-2">
              <label id="input-label" className="font-mono text-[10px] uppercase tracking-widest text-[#7C7A6E] dark:text-[#8E8B7F] font-bold">
                Material / Text Input Fragment
              </label>
              <div className="relative">
                <textarea
                  id="material-input"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Paste your aesthetic fragments, raw text, creative specs, or design queries here..."
                  className="w-full h-48 p-4 bg-white dark:bg-[#10100E] border border-[#E2E1D7] dark:border-[#22221E] rounded-md focus:border-[#111111] dark:focus:border-[#EEEEEE] focus:outline-none font-sans text-sm resize-none leading-relaxed"
                />
                {inputText && (
                  <button
                    id="btn-clear-text"
                    onClick={() => setInputText('')}
                    className="absolute top-3 right-3 text-[#7C7A6E] hover:text-[#111111] dark:hover:text-white transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Quick Presets / Tuning sliders for generation */}
            <div id="tuning-grid" className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <div className="space-y-1">
                <label id="level-label" className="font-mono text-[10px] uppercase tracking-widest text-[#7C7A6E] dark:text-[#8E8B7F] font-bold flex items-center gap-1">
                  <Sliders size={11} />
                  Interpretation Dial
                </label>
                <div id="level-selectors" className="flex border border-[#E2E1D7] dark:border-[#22221E] rounded-sm overflow-hidden text-[9px] font-mono">
                  {(['literal', 'organize', 'develop', 'interpret', 'speculate'] as InterpretationLevel[]).map((level) => (
                    <button
                      key={level}
                      id={`level-btn-${level}`}
                      onClick={() => setInterpretationLevel(level)}
                      className={`flex-1 py-1.5 border-r border-[#E2E1D7] dark:border-[#22221E] last:border-0 uppercase tracking-wider text-center font-semibold transition-colors ${
                        interpretationLevel === level 
                          ? 'bg-[#111111] text-white dark:bg-[#EEEEEE] dark:text-[#111111]' 
                          : 'bg-transparent hover:bg-black/5 dark:hover:bg-white/5 text-[#7C7A6E]'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label id="boundary-label" className="font-mono text-[10px] uppercase tracking-widest text-[#7C7A6E] dark:text-[#8E8B7F] font-bold flex items-center gap-1">
                  <Shield size={11} />
                  Authorship Boundary
                </label>
                <div id="boundary-selectors" className="flex border border-[#E2E1D7] dark:border-[#22221E] rounded-sm overflow-hidden text-[9px] font-mono">
                  {(['creator_only', 'creator_and_assistant', 'explicit_named_perspectives'] as PerspectivePolicy[]).map((policy) => (
                    <button
                      key={policy}
                      id={`policy-btn-${policy}`}
                      onClick={() => setPerspectivePolicy(policy)}
                      className={`flex-1 py-1.5 border-r border-[#E2E1D7] dark:border-[#22221E] last:border-0 uppercase tracking-wider text-center font-semibold transition-colors ${
                        perspectivePolicy === policy 
                          ? 'bg-[#111111] text-white dark:bg-[#EEEEEE] dark:text-[#111111]' 
                          : 'bg-transparent hover:bg-black/5 dark:hover:bg-white/5 text-[#7C7A6E]'
                      }`}
                    >
                      {policy === 'explicit_named_perspectives' ? 'Explicit' : policy.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {perspectivePolicy === 'explicit_named_perspectives' && (
              <div id="explicit-box" className="space-y-2">
                <label id="explicit-label" className="font-mono text-[9px] text-[#7C7A6E] uppercase">Explicit Perspectives / Allowed Roles (comma separated):</label>
                <input
                  id="explicit-roles-input"
                  type="text"
                  value={explicitPerspectives}
                  onChange={(e) => setExplicitPerspectives(e.target.value)}
                  placeholder="e.g. Archivist, Minimalist Architect, Cinematic Director"
                  className="w-full p-2 text-xs bg-white dark:bg-[#10100E] border border-[#E2E1D7] dark:border-[#22221E] rounded-sm"
                />
              </div>
            )}

            {/* Quiet Operations Selector */}
            <div id="operations-bar" className="pt-4 border-t border-[#E2E1D7] dark:border-[#22221E] space-y-3">
              <label id="ops-label" className="font-mono text-[10px] uppercase tracking-widest text-[#7C7A6E] dark:text-[#8E8B7F] font-bold">
                Choose Creative Operation
              </label>
              
              <div id="ops-btn-group" className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                  id="op-direction-card"
                  disabled={isProcessing || !inputText.trim()}
                  onClick={() => triggerOperation('direction_card')}
                  className="flex items-center justify-between p-3.5 border border-[#E2E1D7] dark:border-[#22221E] rounded-md text-left bg-white hover:bg-[#F2F1E8] dark:bg-[#121210] dark:hover:bg-[#1A1A17] transition-all disabled:opacity-40 disabled:hover:bg-white disabled:pointer-events-none group"
                >
                  <div className="space-y-1">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#111111] dark:text-white flex items-center gap-1.5">
                      <ScanLine size={13} className="text-amber-500" />
                      Direction Card
                    </span>
                    <p className="text-[10px] text-[#7C7A6E]">Structure raw fragment into a cohesive editorial trajectory</p>
                  </div>
                  <ArrowRight size={14} className="text-stone-400 group-hover:translate-x-1 transition-transform" />
                </button>

                <button
                  id="op-image-brief"
                  disabled={isProcessing || !inputText.trim()}
                  onClick={() => triggerOperation('image_brief')}
                  className="flex items-center justify-between p-3.5 border border-[#E2E1D7] dark:border-[#22221E] rounded-md text-left bg-white hover:bg-[#F2F1E8] dark:bg-[#121210] dark:hover:bg-[#1A1A17] transition-all disabled:opacity-40 disabled:hover:bg-white disabled:pointer-events-none group"
                >
                  <div className="space-y-1">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#111111] dark:text-white flex items-center gap-1.5">
                      <ImageIcon size={13} className="text-indigo-500" />
                      Create Image Brief
                    </span>
                    <p className="text-[10px] text-[#7C7A6E]">Generate precise, detailed instructions for image models</p>
                  </div>
                  <ArrowRight size={14} className="text-stone-400 group-hover:translate-x-1 transition-transform" />
                </button>

                <button
                  id="op-decision-extract"
                  disabled={isProcessing || !inputText.trim()}
                  onClick={() => triggerOperation('decision_extract')}
                  className="flex items-center justify-between p-3.5 border border-[#E2E1D7] dark:border-[#22221E] rounded-md text-left bg-white hover:bg-[#F2F1E8] dark:bg-[#121210] dark:hover:bg-[#1A1A17] transition-all disabled:opacity-40 disabled:hover:bg-white disabled:pointer-events-none group"
                >
                  <div className="space-y-1">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#111111] dark:text-white flex items-center gap-1.5">
                      <Activity size={13} className="text-emerald-500" />
                      Extract Decisions
                    </span>
                    <p className="text-[10px] text-[#7C7A6E]">Derive clear requirements, tactile constraints & next steps</p>
                  </div>
                  <ArrowRight size={14} className="text-stone-400 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

            </div>

            {error && (
              <div id="op-error-banner" className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 p-3.5 rounded-md text-xs font-mono">
                {error}
              </div>
            )}

            {/* Processing State */}
            {isProcessing && (
              <div id="op-processing-indicator" className="border border-stone-200 dark:border-stone-800 bg-[#FAF9F5]/80 dark:bg-[#121210]/80 rounded-md p-6 flex flex-col items-center justify-center space-y-3">
                <Loader2 size={24} className="animate-spin text-amber-500" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#7C7A6E]">
                  Mimi is restructuring your workspace silently...
                </span>
              </div>
            )}

          </div>
        )}

        {/* Right Side / Output Panel (or Archive view) */}
        {activeTab === 'create' && (
          <div id="quiet-preview-pane" className="flex-1 min-h-0 flex flex-col overflow-y-auto p-6 md:p-8 bg-[#FAF9F5] dark:bg-[#0E0E0C]">
            
            <AnimatePresence mode="wait">
              {activeOperation && activeOperation.status === "review" ? (
                <motion.div
                  key="review-mode"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="h-full flex flex-col space-y-6"
                >
                  <div className="flex items-center justify-between border-b border-[#E2E1D7] dark:border-[#22221E] pb-3">
                    <div>
                      <span className="font-mono text-[10px] uppercase tracking-widest text-amber-600 dark:text-amber-400 font-bold">
                        DRAFT DRAFT_REVIEW_MODE // Direct Worktable
                      </span>
                      <h2 className="text-lg font-serif italic mt-0.5">Editable Structured Output</h2>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        id="btn-discard"
                        onClick={handleDiscardDraft}
                        className="px-3 py-1.5 border border-[#E2E1D7] dark:border-[#22221E] rounded-sm font-mono text-[10px] uppercase tracking-wider text-[#7C7A6E] hover:text-[#111111] dark:hover:text-white transition-colors"
                      >
                        Discard
                      </button>
                      <button
                        id="btn-save"
                        onClick={handleSaveDraft}
                        className="px-4 py-1.5 bg-[#111111] hover:bg-black text-white dark:bg-[#EEEEEE] dark:text-[#111111] dark:hover:bg-white rounded-sm font-mono text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition-colors font-bold"
                      >
                        <Save size={12} />
                        Save Artifact
                      </button>
                    </div>
                  </div>

                  {/* 1. DIRECTION CARD EDITABLE PREVIEW */}
                  {activeOperation.type === "direction_card" && draftDirectionCard && (
                    <div id="direction-card-form" className="space-y-4 bg-white dark:bg-[#121210] border border-[#E2E1D7] dark:border-[#22221E] rounded-md p-6">
                      
                      <div className="space-y-1">
                        <label className="font-mono text-[9px] uppercase tracking-widest text-[#7C7A6E]">Conceptual Title</label>
                        <input
                          id="edit-dc-title"
                          type="text"
                          value={draftDirectionCard.title}
                          onChange={(e) => setDraftDirectionCard({ ...draftDirectionCard, title: e.target.value })}
                          className="w-full text-lg font-serif italic bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-2 rounded-sm focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-mono text-[9px] uppercase tracking-widest text-[#7C7A6E]">Preserved Language (Exact Phrasing)</label>
                        <input
                          id="edit-dc-preserved"
                          type="text"
                          value={draftDirectionCard.preservedLanguage}
                          onChange={(e) => setDraftDirectionCard({ ...draftDirectionCard, preservedLanguage: e.target.value })}
                          className="w-full text-xs font-mono bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-2 rounded-sm focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-mono text-[9px] uppercase tracking-widest text-[#7C7A6E]">Proposed Direction</label>
                        <textarea
                          id="edit-dc-direction"
                          value={draftDirectionCard.proposedDirection}
                          onChange={(e) => setDraftDirectionCard({ ...draftDirectionCard, proposedDirection: e.target.value })}
                          className="w-full text-sm bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-2 rounded-sm h-24 focus:outline-none leading-relaxed"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="font-mono text-[9px] uppercase tracking-widest text-[#7C7A6E]">Inferred Aesthetic Anchors</label>
                          <input
                            id="edit-dc-anchors"
                            type="text"
                            value={draftDirectionCard.inferredAnchors}
                            onChange={(e) => setDraftDirectionCard({ ...draftDirectionCard, inferredAnchors: e.target.value })}
                            className="w-full text-xs bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-2 rounded-sm focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-mono text-[9px] uppercase tracking-widest text-[#7C7A6E]">Tone & Severity Scale</label>
                          <input
                            id="edit-dc-tone"
                            type="text"
                            value={draftDirectionCard.toneScale}
                            onChange={(e) => setDraftDirectionCard({ ...draftDirectionCard, toneScale: e.target.value })}
                            className="w-full text-xs bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-2 rounded-sm focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="font-mono text-[9px] uppercase tracking-widest text-[#7C7A6E]">Open Questions to Evoke</label>
                        <textarea
                          id="edit-dc-questions"
                          value={draftDirectionCard.openQuestions}
                          onChange={(e) => setDraftDirectionCard({ ...draftDirectionCard, openQuestions: e.target.value })}
                          className="w-full text-xs bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-2 rounded-sm h-16 focus:outline-none"
                        />
                      </div>

                    </div>
                  )}

                  {/* 2. IMAGE BRIEF EDITABLE PREVIEW */}
                  {activeOperation.type === "image_brief" && draftImageBrief && (
                    <div id="image-brief-form" className="space-y-4 bg-white dark:bg-[#121210] border border-[#E2E1D7] dark:border-[#22221E] rounded-md p-6">
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="font-mono text-[9px] uppercase tracking-widest text-[#7C7A6E]">Core Visual Concept</label>
                          <input
                            id="edit-ib-concept"
                            type="text"
                            value={draftImageBrief.concept}
                            onChange={(e) => setDraftImageBrief({ ...draftImageBrief, concept: e.target.value })}
                            className="w-full text-xs bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-2 rounded-sm focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-mono text-[9px] uppercase tracking-widest text-[#7C7A6E]">Direct Subject</label>
                          <input
                            id="edit-ib-subject"
                            type="text"
                            value={draftImageBrief.subject}
                            onChange={(e) => setDraftImageBrief({ ...draftImageBrief, subject: e.target.value })}
                            className="w-full text-xs bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-2 rounded-sm focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <label className="font-mono text-[9px] uppercase tracking-widest text-[#7C7A6E]">Lighting Directions</label>
                          <input
                            id="edit-ib-lighting"
                            type="text"
                            value={draftImageBrief.lighting}
                            onChange={(e) => setDraftImageBrief({ ...draftImageBrief, lighting: e.target.value })}
                            className="w-full text-xs bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-2 rounded-sm focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-mono text-[9px] uppercase tracking-widest text-[#7C7A6E]">Composition & Framing</label>
                          <input
                            id="edit-ib-composition"
                            type="text"
                            value={draftImageBrief.composition}
                            onChange={(e) => setDraftImageBrief({ ...draftImageBrief, composition: e.target.value })}
                            className="w-full text-xs bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-2 rounded-sm focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-mono text-[9px] uppercase tracking-widest text-[#7C7A6E]">Materiality & Medium</label>
                          <input
                            id="edit-ib-materiality"
                            type="text"
                            value={draftImageBrief.materiality}
                            onChange={(e) => setDraftImageBrief({ ...draftImageBrief, materiality: e.target.value })}
                            className="w-full text-xs bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-2 rounded-sm focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="font-mono text-[9px] uppercase tracking-widest text-[#7C7A6E]">Style & Vibe Profile</label>
                        <input
                          id="edit-ib-vibe"
                          type="text"
                          value={draftImageBrief.styleAndVibe}
                          onChange={(e) => setDraftImageBrief({ ...draftImageBrief, styleAndVibe: e.target.value })}
                          className="w-full text-xs bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-2 rounded-sm focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1 pt-2">
                        <div className="flex items-center justify-between">
                          <label className="font-mono text-[9px] uppercase tracking-widest text-indigo-500 font-bold">Optimized Ready Prompt</label>
                          <button
                            id="btn-copy-ib-prompt"
                            onClick={() => handleCopyText(draftImageBrief.rawPrompt)}
                            className="text-indigo-500 hover:text-indigo-600 font-mono text-[9px] flex items-center gap-1"
                          >
                            <Clipboard size={10} />
                            {isCopied ? "Copied" : "Copy Prompt"}
                          </button>
                        </div>
                        <textarea
                          id="edit-ib-raw-prompt"
                          value={draftImageBrief.rawPrompt}
                          onChange={(e) => setDraftImageBrief({ ...draftImageBrief, rawPrompt: e.target.value })}
                          className="w-full text-xs font-mono bg-indigo-50/30 dark:bg-[#16161c] border border-indigo-100 dark:border-[#2c2b3e] p-3 rounded-sm h-20 focus:outline-none"
                        />
                      </div>

                    </div>
                  )}

                  {/* 3. DECISION EXTRACT EDITABLE PREVIEW */}
                  {activeOperation.type === "decision_extract" && draftDecisionExtract && (
                    <div id="decision-extract-form" className="space-y-5 bg-white dark:bg-[#121210] border border-[#E2E1D7] dark:border-[#22221E] rounded-md p-6 text-xs font-sans">
                      
                      <div className="space-y-1">
                        <label className="font-mono text-[9px] uppercase tracking-widest text-[#7C7A6E]">Core Creative Inquiry / Thesis</label>
                        <input
                          id="edit-de-inquiry"
                          type="text"
                          value={draftDecisionExtract.coreInquiry}
                          onChange={(e) => setDraftDecisionExtract({ ...draftDecisionExtract, coreInquiry: e.target.value })}
                          className="w-full text-sm font-semibold bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-2 rounded-sm focus:outline-none"
                        />
                      </div>

                      {/* Decisions list editing */}
                      <div className="space-y-2">
                        <span className="font-mono text-[9px] uppercase tracking-widest text-[#7C7A6E] font-bold">Extracted Decisions</span>
                        <div className="space-y-1.5">
                          {draftDecisionExtract.decisions.map((dec, i) => (
                            <div key={i} className="flex gap-2 items-center">
                              <span className="font-mono text-[9px] text-[#7C7A6E] w-4">{i + 1}.</span>
                              <input
                                id={`edit-de-dec-${i}`}
                                type="text"
                                value={dec}
                                onChange={(e) => {
                                  const list = [...draftDecisionExtract.decisions];
                                  list[i] = e.target.value;
                                  setDraftDecisionExtract({ ...draftDecisionExtract, decisions: list });
                                }}
                                className="flex-1 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-1.5 rounded-sm"
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Requirements */}
                      <div className="space-y-2">
                        <span className="font-mono text-[9px] uppercase tracking-widest text-[#7C7A6E] font-bold">Creative Requirements</span>
                        <div className="space-y-1.5">
                          {draftDecisionExtract.requirements.map((req, i) => (
                            <div key={i} className="flex gap-2 items-center">
                              <span className="font-mono text-[9px] text-[#7C7A6E] w-4">{i + 1}.</span>
                              <input
                                id={`edit-de-req-${i}`}
                                type="text"
                                value={req}
                                onChange={(e) => {
                                  const list = [...draftDecisionExtract.requirements];
                                  list[i] = e.target.value;
                                  setDraftDecisionExtract({ ...draftDecisionExtract, requirements: list });
                                }}
                                className="flex-1 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-1.5 rounded-sm"
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Tactile directives */}
                      <div className="space-y-2">
                        <span className="font-mono text-[9px] uppercase tracking-widest text-[#7C7A6E] font-bold">Tactile Directives</span>
                        <div className="space-y-1.5">
                          {draftDecisionExtract.tactileDirectives.map((td, i) => (
                            <div key={i} className="flex gap-2 items-center">
                              <span className="font-mono text-[9px] text-[#7C7A6E] w-4">{i + 1}.</span>
                              <input
                                id={`edit-de-td-${i}`}
                                type="text"
                                value={td}
                                onChange={(e) => {
                                  const list = [...draftDecisionExtract.tactileDirectives];
                                  list[i] = e.target.value;
                                  setDraftDecisionExtract({ ...draftDecisionExtract, tactileDirectives: list });
                                }}
                                className="flex-1 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-1.5 rounded-sm"
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Next Steps */}
                      <div className="space-y-2">
                        <span className="font-mono text-[9px] uppercase tracking-widest text-emerald-600 dark:text-emerald-400 font-bold">Next Steps</span>
                        <div className="space-y-1.5">
                          {draftDecisionExtract.nextSteps.map((step, i) => (
                            <div key={i} className="flex gap-2 items-center">
                              <span className="font-mono text-[9px] text-emerald-500 w-4 font-bold">{i + 1}.</span>
                              <input
                                id={`edit-de-step-${i}`}
                                type="text"
                                value={step}
                                onChange={(e) => {
                                  const list = [...draftDecisionExtract.nextSteps];
                                  list[i] = e.target.value;
                                  setDraftDecisionExtract({ ...draftDecisionExtract, nextSteps: list });
                                }}
                                className="flex-1 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-1.5 rounded-sm"
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>
                  )}

                </motion.div>
              ) : (
                <motion.div
                  key="empty-worktable"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-full flex flex-col items-center justify-center space-y-4 border border-dashed border-[#E2E1D7] dark:border-[#22221E] rounded-md p-10 text-center"
                >
                  <Beaker size={24} className="text-[#7C7A6E]" />
                  <div className="space-y-1 max-w-sm">
                    <h3 className="text-sm font-serif italic">Your Quiet Workspace is Idle</h3>
                    <p className="text-xs text-[#7C7A6E]">
                      Supply fragments on the left, set your governance constraints, and select an operation. Mimi will serve cunt silently, and map it directly on this canvas.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        )}

        {/* History / Archive View */}
        {activeTab === 'archive' && (
          <div id="quiet-archive-pane" className="flex-1 min-h-0 flex flex-col overflow-y-auto p-6 md:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-[#E2E1D7] dark:border-[#22221E] pb-3">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#7C7A6E] dark:text-[#8E8B7F]">
                  DURABLE ARTIFACT ARTIFACT_VAULT // Saved Operations
                </span>
                <h2 className="text-lg font-serif italic mt-0.5">Quiet Studio Archive</h2>
              </div>
              <span className="font-mono text-[10px] uppercase bg-stone-200/50 dark:bg-[#1E1E1A] px-2 py-1 rounded-sm">
                Saved Items: {savedOperations.length}
              </span>
            </div>

            {savedOperations.length === 0 ? (
              <div id="archive-empty" className="py-12 text-center text-xs text-[#7C7A6E] border border-dashed border-[#E2E1D7] dark:border-[#22221E] rounded-md">
                No archived artifacts yet. Complete an operation on the worktable and save it.
              </div>
            ) : (
              <div id="archive-layout" className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full min-h-0">
                {/* List of artifacts */}
                <div id="archive-list" className="lg:col-span-1 border-r border-[#E2E1D7] dark:border-[#22221E] pr-6 space-y-3 overflow-y-auto h-[60vh]">
                  {savedOperations.map((op) => {
                    const parsed = parseJsonSafe(op.generatedContent);
                    const title = coerceToString(
                      parsed?.title || parsed?.coreInquiry || parsed?.concept,
                    ) || `Operation ${op.type.replace('_', ' ')}`;
                    
                    return (
                      <div
                        key={op.id}
                        id={`archive-item-${op.id}`}
                        onClick={() => setSelectedSavedOp(op)}
                        className={`p-3 border rounded-md cursor-pointer transition-all ${
                          selectedSavedOp && selectedSavedOp.id === op.id
                            ? 'border-[#111111] bg-white dark:border-[#EEEEEE] dark:bg-[#161613]'
                            : 'border-[#E2E1D7] dark:border-[#22221E] bg-transparent hover:bg-black/5 dark:hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`font-mono text-[8px] uppercase tracking-widest px-1.5 py-0.5 rounded-sm ${
                            op.type === 'direction_card' ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400' :
                            op.type === 'image_brief' ? 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400' :
                            'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                          }`}>
                            {op.type.replace('_', ' ')}
                          </span>
                          <button
                            id={`btn-del-archive-${op.id}`}
                            onClick={(e) => handleDeleteArchived(op.id, e)}
                            className="text-stone-400 hover:text-rose-500 transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                        <h4 className="text-xs font-serif font-bold italic mt-2 truncate text-[#111111] dark:text-white">
                          {title}
                        </h4>
                        <span className="font-mono text-[8px] text-[#7C7A6E] block mt-1.5">
                          {new Date(op.createdAt).toLocaleDateString()} at {new Date(op.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Selected artifact details */}
                <div id="archive-detail" className="lg:col-span-2 overflow-y-auto h-[60vh] bg-white dark:bg-[#121210] border border-[#E2E1D7] dark:border-[#22221E] rounded-md p-6">
                  {selectedSavedOp ? (
                    (() => {
                      const parsed = parseJsonSafe(selectedSavedOp.generatedContent);
                      if (!parsed) return <div className="text-xs text-[#7C7A6E]">Invalid artifact content format.</div>;

                      const decisions = coerceToStringArray(parsed.decisions);
                      const requirements = coerceToStringArray(parsed.requirements);
                      const tactileDirectives = coerceToStringArray(parsed.tactileDirectives);
                      const nextSteps = coerceToStringArray(parsed.nextSteps);

                      return (
                        <div className="space-y-6">
                          <div className="flex items-center justify-between border-b border-[#E2E1D7] dark:border-[#22221E] pb-3">
                            <span className="font-mono text-[9px] uppercase text-[#7C7A6E] tracking-widest">
                              Artifact Provenance: {selectedSavedOp.id.toUpperCase()}
                            </span>
                            <div className="flex gap-2">
                              <button
                                id="btn-copy-archive-content"
                                onClick={() => handleCopyText(selectedSavedOp.generatedContent || "")}
                                className="px-2.5 py-1 border border-[#E2E1D7] dark:border-[#22221E] text-xs font-mono rounded-sm flex items-center gap-1 hover:bg-stone-50 dark:hover:bg-stone-900"
                              >
                                <Copy size={11} />
                                {isCopied ? "Copied!" : "Copy JSON"}
                              </button>
                            </div>
                          </div>

                          {selectedSavedOp.type === "direction_card" && (
                            <div className="space-y-4">
                              <h3 className="text-xl font-serif italic text-amber-700 dark:text-amber-400 border-b border-stone-100 dark:border-stone-900 pb-2">
                                {coerceToString(parsed.title)}
                              </h3>
                              <div className="space-y-2">
                                <span className="font-mono text-[8px] uppercase tracking-widest text-[#7C7A6E] font-bold">Preserved Language</span>
                                <p className="text-xs font-mono bg-stone-50 dark:bg-stone-900/50 p-2.5 border border-stone-200 dark:border-stone-800 rounded-sm italic">
                                  "{coerceToString(parsed.preservedLanguage)}"
                                </p>
                              </div>
                              <div className="space-y-2">
                                <span className="font-mono text-[8px] uppercase tracking-widest text-[#7C7A6E] font-bold">Proposed Trajectory / Focus</span>
                                <p className="text-sm leading-relaxed">{coerceToString(parsed.proposedDirection)}</p>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                  <span className="font-mono text-[8px] uppercase tracking-widest text-[#7C7A6E] font-bold">Inferred Anchors</span>
                                  <p className="text-xs bg-stone-50 dark:bg-stone-900/50 p-2 border border-stone-200 dark:border-stone-800 rounded-sm">{coerceToString(parsed.inferredAnchors)}</p>
                                </div>
                                <div className="space-y-1">
                                  <span className="font-mono text-[8px] uppercase tracking-widest text-[#7C7A6E] font-bold">Tone & Severity</span>
                                  <p className="text-xs bg-stone-50 dark:bg-stone-900/50 p-2 border border-stone-200 dark:border-stone-800 rounded-sm">{coerceToString(parsed.toneScale)}</p>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <span className="font-mono text-[8px] uppercase tracking-widest text-[#7C7A6E] font-bold">Open Questions</span>
                                <p className="text-xs bg-stone-50 dark:bg-stone-900/50 p-2 border border-stone-200 dark:border-stone-800 rounded-sm leading-relaxed text-stone-600 dark:text-stone-300">
                                  {coerceToString(parsed.openQuestions)}
                                </p>
                              </div>
                            </div>
                          )}

                          {selectedSavedOp.type === "image_brief" && (
                            <div className="space-y-4">
                              <h3 className="text-lg font-serif italic text-indigo-700 dark:text-indigo-400 border-b border-stone-100 dark:border-stone-900 pb-2">
                                {coerceToString(parsed.concept)}
                              </h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                  <span className="font-mono text-[8px] uppercase tracking-widest text-[#7C7A6E] font-bold">Subject Focus</span>
                                  <p className="text-xs bg-stone-50 dark:bg-stone-900/50 p-2 border border-stone-200 dark:border-stone-800 rounded-sm">{coerceToString(parsed.subject)}</p>
                                </div>
                                <div className="space-y-1">
                                  <span className="font-mono text-[8px] uppercase tracking-widest text-[#7C7A6E] font-bold">Lighting Architecture</span>
                                  <p className="text-xs bg-stone-50 dark:bg-stone-900/50 p-2 border border-stone-200 dark:border-stone-800 rounded-sm">{coerceToString(parsed.lighting)}</p>
                                </div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                  <span className="font-mono text-[8px] uppercase tracking-widest text-[#7C7A6E] font-bold">Composition</span>
                                  <p className="text-xs bg-stone-50 dark:bg-stone-900/50 p-2 border border-stone-200 dark:border-stone-800 rounded-sm">{coerceToString(parsed.composition)}</p>
                                </div>
                                <div className="space-y-1">
                                  <span className="font-mono text-[8px] uppercase tracking-widest text-[#7C7A6E] font-bold">Materiality & Substrate</span>
                                  <p className="text-xs bg-stone-50 dark:bg-stone-900/50 p-2 border border-stone-200 dark:border-stone-800 rounded-sm">{coerceToString(parsed.materiality)}</p>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <span className="font-mono text-[8px] uppercase tracking-widest text-[#7C7A6E] font-bold">Style & Vibe</span>
                                <p className="text-xs bg-stone-50 dark:bg-stone-900/50 p-2 border border-stone-200 dark:border-stone-800 rounded-sm">{coerceToString(parsed.styleAndVibe)}</p>
                              </div>
                              <div className="space-y-2 pt-2 border-t border-stone-100 dark:border-stone-900">
                                <div className="flex items-center justify-between">
                                  <span className="font-mono text-[8px] uppercase tracking-widest text-indigo-500 font-bold">Optimized Prompt</span>
                                  <button
                                    id="btn-copy-archive-prompt"
                                    onClick={() => handleCopyText(coerceToString(parsed.rawPrompt))}
                                    className="text-indigo-500 hover:text-indigo-600 font-mono text-[9px] flex items-center gap-1"
                                  >
                                    <Clipboard size={10} />
                                    Copy Prompt
                                  </button>
                                </div>
                                <p className="text-xs font-mono bg-indigo-50/10 dark:bg-indigo-950/20 p-3 border border-indigo-100 dark:border-indigo-950/35 rounded-sm">
                                  {coerceToString(parsed.rawPrompt)}
                                </p>
                              </div>
                            </div>
                          )}

                          {selectedSavedOp.type === "decision_extract" && (
                            <div className="space-y-5">
                              <h3 className="text-lg font-serif italic text-emerald-700 dark:text-emerald-400 border-b border-stone-100 dark:border-stone-900 pb-2">
                                inquiry // {coerceToString(parsed.coreInquiry)}
                              </h3>
                              
                              <div className="space-y-2">
                                <span className="font-mono text-[8px] uppercase tracking-widest text-[#7C7A6E] font-bold">Design Decisions</span>
                                <ul className="space-y-1 list-none pl-0">
                                  {decisions.map((item: string, i: number) => (
                                    <li key={i} className="text-xs flex gap-2 items-start text-stone-700 dark:text-stone-300">
                                      <CornerDownRight size={12} className="text-stone-400 mt-0.5 shrink-0" />
                                      {item}
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              <div className="space-y-2">
                                <span className="font-mono text-[8px] uppercase tracking-widest text-[#7C7A6E] font-bold">Material Requirements</span>
                                <ul className="space-y-1 list-none pl-0">
                                  {requirements.map((item: string, i: number) => (
                                    <li key={i} className="text-xs flex gap-2 items-start text-stone-700 dark:text-stone-300">
                                      <Check size={12} className="text-emerald-500 mt-0.5 shrink-0" />
                                      {item}
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              <div className="space-y-2">
                                <span className="font-mono text-[8px] uppercase tracking-widest text-[#7C7A6E] font-bold">Tactile Directives</span>
                                <ul className="space-y-1 list-none pl-0">
                                  {tactileDirectives.map((item: string, i: number) => (
                                    <li key={i} className="text-xs flex gap-2 items-start text-stone-700 dark:text-stone-300">
                                      <span className="w-1 h-1 rounded-full bg-[#111111] dark:bg-[#EEEEEE] mt-2 shrink-0"></span>
                                      {item}
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              <div className="space-y-2 border-t border-stone-100 dark:border-stone-900 pt-3">
                                <span className="font-mono text-[8px] uppercase tracking-widest text-emerald-500 font-bold">Immediate Next Steps</span>
                                <ul className="space-y-1.5 list-none pl-0">
                                  {nextSteps.map((item: string, i: number) => (
                                    <li key={i} className="text-xs flex gap-2 items-start text-[#111111] dark:text-[#EEEEEE]">
                                      <span className="font-mono text-[9px] font-bold text-emerald-500 shrink-0 bg-emerald-500/10 px-1 py-0.5 rounded-sm">0{i+1}</span>
                                      <span className="font-medium">{item}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          )}

                          <div className="mt-4 pt-4 border-t border-stone-100 dark:border-stone-900 text-[10px] font-mono text-[#7C7A6E] space-y-1">
                            <div>Context Scope: <span className="text-[#111111] dark:text-white uppercase font-semibold">{selectedSavedOp.contextPacketId ? "Sealed Packet" : "Blank Context"}</span></div>
                            <div>Interpretation Dial: <span className="text-[#111111] dark:text-white uppercase font-semibold">{selectedSavedOp.interactionPolicy.interpretationLevel}</span></div>
                            <div>Authorship Boundary: <span className="text-[#111111] dark:text-white uppercase font-semibold">{selectedSavedOp.interactionPolicy.perspectivePolicy.replace('_', ' ')}</span></div>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center space-y-2 text-[#7C7A6E]">
                      <Archive size={20} />
                      <p className="text-xs font-serif italic">Select an archived item to view its details</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Governance / Policies Info View */}
        {activeTab === 'policies' && (
          <div id="quiet-policies-pane" className="flex-1 min-h-0 overflow-y-auto p-6 md:p-8 space-y-6">
            <div className="border-b border-[#E2E1D7] dark:border-[#22221E] pb-3">
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#7C7A6E] dark:text-[#8E8B7F]">
                GOVERNANCE GOVERNANCE_SPEC // Strict Creative Boundaries
              </span>
              <h2 className="text-lg font-serif italic mt-0.5">Authorship & Cognition Policies</h2>
            </div>

            <div id="policies-grid" className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs leading-relaxed max-w-4xl">
              <div className="space-y-4">
                <h3 className="font-serif font-bold text-sm italic flex items-center gap-1.5 border-b border-stone-200 dark:border-stone-800 pb-2">
                  <Shield size={14} className="text-emerald-500" />
                  Authorship Boundary Limits
                </h3>
                <p>
                  Mimi enforces an **Authorship Boundary** that guarantees your voice is the primary focus of the studio environment.
                </p>
                <div className="space-y-3 font-mono text-[10px]">
                  <div className="p-3 bg-white dark:bg-[#121210] border border-[#E2E1D7] dark:border-[#22221E] rounded-sm">
                    <strong className="text-amber-600 dark:text-amber-400">CREATOR ONLY:</strong>
                    <p className="mt-1 text-[#7C7A6E]">Suppresses all simulated interpersonal dialogue, user audience, critics, or conversational triangulation. Only processes literal evidence.</p>
                  </div>
                  <div className="p-3 bg-white dark:bg-[#121210] border border-[#E2E1D7] dark:border-[#22221E] rounded-sm">
                    <strong className="text-stone-600 dark:text-stone-300">CREATOR & ASSISTANT:</strong>
                    <p className="mt-1 text-[#7C7A6E]">Allows standard Mimi assistant presence. Still suppresses any unrequested third-party personas or audience testing.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-serif font-bold text-sm italic flex items-center gap-1.5 border-b border-stone-200 dark:border-stone-800 pb-2">
                  <Lock size={14} className="text-amber-500" />
                  Sealed Context Packets
                </h3>
                <p>
                  A **Sealed Context Packet** is a frozen snapshot of project memory that prevents any subsequent database retrieves or updates from changing your model's perspective.
                </p>
                <div className="space-y-3 font-mono text-[10px]">
                  <div className="p-3 bg-white dark:bg-[#121210] border border-[#E2E1D7] dark:border-[#22221E] rounded-sm">
                    <strong>REPRODUCIBLE RUNS:</strong>
                    <p className="mt-1 text-[#7C7A6E]">Retrying or executing using the same sealed packet fingerprint ensures exactly reproducible results.</p>
                  </div>
                  <div className="p-3 bg-white dark:bg-[#121210] border border-[#E2E1D7] dark:border-[#22221E] rounded-sm">
                    <strong>IMMUTABLE MEMORY:</strong>
                    <p className="mt-1 text-[#7C7A6E]">Prevents any memory mutations from taking place during your active worktable operations.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
