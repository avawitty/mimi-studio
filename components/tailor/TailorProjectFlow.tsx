import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useUser } from '../../contexts/UserContext';
import type {
  TailorProject,
  TailoringIntent,
  EvidenceNode,
  Observation,
  PatternCluster,
  CreativeLaw,
  UserWeight,
  CreativeDossier,
  Doll,
} from '../../types';
import {
  createTailorProject,
  addEvidenceNode,
  listEvidenceNodes,
  listObservations,
  listPatternClusters,
  listCreativeLaws,
  curatePatternCluster,
  updatePatternCluster,
  updateCreativeLaw,
  updateTailorProject,
  exportTailorDraftFromGraph,
} from '../../services/tailorService';
import {
  runTailorAnalysis,
  generateCreativeDossierForProject,
  generateDollFromGraph,
} from '../../services/tailorAnalysisService';
import { generateArtHistoryMatchesForProject } from '../../services/artHistoryService';
import { saveArtworkMatches } from '../../services/tailorService';
import { TailorStartScreen } from './TailorStartScreen';
import { EvidenceUploadScreen, type EvidenceUploadItem, type EvidenceIntakeHandoffPayload } from './EvidenceUploadScreen';
import { AnalysisProgressScreen } from './AnalysisProgressScreen';
import { PatternGraphScreen } from './PatternGraphScreen';
import { CreativeLawsScreen } from './CreativeLawsScreen';
import { CreativeDossierScreen } from './CreativeDossierScreen';
import { OutputSelectionScreen, type TailorOutputChoice } from './OutputSelectionScreen';
import { DollProfileScreen } from './DollProfileScreen';
import { ArtHistoryMirrorScreen } from './ArtHistoryMirrorScreen';
import type { CuriosityPromptId } from '../../services/tailorEvidenceIntake';
import { buildDirectStatementEvidence, CURIOSITY_PROMPTS } from '../../services/tailorEvidenceIntake';

type FlowStep =
  | 'start'
  | 'upload'
  | 'analyzing'
  | 'patterns'
  | 'laws'
  | 'dossier'
  | 'outputs'
  | 'doll'
  | 'art_history';

interface TailorProjectFlowProps {
  onExit: () => void;
  onExportDraft?: (draft: unknown) => void;
  navigate?: (path: string) => void;
  initialProject?: TailorProject;
  initialEvidence?: EvidenceNode[];
}

export const TailorProjectFlow: React.FC<TailorProjectFlowProps> = ({
  onExit,
  onExportDraft,
  navigate,
  initialProject,
  initialEvidence = [],
}) => {
  const { user, profile, updateProfile, login } = useUser();
  const uid = user?.uid ?? '';
  const isSignedIn = Boolean(uid && !user?.isAnonymous);

  const [step, setStep] = useState<FlowStep>(initialProject ? 'upload' : 'start');
  const [project, setProject] = useState<TailorProject | null>(initialProject ?? null);
  const [evidence, setEvidence] = useState<EvidenceNode[]>(initialEvidence);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [clusters, setClusters] = useState<PatternCluster[]>([]);
  const [laws, setLaws] = useState<CreativeLaw[]>([]);
  const [dossier, setDossier] = useState<CreativeDossier | null>(null);
  const [doll, setDoll] = useState<Doll | null>(null);
  const [blurb, setBlurb] = useState(initialProject?.blurb ?? '');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [artQueries, setArtQueries] = useState<string[]>([]);
  const [curiosityIds, setCuriosityIds] = useState<CuriosityPromptId[]>([]);
  const [customCuriosity, setCustomCuriosity] = useState('');
  const [intakeHandoff, setIntakeHandoff] = useState<EvidenceIntakeHandoffPayload | null>(null);
  const bootstrappedRef = useRef(Boolean(initialProject));

  const refreshProjectData = useCallback(async (projectId: string) => {
    if (!uid) return;
    const [ev, obs, cl, lw] = await Promise.all([
      listEvidenceNodes(uid, projectId),
      listObservations(uid, projectId),
      listPatternClusters(uid, projectId),
      listCreativeLaws(uid, projectId),
    ]);
    setEvidence(ev);
    setObservations(obs);
    setClusters(cl);
    setLaws(lw);
  }, [uid]);

  // Evidence Intake is step 0: land on upload immediately with a default project.
  useEffect(() => {
    if (!uid || bootstrappedRef.current || initialProject) return;
    bootstrappedRef.current = true;
    void createTailorProject(uid, 'creative_practice').then((p) => {
      setProject(p);
      setStep('upload');
    });
  }, [uid, initialProject]);

  const handleIntentSelect = async (intent: TailoringIntent) => {
    if (!uid) return;
    const p = await createTailorProject(uid, intent);
    setProject(p);
    setStep('upload');
  };

  const handleUpload = async (files: EvidenceUploadItem[]) => {
    if (!uid || !project) return;
    setUploading(true);
    try {
      for (const f of files) {
        await addEvidenceNode(uid, project.id, {
          sourceType: f.sourceType,
          title: f.title,
          ...(f.dataUrl ? { uploadedFileUrl: f.dataUrl } : {}),
          ...(f.thumbnailUrl || f.dataUrl ? { thumbnailUrl: f.thumbnailUrl ?? f.dataUrl } : {}),
          ...(f.sourceUrl ? { sourceUrl: f.sourceUrl } : {}),
          ...(f.description ? { description: f.description } : {}),
          ...(f.extractedMetadata ? { extractedMetadata: f.extractedMetadata } : {}),
        });
      }
      await refreshProjectData(project.id);
      const updated = await listEvidenceNodes(uid, project.id);
      setEvidence(updated);
    } finally {
      setUploading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!uid || !project) return;
    setStep('analyzing');
    setLoading(true);
    try {
      // Persist direct context + session curiosity into the project blurb
      // without stuffing the full schema into the UI. Curiosity stays session-
      // scoped unless the handoff marked it persistent.
      const curiosityLines = [
        ...(intakeHandoff?.intendedHelp?.length
          ? intakeHandoff.intendedHelp
          : [
              ...CURIOSITY_PROMPTS.filter((p) => curiosityIds.includes(p.id)).map((p) => p.label),
              ...(customCuriosity.trim() ? [customCuriosity.trim()] : []),
            ]),
      ];
      const enrichedBlurb = [
        blurb.trim(),
        curiosityLines.length
          ? `\n\n[Curiosity — this reading]\n${curiosityLines.map((l) => `• ${l}`).join('\n')}`
          : '',
      ]
        .join('')
        .trim();

      // Direct statements outrank inference — store as a note evidence node
      // when the user wrote open context that has not yet been committed.
      if (blurb.trim() && !evidence.some((e) => e.extractedMetadata?.kind === 'direct_statement')) {
        const statement = buildDirectStatementEvidence(blurb.trim(), 'session');
        if (statement) {
          await addEvidenceNode(uid, project.id, {
            sourceType: statement.evidenceSourceType,
            title: statement.title,
            description: statement.description,
            extractedMetadata: {
              ...statement.rawMetadata,
              intakeScope: statement.scope,
              intakeId: statement.id,
              intendedHelp: curiosityLines,
            },
          });
        }
      }

      await updateTailorProject(uid, project.id, { blurb: enrichedBlurb || blurb });
      const result = await runTailorAnalysis(uid, project.id, enrichedBlurb || blurb);
      setArtQueries(result.artHistorySearchQueries);
      await refreshProjectData(project.id);
      setStep('patterns');
    } finally {
      setLoading(false);
    }
  };

  const handleCurate = async (
    clusterId: string,
    action: 'accepted' | 'rejected' | 'renamed',
    annotation?: string,
    weight?: UserWeight,
    name?: string,
  ) => {
    if (!uid || !project) return;
    if (action === 'renamed') {
      await updatePatternCluster(uid, project.id, clusterId, {
        ...(name ? { name } : {}),
        ...(annotation ? { userAnnotation: annotation } : {}),
        ...(weight ? { userWeight: weight } : {}),
        userStatus: 'renamed',
      });
    } else {
      await curatePatternCluster(uid, project.id, clusterId, action, annotation, weight);
    }
    await refreshProjectData(project.id);
  };

  const handleLawAccept = async (lawId: string) => {
    if (!uid || !project) return;
    await updateCreativeLaw(uid, project.id, lawId, { userStatus: 'accepted', claimType: 'user_confirmed' });
    await refreshProjectData(project.id);
  };

  const handleLawReject = async (lawId: string) => {
    if (!uid || !project) return;
    await updateCreativeLaw(uid, project.id, lawId, { userStatus: 'rejected', claimType: 'user_rejected' });
    await refreshProjectData(project.id);
  };

  const handleGenerateDossier = async () => {
    if (!uid || !project) return;
    setStep('dossier');
    setLoading(true);
    try {
      const d = await generateCreativeDossierForProject(uid, project.id);
      setDossier(d);
    } finally {
      setLoading(false);
    }
  };

  const handleOutputSelect = async (choice: TailorOutputChoice) => {
    if (!uid || !project) return;
    setLoading(true);
    try {
      switch (choice) {
        case 'doll': {
          const d = await generateDollFromGraph(uid, project.id);
          setDoll(d);
          setStep('doll');
          break;
        }
        case 'art_history': {
          const matches = await generateArtHistoryMatchesForProject(
            uid,
            project.id,
            artQueries.length ? artQueries : ['expressive distortion', 'symbolic composition'],
            clusters.filter((c) => c.userStatus === 'accepted').map((c) => c.id),
            laws.filter((l) => l.userStatus === 'accepted').map((l) => l.id),
          );
          await saveArtworkMatches(uid, matches);
          setStep('art_history');
          break;
        }
        case 'brand_kit':
        case 'art_style':
        case 'writing_voice': {
          const draft = await exportTailorDraftFromGraph(uid, project.id);
          onExportDraft?.(draft);
          if (updateProfile && profile) await updateProfile({ ...profile, dnaMapped: true });
          onExit();
          break;
        }
        case 'mimi_you': {
          const handle = profile?.handle || user?.email?.split('@')[0] || uid.slice(0, 8);
          navigate?.(`/u/${handle}`);
          break;
        }
        case 'field_notes':
        case 'marketing_asset':
          setStep('outputs');
          break;
        default: {
          const _exhaustive: never = choice;
          return _exhaustive;
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = async () => {
    if (uid && project) {
      const draft = await exportTailorDraftFromGraph(uid, project.id);
      onExportDraft?.(draft);
      if (updateProfile && profile) await updateProfile({ ...profile, dnaMapped: true });
    }
    onExit();
  };

  return (
    <div className="min-h-full bg-[#FDFBF7] dark:bg-[#0A0A0A]">
      {!isSignedIn ? (
        <div className="max-w-md mx-auto px-6 py-24 text-center">
          <p className="text-[10px] uppercase tracking-[0.3em] text-nous-subtle mb-3">Tailor</p>
          <h2 className="font-serif text-2xl text-nous-text mb-4">Sign in to start intake</h2>
          <p className="text-sm text-nous-subtle mb-8">
            Evidence, patterns, creative laws, and dolls are saved to your account.
          </p>
          <button
            type="button"
            onClick={() => void login(true)}
            className="text-xs uppercase tracking-[0.2em] px-6 py-3 border border-nous-border/60"
          >
            Sign in
          </button>
        </div>
      ) : (
      <>
      <div className="sticky top-0 z-10 flex items-center gap-3 px-6 py-4 border-b border-nous-border/20 bg-[#FDFBF7]/90 dark:bg-[#0A0A0A]/90 backdrop-blur">
        <button type="button" onClick={onExit} className="flex items-center gap-2 text-xs uppercase tracking-widest text-nous-subtle hover:text-nous-text">
          <ArrowLeft size={14} /> Tailor
        </button>
        {project && (
          <span className="text-[10px] uppercase tracking-wider text-nous-subtle ml-auto">
            {project.intent.replace(/_/g, ' ')}
          </span>
        )}
      </div>

      {step === 'start' && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-nous-subtle">
            Opening Evidence Intake…
          </p>
          <TailorStartScreen onSelect={handleIntentSelect} onBack={onExit} />
        </div>
      )}
      {step === 'upload' && project && (
        <EvidenceUploadScreen
          evidence={evidence}
          onUpload={handleUpload}
          onContinue={handleAnalyze}
          blurb={blurb}
          onBlurbChange={setBlurb}
          uploading={uploading}
          analysisAvailable={observations.length > 0 || clusters.length > 0}
          curiosityIds={curiosityIds}
          onCuriosityChange={setCuriosityIds}
          customCuriosity={customCuriosity}
          onCustomCuriosityChange={setCustomCuriosity}
          onHandoffReady={setIntakeHandoff}
        />
      )}
      {step === 'analyzing' && (
        <AnalysisProgressScreen loading={loading} observations={observations} />
      )}
      {step === 'patterns' && (
        <PatternGraphScreen
          clusters={clusters}
          evidence={evidence}
          observations={observations}
          onCurate={handleCurate}
          onContinue={() => setStep('laws')}
        />
      )}
      {step === 'laws' && (
        <CreativeLawsScreen
          laws={laws}
          onAccept={handleLawAccept}
          onReject={handleLawReject}
          onContinue={handleGenerateDossier}
        />
      )}
      {step === 'dossier' && (
        <CreativeDossierScreen
          dossier={dossier}
          loading={loading}
          onContinue={() => setStep('outputs')}
        />
      )}
      {step === 'outputs' && (
        <OutputSelectionScreen onSelect={handleOutputSelect} onFinish={handleFinish} />
      )}
      {step === 'doll' && doll && (
        <DollProfileScreen doll={doll} onBack={() => setStep('outputs')} onContinue={handleFinish} />
      )}
      {step === 'art_history' && project && (
        <ArtHistoryMirrorScreen userId={uid} projectId={project.id} onBack={() => setStep('outputs')} />
      )}
      </>
      )}
    </div>
  );
};
