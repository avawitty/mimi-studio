import React, { useCallback, useRef, useState } from 'react';
import { ArrowLeft, Loader2, Sparkles, Upload, X } from 'lucide-react';
import { useUser } from '../../contexts/UserContext';
import { resolveApiKey } from '../../services/apiKeyService';
import {
  synthesizeCreativeDossier,
  saveLikenessToLocalStorage,
  saveDossierToLocalStorage,
} from '../../services/creativeDossierService';
import type { EvidenceBasedCreativeDossier } from '../../types';
import { EvidenceDossierView } from './EvidenceDossierView';
import {
  trackLikenessAccepted,
  trackTailorScryCompleted,
  trackTailorScryStarted,
} from '../../lib/analytics';
import { PearlButton } from '../ui/PearlButton';
import { buildPublicShowcaseSnapshot } from '../../lib/publicShowcaseSnapshot';

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

  const handleScry = async () => {
    if (images.length < 3) {
      setError('Upload at least 3 reference images.');
      return;
    }

    const { key: apiKey } = resolveApiKey(
      'gemini',
      activePersona?.apiKey,
      profile?.planStatus,
    );

    const canUseFundedPath = isSignedIn && (canGenerate || profile?.planStatus === 'trial' || profile?.planStatus === 'ghost');
    if (!apiKey && !canUseFundedPath) {
      setError('Sign in to use daily trial credits, add a Gemini key in Settings, or upgrade to a paid plan.');
      return;
    }

    setStep('scrying');
    setError(null);
    setAccepted(false);
    trackTailorScryStarted(images.length);

    try {
      const result = await synthesizeCreativeDossier({
        images: images.map((img) => ({ dataUrl: img.dataUrl })),
        userBlurb: blurb || undefined,
        apiKey: apiKey ?? undefined,
        preferFundedGateway: !apiKey,
      });
      setDossier(result);
      saveDossierToLocalStorage(result);
      trackTailorScryCompleted(result.references.length);
      setStep('dossier');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Synthesis failed. Try again.';
      if (message.toLowerCase().includes('credit')) {
        setError('You are out of trial credits for today. Add your own Gemini key in Settings or upgrade to continue.');
      } else if (message.toLowerCase().includes('sign in')) {
        setError('Sign in to scry with Mimi trial credits, or add your own Gemini key in Settings.');
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
        await updateProfile({
          ...profile,
          likenessManifest: manifest,
          evidenceDossier: dossier,
          useLikeness: true,
          publicShowcase: buildPublicShowcaseSnapshot(handle, dossier),
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
        <h2 className="font-serif text-2xl text-nous-text mb-2">Reading your evidence</h2>
        <p className="text-sm text-nous-subtle text-center max-w-md">
          Per-reference observation → pattern graph → creative laws → container → applications
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

        <p className="text-[10px] uppercase tracking-[0.3em] text-nous-subtle mb-2">Evidence intake</p>
        <h1 className="font-serif text-3xl text-nous-text mb-2">Bring your references</h1>
        <p className="text-sm text-nous-subtle mb-8">
          Upload 3–8 images. Mimi will synthesize an Evidence-Based Creative Dossier — not a style label.
        </p>

        {!isSignedIn && (
          <div className="mb-6 px-4 py-3 border border-amber-500/30 bg-amber-500/5 text-sm text-nous-subtle">
            Sign in to use trial credits for Scry, or add your own Gemini key in Settings.{' '}
            <button type="button" onClick={() => void login(true)} className="underline text-nous-text">
              Sign in
            </button>
          </div>
        )}

        <div className="mb-6 p-4 border border-nous-border/30">
          <div className="flex justify-between text-xs mb-2">
            <span>{images.length} / 8 uploaded</span>
            <span className="uppercase tracking-wider text-nous-subtle">
              {images.length < 3 ? `Need ${3 - images.length} more` : 'Ready to scry'}
            </span>
          </div>
          <div className="h-1 bg-nous-border/20">
            <div
              className="h-full bg-nous-text/60 transition-all"
              style={{ width: `${Math.min(100, (images.length / 8) * 100)}%` }}
            />
          </div>
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
          disabled={images.length < 3}
          likenessAccent={profile?.likenessManifest?.accentHex}
          onClick={() => void handleScry()}
          className="w-full py-4"
        >
          <Sparkles size={14} strokeWidth={1.25} />
          Scry
        </PearlButton>
      </div>
    </div>
  );
};
