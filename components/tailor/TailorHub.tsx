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
  initialPanel = 'blueprint',
}) => {
  const { updateProfile, profile, user, login } = useUser();
  const [mode, setMode] = useState<TailorPanel>(initialPanel);
  const [resumeProject, setResumeProject] = useState<TailorProject | null>(null);
  const [resumeEvidence, setResumeEvidence] = useState<EvidenceNode[]>([]);
  const isSignedIn = Boolean(user?.uid && !user.isAnonymous);

  const panelPaths: Record<TailorPanel, string> = {
    blueprint: '/tailor',
    dossier: '/tailor/dossier',
    intake: '/tailor/evidence',
    'style-lab': '/tailor/style-lab',
    diagnostics: '/tailor/diagnostics',
  };

  const selectPanel = (panel: TailorPanel) => {
    if (panel === 'intake' && !isSignedIn) {
      void login(true);
      return;
    }
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

  const tabs: Array<{ id: TailorPanel; label: string; note: string }> = [
    { id: 'blueprint', label: 'Profile Blueprint', note: 'compile' },
    { id: 'intake', label: 'Evidence Intake', note: 'collect' },
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
            className="flex max-w-full items-stretch gap-1 overflow-x-auto"
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
      </div>

      <div className="min-h-0 flex-1">
        {mode === 'blueprint' && (
          <TailorView
            initialOverrides={initialOverrides}
            onOverridesConsumed={onOverridesConsumed}
          />
        )}
        {mode === 'dossier' && (
          <EvidenceDossierFlow
            onExit={() => selectPanel('blueprint')}
            navigate={navigate}
          />
        )}
        {mode === 'intake' && (
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
        )}
        {mode === 'style-lab' && <ArtStyleChamber />}
        {mode === 'diagnostics' && <AestheticIntelligenceChamber />}
      </div>
      <ChamberHandoff moduleId="tailor" />
    </div>
  );
};
