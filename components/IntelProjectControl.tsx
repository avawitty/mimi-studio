import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Circle,
  Database,
  FileCheck2,
  FolderArchive,
  Package,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import {
  createIntelProjectRun,
  createIntelProjectRunFromHandoff,
  INTEL_PROJECT_RUN_CHANGED,
  readIntelHubPressHandoff,
  readIntelProjectRun,
  writeIntelProjectRun,
  type IntelProjectRun,
  type IntelProjectStage,
} from '../lib/intelHubWorkflow';
import {
  getApprovedUsedContext,
  subscribeUsedContext,
} from '../services/usedContextService';
import { useUser } from '../contexts/UserContext';

interface IntelProjectControlProps {
  onOpenStrategy: () => void;
  onOpenCapabilities: () => void;
}

const STAGES: Array<{
  id: IntelProjectStage;
  number: string;
  label: string;
  benefit: string;
}> = [
  { id: 'intake', number: '01', label: 'Intake', benefit: 'Collect source material' },
  { id: 'review', number: '02', label: 'Review', benefit: 'Separate evidence from inference' },
  { id: 'used-context', number: '03', label: 'Approve', benefit: 'Choose what this project may use' },
  { id: 'discovery', number: '04', label: 'Discover', benefit: 'Find grounded candidates' },
  { id: 'artifact-pack', number: '05', label: 'Package', benefit: 'Compile the handoff' },
  { id: 'press-review', number: '06', label: 'Press', benefit: 'Human release review' },
  { id: 'shopify-draft', number: '07', label: 'Draft', benefit: 'Create a Shopify draft' },
];

const stageIndex = (stage: IntelProjectStage) =>
  Math.max(0, STAGES.findIndex((candidate) => candidate.id === stage));

export const IntelProjectControl: React.FC<IntelProjectControlProps> = ({
  onOpenStrategy,
  onOpenCapabilities,
}) => {
  const { user, profile } = useUser();
  const ownerUid = user?.uid || profile?.uid;
  const [run, setRun] = useState<IntelProjectRun>(() => {
    const restored = readIntelProjectRun();
    const handoff = readIntelHubPressHandoff();
    if (handoff && (!restored || !restored.artifactPackId)) {
      const hydrated = createIntelProjectRunFromHandoff(handoff);
      writeIntelProjectRun(hydrated);
      return hydrated;
    }
    if (restored) return restored;
    const created = createIntelProjectRun('Mimi');
    writeIntelProjectRun(created);
    return created;
  });
  const [approvedContextCount, setApprovedContextCount] = useState(
    () => getApprovedUsedContext(undefined, ownerUid).length,
  );

  useEffect(() => {
    const refreshRun = () => {
      const restored = readIntelProjectRun();
      if (restored) setRun(restored);
    };
    const refreshContext = () =>
      setApprovedContextCount(getApprovedUsedContext(undefined, ownerUid).length);
    window.addEventListener(INTEL_PROJECT_RUN_CHANGED, refreshRun);
    const unsubscribeContext = subscribeUsedContext(refreshContext);
    return () => {
      window.removeEventListener(INTEL_PROJECT_RUN_CHANGED, refreshRun);
      unsubscribeContext();
    };
  }, [ownerUid]);

  const currentStageIndex = stageIndex(run.stage);
  const nextAction = useMemo(() => {
    if (run.stage === 'press-review' || run.stage === 'shopify-draft') {
      return {
        label: run.stage === 'shopify-draft' ? 'Inspect Shopify draft' : 'Review in The Press',
        detail: 'The creator remains the release authority.',
        action: () =>
          window.dispatchEvent(
            new CustomEvent('mimi:route-request', { detail: { path: '/the-press' } }),
          ),
      };
    }
    if (run.stage === 'discovery') {
      return {
        label: 'Compile artifact pack',
        detail: 'Package approved context and the selected commerce candidate.',
        action: onOpenStrategy,
      };
    }
    if (run.stage === 'used-context') {
      return {
        label: 'Run grounded discovery',
        detail: 'Search from approved context without delegating taste to the catalog.',
        action: onOpenStrategy,
      };
    }
    return {
      label: run.stage === 'review' ? 'Review evidence and inferences' : 'Start with source material',
      detail: 'Nothing moves into generation until you approve it.',
      action: onOpenStrategy,
    };
  }, [onOpenStrategy, run.stage]);

  return (
    <div className="w-full h-full overflow-y-auto bg-[#F2F1ED] text-stone-950">
      <div className="max-w-7xl mx-auto px-5 py-8 md:px-10 md:py-12 space-y-8">
        <header className="grid grid-cols-1 lg:grid-cols-[1.3fr_0.7fr] gap-8 items-end border-b border-stone-300 pb-8">
          <div>
            <div className="flex items-center gap-2 text-amber-700 mb-3">
              <ShieldCheck size={14} />
              <span className="font-mono text-[9px] uppercase tracking-[0.28em] font-bold">
                Intel Hub · Project Control
              </span>
            </div>
            <h1 className="font-serif text-4xl md:text-6xl tracking-tight leading-[0.95]">
              One project state,
              <span className="block italic">from evidence to release.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-sm md:text-base text-stone-600 leading-relaxed">
              Mimi coordinates the handoffs. You decide which evidence becomes project context,
              which interpretation becomes a reusable rule, and when an artifact is ready for
              The Press.
            </p>
          </div>
          <div className="border border-stone-300 bg-white p-5">
            <p className="font-mono text-[8px] uppercase tracking-widest text-stone-500">
              Active project run
            </p>
            <h2 className="font-serif italic text-2xl mt-2">{run.projectName}</h2>
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-stone-200 pt-3">
              <span className="font-mono text-[8px] uppercase tracking-widest text-stone-500">
                Current state
              </span>
              <span className="font-mono text-[8px] uppercase tracking-widest font-bold text-amber-700">
                {STAGES[currentStageIndex]?.label}
              </span>
            </div>
          </div>
        </header>

        <section aria-label="Project stages" className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 border border-stone-300 bg-white">
          {STAGES.map((stage, index) => {
            const complete = index < currentStageIndex;
            const active = index === currentStageIndex;
            return (
              <div
                key={stage.id}
                className={`min-h-28 p-4 border-r border-b xl:border-b-0 border-stone-200 last:border-r-0 ${
                  active ? 'bg-amber-50' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[8px] text-stone-400">{stage.number}</span>
                  {complete ? (
                    <CheckCircle2 size={13} className="text-emerald-700" />
                  ) : (
                    <Circle size={13} className={active ? 'text-amber-600' : 'text-stone-300'} />
                  )}
                </div>
                <p className={`font-mono text-[9px] uppercase tracking-widest font-bold mt-3 ${
                  active ? 'text-amber-800' : 'text-stone-700'
                }`}>
                  {stage.label}
                </p>
                <p className="text-[11px] leading-snug text-stone-500 mt-2">{stage.benefit}</p>
              </div>
            );
          })}
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-7 border border-stone-300 bg-white p-6 md:p-8">
            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="font-mono text-[8px] uppercase tracking-widest text-stone-500">
                  Recommended next action
                </p>
                <h2 className="font-serif italic text-3xl mt-2">{nextAction.label}</h2>
                <p className="text-sm text-stone-600 mt-3 max-w-xl">{nextAction.detail}</p>
              </div>
              <Sparkles size={26} strokeWidth={1.2} className="text-amber-600 shrink-0" />
            </div>
            <button
              type="button"
              onClick={nextAction.action}
              className="mt-8 min-h-12 px-5 bg-stone-950 text-white font-mono text-[9px] uppercase tracking-widest font-bold flex items-center justify-center gap-3 hover:bg-amber-700 transition-colors"
            >
              {nextAction.label} <ArrowRight size={13} />
            </button>
          </div>

          <div className="xl:col-span-5 grid grid-cols-2 gap-3">
            {[
              {
                icon: FolderArchive,
                label: 'Source records',
                value: run.evidenceCount,
                note: 'Pocket preserves provenance',
              },
              {
                icon: FileCheck2,
                label: 'Project context',
                value: Math.max(run.approvedContextCount, approvedContextCount),
                note: 'Approved for this run',
              },
              {
                icon: Database,
                label: 'Reusable rules',
                value: run.reusableRuleCount,
                note: 'Saved to Memory / Tailor',
              },
              {
                icon: Package,
                label: 'Press pack',
                value: run.artifactPackId ? 'Ready' : '—',
                note: 'Review required',
              },
            ].map(({ icon: Icon, label, value, note }) => (
              <div key={label} className="border border-stone-300 bg-white p-4 min-h-36">
                <Icon size={16} strokeWidth={1.5} className="text-stone-500" />
                <p className="font-mono text-[8px] uppercase tracking-widest text-stone-500 mt-5">
                  {label}
                </p>
                <p className="font-serif text-2xl mt-1">{value}</p>
                <p className="text-[10px] text-stone-500 mt-2">{note}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 border border-stone-300 bg-white">
          <button
            type="button"
            onClick={onOpenStrategy}
            className="p-5 text-left border-b md:border-b-0 md:border-r border-stone-200 hover:bg-stone-50 transition-colors"
          >
            <BookOpen size={16} className="text-amber-700" />
            <p className="font-serif italic text-xl mt-4">Strategy workspace</p>
            <p className="text-xs text-stone-500 mt-2">Inspect evidence, approve context, and compile the Press handoff.</p>
          </button>
          <button
            type="button"
            onClick={onOpenCapabilities}
            className="p-5 text-left border-b md:border-b-0 md:border-r border-stone-200 hover:bg-stone-50 transition-colors"
          >
            <Search size={16} className="text-stone-600" />
            <p className="font-serif italic text-xl mt-4">Chamber capabilities</p>
            <p className="text-xs text-stone-500 mt-2">See which Mimi chamber owns each specialized operation.</p>
          </button>
          <button
            type="button"
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent('mimi:route-request', { detail: { path: '/the-press' } }),
              )
            }
            className="p-5 text-left hover:bg-stone-50 transition-colors"
          >
            <ShoppingBag size={16} className="text-[#648d1f]" />
            <p className="font-serif italic text-xl mt-4">Press + Shopify</p>
            <p className="text-xs text-stone-500 mt-2">Review the artifact, then create a draft—never an automatic release.</p>
          </button>
        </section>
      </div>
    </div>
  );
};
