import React, { useState, useEffect } from 'react';
import { TailorView } from '../TailorView';
import { ArtStyleChamber } from '../ArtStyleChamber';
import { AestheticIntelligenceChamber } from '../chambers/AestheticIntelligenceChamber';
import { TailorProjectFlow } from './TailorProjectFlow';
import { EvidenceDossierFlow } from './EvidenceDossierFlow';
import { useUser } from '../../contexts/UserContext';
import { getTailorProject, listEvidenceNodes } from '../../services/tailorService';
import type { TailorProject, EvidenceNode } from '../../types';
import { ChamberHandoff } from '../ChamberHandoff';

export type TailorPanel =
  | 'blueprint'
  | 'dossier'
  | 'intake'
  | 'style-lab'
  | 'diagnostics';

interface TailorHubProps {
  initialOverrides?: unknown;
  onOverridesConsumed?: () => void;
  navigate?: (path: string) => void;
  initialPanel?: TailorPanel;
}

export const TailorHub: React.FC<TailorHubProps> = ({
  initialOverrides,
  onOverridesConsumed,
  navigate,
  initialPanel = 'intake',
}) => {
  const { updateProfile, profile, user, login, isSimulatedMode } = useUser();
  const [mode, setMode] = useState<TailorPanel>(initialPanel);
  const [resumeProject, setResumeProject] = useState<TailorProject | null>(null);
  const [resumeEvidence, setResumeEvidence] = useState<EvidenceNode[]>([]);
  const isSignedIn = Boolean(user?.uid && !user.isAnonymous);

  const panelPaths: Record<TailorPanel, string> = {
    blueprint: '/tailor/blueprint',
    dossier: '/tailor/dossier',
    intake: '/tailor/evidence',
    'style-lab': '/tailor/style-lab',
    diagnostics: '/tailor/diagnostics',
  };

  const selectPanel = (panel: TailorPanel) => {
    if (isSimulatedMode && panel !== 'blueprint') return;
    // Always switch panels so the tab visibly responds (esp. on mobile).
    // Auth-gated panels render their own in-panel sign-in prompt below,
    // instead of firing a full-page redirect that dies inside the preview.
    setMode(panel);
    navigate?.(panelPaths[panel]);
  };

  useEffect(() => {
    setMode(initialPanel);
  }, [initialPanel]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const projectId = params.get('project');
    if (projectId && user?.uid) {
      void getTailorProject(user.uid, projectId).then(async (p) => {
        if (p) {
          setResumeProject(p);
          const ev = await listEvidenceNodes(user.uid, projectId);
          setResumeEvidence(ev);
          setMode('intake');
        }
      });
    }
  }, [user?.uid]);

  // Evidence Intake is step 0 — collect before blueprint / laws / dolls.
  const tabs: Array<{ id: TailorPanel; label: string; note: string }> = [
    { id: 'intake', label: 'Evidence Intake', note: 'collect' },
    { id: 'blueprint', label: 'Profile Blueprint', note: 'compile' },
    { id: 'style-lab', label: 'Style Lab', note: 'interpret' },
    { id: 'diagnostics', label: 'Diagnostics', note: 'review' },
    { id: 'dossier', label: 'Compiled Dossier', note: 'apply' },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col justify-between bg-[#FDFBF7] dark:bg-[#0A0A0A]">
      <div className="border-b border-stone-200 bg-stone-50 px-4 py-2 font-mono text-[10px] uppercase tracking-widest dark:border-stone-850 dark:bg-[#0d0d0d]">
        <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex shrink-0 items-center gap-2">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
            <span className="font-extrabold text-[#d4af37]">Tailor Suite</span>
            <span className="hidden text-[8px] normal-case tracking-normal text-stone-400 sm:inline">
              Evidence → interpretation → rules → generation contract
            </span>
          </div>
          <nav
            aria-label="Tailor profile workflow"
            className="flex max-w-full items-stretch gap-1 overflow-x-auto no-scrollbar scroll-fade-x"
          >
            {tabs.map((tab, index) => {
              const isActive = mode === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => selectPanel(tab.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`min-w-max border-b-2 px-3 py-2 text-left transition-colors ${
                    isActive
                      ? 'border-amber-500 text-stone-900 dark:text-stone-100'
                      : 'border-transparent text-stone-400 hover:text-stone-600 dark:hover:text-stone-200'
                  }`}
                >
                  <span className="mr-2 text-[8px] text-amber-600">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="font-bold">{tab.label}</span>
                  <span className="ml-2 hidden text-[7px] text-stone-400 2xl:inline">
                    {tab.note}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
        {isSimulatedMode && (
          <div className="mt-2 border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[8px] tracking-[0.16em] text-amber-700 dark:text-amber-300">
            Simulated mode active due to billing/limit. Tailor advanced modules are temporarily limited.
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1">
        {mode === 'blueprint' && (
          <TailorView
            initialOverrides={initialOverrides}
            onOverridesConsumed={onOverridesConsumed}
          />
        )}
        {!isSimulatedMode && mode === 'dossier' && (
          <EvidenceDossierFlow
            onExit={() => selectPanel('blueprint')}
            navigate={navigate}
          />
        )}
        {!isSimulatedMode && mode === 'intake' && (
          isSignedIn ? (
            <TailorProjectFlow
              initialProject={resumeProject ?? undefined}
              initialEvidence={resumeEvidence}
              onExit={() => selectPanel('blueprint')}
              navigate={navigate}
              onExportDraft={async (draft) => {
                if (updateProfile && draft && profile) {
                  await updateProfile({ ...profile, tailorDraft: draft as any });
                }
                onOverridesConsumed?.();
                selectPanel('blueprint');
              }}
            />
          ) : (
            <div className="flex h-full min-h-0 items-center justify-center px-6 py-12">
              <div className="w-full max-w-sm text-center">
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#d4af37]">
                  Evidence Intake
                </p>
                <h2 className="mt-3 font-serif text-2xl text-stone-900 dark:text-stone-100">
                  Sign on to bring in your taste
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
                  Evidence is saved to your private profile so Mimi can read your
                  references over time. Sign on to start a fitting.
                </p>
                <button
                  type="button"
                  onClick={() => void login()}
                  className="mt-6 inline-flex min-h-11 w-full items-center justify-center bg-stone-900 px-6 font-mono text-[11px] uppercase tracking-[0.2em] font-bold text-white transition-colors hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white"
                >
                  Sign on
                </button>
                <button
                  type="button"
                  onClick={() => selectPanel('blueprint')}
                  className="mt-3 inline-flex min-h-11 w-full items-center justify-center font-mono text-[10px] uppercase tracking-[0.2em] text-stone-400 transition-colors hover:text-stone-600 dark:hover:text-stone-200"
                >
                  Back to blueprint
                </button>
              </div>
            </div>
          )
        )}
        {!isSimulatedMode && mode === 'style-lab' && <ArtStyleChamber />}
        {!isSimulatedMode && mode === 'diagnostics' && <AestheticIntelligenceChamber />}
        {isSimulatedMode && mode !== 'blueprint' && (
          <div className="flex h-full min-h-0 items-center justify-center px-6 py-12">
            <div className="w-full max-w-xl text-center">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber-600">
                Simulated Tailor Mode
              </p>
              <h2 className="mt-3 font-serif text-2xl text-stone-900 dark:text-stone-100">
                Advanced Tailor modules are temporarily unavailable.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
                We detected a billing/limit condition and automatically switched to simulated mode.
                Blueprint editing remains available while cloud-backed modules are limited.
              </p>
              <button
                type="button"
                onClick={() => selectPanel('blueprint')}
                className="mt-6 inline-flex min-h-11 items-center justify-center border border-stone-300 px-6 font-mono text-[10px] uppercase tracking-[0.2em] text-stone-700 transition-colors hover:bg-stone-100 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-900"
              >
                Return to blueprint
              </button>
            </div>
          </div>
        )}
      </div>
      <ChamberHandoff moduleId="tailor" />
    </div>
  );
};
