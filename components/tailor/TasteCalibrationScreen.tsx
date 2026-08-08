import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type {
  CalibrationChoice,
  CalibrationJudgmentResponse,
  CalibrationPairResponse,
  CalibrationSessionSummary,
  TasteModelDelta,
} from '../../lib/tasteCalibration/contracts';
import {
  completeCalibrationSession,
  createCalibrationSession,
  pauseCalibrationSession,
  submitCalibrationJudgment,
} from '../../services/tasteCalibrationClient';

interface TasteCalibrationScreenProps {
  projectId?: string;
  navigate?: (path: string) => void;
  onExit?: () => void;
}

type Phase = 'loading' | 'compare' | 'feedback' | 'complete' | 'error';

const CHOICES: Array<{ id: CalibrationChoice; label: string; shortcut: string }> = [
  { id: 'left', label: 'Left', shortcut: '1' },
  { id: 'right', label: 'Right', shortcut: '2' },
  { id: 'both', label: 'Both', shortcut: '3' },
  { id: 'neither', label: 'Neither', shortcut: '4' },
  { id: 'skip', label: 'Skip', shortcut: '5' },
];

function formatConfidence(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function ModelDeltaPanel({ delta }: { delta: TasteModelDelta }) {
  const changed = delta.changedFeatures.slice(0, 6);
  const unchanged = delta.changedFeatures.length === 0;

  return (
    <div
      className="rounded-lg border border-[var(--mimi-hairline)] bg-[var(--mimi-field)]/60 p-4"
      role="status"
      aria-live="polite"
    >
      <p className="font-display text-sm text-[var(--mimi-ink)]">Mimi learned</p>
      <ul className="mt-3 space-y-2 text-sm text-[var(--mimi-ink)]/80">
        {unchanged ? (
          <li>No material feature shifts from this comparison.</li>
        ) : (
          changed.map((feature) => {
            const strengthened = feature.delta > 0;
            const weakened = feature.delta < 0;
            const confidenceChanged =
              Math.abs(feature.nextConfidence - feature.previousConfidence) >= 0.03;
            return (
              <li key={feature.featureId}>
                <span className="font-medium">{feature.label}</span>{' '}
                {strengthened && 'strengthened'}
                {weakened && 'weakened'}
                {!strengthened && !weakened && 'unchanged'}
                {confidenceChanged && (
                  <>
                    {' '}
                    · Confidence {formatConfidence(feature.previousConfidence)} →{' '}
                    {formatConfidence(feature.nextConfidence)}
                  </>
                )}
              </li>
            );
          })
        )}
      </ul>
      {delta.remainingUncertaintyFeatureIds.length > 0 && (
        <div className="mt-4 border-t border-[var(--mimi-hairline)] pt-3">
          <p className="text-xs uppercase tracking-widest text-[var(--mimi-stone)]">
            What remains uncertain
          </p>
          <p className="mt-1 text-sm text-[var(--mimi-ink)]/75">
            {delta.remainingUncertaintyFeatureIds
              .slice(0, 3)
              .map((id) => id.replace('tag:', '').replace(/_/g, ' '))
              .join(' · ')}
          </p>
        </div>
      )}
    </div>
  );
}

function CandidateCard({
  side,
  candidate,
}: {
  side: 'A' | 'B';
  candidate: CalibrationPairResponse['left'];
}) {
  return (
    <div className="flex min-h-[220px] flex-1 flex-col overflow-hidden rounded-xl border border-[var(--mimi-hairline)] bg-white shadow-sm dark:bg-[#111]">
      <div className="border-b border-[var(--mimi-hairline)] px-3 py-2 text-xs uppercase tracking-[0.2em] text-[var(--mimi-stone)]">
        {side}
      </div>
      <div className="relative flex flex-1 items-center justify-center bg-[var(--mimi-field)]/40 p-3">
        {candidate.imageUrl ? (
          <img
            src={candidate.imageUrl}
            alt={candidate.altText || candidate.label}
            className="max-h-[42vh] w-full object-contain"
          />
        ) : (
          <div className="px-4 text-center font-display text-lg text-[var(--mimi-ink)]">
            {candidate.label}
          </div>
        )}
      </div>
      <div className="border-t border-[var(--mimi-hairline)] px-3 py-2 text-sm text-[var(--mimi-ink)]/80">
        {candidate.label}
      </div>
    </div>
  );
}

export const TasteCalibrationScreen: React.FC<TasteCalibrationScreenProps> = ({
  projectId,
  navigate,
  onExit,
}) => {
  const reduceMotion = useReducedMotion();
  const liveRegionId = useId();
  const [phase, setPhase] = useState<Phase>('loading');
  const [error, setError] = useState<string | null>(null);
  const [pairResponse, setPairResponse] = useState<CalibrationPairResponse | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showWhy, setShowWhy] = useState(false);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [showReasonSheet, setShowReasonSheet] = useState(false);
  const [lastDelta, setLastDelta] = useState<TasteModelDelta | null>(null);
  const [summary, setSummary] = useState<CalibrationSessionSummary | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const submittingRef = useRef(false);

  const startSession = useCallback(async () => {
    if (!projectId) {
      setError('Open a Tailor project with analyzed references before calibrating taste.');
      setPhase('error');
      return;
    }
    setPhase('loading');
    setError(null);
    try {
      const result = await createCalibrationSession({ projectId });
      setSessionId(result.session.id);
      setPairResponse(result.pair);
      setPhase('compare');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start calibration.');
      setPhase('error');
    }
  }, [projectId]);

  useEffect(() => {
    void startSession();
  }, [startSession]);

  const isolatedFeatures =
    pairResponse?.pair.isolatedFeatureIds.map((id) => ({
      id,
      label:
        pairResponse.left.featureLabels[id] ??
        pairResponse.right.featureLabels[id] ??
        id.replace('tag:', '').replace(/_/g, ' '),
    })) ?? [];

  const submitChoice = useCallback(
    async (choice: CalibrationChoice) => {
      if (!pairResponse || !sessionId || submittingRef.current) return;
      submittingRef.current = true;
      setPhase('loading');
      try {
        const result: CalibrationJudgmentResponse = await submitCalibrationJudgment({
          sessionId,
          pairId: pairResponse.pair.id,
          choice,
          decidingFeatureIds: selectedFeatures,
          correctionNote: note.trim() || undefined,
        });
        setLastDelta(result.modelDelta);
        setAnnouncement(
          result.modelDelta.changedFeatures.length > 0
            ? `Judgment recorded. ${result.modelDelta.changedFeatures.length} taste features updated.`
            : 'Judgment recorded. Taste model unchanged.',
        );
        setSelectedFeatures([]);
        setNote('');
        setShowReasonSheet(false);

        if (result.sessionComplete) {
          const done = await completeCalibrationSession(sessionId);
          setSummary(done);
          setPhase('complete');
        } else if (result.nextPair) {
          setPairResponse(result.nextPair);
          setPhase('feedback');
        } else {
          setPhase('compare');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not submit judgment.');
        setPhase('error');
      } finally {
        submittingRef.current = false;
      }
    },
    [note, pairResponse, selectedFeatures, sessionId],
  );

  const continueToNext = useCallback(() => {
    setPhase('compare');
    setLastDelta(null);
  }, []);

  const handlePause = useCallback(async () => {
    if (!sessionId) return;
    await pauseCalibrationSession(sessionId);
    onExit?.();
  }, [onExit, sessionId]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (phase !== 'compare' || submittingRef.current) return;
      const mapping: Record<string, CalibrationChoice> = {
        '1': 'left',
        '2': 'right',
        '3': 'both',
        '4': 'neither',
        '5': 'skip',
      };
      const choice = mapping[event.key];
      if (choice) {
        event.preventDefault();
        void submitChoice(choice);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, submitChoice]);

  if (phase === 'loading') {
    return (
      <div className="flex h-full items-center justify-center p-8 text-sm text-[var(--mimi-stone)]">
        Preparing calibration pair…
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="mx-auto flex h-full max-w-lg flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="font-display text-lg text-[var(--mimi-ink)]">{error}</p>
        <button
          type="button"
          onClick={() => void startSession()}
          className="min-h-[44px] rounded-full border border-[var(--mimi-hairline)] px-5 py-2 text-sm"
        >
          Try again
        </button>
      </div>
    );
  }

  if (phase === 'complete' && summary) {
    return (
      <div className="mx-auto flex h-full max-w-2xl flex-col gap-6 overflow-y-auto p-6">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--mimi-stone)]">
            Calibration complete
          </p>
          <h2 className="mt-2 font-display text-2xl text-[var(--mimi-ink)]">
            Taste boundary sharpened
          </h2>
        </div>
        {summary.strongestConfirmed.length > 0 && (
          <section>
            <h3 className="text-sm font-medium text-[var(--mimi-ink)]">Strongest confirmed</h3>
            <p className="mt-1 text-sm text-[var(--mimi-ink)]/75">
              {summary.strongestConfirmed.map((f) => f.label).join(' · ')}
            </p>
          </section>
        )}
        {summary.strongestRefusals.length > 0 && (
          <section>
            <h3 className="text-sm font-medium text-[var(--mimi-ink)]">Strongest refusals</h3>
            <p className="mt-1 text-sm text-[var(--mimi-ink)]/75">
              {summary.strongestRefusals.map((f) => f.label).join(' · ')}
            </p>
          </section>
        )}
        {summary.remainingUncertainties.length > 0 && (
          <section>
            <h3 className="text-sm font-medium text-[var(--mimi-ink)]">Remaining uncertainties</h3>
            <p className="mt-1 text-sm text-[var(--mimi-ink)]/75">
              {summary.remainingUncertainties.map((f) => f.label).join(' · ')}
            </p>
          </section>
        )}
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => navigate?.('/taste-graph')}
            className="min-h-[44px] rounded-full bg-[var(--mimi-ink)] px-5 py-2 text-sm text-[var(--mimi-field)]"
          >
            Review Taste Graph
          </button>
          <button
            type="button"
            onClick={() => onExit?.()}
            className="min-h-[44px] rounded-full border border-[var(--mimi-hairline)] px-5 py-2 text-sm"
          >
            Back to Tailor
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-full max-w-5xl flex-col gap-4 p-4 md:p-6">
      <div id={liveRegionId} className="sr-only" aria-live="polite">
        {announcement}
      </div>

      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--mimi-stone)]">
            Taste Calibration
          </p>
          <h2 className="font-display text-xl text-[var(--mimi-ink)]">
            Which reference fits your taste boundary?
          </h2>
        </div>
        {pairResponse && (
          <p className="text-sm text-[var(--mimi-stone)]">
            {pairResponse.sessionProgress.answered + (phase === 'feedback' ? 0 : 0)} /{' '}
            {pairResponse.sessionProgress.target}
          </p>
        )}
      </header>

      {phase === 'feedback' && lastDelta && (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <ModelDeltaPanel delta={lastDelta} />
          <button
            type="button"
            onClick={continueToNext}
            className="mt-4 min-h-[44px] w-full rounded-full bg-[var(--mimi-ink)] px-5 py-3 text-sm text-[var(--mimi-field)] md:w-auto"
          >
            Next comparison
          </button>
        </motion.div>
      )}

      {phase === 'compare' && pairResponse && (
        <>
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 md:grid-cols-2">
            <CandidateCard side="A" candidate={pairResponse.left} />
            <CandidateCard side="B" candidate={pairResponse.right} />
          </div>

          <div className="rounded-lg border border-[var(--mimi-hairline)] bg-[var(--mimi-field)]/30 p-3">
            <button
              type="button"
              onClick={() => setShowWhy((v) => !v)}
              aria-expanded={showWhy}
              className="text-sm font-medium text-[var(--mimi-ink)] underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mimi-cobalt)]"
            >
              Why these two?
            </button>
            <AnimatePresence>
              {showWhy && (
                <motion.p
                  initial={reduceMotion ? false : { opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-2 text-sm text-[var(--mimi-ink)]/75"
                >
                  {pairResponse.pair.selectionReason.explanation}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {CHOICES.map((choice) => (
              <button
                key={choice.id}
                type="button"
                onClick={() => void submitChoice(choice.id)}
                className="min-h-[44px] rounded-full border border-[var(--mimi-hairline)] bg-white px-3 py-3 text-sm font-medium text-[var(--mimi-ink)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mimi-cobalt)] active:bg-[var(--mimi-field)] dark:bg-[#111]"
                aria-keyshortcuts={choice.shortcut}
              >
                {choice.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setShowReasonSheet(true)}
              className="min-h-[44px] rounded-full border border-[var(--mimi-hairline)] px-4 py-2 text-sm"
            >
              What caused the preference?
            </button>
            <button
              type="button"
              onClick={() => void handlePause()}
              className="min-h-[44px] rounded-full border border-[var(--mimi-hairline)] px-4 py-2 text-sm text-[var(--mimi-stone)]"
            >
              Pause
            </button>
            {sessionId && (
              <button
                type="button"
                onClick={() => void completeCalibrationSession(sessionId).then(setSummary).then(() => setPhase('complete'))}
                className="min-h-[44px] rounded-full border border-[var(--mimi-hairline)] px-4 py-2 text-sm text-[var(--mimi-stone)]"
              >
                Finish early
              </button>
            )}
          </div>
        </>
      )}

      <AnimatePresence>
        {showReasonSheet && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 md:items-center"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowReasonSheet(false)}
          >
            <motion.div
              role="dialog"
              aria-label="What caused the preference"
              className="w-full max-w-lg rounded-t-2xl border border-[var(--mimi-hairline)] bg-[var(--mimi-field)] p-5 md:rounded-2xl"
              initial={reduceMotion ? false : { y: 40 }}
              animate={{ y: 0 }}
              exit={{ y: 40 }}
              onClick={(e) => e.stopPropagation()}
            >
              <p className="font-display text-lg text-[var(--mimi-ink)]">
                What caused the preference?
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {isolatedFeatures.map((feature) => {
                  const active = selectedFeatures.includes(feature.id);
                  return (
                    <button
                      key={feature.id}
                      type="button"
                      onClick={() =>
                        setSelectedFeatures((prev) =>
                          active
                            ? prev.filter((id) => id !== feature.id)
                            : [...prev, feature.id],
                        )
                      }
                      aria-pressed={active}
                      className={`min-h-[44px] rounded-full border px-4 py-2 text-sm ${
                        active
                          ? 'border-[var(--mimi-cobalt)] bg-[var(--mimi-cobalt)]/10'
                          : 'border-[var(--mimi-hairline)]'
                      }`}
                    >
                      {feature.label}
                    </button>
                  );
                })}
              </div>
              <label className="mt-4 block text-sm text-[var(--mimi-stone)]">
                Optional note
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[var(--mimi-hairline)] bg-white p-3 text-sm dark:bg-[#111]"
                  rows={3}
                />
              </label>
              <button
                type="button"
                onClick={() => setShowReasonSheet(false)}
                className="mt-4 min-h-[44px] w-full rounded-full bg-[var(--mimi-ink)] px-5 py-2 text-sm text-[var(--mimi-field)]"
              >
                Done
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
