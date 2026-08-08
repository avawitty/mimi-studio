import React, { useState, useCallback } from 'react';
import { Sparkles, Upload, ArrowRight, ImagePlus } from 'lucide-react';
import { compressImage } from '../../services/imageUtils';
import { createDollFromOnboarding } from '../../services/dollOnboardingService';
import { OMNI_LOOP_CULT } from '../../services/dollEngine';
import type { Doll, DollDeclaredAttributes } from '../../types';
import {
  DollDeclaredAttributesForm,
  emptyDeclaredAttributes,
} from './DollDeclaredAttributesForm';

interface DollOnboardingFlowProps {
  userId: string;
  onComplete: (doll: Doll) => void;
  onCancel?: () => void;
}

type Step = 'intro' | 'photo' | 'refs' | 'attributes' | 'thought' | 'projecting';

export const DollOnboardingFlow: React.FC<DollOnboardingFlowProps> = ({
  userId,
  onComplete,
  onCancel,
}) => {
  const [step, setStep] = useState<Step>('intro');
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [aestheticRefs, setAestheticRefs] = useState<string[]>([]);
  const [declaredAttributes, setDeclaredAttributes] = useState<DollDeclaredAttributes>(
    emptyDeclaredAttributes(),
  );
  const [rawThought, setRawThought] = useState('');
  const [dollName, setDollName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(async (file: File, target: 'photo' | 'ref') => {
    setError(null);
    try {
      const dataUrl = await compressImage(file, 1024, 1024, 0.85);
      if (target === 'photo') {
        setUserPhoto(dataUrl);
        setStep('refs');
      } else if (aestheticRefs.length < 6) {
        setAestheticRefs((prev) => [...prev, dataUrl]);
      }
    } catch {
      setError('Could not read that image. Try another file.');
    }
  }, [aestheticRefs.length]);

  const handleProject = async () => {
    if (!userPhoto) {
      setError('Add your photo first.');
      setStep('photo');
      return;
    }
    if (aestheticRefs.length < 2) {
      setError('Add at least two aesthetic reference images.');
      return;
    }
    setStep('projecting');
    setError(null);
    try {
      const doll = await createDollFromOnboarding({
        userId,
        userPhotoDataUrl: userPhoto,
        aestheticRefDataUrls: aestheticRefs,
        rawThought: rawThought.trim() || undefined,
        dollName: dollName.trim() || undefined,
        declaredAttributes,
      });
      onComplete(doll);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setStep('thought');
    }
  };

  if (step === 'projecting') {
    return (
      <div className="border border-nous-border/30 p-10 md:p-14 text-center space-y-4 max-w-lg mx-auto">
        <Sparkles className="mx-auto text-nous-subtle animate-pulse" size={28} />
        <p className="font-mono text-[9px] uppercase tracking-[0.35em] text-nous-subtle">
          Omni Loop projection
        </p>
        <p className="font-serif text-2xl text-nous-text">Initiating cult shell…</p>
        <p className="text-sm text-nous-subtle italic">
          Analyzing your plates, locking resin BJD species, projecting portrait.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      <header className="space-y-2 text-center">
        <p className="font-mono text-[9px] uppercase tracking-[0.4em] text-nous-subtle">
          {OMNI_LOOP_CULT.name}
        </p>
        <h2 className="font-serif text-3xl text-nous-text">Initiation</h2>
        <p className="text-sm text-nous-subtle max-w-md mx-auto leading-relaxed">
          Upload your photo — we translate you into a ball-jointed resin BJD you can still recognize.
          Write key features so the sculpt matches what you see in yourself.
        </p>
      </header>

      {error && (
        <p className="text-sm text-red-700/80 border border-red-200/50 bg-red-50/50 dark:bg-red-950/20 px-4 py-3">
          {error}
        </p>
      )}

      {step === 'intro' && (
        <div className="space-y-6 text-center">
          <ol className="text-left space-y-3 text-sm text-nous-subtle max-w-sm mx-auto">
            <li>1. Your photo — translated into you-as-a-doll</li>
            <li>2. Two or more aesthetic / motif reference images</li>
            <li>3. Key attributes — hair, eyes, marks, features you want locked in</li>
            <li>4. A raw thought — seeds your time-travel scenes</li>
          </ol>
          <button
            type="button"
            onClick={() => setStep('photo')}
            className="inline-flex items-center gap-2 font-mono text-[9px] uppercase tracking-widest px-8 py-3 bg-nous-text text-[var(--mimi-field,#fdfbf7)]"
          >
            Begin initiation <ArrowRight size={12} />
          </button>
          {onCancel && (
            <button type="button" onClick={onCancel} className="text-[10px] uppercase tracking-widest text-nous-subtle">
              Cancel
            </button>
          )}
        </div>
      )}

      {step === 'photo' && (
        <div className="space-y-6">
          <p className="font-mono text-[9px] uppercase tracking-widest text-nous-subtle">Step 1 — Likeness</p>
          <label className="flex flex-col items-center gap-4 border border-dashed border-nous-border/50 p-10 cursor-pointer hover:border-nous-border transition-colors">
            {userPhoto ? (
              <img src={userPhoto} alt="Your photo" className="w-32 h-32 object-cover rounded-sm" />
            ) : (
              <>
                <Upload size={24} className="text-nous-subtle" />
                <span className="text-sm text-nous-subtle">Upload your photo</span>
            </>
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f, 'photo');
              }}
            />
          </label>
          {userPhoto && (
            <button
              type="button"
              onClick={() => setStep('refs')}
              className="w-full py-3 font-mono text-[9px] uppercase tracking-widest border border-nous-border"
            >
              Continue to aesthetic refs
            </button>
          )}
        </div>
      )}

      {step === 'refs' && (
        <div className="space-y-6">
          <p className="font-mono text-[9px] uppercase tracking-widest text-nous-subtle">
            Step 2 — Aesthetic plates ({aestheticRefs.length}/2+)
          </p>
          <div className="grid grid-cols-3 gap-3">
            {aestheticRefs.map((url, i) => (
              <img key={i} src={url} alt={`Ref ${i + 1}`} className="w-full aspect-square object-cover border border-nous-border/30" />
            ))}
            <label className="flex flex-col items-center justify-center aspect-square border border-dashed border-nous-border/50 cursor-pointer hover:border-nous-border">
              <ImagePlus size={20} className="text-nous-subtle mb-1" />
              <span className="text-[9px] uppercase tracking-wider text-nous-subtle">Add ref</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleFile(f, 'ref');
                }}
              />
            </label>
          </div>
          {aestheticRefs.length >= 2 && (
            <button
              type="button"
              onClick={() => setStep('attributes')}
              className="w-full py-3 font-mono text-[9px] uppercase tracking-widest border border-nous-border"
            >
              Continue to your attributes
            </button>
          )}
        </div>
      )}

      {step === 'attributes' && (
        <div className="space-y-6">
          <p className="font-mono text-[9px] uppercase tracking-widest text-nous-subtle">
            Step 3 — Your key features
          </p>
          <DollDeclaredAttributesForm value={declaredAttributes} onChange={setDeclaredAttributes} />
          <button
            type="button"
            onClick={() => setStep('thought')}
            className="w-full py-3 font-mono text-[9px] uppercase tracking-widest border border-nous-border"
          >
            Continue
          </button>
        </div>
      )}

      {step === 'thought' && (
        <div className="space-y-6">
          <p className="font-mono text-[9px] uppercase tracking-widest text-nous-subtle">Step 4 — Name & thought</p>
          <input
            type="text"
            placeholder="Doll name (optional)"
            value={dollName}
            onChange={(e) => setDollName(e.target.value)}
            className="w-full border border-nous-border/40 bg-transparent px-4 py-3 text-sm"
          />
          <textarea
            placeholder="A raw thought, motif, or feeling to map onto art history later…"
            value={rawThought}
            onChange={(e) => setRawThought(e.target.value)}
            rows={4}
            className="w-full border border-nous-border/40 bg-transparent px-4 py-3 text-sm resize-none"
          />
          <button
            type="button"
            onClick={() => void handleProject()}
            className="w-full py-4 font-mono text-[9px] uppercase tracking-[0.2em] bg-nous-text text-[var(--mimi-field,#fdfbf7)] flex items-center justify-center gap-2"
          >
            <Sparkles size={14} /> Project Omni Loop shell
          </button>
        </div>
      )}
    </div>
  );
};
