import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, Loader2, Sparkles, Upload, X } from 'lucide-react';
import { useUser } from '../../contexts/UserContext';
import { resolveApiKey, type LLMProvider } from '../../services/apiKeyService';
import {
  synthesizeCreativeDossier,
  saveLikenessToLocalStorage,
  saveDossierToLocalStorage,
  buildTailorBlueprintDigest,
  type DossierProviderKey,
} from '../../services/creativeDossierService';
import { buildPriorTasteContextFromProfile } from '../../services/localDossierSynthesis';
import { summarizeAtelierForPriorContext } from '../../services/atelierService';
import type { EvidenceBasedCreativeDossier, TailorLogicDraft } from '../../types';

interface IntakeSection {
  label: string;
  detail: string;
  present: boolean;
}

function buildIntakeSections(draft: Partial<TailorLogicDraft> | null | undefined): IntakeSection[] {
  const pc = draft?.positioningCore;
  const ee = draft?.expressionEngine;
  const sv = draft?.strategicVectors;
  const ss = draft?.strategicSummary;
  const arr = (a?: string[]) => (a ?? []).filter((v) => typeof v === 'string' && v.trim());
  const refs = arr(pc?.anchors?.culturalReferences);
  const excl = arr(pc?.exclusionPrinciples);
  const aesthetic = [...arr(pc?.aestheticCore?.silhouettes), ...arr(pc?.aestheticCore?.materiality)];
  const palette = [ee?.colorPalette?.primary, ee?.colorPalette?.accent].filter((v): v is string => Boolean(v));
  const typo = [ee?.typographyIntent?.styleDescription, ee?.typography?.serif].filter((v): v is string => Boolean(v));
  const voice = [ee?.narrativeVoice?.emotionalTemperature, ee?.narrativeVoice?.tone, ee?.narrativeVoice?.voiceNotes].filter(
    (v): v is string => Boolean(v),
  );
  const strat = [...arr(sv?.desireVectors?.deepen), ...arr(sv?.desireVectors?.experiment)];
  const evidence = (draft?.styleEvidence ?? []).filter((e) => e && typeof e.value === 'string' && e.value.trim());
  const preview = (items: string[]) => items.slice(0, 3).join(', ');

  return [
    { label: 'References', detail: refs.length ? preview(refs) : 'Not set', present: refs.length > 0 },
    { label: 'Refusals & exclusions', detail: excl.length ? preview(excl) : 'Not set', present: excl.length > 0 },
    { label: 'Aesthetic core', detail: aesthetic.length ? preview(aesthetic) : 'Not set', present: aesthetic.length > 0 },
    { label: 'Color palette', detail: palette.length ? palette.join(' · ') : 'Not set', present: palette.length > 0 },
    { label: 'Typography', detail: typo.length ? preview(typo) : 'Not set', present: typo.length > 0 },
    { label: 'Narrative voice', detail: voice.length ? preview(voice) : 'Not set', present: voice.length > 0 },
    { label: 'Strategic direction', detail: strat.length ? preview(strat) : 'Not set', present: strat.length > 0 },
    { label: 'Aesthetic DNA', detail: ss?.aestheticDNA?.trim() || 'Not set', present: Boolean(ss?.aestheticDNA?.trim()) },
    { label: 'Saved evidence', detail: evidence.length ? `${evidence.length} saved` : 'None yet', present: evidence.length > 0 },
  ];
}
import { EvidenceDossierView } from './EvidenceDossierView';
import {
  trackLikenessAccepted,
  trackTailorScryCompleted,
  trackTailorScryStarted,
} from '../../lib/analytics';
import { PearlButton } from '../ui/PearlButton';
import { buildPublicShowcaseSnapshot } from '../../lib/publicShowcaseSnapshot';
import { listDolls } from '../../services/tailorService';
import { readStoredActiveDollId } from '../../services/dollEngine';

type Step = 'upload' | 'scrying' | 'dossier';

interface UploadedImage {
  id: string;
  dataUrl: string;
  name: string;
}

interface EvidenceDossierFlowProps {
  onExit: () => void;
  navigate?: (path: string) => void;
}

export const EvidenceDossierFlow: React.FC<EvidenceDossierFlowProps> = ({
  onExit,
  navigate,
}) => {
  const { user, profile, updateProfile, login, activePersona, canGenerate } = useUser();
  const isSignedIn = Boolean(user?.uid && !user?.isAnonymous);

  const draft = (profile?.tailorDraft ?? activePersona?.tailorDraft ?? null) as Partial<TailorLogicDraft> | null;
  const blueprintDigest = useMemo(() => buildTailorBlueprintDigest(draft), [draft]);
  const hasBlueprint = blueprintDigest.length > 0;
  const intakeSections = useMemo(() => buildIntakeSections(draft), [draft]);
  const capturedCount = intakeSections.filter((s) => s.present).length;

  const [step, setStep] = useState<Step>('upload');
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [blurb, setBlurb] = useState('');
  const [dossier, setDossier] = useState<EvidenceBasedCreativeDossier | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files?.length) return;
    const newImages: UploadedImage[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      if (images.length + newImages.length >= 8) break;
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      newImages.push({
        id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
        dataUrl,
        name: file.name,
      });
    }
    if (newImages.length) {
      setImages((prev) => [...prev, ...newImages].slice(0, 8));
      setError(null);
    }
  }, [images.length]);

  const removeImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  };

  const canCompile = hasBlueprint || images.length >= 3;

  const collectProviderKeys = (): DossierProviderKey[] => {
    const providers: LLMProvider[] = ['openai', 'anthropic', 'gemini'];
    const keys: DossierProviderKey[] = [];
    for (const provider of providers) {
      // Persona apiKey is a legacy Gemini override — never broadcast it to OpenAI/Anthropic.
      const personaOverride = provider === 'gemini' ? activePersona?.apiKey : undefined;
      const { key } = resolveApiKey(provider, personaOverride, profile?.planStatus);
      if (key) keys.push({ provider, key });
    }
    return keys;
  };

  const handleScry = async () => {
    if (!canCompile) {
      setError('Fill in your Tailor blueprint or upload at least 3 reference images.');
      return;
    }

    const providerKeys = collectProviderKeys();
    const canUseFundedPath =
      isSignedIn && (canGenerate || profile?.planStatus === 'trial' || profile?.planStatus === 'ghost');

    // Local pattern synthesis always works; LLM keys / trial credits only upgrade the read.
    setStep('scrying');
    setError(null);
    setAccepted(false);
    trackTailorScryStarted(images.length);

    try {
      const atelierSignals = summarizeAtelierForPriorContext(profile?.uid || user?.uid);
      const priorContext = {
        ...buildPriorTasteContextFromProfile(profile),
        atelierDesireSignals: atelierSignals.desire,
        atelierReferenceSignals: atelierSignals.reference,
      };
      const result = await synthesizeCreativeDossier({
        images: images.map((img) => ({ dataUrl: img.dataUrl })),
        userBlurb: blurb || undefined,
        providerKeys,
        apiKey: providerKeys.find((k) => k.provider === 'gemini')?.key,
        blueprintDigest: blueprintDigest || undefined,
        priorContext,
        // Prefer trial/funded path when available; stale BYOK must not skip it.
        preferFundedGateway: canUseFundedPath,
        allowLocalFallback: true,
      });
      setDossier(result);
      saveDossierToLocalStorage(result);
      trackTailorScryCompleted(result.references.length);
      setStep('dossier');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Synthesis failed. Try again.';
      if (message.toLowerCase().includes('credit')) {
        setError(
          'Trial credits exhausted — compiling from your blueprint + local visual patterns instead requires a retry, or add an OpenAI / Anthropic / Gemini key in Settings.',
        );
      } else if (message.toLowerCase().includes('sign in')) {
        setError(
          'Sign in for trial credits, or add an OpenAI / Anthropic / Gemini key in Settings. Local evidence reads still work from your blueprint.',
        );
      } else {
        setError(message);
      }
      setStep('upload');
    }
  };

  const handleAcceptLikeness = async () => {
    if (!dossier) return;
    setAccepting(true);
    try {
      const manifest = {
        ...dossier.likenessManifest,
        containerName: dossier.creativeOperatingSystem.containerName,
        oneSentencePhilosophy: dossier.creativeOperatingSystem.oneSentencePhilosophy,
        savedAt: Date.now(),
      };
      saveLikenessToLocalStorage(manifest);

      if (isSignedIn && updateProfile && profile) {
        const handle = profile.handle || user?.email?.split('@')[0]?.toLowerCase() || 'creator';
        let showcaseDoll = null;
        if (user?.uid) {
          const dolls = await listDolls(user.uid).catch((): Awaited<ReturnType<typeof listDolls>> => []);
          const preferredId = readStoredActiveDollId();
          showcaseDoll =
            (preferredId && dolls.find((d) => d.id === preferredId)) ||
            dolls[0] ||
            null;
        }
        await updateProfile({
          ...profile,
          likenessManifest: manifest,
          evidenceDossier: dossier,
          useLikeness: true,
          publicShowcase: buildPublicShowcaseSnapshot(handle, dossier, showcaseDoll),
        });
      }
      trackLikenessAccepted();
      setAccepted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save likeness.');
    } finally {
      setAccepting(false);
    }
  };

  const handleStartOver = () => {
    setImages([]);
    setBlurb('');
    setDossier(null);
    setError(null);
    setAccepted(false);
    setStep('upload');
  };

  if (step === 'scrying') {
    return (
      <div className="min-h-full bg-[#FDFBF7] dark:bg-[#0A0A0A] flex flex-col items-center justify-center px-6 py-24">
        <Loader2 className="animate-spin text-nous-subtle mb-6" size={32} />
        <p className="text-[10px] uppercase tracking-[0.4em] text-nous-subtle mb-2">Scrying</p>
        <h2 className="font-serif text-2xl text-nous-text mb-2">Reading everything you&apos;ve given Mimi</h2>
        <p className="text-sm text-nous-subtle text-center max-w-md">
          Blueprint + references → pattern graph → creative laws → container → applications
        </p>
      </div>
    );
  }

  if (step === 'dossier' && dossier) {
    return (
      <div className="min-h-full bg-[#FDFBF7] dark:bg-[#0A0A0A]">
        <div className="sticky top-0 z-10 bg-[#FDFBF7]/95 dark:bg-[#0A0A0A]/95 border-b border-nous-border/30 px-6 py-4 flex items-center justify-between">
          <button
            type="button"
            onClick={onExit}
            className="flex items-center gap-2 text-xs uppercase tracking-widest text-nous-subtle hover:text-nous-text"
          >
            <ArrowLeft size={14} />
            Tailor
          </button>
          {navigate && isSignedIn && (
            <button
              type="button"
              onClick={() => navigate('/studio')}
              className="text-xs uppercase tracking-widest text-nous-subtle hover:text-nous-text"
            >
              Open Studio
            </button>
          )}
        </div>
        {error && (
          <p className="text-center text-sm text-red-600/80 px-6 py-4">{error}</p>
        )}
        <EvidenceDossierView
          dossier={dossier}
          onAcceptLikeness={handleAcceptLikeness}
          onStartOver={handleStartOver}
          accepting={accepting}
          accepted={accepted}
        />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#FDFBF7] dark:bg-[#0A0A0A]">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <button
          type="button"
          onClick={onExit}
          className="flex items-center gap-2 text-xs uppercase tracking-widest text-nous-subtle hover:text-nous-text mb-8"
        >
          <ArrowLeft size={14} />
          Back
        </button>

        <p className="text-[10px] uppercase tracking-[0.3em] text-nous-subtle mb-2">Full read</p>
        <h1 className="font-serif text-3xl text-nous-text mb-2">Compile your dossier</h1>
        <p className="text-sm text-nous-subtle mb-8">
          Mimi reads your entire Tailor blueprint — positioning, palette, voice, strategy — plus any
          references you add, and synthesizes one Evidence-Based Creative Dossier. Not a style label.
        </p>

        {!isSignedIn && (
          <div className="mb-6 px-4 py-3 border border-amber-500/30 bg-amber-500/5 text-sm text-nous-subtle">
            Optional: sign in for trial LLM credits, or add an OpenAI / Anthropic / Gemini key in Settings.
            Without keys, Mimi still compiles a local evidence read from your blueprint + image patterns.{' '}
            <button type="button" onClick={() => void login()} className="underline text-nous-text">
              Sign in
            </button>
          </div>
        )}

        {/* Full intake summary — everything Mimi will read from your blueprint */}
        <div className="mb-8 border border-nous-border/30">
          <div className="flex items-center justify-between px-4 py-3 border-b border-nous-border/20">
            <span className="text-xs uppercase tracking-widest text-nous-text font-semibold">Tailor intake</span>
            <span className="text-[10px] uppercase tracking-wider text-nous-subtle">
              {capturedCount} of {intakeSections.length} captured
            </span>
          </div>
          <ul className="divide-y divide-nous-border/15">
            {intakeSections.map((s) => (
              <li key={s.label} className="flex items-start gap-3 px-4 py-3">
                <span
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                    s.present
                      ? 'border-nous-text/40 bg-nous-text/5 text-nous-text'
                      : 'border-nous-border/40 text-transparent'
                  }`}
                >
                  <Check size={10} strokeWidth={2.5} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-nous-text">{s.label}</p>
                  <p className="text-xs text-nous-subtle truncate">{s.detail}</p>
                </div>
              </li>
            ))}
          </ul>
          {!hasBlueprint && (
            <p className="px-4 py-3 text-xs text-nous-subtle border-t border-nous-border/20 leading-relaxed">
              Your blueprint is empty. Fill it in under Profile Blueprint, or upload at least 3
              references below to compile from images alone.
            </p>
          )}
        </div>

        <div className="mb-4 flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-[0.3em] text-nous-subtle">
            Supporting references {hasBlueprint ? '(optional)' : ''}
          </p>
          <span className="text-[10px] uppercase tracking-wider text-nous-subtle">
            {images.length} / 8
            {!hasBlueprint && images.length < 3 ? ` · need ${3 - images.length} more` : ''}
          </span>
        </div>
        <div className="mb-6 h-1 bg-nous-border/20">
          <div
            className="h-full bg-nous-text/60 transition-all"
            style={{ width: `${Math.min(100, (images.length / 8) * 100)}%` }}
          />
        </div>

        <div
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-nous-border/40 p-12 text-center cursor-pointer hover:border-nous-text/30 transition-colors mb-6"
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => void handleFiles(e.target.files)}
          />
          <Upload className="mx-auto text-nous-subtle mb-3" size={24} />
          <p className="text-sm text-nous-text">Drop images or click to upload</p>
        </div>

        {images.length > 0 && (
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-8">
            {images.map((img) => (
              <div key={img.id} className="aspect-square border border-nous-border/30 overflow-hidden relative group">
                <img src={img.dataUrl} alt={img.name} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(img.id)}
                  className="absolute top-1 right-1 p-0.5 bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Remove image"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        <label className="block mb-8">
          <span className="text-xs uppercase tracking-widest text-nous-subtle">
            What are you trying to understand? (optional)
          </span>
          <textarea
            value={blurb}
            onChange={(e) => setBlurb(e.target.value)}
            rows={3}
            className="mt-2 w-full border border-nous-border/40 bg-transparent px-4 py-3 text-sm resize-none focus:outline-none focus:border-nous-text/40"
            placeholder="What creative methodology, brand direction, or visual fluency are you building?"
          />
        </label>

        {error && (
          <p className="text-sm text-red-600/80 mb-4">{error}</p>
        )}

        <PearlButton
          type="button"
          editorial
          inverse
          disabled={!canCompile}
          likenessAccent={profile?.likenessManifest?.accentHex}
          onClick={() => void handleScry()}
          className="w-full py-4"
        >
          <Sparkles size={14} strokeWidth={1.25} />
          Compile Full Read
        </PearlButton>
      </div>
    </div>
  );
};
