import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, TrendingUp, Layers, Compass, Target, Heart, Database, Eye,
  ShieldCheck, DollarSign, Sliders, Lock, CheckSquare, Play, Share2, 
  Download, ArrowRight, FileText, Info, Network, HelpCircle, Cpu, Link, Loader2,
  BookOpen, CheckCircle2, Circle, Package, ShoppingBag, ExternalLink, Search
} from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { mapScrapeToClientStrategy, type IngestScrapePayload } from '../lib/ingestClientStrategy';
import {
  buildCommerceQuery,
  buildIntelEvidence,
  createIntelProjectRun,
  createIntelProjectRunFromHandoff,
  normalizeIntelCatalogCandidate,
  readIntelHubPressHandoff,
  readIntelProjectRun,
  updateIntelProjectRun,
  writeIntelHubPressHandoff,
  writeIntelProjectRun,
  type IntelCatalogCandidate,
  type IntelEvidenceItem,
  type IntelHubPressHandoff,
  type IntelProjectRun,
  type IntelStrategyLike,
} from '../lib/intelHubWorkflow';
import {
  addToUsedContext,
  setUsedContextApproved,
} from '../services/usedContextService';
import { saveMemoryAtom } from '../services/memoryService';
import { searchShopifyCatalog } from '../services/shopifyExportService';
import type { MemoryAtom, UsedContextSnapshot } from '../types';

// 1. Structure the Client Interface
interface ClientStrategy extends IntelStrategyLike {
  technical: {
    pipelineName: string;
    step1: string;
    step2: string;
    step3: string;
  };
  monetization: {
    tier1Title: string;
    tier1Description: string;
    tier2Title: string;
    tier2Description: string;
  };
  roadmap: Array<{ id: string; title: string; description: string; checked: boolean }>;
}

// 2. Default Mimi Zine Baseline
const DEFAULT_CLIENT: ClientStrategy = {
  clientName: "Mimi Zine (Mimi Museum)",
  tagline: "A private editorial studio for turning scattered cultural signals into a coherent, evolving point of view.",
  wedgeFocus: 85,
  editorialOrthodoxy: 75,
  dataSovereignty: true,
  thesis: {
    chapter: "CHAPTER I // PERSONAL EDITORIAL INTELLIGENCE",
    title: "The Personal Editorial Intelligence Layer",
    summary1: "Mimi Zine is a private editorial studio rather than a generic inspiration feed or styling assistant. It turns scattered references, wardrobe signals, saved images, cultural interests, and personal language into a coherent point of view. Users are not merely discovering content; they are authoring an evolving aesthetic identity with an intelligent partner.",
    summary2: "For a visually literate, identity-conscious audience motivated by synthesis rather than volume, Mimi combines multimodal intake, semantic tagging, preference modeling, contrastive visual analysis, and longitudinal taste graphs. Loosely organized references become editorial boards, vocabulary, recommendations, and periodic style reports while the archive remains portable, inspectable, private, and user-controlled.",
    bullets: [
      "Mimi is a taste-making instrument, not an algorithmic content feed.",
      "Every recommendation reveals the editorial logic behind the connection.",
      "The user's archive is proprietary cultural capital: portable, private, and user-controlled."
    ]
  },
  wedge: {
    title: "The Private Editorial Studio",
    summary: "A digital-physical system that compiles scattered references into an explainable, evolving point of view. Its wedge is not more inspiration, but coherent authorship: approved context, editorial logic, portable memory, and publishable artifacts."
  },
  technical: {
    pipelineName: "PERSONAL EDITORIAL INTELLIGENCE LOOP",
    step1: "Multimodal intake: references, wardrobe signals, saved images, cultural interests, and personal language",
    step2: "Evidence review, semantic tagging, contrastive analysis, and longitudinal preference modeling",
    step3: "Approved Taste Graph context, editorial boards, vocabulary, recommendations, reports, and publishable artifacts"
  },
  monetization: {
    tier1Title: "SaaS Subscriptions",
    tier1Description: "$12–$39/month for active creators, digital curators, and brand developers wanting continuous graph memory.",
    tier2Title: "Enterprise APIs",
    tier2Description: "Licensing access permissions allowing outside luxury portals or commerce engines to index user vectors directly."
  },
  roadmap: [
    { id: "step1", title: "WEDGE CONFIRMATION", description: "Position Mimi as a private editorial studio and personal editorial intelligence layer.", checked: true },
    { id: "step2", title: "INTERACTIVE DESIGN MVP", description: "Assemble vision CLIP embeddings coordinate projections on the Web interface.", checked: false },
    { id: "step3", title: "STYLIST INTERVIEWS", description: "Select 15 highly aesthetic-centric creators and conduct clinical UI testing.", checked: false },
    { id: "step4", title: "MEMORY SYNCHRONIZER", description: "Establish central strategy files and repository trackers inside Git.", checked: false },
    { id: "step5", title: "REVENUE PIPELINE GATE", description: "Launch enterprise visual reports, brand tracking models, and release public tiers.", checked: false }
  ]
};

export const FounderStrategyMemo: React.FC = () => {
  const { pocket, setPocket, user } = useUser();
  const [activeTab, setActiveTab] = useState<'thesis' | 'wedge' | 'technical' | 'monetization' | 'roadmap'>('thesis');
  const [clientData, setClientData] = useState<ClientStrategy>(DEFAULT_CLIENT);
  const [inputUrl, setInputUrl] = useState<string>('');
  const [sourceUrl, setSourceUrl] = useState<string>('');
  const [isIngesting, setIsIngesting] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);
  const initialReview = useMemo(() => buildIntelEvidence(DEFAULT_CLIENT), []);
  const restoredPressHandoff = useMemo(() => readIntelHubPressHandoff(), []);
  const [reviewItems, setReviewItems] = useState<IntelEvidenceItem[]>(initialReview);
  const [selectedReviewIds, setSelectedReviewIds] = useState<Set<string>>(
    () => new Set(initialReview.filter((item) => item.kind === 'evidence').map((item) => item.id)),
  );
  const [reviewScopes, setReviewScopes] = useState<Record<string, 'project' | 'reusable'>>(
    () => Object.fromEntries(
      initialReview.map((item) => [item.id, item.kind === 'inference' ? 'reusable' : 'project']),
    ),
  );
  const [approvedContext, setApprovedContext] = useState<UsedContextSnapshot[]>(
    () => restoredPressHandoff?.approvedContext || [],
  );
  const [isApprovingContext, setIsApprovingContext] = useState(false);
  const [commerceQuery, setCommerceQuery] = useState(
    () => restoredPressHandoff?.commerceQuery || buildCommerceQuery(DEFAULT_CLIENT, []),
  );
  const [catalogCandidates, setCatalogCandidates] = useState<IntelCatalogCandidate[]>(
    () => restoredPressHandoff?.selectedCandidate ? [restoredPressHandoff.selectedCandidate] : [],
  );
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>(
    () => restoredPressHandoff?.selectedCandidate?.id || '',
  );
  const [catalogState, setCatalogState] = useState<'idle' | 'searching' | 'done' | 'error'>('idle');
  const [catalogMessage, setCatalogMessage] = useState('');
  const [pressHandoff, setPressHandoff] = useState<IntelHubPressHandoff | null>(
    restoredPressHandoff,
  );
  const [projectRun, setProjectRun] = useState<IntelProjectRun>(
    () => {
      const restoredRun = readIntelProjectRun();
      if (restoredPressHandoff && (!restoredRun || !restoredRun.artifactPackId)) {
        return createIntelProjectRunFromHandoff(restoredPressHandoff);
      }
      return restoredRun || createIntelProjectRun(DEFAULT_CLIENT.clientName, initialReview.length);
    },
  );
  const reviewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    writeIntelProjectRun(projectRun);
  }, []);

  const updateProjectRunState = (
    patch: Partial<Omit<IntelProjectRun, 'version' | 'id' | 'createdAt'>>,
  ) => {
    setProjectRun((current) => {
      const next = updateIntelProjectRun(current, patch);
      writeIntelProjectRun(next);
      return next;
    });
  };

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // URL Ingest Trigger
  const handleUrlIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl) return;

    const submittedUrl = inputUrl;
    setIsIngesting(true);
    showNotification("Scraping brand attributes and extracting aesthetic markers...");

    try {
      const res = await fetch('/api/ingest-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: submittedUrl })
      });
      if (!res.ok) throw new Error('Ingestion failed');
      const payload = (await res.json()) as IngestScrapePayload | ClientStrategy;
      const hydrated = 'thesis' in payload
        ? payload
        : mapScrapeToClientStrategy(payload, clientData);
      const nextReview = buildIntelEvidence(hydrated, submittedUrl);

      setClientData(hydrated);
      setSourceUrl(submittedUrl);
      setReviewItems(nextReview);
      setSelectedReviewIds(
        new Set(nextReview.filter((item) => item.kind === 'evidence').map((item) => item.id)),
      );
      setReviewScopes(
        Object.fromEntries(
          nextReview.map((item) => [item.id, item.kind === 'inference' ? 'reusable' : 'project']),
        ),
      );
      setApprovedContext([]);
      setCommerceQuery(buildCommerceQuery(hydrated, []));
      setCatalogCandidates([]);
      setSelectedCandidateId('');
      setCatalogState('idle');
      setCatalogMessage('');
      const nextRun = createIntelProjectRun(hydrated.clientName, nextReview.length);
      const ingestedRun = updateIntelProjectRun(nextRun, {
        sourceUrl: submittedUrl,
        selectedReviewCount: nextReview.filter((item) => item.kind === 'evidence').length,
      });
      writeIntelProjectRun(ingestedRun);
      setProjectRun(ingestedRun);
      showNotification(`Evidence captured for ${hydrated.clientName}. Review it before approval.`);
      setInputUrl('');
    } catch (err) {
      console.error(err);
      showNotification("Error refracting client. Reverting to default blueprint.");
    } finally {
      setIsIngesting(false);
    }
  };

  const handleCheckboxToggle = (id: string) => {
    setClientData(prev => ({
      ...prev,
      roadmap: prev.roadmap.map(step => step.id === id ? { ...step, checked: !step.checked } : step)
    }));
  };

  const toggleReviewItem = (id: string) => {
    setSelectedReviewIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      updateProjectRunState({ selectedReviewCount: next.size });
      return next;
    });
  };

  const setReviewItemScope = (id: string, scope: 'project' | 'reusable') => {
    setReviewScopes((current) => ({ ...current, [id]: scope }));
  };

  const approveReviewToPocket = async () => {
    const selected = reviewItems.filter((item) => selectedReviewIds.has(item.id));
    if (selected.length === 0) {
      showNotification("Select at least one evidence or inference item before approval.");
      return;
    }

    setIsApprovingContext(true);
    const projectId = `intel-${clientData.clientName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'project'}`;
    const approvedAt = Date.now();

    const approvedAtoms = selected.map((item) => {
      const atom: MemoryAtom = {
        id: `${projectId}-${item.id}`,
        projectId,
        title: item.title,
        content: item.content,
        source: item.source,
        tags: [...item.tags, item.kind, `confidence-${Math.round(item.confidence * 100)}`],
        timestamp: approvedAt,
        signalType: sourceUrl ? 'link_drop' : 'manual',
        metadata: {
          claimType: item.kind,
          confidence: item.confidence,
          sourceUrl: sourceUrl || undefined,
          origin: 'intel-hub',
          approvalScope: reviewScopes[item.id] || 'project',
        },
      };

      addToUsedContext(atom, 'studio');
      setUsedContextApproved(atom.id, true, 'studio');
      addToUsedContext(atom, 'the-edit');
      setUsedContextApproved(atom.id, true, 'the-edit');

      const snapshot: UsedContextSnapshot = {
        atomId: atom.id,
        title: atom.title || 'Intel Hub signal',
        content: atom.content,
        source: atom.source,
      };
      return { item, atom, snapshot };
    });
    const snapshots = approvedAtoms.map(({ snapshot }) => snapshot);
    const reusableAtoms = approvedAtoms.filter(
      ({ item }) => (reviewScopes[item.id] || 'project') === 'reusable',
    );

    try {
      let reusableSaved = 0;
      if (user?.uid && reusableAtoms.length > 0) {
        const memoryResults = await Promise.allSettled(
          reusableAtoms.map(({ atom }) =>
            saveMemoryAtom(user.uid, {
              ...atom,
              tags: [...(atom.tags || []), 'tailor-rule', 'reusable'],
              metadata: {
                ...(atom.metadata || {}),
                durableRule: true,
              },
            }),
          ),
        );
        reusableSaved = memoryResults.filter((result) => result.status === 'fulfilled').length;
      }

      const pocketPayload = {
        title: `${clientData.clientName} — approved intelligence`,
        source: sourceUrl || 'Intel Hub strategic baseline',
        origin: 'intel-hub',
        timestamp: approvedAt,
        thesis: clientData.thesis.title,
        sourceEvidence: selected.filter((item) => item.kind === 'evidence').map((item) => ({
          id: item.id,
          title: item.title,
          content: item.content,
          confidence: item.confidence,
          source: item.source,
        })),
        approvedInferences: selected.filter((item) => item.kind === 'inference').map((item) => ({
          id: item.id,
          title: item.title,
          content: item.content,
          confidence: item.confidence,
          scope: reviewScopes[item.id] || 'project',
        })),
        tags: ['intel-hub', 'approved-context', clientData.clientName],
      };

      if (user?.uid) {
        const { archiveManager } = await import('../services/archiveManager');
        await archiveManager.saveToPocket(user.uid, 'analysis_report', pocketPayload);
      } else if (setPocket) {
        const updatedPocket = Array.isArray(pocket) ? [...pocket] : [];
        updatedPocket.push({
          id: `intel-review-${approvedAt}`,
          userId: 'ghost',
          title: pocketPayload.title,
          source: pocketPayload.source,
          timestamp: approvedAt,
          savedAt: approvedAt,
          type: 'analysis_report',
          content: pocketPayload,
          tags: pocketPayload.tags,
        });
        setPocket(updatedPocket);
      }

      setApprovedContext(snapshots);
      setCommerceQuery(buildCommerceQuery(clientData, snapshots));
      updateProjectRunState({
        projectId,
        projectName: clientData.clientName,
        sourceUrl: sourceUrl || undefined,
        evidenceCount: reviewItems.length,
        selectedReviewCount: selected.length,
        approvedContextCount: snapshots.length,
        reusableRuleCount: reusableSaved,
        commerceQuery: buildCommerceQuery(clientData, snapshots),
      });
      showNotification(
        `${snapshots.length} signal${snapshots.length === 1 ? '' : 's'} approved for this project` +
        (reusableSaved ? `; ${reusableSaved} reusable rule${reusableSaved === 1 ? '' : 's'} saved to Memory.` : '.'),
      );
    } catch (error) {
      console.error(error);
      setApprovedContext(snapshots);
      setCommerceQuery(buildCommerceQuery(clientData, snapshots));
      updateProjectRunState({
        approvedContextCount: snapshots.length,
        commerceQuery: buildCommerceQuery(clientData, snapshots),
      });
      showNotification("Used Context was approved locally, but Pocket archival needs attention.");
    } finally {
      setIsApprovingContext(false);
    }
  };

  const searchCommerce = async () => {
    if (!approvedContext.length) {
      showNotification("Approve Used Context before searching commerce.");
      return;
    }
    setCatalogState('searching');
    setCatalogMessage('');
    try {
      const result = await searchShopifyCatalog({
        query: commerceQuery,
        intent: `Find products consistent with the approved ${clientData.clientName} intelligence. ${clientData.thesis.title}.`,
        country: 'US',
        limit: 8,
      });
      const normalized = result.products.map(normalizeIntelCatalogCandidate);
      setCatalogCandidates(normalized);
      setSelectedCandidateId(normalized[0]?.id || '');
      updateProjectRunState({
        commerceQuery,
        catalogCandidateCount: normalized.length,
        selectedCandidateId: normalized[0]?.id || undefined,
      });
      setCatalogState('done');
      setCatalogMessage(
        normalized.length
          ? `${normalized.length} candidate${normalized.length === 1 ? '' : 's'} retrieved from Shopify.`
          : 'Shopify returned no available candidates for this query.',
      );
    } catch (error) {
      setCatalogState('error');
      setCatalogMessage(error instanceof Error ? error.message : 'Shopify discovery failed.');
    }
  };

  const compileArtifactPack = () => {
    if (!approvedContext.length) {
      showNotification("Approve Used Context before compiling an artifact pack.");
      return;
    }
    const selectedCandidate = catalogCandidates.find((candidate) => candidate.id === selectedCandidateId);
    const compiledAt = Date.now();
    const handoff: IntelHubPressHandoff = {
      version: 1,
      id: `intel-pack-${compiledAt}`,
      clientName: clientData.clientName,
      sourceUrl: sourceUrl || undefined,
      thesis: clientData.thesis.title,
      approvedContext,
      commerceQuery,
      selectedCandidate,
      compiledAt,
      status: 'review_required',
    };
    writeIntelHubPressHandoff(handoff);
    setPressHandoff(handoff);
    updateProjectRunState({
      artifactPackId: handoff.id,
      selectedCandidateId: selectedCandidate?.id,
      pressStatus: 'review_required',
    });
    showNotification("Artifact pack compiled for human review in The Press.");
  };

  const openPress = () => {
    window.dispatchEvent(
      new CustomEvent('mimi:route-request', { detail: { path: '/the-press' } }),
    );
  };

  const exportMemo = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(clientData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${clientData.clientName.toLowerCase().replace(/\s+/g, '_')}_strategy_memo.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showNotification(`${clientData.clientName} blueprint exported successfully.`);
  };

  return (
    <div className="w-full h-full overflow-y-auto bg-[#111112] text-[#EAE9E5] p-6 lg:p-12 relative font-sans no-scrollbar">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1b1b1c_1px,transparent_1px),linear-gradient(to_bottom,#1b1b1c_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_80%,transparent_100%)] pointer-events-none opacity-50" />

      {/* NOTIFICATION FLOATER */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-8 left-1/2 translate-x-[-50%] z-50 p-4 bg-stone-900 border border-yellow-500/50 text-[#EAE9E5] font-mono text-[9px] uppercase tracking-widest flex items-center gap-3 shadow-2xl rounded-none py-3"
          >
            <ShieldCheck size={14} className="text-yellow-500 shrink-0" />
            <span>{notification}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto relative z-10 space-y-8">
        
        {/* URL DROP ZONE INGESTOR HUD */}
        <div className="bg-stone-900 border border-stone-850 p-5 rounded-none shadow-md">
          <form onSubmit={handleUrlIngest} className="flex flex-col md:flex-row items-center gap-4">
            <div className="flex-1 w-full space-y-1">
              <span className="font-mono text-[7px] text-yellow-500 uppercase tracking-widest block font-bold">✥ Link / Catalog Intake</span>
              <p className="font-sans text-[10px] text-stone-400 uppercase">Drop a website or catalog URL. Mimi records the source before interpreting it.</p>
            </div>
            <div className="relative flex w-full md:w-auto md:min-w-[400px] border border-stone-880 bg-stone-950">
              <div className="absolute inset-y-0 left-3 flex items-center text-stone-500 pointer-events-none">
                <Link size={12} />
              </div>
              <input 
                type="url" 
                placeholder="https://client-brand-or-portfolio.com"
                value={inputUrl}
                onChange={e => setInputUrl(e.target.value)}
                disabled={isIngesting}
                className="w-full bg-transparent pl-9 pr-4 py-2.5 font-mono text-[10px] text-white focus:outline-none placeholder-stone-600 rounded-none border-none"
              />
            </div>
            <button 
              type="submit"
              disabled={isIngesting || !inputUrl}
              className="w-full md:w-auto px-6 py-2.5 bg-yellow-500 hover:bg-yellow-400 disabled:bg-stone-800 disabled:text-stone-500 text-stone-950 font-mono text-[9px] uppercase tracking-widest font-black transition-all flex items-center justify-center gap-2 rounded-none"
            >
              {isIngesting ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
              Ingest Evidence
            </button>
          </form>
        </div>

        {/* HEADER BRANDING */}
        <header className="border-b border-stone-800 pb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[8px] tracking-[0.3em] text-stone-500 uppercase font-bold">[ ACTIVE CLIENT WORKSPACE ]</span>
              <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse" />
            </div>
            <h1 className="font-serif text-4xl lg:text-5xl font-light italic tracking-tight text-white">
              {clientData.clientName}
            </h1>
            <p className="font-sans text-[11px] text-[#A19D94] uppercase tracking-widest max-w-xl leading-relaxed">
              {clientData.tagline}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => reviewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className="px-3.5 py-2 bg-[#EAE9E5] text-stone-950 font-mono text-[9px] uppercase tracking-widest font-black rounded-none hover:bg-white transition-colors flex items-center gap-2"
            >
              <BookOpen size={12} /> Review Used Context
            </button>
            <button 
              onClick={exportMemo}
              className="px-3.5 py-2 bg-transparent border border-stone-800 text-stone-300 font-mono text-[9px] uppercase tracking-widest font-bold rounded-none hover:bg-stone-900 transition-colors flex items-center gap-2"
            >
              <Download size={12} /> Export Blueprint
            </button>
          </div>
        </header>

        {/* APPROVAL-FIRST ORCHESTRATION */}
        <section
          ref={reviewRef}
          id="intel-workflow"
          className="border border-stone-800 bg-[#151415] scroll-mt-6"
        >
          <div className="border-b border-stone-800 px-5 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div>
              <p className="font-mono text-[8px] uppercase tracking-[0.3em] text-yellow-500 font-black">
                Project flight plan
              </p>
              <h2 className="font-serif italic text-2xl text-white mt-1">
                Intel Hub coordinates state. You approve what moves forward.
              </h2>
            </div>
            <p className="font-sans text-[9px] uppercase tracking-widest text-stone-500 max-w-sm lg:text-right leading-relaxed">
              Evidence remains distinct from inference. Shopify discovery stays read-only. Publishing stays in The Press.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 border-b border-stone-800">
            {[
              { n: '01', label: 'Intake', done: Boolean(sourceUrl), active: !sourceUrl },
              { n: '02', label: 'Tailor Review', done: approvedContext.length > 0, active: !approvedContext.length },
              { n: '03', label: 'Used Context', done: approvedContext.length > 0, active: false },
              { n: '04', label: 'Discovery', done: catalogCandidates.length > 0, active: approvedContext.length > 0 && !catalogCandidates.length },
              { n: '05', label: 'Artifact Pack', done: Boolean(pressHandoff), active: approvedContext.length > 0 && !pressHandoff },
              { n: '06', label: 'Press Review', done: false, active: Boolean(pressHandoff) },
              { n: '07', label: 'Shopify Draft', done: false, active: false },
            ].map((stage) => (
              <div
                key={stage.n}
                className={`px-4 py-3 border-r border-b md:border-b-0 border-stone-800 last:border-r-0 ${
                  stage.active ? 'bg-yellow-500/8' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  {stage.done ? (
                    <CheckCircle2 size={11} className="text-emerald-400" />
                  ) : (
                    <Circle size={11} className={stage.active ? 'text-yellow-500' : 'text-stone-700'} />
                  )}
                  <span className="font-mono text-[7px] uppercase tracking-widest text-stone-600">
                    {stage.n}
                  </span>
                </div>
                <p className={`font-mono text-[8px] uppercase tracking-wider mt-2 font-bold ${
                  stage.done ? 'text-stone-300' : stage.active ? 'text-yellow-400' : 'text-stone-600'
                }`}>
                  {stage.label}
                </p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12">
            <div className="xl:col-span-7 p-5 lg:p-6 border-b xl:border-b-0 xl:border-r border-stone-800 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                <div>
                  <p className="font-mono text-[8px] uppercase tracking-widest text-stone-500">
                    Evidence + Tailor Review
                  </p>
                  <p className="font-serif italic text-sm text-stone-300 mt-1">
                    Choose exactly what Mimi may carry into generation and discovery.
                  </p>
                </div>
                <span className="font-mono text-[8px] uppercase tracking-widest text-stone-500">
                  {selectedReviewIds.size} of {reviewItems.length} selected
                </span>
              </div>

              <div className="space-y-2">
                {reviewItems.map((item) => {
                  const selected = selectedReviewIds.has(item.id);
                  const scope = reviewScopes[item.id] || 'project';
                  return (
                    <div
                      key={item.id}
                      className={`w-full border transition-colors ${
                        selected
                          ? item.kind === 'evidence'
                            ? 'border-emerald-500/40 bg-emerald-500/5'
                            : 'border-yellow-500/40 bg-yellow-500/5'
                          : 'border-stone-800 bg-stone-950/40 opacity-60'
                      }`}
                    >
                      <button
                        type="button"
                        aria-pressed={selected}
                        onClick={() => toggleReviewItem(item.id)}
                        className="w-full text-left p-4"
                      >
                        <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {selected ? (
                            <CheckSquare size={13} className={item.kind === 'evidence' ? 'text-emerald-400' : 'text-yellow-400'} />
                          ) : (
                            <Circle size={13} className="text-stone-600" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-mono text-[8px] uppercase tracking-widest font-black text-stone-200">
                              {item.title}
                            </p>
                            <span className={`font-mono text-[7px] uppercase tracking-widest px-2 py-0.5 border ${
                              item.kind === 'evidence'
                                ? 'border-emerald-500/30 text-emerald-400'
                                : 'border-yellow-500/30 text-yellow-400'
                            }`}>
                              {item.kind} · {Math.round(item.confidence * 100)}%
                            </span>
                          </div>
                          <p className="font-serif text-[11px] text-stone-400 leading-relaxed mt-2">
                            {item.content}
                          </p>
                          <p className="font-mono text-[7px] uppercase tracking-widest text-stone-600 mt-2 truncate">
                            Source: {item.source}
                          </p>
                        </div>
                      </div>
                      </button>
                      {selected ? (
                        <div className="border-t border-stone-800/70 px-4 py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <span className="font-mono text-[7px] uppercase tracking-widest text-stone-600">
                            Approval destination
                          </span>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => setReviewItemScope(item.id, 'project')}
                              className={`px-2.5 py-1 border font-mono text-[7px] uppercase tracking-widest ${
                                scope === 'project'
                                  ? 'border-stone-300 text-stone-100'
                                  : 'border-stone-800 text-stone-600'
                              }`}
                            >
                              This project
                            </button>
                            <button
                              type="button"
                              onClick={() => setReviewItemScope(item.id, 'reusable')}
                              className={`px-2.5 py-1 border font-mono text-[7px] uppercase tracking-widest ${
                                scope === 'reusable'
                                  ? 'border-yellow-500/60 text-yellow-400'
                                  : 'border-stone-800 text-stone-600'
                              }`}
                            >
                              Project + Memory rule
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => void approveReviewToPocket()}
                disabled={isApprovingContext || selectedReviewIds.size === 0}
                className="w-full min-h-11 px-5 py-3 bg-[#EAE9E5] text-stone-950 font-mono text-[9px] uppercase tracking-widest font-black hover:bg-white disabled:bg-stone-800 disabled:text-stone-600 transition-colors flex items-center justify-center gap-2"
              >
                {isApprovingContext ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />}
                {isApprovingContext ? 'Approving Context' : 'Approve selected context'}
              </button>
            </div>

            <div className="xl:col-span-5 p-5 lg:p-6 space-y-7">
              <section className="space-y-4">
                <div>
                  <p className="font-mono text-[8px] uppercase tracking-widest text-stone-500">
                    Commerce Discovery
                  </p>
                  <p className="font-serif italic text-sm text-stone-300 mt-1">
                    Shopify answers what exists; Tailor has already defined what fits.
                  </p>
                </div>

                <label className="block">
                  <span className="font-mono text-[7px] uppercase tracking-widest text-stone-600">
                    Search generated from approved context
                  </span>
                  <textarea
                    value={commerceQuery}
                    onChange={(event) => setCommerceQuery(event.target.value)}
                    rows={3}
                    disabled={!approvedContext.length}
                    className="mt-2 w-full border border-stone-800 bg-stone-950 px-3 py-2 font-mono text-[9px] leading-relaxed text-stone-300 disabled:opacity-40 resize-none"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => void searchCommerce()}
                  disabled={!approvedContext.length || catalogState === 'searching' || !commerceQuery.trim()}
                  className="w-full min-h-11 px-4 py-2 border border-[#95BF47]/50 text-[#b8d67b] font-mono text-[8px] uppercase tracking-widest font-black hover:bg-[#95BF47]/10 disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {catalogState === 'searching' ? <Loader2 size={11} className="animate-spin" /> : <Search size={11} />}
                  Search Shopify Catalog
                </button>

                {catalogMessage ? (
                  <p className={`font-sans text-[10px] leading-relaxed ${
                    catalogState === 'error' ? 'text-amber-400' : 'text-stone-500'
                  }`}>
                    {catalogMessage}
                  </p>
                ) : null}

                {catalogCandidates.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {catalogCandidates.map((candidate) => {
                      const selected = selectedCandidateId === candidate.id;
                      return (
                        <button
                          type="button"
                          key={candidate.id}
                          aria-pressed={selected}
                          onClick={() => {
                            setSelectedCandidateId(candidate.id);
                            updateProjectRunState({ selectedCandidateId: candidate.id });
                          }}
                          className={`w-full border p-3 text-left ${
                            selected
                              ? 'border-[#95BF47]/60 bg-[#95BF47]/8'
                              : 'border-stone-800 bg-stone-950/40'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <ShoppingBag size={12} className={selected ? 'text-[#95BF47]' : 'text-stone-600'} />
                            <div className="min-w-0 flex-1">
                              <p className="font-serif text-sm text-stone-200 truncate">
                                {candidate.title}
                              </p>
                              <p className="font-mono text-[7px] uppercase tracking-widest text-stone-600 mt-1">
                                {[candidate.vendor, candidate.price].filter(Boolean).join(' · ') || 'Shopify catalog candidate'}
                              </p>
                              <p className="font-sans text-[9px] text-stone-500 mt-2">
                                Grounded by {approvedContext.slice(0, 2).map((item) => item.title).join(' + ')}
                              </p>
                            </div>
                            {selected ? <CheckCircle2 size={12} className="text-[#95BF47]" /> : null}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </section>

              <section className="border-t border-stone-800 pt-6 space-y-4">
                <div className="flex items-start gap-3">
                  <Package size={16} className={approvedContext.length ? 'text-yellow-500' : 'text-stone-700'} />
                  <div>
                    <p className="font-mono text-[8px] uppercase tracking-widest font-black text-stone-300">
                      Artifact Pack
                    </p>
                    <p className="font-serif text-[11px] text-stone-500 leading-relaxed mt-1">
                      Packages the thesis, approved provenance, discovery query, and selected candidate for Press review.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="border border-stone-800 p-3">
                    <p className="font-mono text-[7px] uppercase tracking-widest text-stone-600">Context</p>
                    <p className="font-serif text-lg text-stone-300 mt-1">{approvedContext.length}</p>
                  </div>
                  <div className="border border-stone-800 p-3">
                    <p className="font-mono text-[7px] uppercase tracking-widest text-stone-600">Candidate</p>
                    <p className="font-serif text-lg text-stone-300 mt-1">{selectedCandidateId ? '1' : '—'}</p>
                  </div>
                  <div className="border border-stone-800 p-3">
                    <p className="font-mono text-[7px] uppercase tracking-widest text-stone-600">Status</p>
                    <p className="font-mono text-[8px] uppercase text-stone-300 mt-2">
                      {pressHandoff ? 'In Press' : 'Draft'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={compileArtifactPack}
                    disabled={!approvedContext.length}
                    className="min-h-11 px-4 py-2 bg-yellow-500 text-stone-950 font-mono text-[8px] uppercase tracking-widest font-black hover:bg-yellow-400 disabled:bg-stone-800 disabled:text-stone-600 flex items-center justify-center gap-2"
                  >
                    <Package size={11} /> Compile Pack
                  </button>
                  <button
                    type="button"
                    onClick={openPress}
                    disabled={!pressHandoff}
                    className="min-h-11 px-4 py-2 border border-stone-700 text-stone-200 font-mono text-[8px] uppercase tracking-widest font-black hover:border-stone-400 disabled:opacity-35 flex items-center justify-center gap-2"
                  >
                    Open in Press <ExternalLink size={10} />
                  </button>
                </div>
                <p className="font-sans text-[9px] uppercase tracking-widest text-stone-600 leading-relaxed">
                  Shopify draft creation remains in The Press after human review. Intel Hub never publishes directly.
                </p>
              </section>
            </div>
          </div>
        </section>

        {/* METRICS & ADJUSTABLE CONSTANTS BOARD */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-stone-900/40 p-5 border border-stone-800/80">
          <div className="lg:col-span-4 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-stone-800/60">
              <Sliders size={13} className="text-stone-400" />
              <span className="font-mono text-[8.5px] uppercase tracking-widest text-[#78716C] font-extrabold">Strategic Sliders</span>
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between font-mono text-[9px] text-[#78716C]">
                <span>WEDGE SPECIALIZATION</span>
                <span className="text-[#EAE9E5]">{clientData.wedgeFocus}% Focus</span>
              </div>
              <input 
                type="range" min="30" max="100" 
                value={clientData.wedgeFocus} 
                onChange={e => setClientData(prev => ({ ...prev, wedgeFocus: Number(e.target.value) }))}
                className="w-full accent-yellow-500 bg-stone-950 cursor-pointer h-1 rounded-none py-1"
              />
              <span className="block font-sans text-[8px] text-stone-500 uppercase">Lower = Broad utility tool | Higher = Focused AI taste-mapping output</span>
            </div>

            <div className="space-y-1 pt-2">
              <div className="flex justify-between font-mono text-[9px] text-[#78716C]">
                <span>EDITORIAL CONTROLS</span>
                <span className="text-[#EAE9E5]">
                  {clientData.editorialOrthodoxy > 50 ? `Minimalist (${clientData.editorialOrthodoxy}%)` : `Maximalist (${100 - clientData.editorialOrthodoxy}%)`}
                </span>
              </div>
              <input 
                type="range" min="0" max="100" 
                value={clientData.editorialOrthodoxy} 
                onChange={e => setClientData(prev => ({ ...prev, editorialOrthodoxy: Number(e.target.value) }))}
                className="w-full accent-yellow-500 bg-stone-950 cursor-pointer h-1 rounded-none py-1"
              />
              <span className="block font-sans text-[8px] text-stone-500 uppercase">Triggers either layout reduction or visual complexity</span>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-stone-800/40 font-mono text-[9px]">
              <span className="text-[#78716C] uppercase">DATA SOVEREIGNTY SECURED</span>
              <button 
                onClick={() => setClientData(prev => ({ ...prev, dataSovereignty: !prev.dataSovereignty }))}
                className={`px-2 py-1 text-[8px] font-bold border ${clientData.dataSovereignty ? 'border-yellow-500 text-yellow-500 bg-yellow-500/5' : 'border-stone-700 text-stone-500'}`}
              >
                {clientData.dataSovereignty ? 'BOUNDED SANDBOX' : 'OPEN FEED'}
              </button>
            </div>
          </div>

          <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-4 border-l border-stone-800/80 pl-0 lg:pl-6 pt-6 lg:pt-0">
            <div className="bg-stone-950/50 p-4 border border-stone-850 flex flex-col justify-between">
              <div>
                <span className="font-mono text-[8px] text-stone-500 block uppercase mb-1">Aesthetic Alignment</span>
                <h4 className="font-serif italic text-lg text-white mb-2">Pinterest Parallel</h4>
                <p className="font-sans text-[10px] text-stone-400 leading-relaxed uppercase">Long-term interest-based graph connections which build a deep asset moat.</p>
              </div>
              <div className="pt-4 font-mono text-[8px] text-yellow-500/80 uppercase">Defensibility: 95% Strong</div>
            </div>

            <div className="bg-stone-950/50 p-4 border border-stone-850 flex flex-col justify-between">
              <div>
                <span className="font-mono text-[8px] text-stone-500 block uppercase mb-1">Scraped Target Wedge</span>
                <h4 className="font-serif italic text-base text-white mb-2 truncate">{clientData.wedge.title}</h4>
                <p className="font-sans text-[10px] text-stone-400 leading-relaxed uppercase">Identified as the optimal digital entry point to lock in active patrons.</p>
              </div>
              <div className="pt-4 font-mono text-[8px] text-yellow-500/80 uppercase">Primary Strategy Wedge</div>
            </div>

            <div className="bg-stone-950/50 p-4 border border-stone-850 flex flex-col justify-between">
              <div>
                <span className="font-mono text-[8px] text-stone-500 block uppercase mb-1">Curation Logic</span>
                <h4 className="font-serif italic text-lg text-white mb-2">Discernment OS</h4>
                <p className="font-sans text-[10px] text-stone-400 leading-relaxed uppercase">A dynamic collaborator mapping context. Intuition remains human.</p>
              </div>
              <div className="pt-4 font-mono text-[8px] text-green-500 uppercase">Vibe: Active</div>
            </div>
          </div>
        </section>

        {/* TAB WORKSPACE NAVIGATION */}
        <div className="flex border-b border-stone-800 font-mono text-[10px] uppercase tracking-widest overflow-x-auto no-scrollbar gap-2">
          <button 
            onClick={() => setActiveTab('thesis')}
            className={`pb-3 px-3 flex items-center gap-2 border-b-2 transition-all ${activeTab === 'thesis' ? 'border-[#EAE9E5] text-white font-bold' : 'border-transparent text-stone-500 hover:text-stone-300'}`}
          >
            <Network size={13} /> Custom Thesis
          </button>
          <button 
            onClick={() => setActiveTab('wedge')}
            className={`pb-3 px-3 flex items-center gap-2 border-b-2 transition-all ${activeTab === 'wedge' ? 'border-[#EAE9E5] text-white font-bold' : 'border-transparent text-stone-500 hover:text-stone-300'}`}
          >
            <Target size={13} /> The Wedge
          </button>
          <button 
            onClick={() => setActiveTab('technical')}
            className={`pb-3 px-3 flex items-center gap-2 border-b-2 transition-all ${activeTab === 'technical' ? 'border-[#EAE9E5] text-white font-bold' : 'border-transparent text-stone-500 hover:text-stone-300'}`}
          >
            <Database size={13} /> Process Blocks
          </button>
          <button 
            onClick={() => setActiveTab('monetization')}
            className={`pb-3 px-3 flex items-center gap-2 border-b-2 transition-all ${activeTab === 'monetization' ? 'border-[#EAE9E5] text-white font-bold' : 'border-transparent text-stone-500 hover:text-stone-300'}`}
          >
            <DollarSign size={13} /> Pricing Models
          </button>
          <button 
            onClick={() => setActiveTab('roadmap')}
            className={`pb-3 px-3 flex items-center gap-2 border-b-2 transition-all ${activeTab === 'roadmap' ? 'border-[#EAE9E5] text-white font-bold' : 'border-transparent text-stone-500 hover:text-stone-300'}`}
          >
            <CheckSquare size={13} /> Roadmap Timeline
          </button>
        </div>

        {/* TAB WORKSPACE PANELS */}
        <div className="min-h-[350px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }} className="space-y-6"
            >
              {activeTab === 'thesis' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 leading-relaxed">
                  <div className="space-y-4">
                    <div className="inline-block px-2 py-0.5 bg-stone-900 border border-stone-850 text-stone-400 font-mono text-[8px] uppercase tracking-widest">{clientData.thesis.chapter}</div>
                    <h3 className="font-serif italic text-2xl text-white">{clientData.thesis.title}</h3>
                    <p className="font-sans text-xs text-stone-300">{clientData.thesis.summary1}</p>
                    <p className="font-sans text-xs text-stone-300">{clientData.thesis.summary2}</p>
                    <div className="p-4 bg-stone-950 border border-stone-850 font-mono text-[9px] uppercase tracking-widest text-[#78716C] rounded-sm">
                      <div className="font-extrabold text-[#EAE9E5] mb-2">[ CORE PLACEMENTS ]</div>
                      {clientData.thesis.bullets.map((bullet, idx) => <div key={idx}>• {bullet}</div>)}
                    </div>
                  </div>
                  <div className="flex flex-col justify-center">
                    <div className="bg-stone-950 p-6 border border-stone-850 relative">
                      <span className="absolute top-2 right-3 font-mono text-[7px] text-stone-600 font-extrabold uppercase">[ SYSTEM CORRELATION ]</span>
                      <div className="space-y-4 font-mono text-[10px]">
                        <div className="flex justify-between items-center pb-2 border-b border-stone-900"><span className="text-[#78716C]">MAPPED SIGNALS</span><span className="text-emerald-500">ACTIVE</span></div>
                        <div className="flex justify-between items-center pb-2 border-b border-stone-900"><span className="text-[#78716C]">VECTOR EXTRACTIONS</span><span className="text-emerald-500">OPTIMAL</span></div>
                        <div className="flex justify-between items-center"><span className="text-[#78716C]">COHERENCE SCALE</span><span className="text-yellow-500 font-bold">1:12.7 EMB</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'wedge' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 leading-relaxed">
                  <div className="space-y-4">
                    <div className="inline-block px-2 py-0.5 bg-stone-900 border border-stone-850 text-stone-400 font-mono text-[8px] uppercase tracking-widest">CHAPTER II // COGNITIVE WEDGE</div>
                    <h3 className="font-serif italic text-2xl text-white">{clientData.wedge.title}</h3>
                    <p className="font-sans text-xs text-stone-300">{clientData.wedge.summary}</p>
                  </div>
                </div>
              )}

              {activeTab === 'technical' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 leading-relaxed">
                  <div className="space-y-4">
                    <div className="inline-block px-2 py-0.5 bg-stone-900 border border-stone-850 text-stone-400 font-mono text-[8px] uppercase tracking-widest">CHAPTER III // PIPELINES</div>
                    <h3 className="font-serif italic text-2xl text-white">Ingestion Pipeline Blocks</h3>
                    <ul className="font-sans text-xs text-stone-300 space-y-4 list-none pl-0">
                      <li className="flex gap-3">
                        <span className="font-mono text-[9px] text-yellow-500 font-bold bg-stone-900/50 w-5 h-5 border border-stone-850 shrink-0 flex items-center justify-center">01</span>
                        <div><strong>Input Scrape Stream:</strong> {clientData.technical.step1}</div>
                      </li>
                      <li className="flex gap-3">
                        <span className="font-mono text-[9px] text-yellow-500 font-bold bg-stone-900/50 w-5 h-5 border border-stone-850 shrink-0 flex items-center justify-center">02</span>
                        <div><strong>Latent Mapping Strategy:</strong> {clientData.technical.step2}</div>
                      </li>
                      <li className="flex gap-3">
                        <span className="font-mono text-[9px] text-yellow-500 font-bold bg-stone-900/50 w-5 h-5 border border-stone-850 shrink-0 flex items-center justify-center">03</span>
                        <div><strong>Tactical Outputs:</strong> {clientData.technical.step3}</div>
                      </li>
                    </ul>
                  </div>
                </div>
              )}

              {activeTab === 'monetization' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 leading-relaxed">
                  <div className="space-y-4">
                    <div className="inline-block px-2 py-0.5 bg-stone-900 border border-stone-850 text-stone-400 font-mono text-[8px] uppercase tracking-widest">CHAPTER IV // MONETIZATION</div>
                    <h3 className="font-serif italic text-2xl text-white">Liquidity & Pricing Models</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-stone-950 border border-stone-850 space-y-2">
                        <h4 className="font-serif italic text-base text-white">{clientData.monetization.tier1Title}</h4>
                        <p className="font-sans text-[10px] text-stone-400 leading-normal uppercase">{clientData.monetization.tier1Description}</p>
                      </div>
                      <div className="p-4 bg-stone-950 border border-stone-850 space-y-2">
                        <h4 className="font-serif italic text-base text-white">{clientData.monetization.tier2Title}</h4>
                        <p className="font-sans text-[10px] text-stone-400 leading-normal uppercase">{clientData.monetization.tier2Description}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'roadmap' && (
                <div className="space-y-6">
                  <div className="inline-block px-2 py-0.5 bg-stone-900 border border-stone-850 text-stone-400 font-mono text-[8px] uppercase tracking-widest">TACTICAL TIMELINE // STEP-BY-STEP</div>
                  <div className="space-y-3 font-mono text-xs">
                    {clientData.roadmap.map(step => (
                      <div key={step.id} className="p-4 bg-stone-950 border border-stone-850 flex items-start gap-4">
                        <input 
                          type="checkbox" checked={step.checked} 
                          onChange={() => handleCheckboxToggle(step.id)}
                          className="mt-1 accent-yellow-500 bg-stone-900 border-stone-700 w-4 h-4 cursor-pointer"
                        />
                        <div className="flex-1 space-y-1">
                          <span className="text-yellow-500/90 font-bold uppercase tracking-widest text-[9px]">{step.title}</span>
                          <p className="font-sans text-[11px] text-[#A19D94] uppercase leading-relaxed">{step.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <footer className="border-t border-stone-800 pt-6 flex justify-between items-center text-stone-500 font-mono text-[8px] uppercase tracking-widest">
          <span>Active Client Refractor: CLIENT_REVISION_v01</span>
          <span>SYSTEM CONFIRMED: READY</span>
        </footer>

      </div>
    </div>
  );
};
