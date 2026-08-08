import React, { useCallback, useEffect, useMemo, useState } from "react";
import type {
  CalibrationChoice,
  TasteCalibrationPair,
  TasteCalibrationSession,
} from "../../schemas/tasteIntelligenceContracts";
import type { TasteModelSnapshot } from "../../lib/tasteModel";
import {
  getActiveCalibrationSession,
  startCalibrationSession,
  submitCalibrationJudgment,
  type CalibrationCandidateInput,
} from "../../services/tasteIntelligenceClient";
import { useUser } from "../../contexts/UserContext";
import { compileAndSaveTasteModel } from "../../services/tasteModelService";
import { useTasteModel } from "../../hooks/useTasteModel";
import {
  buildE2eTasteSnapshot,
  isE2eTailorPatternsFixture,
} from "../../lib/e2e/tailorPatternGraphFixture";

const DECIDING_DIMENSIONS = [
  "composition",
  "color",
  "material",
  "mood",
  "typography",
  "cultural reference",
  "strangeness",
  "restraint",
  "commercial feeling",
] as const;

interface CalibrationLabProps {
  projectId?: string;
  tasteSnapshot?: TasteModelSnapshot | null;
  candidates?: CalibrationCandidateInput[];
  navigate?: (path: string) => void;
}

export function deriveCalibrationCandidates(
  tasteSnapshot: TasteModelSnapshot | null | undefined,
  externalCandidates?: CalibrationCandidateInput[],
): CalibrationCandidateInput[] {
  if (externalCandidates && externalCandidates.length >= 2) {
    return externalCandidates;
  }
  if (!tasteSnapshot) return [];
  const features = tasteSnapshot.featureWeights.slice(0, 12);
  const pairs: CalibrationCandidateInput[] = [];
  for (let i = 0; i < features.length - 1; i += 2) {
    const a = features[i]!;
    const b = features[i + 1]!;
    pairs.push({
      id: `pair-${a.featureId}`,
      label: a.label,
      featureIds: [a.featureId],
      sourceIds: a.sourceIds,
    });
    pairs.push({
      id: `pair-${b.featureId}`,
      label: b.label,
      featureIds: [b.featureId],
      sourceIds: b.sourceIds,
    });
  }
  return pairs;
}

export const CalibrationLab: React.FC<CalibrationLabProps> = ({
  projectId: projectIdProp,
  tasteSnapshot: tasteSnapshotProp,
  candidates: externalCandidates,
  navigate,
}) => {
  const { user } = useUser();
  const projectIdFromUrl = useMemo(() => {
    if (typeof window === "undefined") return undefined;
    return new URLSearchParams(window.location.search).get("project") ?? undefined;
  }, []);
  const projectId = projectIdProp ?? projectIdFromUrl;
  const e2eFixture = isE2eTailorPatternsFixture();
  const tasteModel = useTasteModel({
    userId: user?.uid,
    projectId,
    autoLoad: Boolean(user?.uid) && !tasteSnapshotProp && !e2eFixture,
  });
  const tasteSnapshot =
    tasteSnapshotProp ?? (e2eFixture ? buildE2eTasteSnapshot() : tasteModel.activeSnapshot);
  const tasteLoading = !tasteSnapshotProp && !e2eFixture && tasteModel.loading;
  const tasteLoadError =
    !tasteSnapshotProp && !e2eFixture && !tasteLoading && Boolean(tasteModel.error);
  const [session, setSession] = useState<TasteCalibrationSession | null>(null);
  const [pair, setPair] = useState<TasteCalibrationPair | null>(null);
  const [left, setLeft] = useState<CalibrationCandidateInput | null>(null);
  const [right, setRight] = useState<CalibrationCandidateInput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<{
    affectedFeatureIds: string[];
    choice: CalibrationChoice;
  } | null>(null);
  const [showReasonSheet, setShowReasonSheet] = useState(false);
  const [pendingChoice, setPendingChoice] = useState<CalibrationChoice | null>(null);
  const [selectedDimensions, setSelectedDimensions] = useState<string[]>([]);
  const [undoStack, setUndoStack] = useState<string[]>([]);

  const derivedCandidates = useMemo(
    () => deriveCalibrationCandidates(tasteSnapshot, externalCandidates),
    [externalCandidates, tasteSnapshot],
  );

  const applySessionPayload = useCallback(
    (result: {
      session: TasteCalibrationSession;
      pair: TasteCalibrationPair | null;
      left?: CalibrationCandidateInput;
      right?: CalibrationCandidateInput;
    }) => {
      const exhausted =
        result.session.status === "completed" ||
        (result.pair == null &&
          (result.session.answeredQuestionCount >= result.session.targetQuestionCount ||
            result.session.answeredQuestionCount > 0));
      if (exhausted) {
        setSession({
          ...result.session,
          status: "completed",
          completedAt: result.session.completedAt ?? Date.now(),
        });
        setPair(null);
        setLeft(null);
        setRight(null);
        return;
      }
      setSession(result.session);
      setPair(result.pair);
      setLeft(result.left ?? null);
      setRight(result.right ?? null);
    },
    [],
  );

  const resumeActiveSession = useCallback(async () => {
    if (!user?.uid || derivedCandidates.length < 2) return;
    try {
      const { session: active } = await getActiveCalibrationSession(projectId);
      if (!active) return;
      if (active.status === "completed") {
        setSession(active);
        return;
      }
      const result = await startCalibrationSession({
        projectId,
        candidates: derivedCandidates,
      });
      applySessionPayload(result);
    } catch {
      // Neon may be unavailable locally — honest empty state
    }
  }, [user?.uid, projectId, derivedCandidates, applySessionPayload]);

  useEffect(() => {
    void resumeActiveSession();
  }, [resumeActiveSession]);

  const beginSession = async () => {
    if (!user?.uid || derivedCandidates.length < 2) {
      setError("Need at least two candidates and a signed-in session.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await startCalibrationSession({
        projectId,
        candidates: derivedCandidates,
      });
      applySessionPayload(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start calibration.");
    } finally {
      setLoading(false);
    }
  };

  const submitChoice = async (choice: CalibrationChoice) => {
    if (!session || !pair || !left || !right) return;
    setLoading(true);
    setError(null);
    try {
      const result = await submitCalibrationJudgment({
        sessionId: session.id,
        pairId: pair.id,
        choice,
        decidingFeatureIds: [
          ...pair.isolatedFeatureIds,
          ...selectedDimensions,
        ],
        leftFeatureIds: left.featureIds,
        rightFeatureIds: right.featureIds,
      });
      setUndoStack((s) => [...s, pair.id]);
      setLastUpdate({
        affectedFeatureIds: result.affectedFeatureIds,
        choice,
      });
      const answered = session.answeredQuestionCount + 1;
      const sessionCompleted =
        choice === "skip" || answered >= session.targetQuestionCount;

      setSession((s) =>
        s
          ? {
              ...s,
              answeredQuestionCount: answered,
              status: sessionCompleted ? "completed" : "active",
              completedAt: sessionCompleted ? Date.now() : s.completedAt,
            }
          : s,
      );
      if (user?.uid && choice !== "skip") {
        await compileAndSaveTasteModel({ userId: user.uid, projectId });
      }
      if (!sessionCompleted) {
        const next = await startCalibrationSession({
          projectId,
          candidates: derivedCandidates,
        });
        applySessionPayload(next);
      } else {
        setPair(null);
        setLeft(null);
        setRight(null);
      }
      setShowReasonSheet(false);
      setPendingChoice(null);
      setSelectedDimensions([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not record judgment.");
    } finally {
      setLoading(false);
    }
  };

  const handleChoice = (choice: CalibrationChoice) => {
    if (choice === "skip") {
      void submitChoice("skip");
      return;
    }
    setPendingChoice(choice);
    setShowReasonSheet(true);
  };

  const remaining =
    session != null
      ? Math.max(0, session.targetQuestionCount - session.answeredQuestionCount)
      : null;

  return (
    <div
      className="mx-auto flex min-h-[60vh] max-w-lg flex-col px-4 py-6"
      aria-label="Taste Calibration Lab"
    >
      <header className="mb-6 border-b border-mimi-hairline/50 pb-4">
        <p className="font-mono text-[10px] uppercase tracking-widest text-mimi-stone">
          Tailor · Calibration Lab
        </p>
        <h1 className="font-display text-2xl text-mimi-ink mt-1">
          Calibrate your taste model
        </h1>
        <p className="mt-2 text-sm text-mimi-stone">
          Compare pairs to reduce uncertainty. Skip creates no preference signal.
        </p>
      </header>

      {!session && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          {tasteLoadError ? (
            <>
              <p className="text-sm text-mimi-stone" role="alert">
                Could not load your taste model. This is usually temporary — retry
                before adding more evidence.
              </p>
              <p className="text-xs text-mimi-stone">{tasteModel.error}</p>
              <button
                type="button"
                onClick={() => void tasteModel.refresh()}
                disabled={tasteLoading}
                className="min-h-[44px] rounded border border-mimi-ink bg-mimi-ink px-6 py-3 text-sm text-mimi-field disabled:opacity-40"
              >
                {tasteLoading ? "Retrying…" : "Retry load"}
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-mimi-stone">
                {tasteLoading
                  ? "Loading your taste model…"
                  : derivedCandidates.length < 2
                    ? "Compile a taste model with at least two features first — run Evidence Intake, then return here."
                    : "Start a short calibration session. Questions are chosen by active learning, not random pairs."}
              </p>
              <button
                type="button"
                onClick={() => void beginSession()}
                disabled={loading || tasteLoading || derivedCandidates.length < 2}
                className="min-h-[44px] rounded border border-mimi-ink bg-mimi-ink px-6 py-3 text-sm text-mimi-field disabled:opacity-40"
              >
                {loading ? "Starting…" : "Begin calibration"}
              </button>
              {derivedCandidates.length < 2 && !tasteLoading && (
                <button
                  type="button"
                  onClick={() => navigate?.("/tailor/evidence")}
                  className="min-h-[44px] border border-mimi-hairline px-4 py-2 text-sm text-mimi-stone"
                >
                  Go to Evidence Intake
                </button>
              )}
            </>
          )}
        </div>
      )}

      {session && session.status !== "completed" && !pair && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <p className="text-sm text-mimi-stone">
            {loading
              ? "Preparing the next comparison…"
              : "No more unique pairs remain for this session."}
          </p>
        </div>
      )}

      {session && session.status !== "completed" && pair && left && right && (
        <div className="flex flex-1 flex-col gap-4">
          <div
            className="flex items-center justify-between text-xs text-mimi-stone"
            aria-live="polite"
          >
            <span>
              Question {session.answeredQuestionCount + 1} of{" "}
              {session.targetQuestionCount}
            </span>
            {remaining != null && <span>{remaining} remaining</span>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <CandidateCard side="A" candidate={left} />
            <CandidateCard side="B" candidate={right} />
          </div>

          <div
            className="grid grid-cols-2 gap-2 sm:grid-cols-3"
            role="group"
            aria-label="Preference choice"
          >
            <ChoiceButton label="More A" onClick={() => handleChoice("left")} disabled={loading} />
            <ChoiceButton label="More B" onClick={() => handleChoice("right")} disabled={loading} />
            <ChoiceButton label="Both" onClick={() => handleChoice("both")} disabled={loading} />
            <ChoiceButton label="Neither" onClick={() => handleChoice("neither")} disabled={loading} />
            <ChoiceButton label="Skip" onClick={() => handleChoice("skip")} disabled={loading} variant="muted" />
          </div>

          {pair.selectionReason && (
            <p className="text-xs text-mimi-stone">
              Why this pair: {pair.selectionReason.replace(/_/g, " ")} · expected
              information gain {(pair.expectedInformationGain * 100).toFixed(0)}%
            </p>
          )}

          {lastUpdate && (
            <aside
              className="rounded border border-mimi-hairline/60 bg-mimi-field/80 p-3 text-sm"
              aria-label="Model update summary"
            >
              <p className="font-medium text-mimi-ink">What changed</p>
              <p className="mt-1 text-mimi-stone">
                Choice: {lastUpdate.choice}. Features affected:{" "}
                {lastUpdate.affectedFeatureIds.length > 0
                  ? lastUpdate.affectedFeatureIds.join(", ")
                  : "none (skip or insufficient signal)"}
              </p>
            </aside>
          )}
        </div>
      )}

      {session?.status === "completed" && (
        <div className="mt-6 rounded border border-mimi-olive/30 bg-mimi-field p-4 text-center">
          <p className="font-display text-lg text-mimi-ink">Session complete</p>
          <p className="mt-1 text-sm text-mimi-stone">
            Your model was updated from explicit judgments. No percentage meter —
            check the pattern graph for confidence changes.
          </p>
          <button
            type="button"
            className="mt-4 min-h-[44px] border border-mimi-hairline px-4 py-2 text-sm"
            onClick={() => navigate?.("/tailor/diagnostics")}
          >
            Review in Diagnostics
          </button>
        </div>
      )}

      {showReasonSheet && pendingChoice && (
        <div
          className="fixed inset-x-0 bottom-0 z-50 max-h-[70vh] overflow-y-auto rounded-t-lg border border-mimi-hairline bg-mimi-field p-4 shadow-lg"
          role="dialog"
          aria-label="What made the difference?"
        >
          <p className="font-display text-lg text-mimi-ink">What made the difference?</p>
          <p className="text-xs text-mimi-stone mb-3">Optional — helps isolate features.</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {DECIDING_DIMENSIONS.map((dim) => {
              const on = selectedDimensions.includes(dim);
              return (
                <button
                  key={dim}
                  type="button"
                  onClick={() =>
                    setSelectedDimensions((d) =>
                      on ? d.filter((x) => x !== dim) : [...d, dim],
                    )
                  }
                  className={`min-h-[40px] rounded border px-3 py-2 text-xs capitalize ${
                    on
                      ? "border-mimi-cobalt bg-mimi-cobalt/10 text-mimi-ink"
                      : "border-mimi-hairline text-mimi-stone"
                  }`}
                >
                  {dim}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="flex-1 min-h-[44px] border border-mimi-ink bg-mimi-ink text-mimi-field text-sm"
              onClick={() => void submitChoice(pendingChoice)}
              disabled={loading}
            >
              Confirm
            </button>
            <button
              type="button"
              className="min-h-[44px] border border-mimi-hairline px-4 text-sm"
              onClick={() => {
                setShowReasonSheet(false);
                setPendingChoice(null);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-4 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {undoStack.length > 0 && (
        <p className="mt-2 text-[10px] text-mimi-stone">
          Undo via model edit history ({undoStack.length} judgments this session).
        </p>
      )}
    </div>
  );
};

function CandidateCard({
  side,
  candidate,
}: {
  side: "A" | "B";
  candidate: CalibrationCandidateInput;
}) {
  return (
    <article
      className="flex min-h-[120px] flex-col justify-between rounded border border-mimi-hairline/70 bg-mimi-field p-4"
      aria-label={`Candidate ${side}`}
    >
      <span className="font-mono text-[10px] uppercase tracking-widest text-mimi-stone">
        {side}
      </span>
      <p className="font-display text-lg text-mimi-ink mt-2">
        {candidate.label ?? candidate.id}
      </p>
      {candidate.featureIds.length > 0 && (
        <p className="mt-2 text-[10px] text-mimi-stone">
          {candidate.featureIds.length} linked feature
          {candidate.featureIds.length === 1 ? "" : "s"}
        </p>
      )}
    </article>
  );
}

function ChoiceButton({
  label,
  onClick,
  disabled,
  variant = "default",
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: "default" | "muted";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`min-h-[48px] rounded border px-3 py-3 text-sm font-medium touch-manipulation ${
        variant === "muted"
          ? "border-mimi-hairline text-mimi-stone"
          : "border-mimi-ink/30 text-mimi-ink active:bg-mimi-ink/5"
      } disabled:opacity-40`}
    >
      {label}
    </button>
  );
}

export default CalibrationLab;
