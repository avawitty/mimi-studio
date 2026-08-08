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
  TailorLogicDraft,
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
  createFieldNote,
} from '../../services/tailorService';
import {
  runTailorAnalysis,
  generateCreativeDossierForProject,
  generateDollFromGraph,
  generateMarketingAsset,
} from '../../services/tailorAnalysisService';
import { generateArtHistoryMatchesForProject } from '../../services/artHistoryService';
import { saveArtworkMatches } from '../../services/tailorService';
import {
  evaluateGenerationReadiness,
  isGenerationBlocked,
  type GenerationBlocked,
} from '../../services/tailorReadiness';
import { TailorStartScreen } from './TailorStartScreen';
import { EvidenceUploadScreen, type EvidenceUploadItem, type EvidenceIntakeHandoffPayload } from './EvidenceUploadScreen';
import { AnalysisProgressScreen } from './AnalysisProgressScreen';
import { PatternGraphScreen } from './PatternGraphScreen';
import { CreativeLawsScreen } from './CreativeLawsScreen';
import { CreativeDossierScreen } from './CreativeDossierScreen';
import { OutputSelectionScreen, type TailorOutputChoice } from './OutputSelectionScreen';
import { DollProfileScreen } from './DollProfileScreen';
import { ArtHistoryMirrorScreen } from './ArtHistoryMirrorScreen';
import { GenerationBlockedPanel } from './GenerationBlockedPanel';
import type { CuriosityPromptId } from '../../services/tailorEvidenceIntake';
import { buildDirectStatementEvidence, CURIOSITY_PROMPTS } from '../../services/tailorEvidenceIntake';
import { useTasteModel } from '../../hooks/useTasteModel';
import {
  compileAndSaveTasteModel,
  recordCurationAsTasteEvent,
} from '../../services/tasteModelService';
import {
  buildE2eTasteSnapshot,
  E2E_EVIDENCE,
  E2E_OBSERVATIONS,
  E2E_PATTERN_CLUSTERS,
  E2E_TAILOR_PROJECT,
  isE2eTailorPatternsFixture,
} from '../../lib/e2e/tailorPatternGraphFixture';

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
  onExportDraft?: (draft: TailorLogicDraft) => void;
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
  const e2eFixture = isE2eTailorPatternsFixture();
  const uid = e2eFixture ? E2E_TAILOR_PROJECT.userId : (user?.uid ?? '');
  const isSignedIn = e2eFixture || Boolean(uid && !user?.isAnonymous);

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
  const [generationBlock, setGenerationBlock] = useState<GenerationBlocked | null>(null);
  const bootstrappedRef = useRef(Boolean(initialProject));
  const [e2eSnapshot, setE2eSnapshot] = useState(
  () => (e2eFixture ? buildE2eTasteSnapshot() : null),
  );

  const tasteModel = useTasteModel({
    userId: uid,
    projectId: project?.id,
    autoLoad: Boolean(uid && project?.id) && !e2eFixture,
  });

  useEffect(() => {
    if (!e2eFixture || bootstrappedRef.current) return;
    bootstrappedRef.current = true;
    setProject(E2E_TAILOR_PROJECT);
    setEvidence(E2E_EVIDENCE);
    setObservations(E2E_OBSERVATIONS);
    setClusters(E2E_PATTERN_CLUSTERS);
    setStep('patterns');
  }, [e2eFixture]);

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
      window.dispatchEvent(
        new CustomEvent("mimi:registry_alert", {
          detail: {
            message: `${files.length} evidence item${files.length === 1 ? "" : "s"} staged for reading.`,
            type: "success",
          },
        }),
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Could not stage evidence. Try again or upload a screenshot.";
      console.error("MIMI // Tailor evidence upload failed", err);
      window.dispatchEvent(
        new CustomEvent("mimi:registry_alert", {
          detail: { message, type: "error" },
        }),
      );
    } finally {
      setUploading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!uid || !project) return;
    setStep('analyzing');
    setLoading(true);
    try {
      // Always use live chip / custom curiosity at analyze time. A prior
      // intakeHandoff snapshot can be stale if the user changed chips after commit.
      const curiosityLines = [
        ...CURIOSITY_PROMPTS.filter((p) => curiosityIds.includes(p.id)).map((p) => p.label),
        ...(customCuriosity.trim() ? [customCuriosity.trim()] : []),
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
      // when the user wrote open context / free-text curiosity, or selected
      // enough curiosity prompts to unlock a read without uploaded references.
      const statementText =
        blurb.trim() ||
        customCuriosity.trim() ||
        (curiosityLines.length >= 3 ? curiosityLines.map((l) => `• ${l}`).join('\n') : '');
      if (statementText && !evidence.some((e) => e.extractedMetadata?.kind === 'direct_statement')) {
        const fromCustom = Boolean(customCuriosity.trim() && !blurb.trim());
        const fromPrompts = Boolean(!blurb.trim() && !customCuriosity.trim() && curiosityLines.length >= 3);
        const statement = buildDirectStatementEvidence(statementText, 'session');
        if (statement) {
          await addEvidenceNode(uid, project.id, {
            sourceType: statement.evidenceSourceType,
            title: fromCustom ? 'Curiosity' : fromPrompts ? 'Curiosity prompts' : statement.title,
            description: statement.description,
            extractedMetadata: {
              ...statement.rawMetadata,
              intakeScope: statement.scope,
              intakeId: statement.id,
              intendedHelp: curiosityLines,
              ...(fromCustom ? { fromCustomCuriosity: true } : {}),
              ...(fromPrompts ? { fromCuriosityPrompts: true } : {}),
            },
          });
        }
      }

      await updateTailorProject(uid, project.id, { blurb: enrichedBlurb || blurb });
      const result = await runTailorAnalysis(uid, project.id, enrichedBlurb || blurb);
      setArtQueries(result.artHistorySearchQueries);
      await refreshProjectData(project.id);
      setStep('patterns');
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Reading failed. Check your evidence sources and try again.";
      console.error("MIMI // Tailor analyze failed", err);
      window.dispatchEvent(
        new CustomEvent("mimi:registry_alert", {
          detail: { message, type: "error" },
        }),
      );
      setStep("upload");
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
    const cluster = clusters.find((c) => c.id === clusterId);
    try {
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

      if (isSignedIn) {
        await recordCurationAsTasteEvent(uid, project.id, 'pattern_cluster', clusterId, action, {
          annotation,
          weight,
          provenance: {
            patternClusterIds: [clusterId],
            observationIds: cluster?.observationIds ?? [],
            evidenceNodeIds: cluster?.supportingEvidenceNodeIds ?? [],
          },
        });
        await compileAndSaveTasteModel({ userId: uid, projectId: project.id });
        await tasteModel.refresh();
      }
    } catch (err) {
      console.error('MIMI // Taste curation failed', err);
      window.dispatchEvent(
        new CustomEvent('mimi:registry_alert', {
          detail: {
            message: 'Curation saved but taste model update failed. Your correction is recorded.',
            type: 'warning',
          },
        }),
      );
    }
    await refreshProjectData(project.id);
  };

  const handleLawAccept = async (lawId: string) => {
    if (!uid || !project) return;
    const law = laws.find((l) => l.id === lawId);
    await updateCreativeLaw(uid, project.id, lawId, { userStatus: 'accepted', claimType: 'user_confirmed' });
    if (isSignedIn) {
      await recordCurationAsTasteEvent(uid, project.id, 'creative_law', lawId, 'accepted', {
        provenance: {
          creativeLawIds: [lawId],
          patternClusterIds: law?.supportingPatternClusterIds ?? [],
          evidenceNodeIds: law?.supportingEvidenceNodeIds ?? [],
        },
      });
      await compileAndSaveTasteModel({ userId: uid, projectId: project.id });
      await tasteModel.refresh();
    }
    await refreshProjectData(project.id);
  };

  const handleLawReject = async (lawId: string) => {
    if (!uid || !project) return;
    const law = laws.find((l) => l.id === lawId);
    await updateCreativeLaw(uid, project.id, lawId, { userStatus: 'rejected', claimType: 'user_rejected' });
    if (isSignedIn) {
      await recordCurationAsTasteEvent(uid, project.id, 'creative_law', lawId, 'rejected', {
        provenance: {
          creativeLawIds: [lawId],
          patternClusterIds: law?.supportingPatternClusterIds ?? [],
          evidenceNodeIds: law?.supportingEvidenceNodeIds ?? [],
        },
      });
      await compileAndSaveTasteModel({ userId: uid, projectId: project.id });
      await tasteModel.refresh();
    }
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
    setGenerationBlock(null);

    const actionForChoice =
      choice === 'doll'
        ? 'doll'
        : choice === 'marketing_asset'
          ? 'marketing_asset'
          : choice === 'field_notes'
            ? 'field_notes'
            : choice === 'art_history'
              ? 'art_history'
              : choice === 'brand_kit' || choice === 'art_style' || choice === 'writing_voice'
                ? 'brand_export'
                : null;

    if (actionForChoice) {
      const readiness = evaluateGenerationReadiness({
        action: actionForChoice,
        project,
        evidenceCount: evidence.length,
        patterns: clusters,
        laws,
        assetType: choice === 'marketing_asset' ? 'brand_statement' : undefined,
        expectedTasteGraphId: project.tasteGraphId,
      });
      if (isGenerationBlocked(readiness)) {
        setGenerationBlock(readiness);
        return;
      }
    }

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
          if (!project.tasteGraphId) {
            setGenerationBlock({
              ok: false,
              prerequisite: 'missing_taste_graph',
              explanation: 'Art History needs a linked Taste Graph.',
              recoveryAction: 'Re-run intake so the project has a tasteGraphId.',
            });
            break;
          }
          const matches = await generateArtHistoryMatchesForProject(
            uid,
            project.id,
            artQueries.length ? artQueries : ['expressive distortion', 'symbolic composition'],
            clusters.filter((c) => c.userStatus === 'accepted').map((c) => c.id),
            laws.filter((l) => l.userStatus === 'accepted').map((l) => l.id),
          );
          await saveArtworkMatches(
            uid,
            matches.map((m) => ({ ...m, projectId: project.id })),
          );
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
          navigate?.('/mimi-dolls/overview');
          break;
        }
        case 'mimi_rip': {
          navigate?.('/rip');
          break;
        }
        case 'marketing_asset': {
          if (!project.tasteGraphId) {
            setGenerationBlock({
              ok: false,
              prerequisite: 'missing_taste_graph',
              explanation: 'Marketing assets need a linked Taste Graph.',
              recoveryAction: 'Re-run intake so the project has a tasteGraphId.',
            });
            break;
          }
          await generateMarketingAsset(
            uid,
            project.id,
            project.tasteGraphId,
            'brand_statement',
          );
          setStep('outputs');
          break;
        }
        case 'field_notes': {
          const accepted = clusters.filter((c) => c.userStatus === 'accepted');
          await createFieldNote(uid, {
            projectId: project.id,
            title: 'Tailor session note',
            body:
              accepted.length > 0
                ? `Accepted patterns: ${accepted.map((c) => c.name).join(', ')}`
                : `Evidence count: ${evidence.length}. Continue curation in Tailor.`,
            noteType: 'observation',
            linkedPatternClusterIds: accepted.map((c) => c.id),
            linkedEvidenceNodeIds: evidence.slice(0, 8).map((e) => e.id),
            linkedCreativeLawIds: laws
              .filter((l) => l.userStatus === 'accepted')
              .map((l) => l.id),
            linkedDollIds: [],
            tags: ['tailor', 'session'],
          });
          navigate?.('/mimi-dolls/field-notes');
          break;
        }
        default: {
          const _exhaustive: never = choice;
          return _exhaustive;
        }
      }
    } catch (e) {
      const err = e as Error & { prerequisite?: string; recoveryAction?: string };
      if (err.prerequisite && err.recoveryAction) {
        setGenerationBlock({
          ok: false,
          prerequisite: err.prerequisite as GenerationBlocked['prerequisite'],
          explanation: err.message,
          recoveryAction: err.recoveryAction,
        });
      } else {
        setGenerationBlock({
          ok: false,
          prerequisite: 'no_evidence',
          explanation: err.message || 'Generation failed.',
          recoveryAction: 'Check evidence, accepted laws, and try again.',
        });
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
          laws={laws}
          projectId={project?.id}
          editorUserId={e2eFixture ? uid : undefined}
          onCurate={handleCurate}
          onContinue={() => setStep('laws')}
          tasteSnapshot={e2eSnapshot ?? tasteModel.activeSnapshot}
          tasteLoading={tasteModel.loading}
          tasteStale={tasteModel.stale}
          onRecompileTasteModel={tasteModel.recompile}
          onTasteSnapshotChange={(snapshot) => {
            if (e2eFixture) setE2eSnapshot(snapshot);
          }}
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
        <>
          {generationBlock && (
            <GenerationBlockedPanel
              block={generationBlock}
              onDismiss={() => setGenerationBlock(null)}
              onRecover={() => {
                setGenerationBlock(null);
                if (
                  generationBlock.prerequisite === 'no_accepted_laws' ||
                  generationBlock.prerequisite === 'no_accepted_patterns'
                ) {
                  setStep('laws');
                } else if (generationBlock.prerequisite === 'no_evidence') {
                  setStep('upload');
                }
              }}
            />
          )}
          <OutputSelectionScreen onSelect={handleOutputSelect} onFinish={handleFinish} />
        </>
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
