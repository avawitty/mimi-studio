import { and, desc, eq, inArray } from "drizzle-orm";
import type { TasteCalibrationRepository } from "../../../domain/tasteCalibration/repository.js";
import type {
  CreateCalibrationPairInput,
  CreateCalibrationSessionInput,
  CreatePairwiseJudgmentInput,
  SessionJudgmentHistory,
  TasteCalibrationSessionRecord,
  UpdateSessionSnapshotInput,
} from "../../../domain/tasteCalibration/types.js";
import type { NeonRepositoryDatabase } from "./connection.js";
import {
  mapJudgmentRow,
  mapPairRow,
  mapSessionRow,
} from "./tasteCalibrationMappers.js";
import {
  tasteCalibrationPairs,
  tasteCalibrationSessions,
  tastePairwiseJudgments,
} from "./schema.js";

export class NeonTasteCalibrationRepository implements TasteCalibrationRepository {
  constructor(private readonly db: NeonRepositoryDatabase) {}

  async createSession(
    input: CreateCalibrationSessionInput,
  ): Promise<TasteCalibrationSessionRecord> {
    const [row] = await this.db
      .insert(tasteCalibrationSessions)
      .values({
        id: input.id,
        ownerId: input.ownerId,
        workspaceId: input.workspaceId ?? null,
        projectId: input.projectId ?? null,
        targetQuestionCount: input.targetQuestionCount,
        seed: input.seed,
        algorithmVersion: input.algorithmVersion,
        baselineSnapshotId: input.baselineSnapshotId ?? null,
        scope: input.scope,
        status: "active",
        answeredCount: 0,
      })
      .returning();
    if (!row) throw new Error("Calibration session could not be created.");
    return mapSessionRow(row);
  }

  async getSession(
    sessionId: string,
    ownerId: string,
  ): Promise<TasteCalibrationSessionRecord | null> {
    const [row] = await this.db
      .select()
      .from(tasteCalibrationSessions)
      .where(
        and(
          eq(tasteCalibrationSessions.id, sessionId),
          eq(tasteCalibrationSessions.ownerId, ownerId),
        ),
      )
      .limit(1);
    return row ? mapSessionRow(row) : null;
  }

  async getActiveSession(
    ownerId: string,
    projectId?: string,
  ): Promise<TasteCalibrationSessionRecord | null> {
    const conditions = [
      eq(tasteCalibrationSessions.ownerId, ownerId),
      inArray(tasteCalibrationSessions.status, ["active", "paused"]),
    ];
    if (projectId) {
      conditions.push(eq(tasteCalibrationSessions.projectId, projectId));
    }
    const [row] = await this.db
      .select()
      .from(tasteCalibrationSessions)
      .where(and(...conditions))
      .orderBy(desc(tasteCalibrationSessions.updatedAt))
      .limit(1);
    return row ? mapSessionRow(row) : null;
  }

  async updateSessionSnapshot(
    input: UpdateSessionSnapshotInput,
  ): Promise<TasteCalibrationSessionRecord> {
    const [row] = await this.db
      .update(tasteCalibrationSessions)
      .set({
        currentSnapshotId: input.currentSnapshotId,
        currentModelState: input.currentModelState as unknown as Record<string, unknown>,
        answeredCount: input.answeredCount,
        status: input.status,
        completedAt: input.completedAt ? new Date(input.completedAt) : undefined,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(tasteCalibrationSessions.id, input.sessionId),
          eq(tasteCalibrationSessions.ownerId, input.ownerId),
        ),
      )
      .returning();
    if (!row) throw new Error("Calibration session not found.");
    return mapSessionRow(row);
  }

  async completeSession(
    sessionId: string,
    ownerId: string,
    completedAt: number,
  ): Promise<TasteCalibrationSessionRecord> {
    const [row] = await this.db
      .update(tasteCalibrationSessions)
      .set({
        status: "completed",
        completedAt: new Date(completedAt),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(tasteCalibrationSessions.id, sessionId),
          eq(tasteCalibrationSessions.ownerId, ownerId),
        ),
      )
      .returning();
    if (!row) throw new Error("Calibration session not found.");
    return mapSessionRow(row);
  }

  async pauseSession(
    sessionId: string,
    ownerId: string,
  ): Promise<TasteCalibrationSessionRecord> {
    const [row] = await this.db
      .update(tasteCalibrationSessions)
      .set({ status: "paused", updatedAt: new Date() })
      .where(
        and(
          eq(tasteCalibrationSessions.id, sessionId),
          eq(tasteCalibrationSessions.ownerId, ownerId),
        ),
      )
      .returning();
    if (!row) throw new Error("Calibration session not found.");
    return mapSessionRow(row);
  }

  async createPair(input: CreateCalibrationPairInput, ownerId: string) {
    const [row] = await this.db
      .insert(tasteCalibrationPairs)
      .values({
        id: input.id,
        sessionId: input.sessionId,
        ownerId,
        pairIndex: input.pairIndex,
        leftCandidateId: input.leftCandidateId,
        rightCandidateId: input.rightCandidateId,
        isolatedFeatureIds: input.isolatedFeatureIds,
        selectionReason: input.selectionReason,
        predictedLeftPreference: String(input.predictedLeftPreference),
        expectedInformationGain: String(input.expectedInformationGain),
        askedAt: new Date(input.askedAt),
      })
      .returning();
    if (!row) throw new Error("Calibration pair could not be created.");
    return mapPairRow(row);
  }

  async getPair(pairId: string, ownerId: string) {
    const [row] = await this.db
      .select()
      .from(tasteCalibrationPairs)
      .where(
        and(
          eq(tasteCalibrationPairs.id, pairId),
          eq(tasteCalibrationPairs.ownerId, ownerId),
        ),
      )
      .limit(1);
    return row ? mapPairRow(row) : null;
  }

  async markPairAnswered(
    pairId: string,
    ownerId: string,
    answeredAt: number,
  ): Promise<void> {
    await this.db
      .update(tasteCalibrationPairs)
      .set({ answeredAt: new Date(answeredAt) })
      .where(
        and(
          eq(tasteCalibrationPairs.id, pairId),
          eq(tasteCalibrationPairs.ownerId, ownerId),
        ),
      );
  }

  async createJudgment(input: CreatePairwiseJudgmentInput) {
    const [row] = await this.db
      .insert(tastePairwiseJudgments)
      .values({
        id: input.id,
        sessionId: input.sessionId,
        pairId: input.pairId,
        ownerId: input.ownerId,
        choice: input.choice,
        decidingFeatureIds: input.decidingFeatureIds,
        correctionNote: input.correctionNote ?? null,
        scope: input.scope,
        projectId: input.projectId ?? null,
        answeredAt: new Date(input.answeredAt),
      })
      .returning();
    if (!row) throw new Error("Pairwise judgment could not be created.");
    return mapJudgmentRow(row);
  }

  async getSessionHistory(
    sessionId: string,
    ownerId: string,
  ): Promise<SessionJudgmentHistory> {
    const pairRows = await this.db
      .select()
      .from(tasteCalibrationPairs)
      .where(
        and(
          eq(tasteCalibrationPairs.sessionId, sessionId),
          eq(tasteCalibrationPairs.ownerId, ownerId),
        ),
      )
      .orderBy(tasteCalibrationPairs.pairIndex);

    const judgmentRows = await this.db
      .select()
      .from(tastePairwiseJudgments)
      .where(
        and(
          eq(tastePairwiseJudgments.sessionId, sessionId),
          eq(tastePairwiseJudgments.ownerId, ownerId),
        ),
      )
      .orderBy(tastePairwiseJudgments.answeredAt);

    return {
      pairs: pairRows.map(mapPairRow),
      judgments: judgmentRows.map(mapJudgmentRow),
    };
  }

  async deleteLastJudgment(sessionId: string, ownerId: string) {
    const [lastJudgment] = await this.db
      .select()
      .from(tastePairwiseJudgments)
      .where(
        and(
          eq(tastePairwiseJudgments.sessionId, sessionId),
          eq(tastePairwiseJudgments.ownerId, ownerId),
        ),
      )
      .orderBy(desc(tastePairwiseJudgments.answeredAt))
      .limit(1);

    if (!lastJudgment) return null;

    const pair = await this.getPair(lastJudgment.pairId, ownerId);
    if (!pair) return null;

    await this.db
      .delete(tastePairwiseJudgments)
      .where(eq(tastePairwiseJudgments.id, lastJudgment.id));

    await this.db
      .update(tasteCalibrationPairs)
      .set({ answeredAt: null })
      .where(eq(tasteCalibrationPairs.id, pair.id));

    return {
      judgment: mapJudgmentRow(lastJudgment),
      pair,
    };
  }
}
