import { randomUUID } from "node:crypto";
import type { TasteCalibrationRepository } from "../../domain/tasteCalibration/repository.js";
import type {
  CalibrationPairResponse,
  CalibrationSessionSummary,
  TasteCalibrationSession,
} from "../../lib/tasteCalibration/contracts.js";
import type { TasteModelSnapshot } from "../../lib/tasteModel/contracts.js";
import {
  applyPairwiseJudgment,
  buildCalibrationCandidates,
  CALIBRATION_ALGORITHM_VERSION,
  computeModelDelta,
  DEFAULT_TARGET_QUESTION_COUNT,
  rankedPairToCalibrationPair,
  selectCalibrationPair,
  stablePairKey,
} from "../../lib/tasteCalibration/index.js";
import type { CalibrationCandidate } from "../../lib/tasteCalibration/contracts.js";
import type { EvidenceNode, Observation } from "../../types.js";

export interface TasteCalibrationServiceDeps {
  repository: TasteCalibrationRepository;
  loadEvidence: (userId: string, projectId: string) => Promise<EvidenceNode[]>;
  loadObservations: (userId: string, projectId: string) => Promise<Observation[]>;
  loadBaseSnapshot: (
    userId: string,
    projectId?: string,
  ) => Promise<TasteModelSnapshot | null>;
}

function toCandidateView(candidate: CalibrationCandidate) {
  return {
    id: candidate.id,
    label: candidate.label,
    imageUrl: candidate.imageUrl,
    altText: candidate.altText,
    featureIds: candidate.featureIds,
    featureLabels: candidate.featureLabels,
  };
}

function assertOwner<T extends { ownerId: string }>(
  record: T | null,
  ownerId: string,
): T {
  if (!record || record.ownerId !== ownerId) {
    const error = new Error("Calibration session not found or access denied.");
    (error as { status?: number; code?: string }).status = 404;
    (error as { code?: string }).code = "SESSION_ACCESS_DENIED";
    throw error;
  }
  return record;
}

export class TasteCalibrationService {
  constructor(private readonly deps: TasteCalibrationServiceDeps) {}

  async createSession(input: {
    ownerId: string;
    projectId?: string;
    workspaceId?: string;
    targetQuestionCount?: number;
    scope?: "persistent" | "project" | "session";
    seed?: string;
  }): Promise<{ session: TasteCalibrationSession; pair: CalibrationPairResponse }> {
    if (!input.projectId) {
      const error = new Error("A projectId is required for taste calibration.");
      (error as { status?: number }).status = 400;
      throw error;
    }

    const evidence = await this.deps.loadEvidence(input.ownerId, input.projectId);
    const observations = await this.deps.loadObservations(
      input.ownerId,
      input.projectId,
    );
    const candidates = buildCalibrationCandidates(evidence, observations);
    if (candidates.length < 2) {
      const error = new Error(
        "At least two analyzed references are required to start calibration.",
      );
      (error as { status?: number }).status = 400;
      throw error;
    }

    const baseSnapshot = await this.deps.loadBaseSnapshot(
      input.ownerId,
      input.projectId,
    );
    const sessionId = randomUUID();
    const seed = input.seed ?? `${input.ownerId}:${input.projectId}:${Date.now()}`;

    const session = await this.deps.repository.createSession({
      id: sessionId,
      ownerId: input.ownerId,
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      targetQuestionCount: input.targetQuestionCount ?? DEFAULT_TARGET_QUESTION_COUNT,
      seed,
      algorithmVersion: CALIBRATION_ALGORITHM_VERSION,
      baselineSnapshotId: baseSnapshot?.id,
      scope: input.scope ?? "project",
    });

    const pair = await this.generateNextPair(session, candidates, baseSnapshot);
    return { session, pair };
  }

  async getSession(sessionId: string, ownerId: string) {
    const session = await this.deps.repository.getSession(sessionId, ownerId);
    return assertOwner(session, ownerId);
  }

  async getNextPair(
    sessionId: string,
    ownerId: string,
  ): Promise<CalibrationPairResponse> {
    const session = assertOwner(
      await this.deps.repository.getSession(sessionId, ownerId),
      ownerId,
    );
    if (session.status === "completed") {
      const error = new Error("Calibration session is already complete.");
      (error as { status?: number }).status = 400;
      throw error;
    }
    if (!session.projectId) {
      const error = new Error("Session is missing project scope.");
      (error as { status?: number }).status = 400;
      throw error;
    }

    const evidence = await this.deps.loadEvidence(ownerId, session.projectId);
    const observations = await this.deps.loadObservations(ownerId, session.projectId);
    const candidates = buildCalibrationCandidates(evidence, observations);
    const model =
      (session.currentModelState as TasteModelSnapshot | null) ??
      (await this.deps.loadBaseSnapshot(ownerId, session.projectId));

    return this.generateNextPair(session, candidates, model);
  }

  private async generateNextPair(
    session: TasteCalibrationSession & { currentModelState?: TasteModelSnapshot | null },
    candidates: CalibrationCandidate[],
    model: TasteModelSnapshot | null,
  ): Promise<CalibrationPairResponse> {
    const history = await this.deps.repository.getSessionHistory(
      session.id,
      session.ownerId,
    );

    const askedPairKeys = new Set(
      history.pairs.map((p) =>
        stablePairKey(p.leftCandidateId, p.rightCandidateId),
      ),
    );
    const featureAskCounts = new Map<string, number>();
    for (const pair of history.pairs) {
      for (const featureId of pair.isolatedFeatureIds) {
        featureAskCounts.set(featureId, (featureAskCounts.get(featureId) ?? 0) + 1);
      }
    }

    const ranked = selectCalibrationPair({
      seed: session.seed,
      pairIndex: history.pairs.length,
      askedPairKeys,
      featureAskCounts,
      model,
      candidates,
    });

    if (!ranked) {
      const error = new Error("No more informative calibration pairs available.");
      (error as { status?: number }).status = 400;
      throw error;
    }

    const pairId = randomUUID();
    const askedAt = Date.now();
    const pair = await this.deps.repository.createPair(
      rankedPairToCalibrationPair(
        ranked,
        session.id,
        history.pairs.length,
        pairId,
        askedAt,
      ),
      session.ownerId,
    );

    return {
      pair,
      left: toCandidateView(ranked.left),
      right: toCandidateView(ranked.right),
      sessionProgress: {
        answered: session.answeredCount,
        target: session.targetQuestionCount,
        remaining: Math.max(0, session.targetQuestionCount - session.answeredCount),
      },
    };
  }

  async submitJudgment(input: {
    ownerId: string;
    sessionId: string;
    pairId: string;
    choice: "left" | "right" | "both" | "neither" | "skip";
    decidingFeatureIds?: string[];
    correctionNote?: string;
  }) {
    const session = assertOwner(
      await this.deps.repository.getSession(input.sessionId, input.ownerId),
      input.ownerId,
    );
    if (session.status === "completed") {
      const error = new Error("Calibration session is already complete.");
      (error as { status?: number }).status = 400;
      throw error;
    }

    const pair = await this.deps.repository.getPair(input.pairId, input.ownerId);
    if (!pair || pair.sessionId !== session.id) {
      const error = new Error("Calibration pair not found.");
      (error as { status?: number }).status = 404;
      throw error;
    }
    if (pair.answeredAt) {
      const error = new Error("This pair has already been answered.");
      (error as { status?: number }).status = 400;
      throw error;
    }

    if (!session.projectId) {
      const error = new Error("Session is missing project scope.");
      (error as { status?: number }).status = 400;
      throw error;
    }

    const evidence = await this.deps.loadEvidence(input.ownerId, session.projectId);
    const observations = await this.deps.loadObservations(
      input.ownerId,
      session.projectId,
    );
    const candidates = buildCalibrationCandidates(evidence, observations);
    const left = candidates.find((c) => c.id === pair.leftCandidateId);
    const right = candidates.find((c) => c.id === pair.rightCandidateId);
    if (!left || !right) {
      const error = new Error("Calibration candidates are no longer available.");
      (error as { status?: number }).status = 400;
      throw error;
    }

    const previousModel =
      (session.currentModelState as TasteModelSnapshot | null) ??
      (await this.deps.loadBaseSnapshot(input.ownerId, session.projectId));

    const answeredAt = Date.now();
    const judgment = await this.deps.repository.createJudgment({
      id: randomUUID(),
      sessionId: session.id,
      pairId: pair.id,
      ownerId: input.ownerId,
      choice: input.choice,
      decidingFeatureIds: input.decidingFeatureIds ?? [],
      correctionNote: input.correctionNote,
      scope: session.scope,
      projectId: session.projectId,
      answeredAt,
    });

    await this.deps.repository.markPairAnswered(pair.id, input.ownerId, answeredAt);

    const nextModel = applyPairwiseJudgment(
      previousModel,
      pair,
      judgment,
      left,
      right,
    );
    const modelDelta = computeModelDelta(previousModel, nextModel);
    const answeredCount = session.answeredCount + 1;
    const sessionComplete = answeredCount >= session.targetQuestionCount;

    const updatedSession = await this.deps.repository.updateSessionSnapshot({
      sessionId: session.id,
      ownerId: input.ownerId,
      currentSnapshotId: nextModel.id,
      currentModelState: nextModel,
      answeredCount,
      status: sessionComplete ? "completed" : "active",
      completedAt: sessionComplete ? answeredAt : undefined,
    });

    let nextPair: CalibrationPairResponse | undefined;
    if (!sessionComplete) {
      nextPair = await this.generateNextPair(
        updatedSession,
        candidates,
        nextModel,
      );
    }

    return {
      judgment,
      modelDelta,
      session: updatedSession,
      nextPair,
      sessionComplete,
    };
  }

  async completeSession(sessionId: string, ownerId: string) {
    const session = assertOwner(
      await this.deps.repository.getSession(sessionId, ownerId),
      ownerId,
    );
    const completed = await this.deps.repository.completeSession(
      sessionId,
      ownerId,
      Date.now(),
    );
    return this.buildSessionSummary(completed);
  }

  async pauseSession(sessionId: string, ownerId: string) {
    return this.deps.repository.pauseSession(sessionId, ownerId);
  }

  async undoLastJudgment(sessionId: string, ownerId: string) {
    const session = assertOwner(
      await this.deps.repository.getSession(sessionId, ownerId),
      ownerId,
    );
    const undone = await this.deps.repository.deleteLastJudgment(sessionId, ownerId);
    if (!undone) return null;

    const answeredCount = Math.max(0, session.answeredCount - 1);
    const updated = await this.deps.repository.updateSessionSnapshot({
      sessionId,
      ownerId,
      currentSnapshotId: session.baselineSnapshotId ?? session.currentSnapshotId ?? "",
      currentModelState:
        (session.currentModelState as TasteModelSnapshot) ??
        ({} as TasteModelSnapshot),
      answeredCount,
      status: "active",
    });

    return { session: updated, undone };
  }

  async buildSessionSummary(
    session: TasteCalibrationSession & { currentModelState?: TasteModelSnapshot | null },
  ): Promise<CalibrationSessionSummary> {
    const model = session.currentModelState as TasteModelSnapshot | null;
    const weights = model?.featureWeights ?? [];

    const strongestConfirmed = [...weights]
      .filter((f) => f.signedWeight > 0.1)
      .sort((a, b) => b.signedWeight - a.signedWeight)
      .slice(0, 3)
      .map((f) => ({ featureId: f.featureId, label: f.label, weight: f.signedWeight }));

    const strongestRefusals = [...weights]
      .filter((f) => f.signedWeight < -0.1)
      .sort((a, b) => a.signedWeight - b.signedWeight)
      .slice(0, 3)
      .map((f) => ({ featureId: f.featureId, label: f.label, weight: f.signedWeight }));

    const remainingUncertainties = (model?.diagnostics.lowConfidenceFeatureIds ?? [])
      .slice(0, 3)
      .map((id: string) => {
        const fw = weights.find((f) => f.featureId === id);
        return { featureId: id, label: fw?.label ?? id.replace("tag:", "") };
      });

    return {
      session,
      strongestConfirmed,
      strongestRefusals,
      remainingUncertainties,
    };
  }
}
