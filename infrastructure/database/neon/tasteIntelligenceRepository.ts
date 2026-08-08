import { randomUUID } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import type { TasteIntelligenceRepository } from "../../../domain/tasteIntelligence/repository.js";
import type {
  CreateCalibrationSessionInput,
  RecordJudgmentInput,
  TasteLearningEventRow,
  TasteModelSnapshotRow,
} from "../../../domain/tasteIntelligence/repository.js";
import type { NormalizedTasteEvent, TasteModelSnapshot } from "../../../lib/tasteModel/contracts.js";
import {
  collaborativeTasteContractSchema,
  culturalPositioningReportSchema,
  savedReasonHypothesisSchema,
  sentinelMemoryPolicySchema,
  tasteCalibrationPairSchema,
  tasteCalibrationSessionSchema,
  tasteCritiqueSchema,
  tasteEvaluationEventSchema,
  tasteExperimentSchema,
  tasteExposureEventSchema,
  tasteGenerationContractSchema,
  tasteModelEditSchema,
  tastePairwiseJudgmentSchema,
  tastePassportSchema,
  tasteRefusalSchema,
  type CollaborativeTasteContract,
  type CulturalPositioningReport,
  type SavedReasonHypothesis,
  type SentinelMemoryPolicy,
  type TasteCalibrationPair,
  type TasteCalibrationSession,
  type TasteCritique,
  type TasteEvaluationEvent,
  type TasteExperiment,
  type TasteExposureEvent,
  type TasteGenerationContract,
  type TasteModelEdit,
  type TastePairwiseJudgment,
  type TastePassport,
  type TasteRefusal,
} from "../../../schemas/tasteIntelligenceContracts.js";
import type { NeonRepositoryDatabase } from "./connection.js";
import {
  collaborativeTasteContracts,
  culturalPositioningReports,
  legacyRecordMap,
  savedReasonHypotheses,
  sentinelMemoryPolicies,
  tasteCalibrationPairs,
  tasteCalibrationSessions,
  tasteCritiques,
  tasteEvaluationEvents,
  tasteExperiments,
  tasteExposureEvents,
  tasteGenerationContracts,
  tasteLearningEvents,
  tasteModelEdits,
  tasteModelSnapshots,
  tastePairwiseJudgments,
  tastePassports,
  tasteRefusals,
} from "./schema.js";

function mapLearningEventRow(row: typeof tasteLearningEvents.$inferSelect): TasteLearningEventRow {
  return {
    id: row.id,
    ownerId: row.ownerId,
    workspaceId: row.workspaceId,
    projectId: row.projectId,
    event: row.eventPayload as unknown as NormalizedTasteEvent,
    idempotencyKey: row.idempotencyKey,
    occurredAt: row.occurredAt,
    createdAt: row.createdAt,
  };
}

function mapSnapshotRow(row: typeof tasteModelSnapshots.$inferSelect): TasteModelSnapshotRow {
  return {
    id: row.id,
    ownerId: row.ownerId,
    workspaceId: row.workspaceId,
    projectId: row.projectId,
    scope: row.scope as "global" | "project",
    schemaVersion: row.schemaVersion,
    modelVersion: row.modelVersion,
    snapshot: row.snapshotPayload as unknown as TasteModelSnapshot,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class NeonTasteIntelligenceRepository implements TasteIntelligenceRepository {
  constructor(
    private readonly db: NeonRepositoryDatabase,
    private readonly transactional: boolean,
  ) {}

  private requireTransaction(): void {
    if (!this.transactional) {
      throw new Error("Taste intelligence mutations require a UnitOfWork transaction.");
    }
  }

  async upsertLearningEvent(
    ownerId: string,
    event: NormalizedTasteEvent,
    idempotencyKey?: string,
  ): Promise<TasteLearningEventRow> {
    this.requireTransaction();
    const key = idempotencyKey ?? event.dedupeKey ?? event.id;
    const [row] = await this.db
      .insert(tasteLearningEvents)
      .values({
        id: event.id,
        ownerId,
        projectId: event.projectId ?? null,
        eventPayload: event as unknown as Record<string, unknown>,
        idempotencyKey: key,
        occurredAt: new Date(event.occurredAt),
      })
      .onConflictDoNothing()
      .returning();
    if (row) return mapLearningEventRow(row);
    const [existing] = await this.db
      .select()
      .from(tasteLearningEvents)
      .where(
        and(
          eq(tasteLearningEvents.ownerId, ownerId),
          eq(tasteLearningEvents.idempotencyKey, key),
        ),
      )
      .limit(1);
    if (!existing) throw new Error("Learning event could not be stored.");
    return mapLearningEventRow(existing);
  }

  async listLearningEvents(
    ownerId: string,
    opts?: { projectId?: string; limit?: number },
  ): Promise<TasteLearningEventRow[]> {
    const limit = opts?.limit ?? 500;
    const rows = await this.db
      .select()
      .from(tasteLearningEvents)
      .where(
        opts?.projectId
          ? and(
              eq(tasteLearningEvents.ownerId, ownerId),
              eq(tasteLearningEvents.projectId, opts.projectId),
            )
          : eq(tasteLearningEvents.ownerId, ownerId),
      )
      .orderBy(desc(tasteLearningEvents.occurredAt))
      .limit(limit);
    return rows.map(mapLearningEventRow);
  }

  async saveSnapshot(
    ownerId: string,
    snapshot: TasteModelSnapshot,
    opts?: { workspaceId?: string; projectId?: string },
  ): Promise<TasteModelSnapshotRow> {
    this.requireTransaction();
    const scope = snapshot.scope;
    const [row] = await this.db
      .insert(tasteModelSnapshots)
      .values({
        id: snapshot.id,
        ownerId,
        workspaceId: opts?.workspaceId ?? null,
        projectId: opts?.projectId ?? snapshot.projectId ?? null,
        scope,
        schemaVersion: snapshot.schemaVersion,
        modelVersion: snapshot.modelVersion,
        snapshotPayload: snapshot as unknown as Record<string, unknown>,
      })
      .onConflictDoUpdate({
        target: tasteModelSnapshots.id,
        set: {
          snapshotPayload: snapshot as unknown as Record<string, unknown>,
          schemaVersion: snapshot.schemaVersion,
          modelVersion: snapshot.modelVersion,
          updatedAt: sql`now()`,
        },
      })
      .returning();
    return mapSnapshotRow(row!);
  }

  async getLatestSnapshot(
    ownerId: string,
    scope: "global" | string,
  ): Promise<TasteModelSnapshotRow | null> {
    const normalizedScope = scope === "global" ? "global" : "project";
    const [row] = await this.db
      .select()
      .from(tasteModelSnapshots)
      .where(
        and(
          eq(tasteModelSnapshots.ownerId, ownerId),
          eq(tasteModelSnapshots.scope, normalizedScope),
          scope !== "global"
            ? eq(tasteModelSnapshots.projectId, scope)
            : sql`true`,
        ),
      )
      .orderBy(desc(tasteModelSnapshots.updatedAt))
      .limit(1);
    return row ? mapSnapshotRow(row) : null;
  }

  async findSnapshotById(
    ownerId: string,
    snapshotId: string,
  ): Promise<TasteModelSnapshotRow | null> {
    const [row] = await this.db
      .select()
      .from(tasteModelSnapshots)
      .where(
        and(
          eq(tasteModelSnapshots.ownerId, ownerId),
          eq(tasteModelSnapshots.id, snapshotId),
        ),
      )
      .limit(1);
    return row ? mapSnapshotRow(row) : null;
  }

  async createCalibrationSession(
    input: CreateCalibrationSessionInput,
  ): Promise<TasteCalibrationSession> {
    this.requireTransaction();
    const now = Date.now();
    const session: TasteCalibrationSession = {
      id: input.id,
      ownerId: input.ownerId,
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      modelSnapshotId: input.modelSnapshotId,
      status: "active",
      targetQuestionCount: input.targetQuestionCount,
      answeredQuestionCount: 0,
      startedAt: now,
      algorithmVersion: input.algorithmVersion,
      createdAt: now,
      updatedAt: now,
    };
    tasteCalibrationSessionSchema.parse(session);
    await this.db.insert(tasteCalibrationSessions).values({
      id: session.id,
      ownerId: session.ownerId,
      workspaceId: session.workspaceId ?? null,
      projectId: session.projectId ?? null,
      modelSnapshotId: session.modelSnapshotId,
      status: session.status,
      targetQuestionCount: session.targetQuestionCount,
      answeredQuestionCount: session.answeredQuestionCount,
      algorithmVersion: session.algorithmVersion,
      idempotencyKey: input.idempotencyKey,
      startedAt: new Date(session.startedAt),
      completedAt: null,
    });
    return session;
  }

  async getActiveCalibrationSession(
    ownerId: string,
    projectId?: string,
  ): Promise<TasteCalibrationSession | null> {
    const [row] = await this.db
      .select()
      .from(tasteCalibrationSessions)
      .where(
        and(
          eq(tasteCalibrationSessions.ownerId, ownerId),
          eq(tasteCalibrationSessions.status, "active"),
          projectId
            ? eq(tasteCalibrationSessions.projectId, projectId)
            : sql`true`,
        ),
      )
      .orderBy(desc(tasteCalibrationSessions.updatedAt))
      .limit(1);
    if (!row) return null;
    return tasteCalibrationSessionSchema.parse({
      id: row.id,
      ownerId: row.ownerId,
      workspaceId: row.workspaceId ?? undefined,
      projectId: row.projectId ?? undefined,
      modelSnapshotId: row.modelSnapshotId,
      status: row.status,
      targetQuestionCount: row.targetQuestionCount,
      answeredQuestionCount: row.answeredQuestionCount,
      startedAt: row.startedAt.getTime(),
      completedAt: row.completedAt?.getTime(),
      algorithmVersion: row.algorithmVersion,
      createdAt: row.createdAt.getTime(),
      updatedAt: row.updatedAt.getTime(),
    });
  }

  async updateCalibrationSession(
    session: TasteCalibrationSession,
  ): Promise<TasteCalibrationSession> {
    this.requireTransaction();
    tasteCalibrationSessionSchema.parse(session);
    await this.db
      .update(tasteCalibrationSessions)
      .set({
        status: session.status,
        answeredQuestionCount: session.answeredQuestionCount,
        completedAt: session.completedAt ? new Date(session.completedAt) : null,
        updatedAt: sql`now()`,
      })
      .where(eq(tasteCalibrationSessions.id, session.id));
    return { ...session, updatedAt: Date.now() };
  }

  async saveCalibrationPair(pair: TasteCalibrationPair): Promise<TasteCalibrationPair> {
    this.requireTransaction();
    tasteCalibrationPairSchema.parse(pair);
    await this.db.insert(tasteCalibrationPairs).values({
      id: pair.id,
      sessionId: pair.sessionId,
      pairPayload: pair as unknown as Record<string, unknown>,
      askedAt: new Date(pair.askedAt),
    });
    return pair;
  }

  async listCalibrationPairs(sessionId: string): Promise<TasteCalibrationPair[]> {
    const rows = await this.db
      .select()
      .from(tasteCalibrationPairs)
      .where(eq(tasteCalibrationPairs.sessionId, sessionId))
      .orderBy(desc(tasteCalibrationPairs.askedAt));
    return rows.map((r) =>
      tasteCalibrationPairSchema.parse(r.pairPayload),
    );
  }

  async recordPairwiseJudgment(
    input: RecordJudgmentInput,
  ): Promise<TastePairwiseJudgment> {
    this.requireTransaction();
    const judgment: TastePairwiseJudgment = {
      id: input.id,
      sessionId: input.sessionId,
      pairId: input.pairId,
      choice: input.choice,
      decidingFeatureIds: input.decidingFeatureIds,
      correctionNote: input.correctionNote,
      confidence: input.confidence,
      contextScope: input.contextScope,
      answeredAt: Date.now(),
    };
    tastePairwiseJudgmentSchema.parse(judgment);
    await this.db.insert(tastePairwiseJudgments).values({
      id: judgment.id,
      sessionId: judgment.sessionId,
      pairId: judgment.pairId,
      judgmentPayload: judgment as unknown as Record<string, unknown>,
      idempotencyKey: input.idempotencyKey,
      answeredAt: new Date(judgment.answeredAt),
    });
    return judgment;
  }

  async listJudgments(sessionId: string): Promise<TastePairwiseJudgment[]> {
    const rows = await this.db
      .select()
      .from(tastePairwiseJudgments)
      .where(eq(tastePairwiseJudgments.sessionId, sessionId))
      .orderBy(desc(tastePairwiseJudgments.answeredAt));
    return rows.map((r) =>
      tastePairwiseJudgmentSchema.parse(r.judgmentPayload),
    );
  }

  async upsertRefusal(refusal: TasteRefusal): Promise<TasteRefusal> {
    this.requireTransaction();
    tasteRefusalSchema.parse(refusal);
    await this.db
      .insert(tasteRefusals)
      .values({
        id: refusal.id,
        ownerId: refusal.ownerId,
        projectId: refusal.projectId ?? null,
        refusalPayload: refusal as unknown as Record<string, unknown>,
        status: refusal.status,
      })
      .onConflictDoUpdate({
        target: tasteRefusals.id,
        set: {
          refusalPayload: refusal as unknown as Record<string, unknown>,
          status: refusal.status,
          updatedAt: sql`now()`,
        },
      });
    return refusal;
  }

  async listActiveRefusals(
    ownerId: string,
    projectId?: string,
  ): Promise<TasteRefusal[]> {
    const rows = await this.db
      .select()
      .from(tasteRefusals)
      .where(
        and(
          eq(tasteRefusals.ownerId, ownerId),
          eq(tasteRefusals.status, "active"),
          projectId ? eq(tasteRefusals.projectId, projectId) : sql`true`,
        ),
      )
      .orderBy(desc(tasteRefusals.updatedAt));
    return rows.map((r) => tasteRefusalSchema.parse(r.refusalPayload));
  }

  async appendModelEdit(edit: TasteModelEdit): Promise<TasteModelEdit> {
    this.requireTransaction();
    tasteModelEditSchema.parse(edit);
    await this.db.insert(tasteModelEdits).values({
      id: edit.id,
      ownerId: edit.ownerId,
      projectId: edit.projectId ?? null,
      editPayload: edit as unknown as Record<string, unknown>,
    });
    return edit;
  }

  async listModelEdits(
    ownerId: string,
    opts?: { projectId?: string; limit?: number },
  ): Promise<TasteModelEdit[]> {
    const rows = await this.db
      .select()
      .from(tasteModelEdits)
      .where(
        opts?.projectId
          ? and(
              eq(tasteModelEdits.ownerId, ownerId),
              eq(tasteModelEdits.projectId, opts.projectId),
            )
          : eq(tasteModelEdits.ownerId, ownerId),
      )
      .orderBy(desc(tasteModelEdits.createdAt))
      .limit(opts?.limit ?? 100);
    return rows.map((r) => tasteModelEditSchema.parse(r.editPayload));
  }

  async saveGenerationContract(
    contract: TasteGenerationContract,
  ): Promise<TasteGenerationContract> {
    this.requireTransaction();
    tasteGenerationContractSchema.parse(contract);
    await this.db.insert(tasteGenerationContracts).values({
      id: contract.id,
      ownerId: contract.ownerId,
      workspaceId: contract.workspaceId ?? null,
      projectId: contract.projectId ?? null,
      contractPayload: contract as unknown as Record<string, unknown>,
      compiledAt: new Date(contract.compiledAt),
    });
    return contract;
  }

  async getGenerationContract(
    ownerId: string,
    contractId: string,
  ): Promise<TasteGenerationContract | null> {
    const [row] = await this.db
      .select()
      .from(tasteGenerationContracts)
      .where(
        and(
          eq(tasteGenerationContracts.ownerId, ownerId),
          eq(tasteGenerationContracts.id, contractId),
        ),
      )
      .limit(1);
    return row
      ? tasteGenerationContractSchema.parse(row.contractPayload)
      : null;
  }

  async saveCritique(ownerId: string, critique: TasteCritique): Promise<TasteCritique> {
    this.requireTransaction();
    tasteCritiqueSchema.parse(critique);
    await this.db.insert(tasteCritiques).values({
      id: critique.id,
      ownerId,
      contractId: critique.contractId,
      critiquePayload: critique as unknown as Record<string, unknown>,
    });
    return critique;
  }

  async recordExposureEvent(event: TasteExposureEvent): Promise<TasteExposureEvent> {
    this.requireTransaction();
    tasteExposureEventSchema.parse(event);
    await this.db.insert(tasteExposureEvents).values({
      id: event.id,
      ownerId: event.ownerId,
      projectId: event.projectId ?? null,
      eventPayload: event as unknown as Record<string, unknown>,
      occurredAt: new Date(event.occurredAt),
    });
    return event;
  }

  async listExposureEvents(
    ownerId: string,
    opts?: { projectId?: string; limit?: number },
  ): Promise<TasteExposureEvent[]> {
    const rows = await this.db
      .select()
      .from(tasteExposureEvents)
      .where(eq(tasteExposureEvents.ownerId, ownerId))
      .orderBy(desc(tasteExposureEvents.occurredAt))
      .limit(opts?.limit ?? 500);
    return rows.map((r) => tasteExposureEventSchema.parse(r.eventPayload));
  }

  async saveExperiment(experiment: TasteExperiment): Promise<TasteExperiment> {
    this.requireTransaction();
    tasteExperimentSchema.parse(experiment);
    await this.db
      .insert(tasteExperiments)
      .values({
        id: experiment.id,
        ownerId: experiment.ownerId,
        projectId: experiment.projectId ?? null,
        experimentPayload: experiment as unknown as Record<string, unknown>,
        status: experiment.status,
        completedAt: experiment.completedAt
          ? new Date(experiment.completedAt)
          : null,
      })
      .onConflictDoUpdate({
        target: tasteExperiments.id,
        set: {
          experimentPayload: experiment as unknown as Record<string, unknown>,
          status: experiment.status,
          completedAt: experiment.completedAt
            ? new Date(experiment.completedAt)
            : null,
        },
      });
    return experiment;
  }

  async listExperiments(
    ownerId: string,
    projectId?: string,
  ): Promise<TasteExperiment[]> {
    const rows = await this.db
      .select()
      .from(tasteExperiments)
      .where(
        projectId
          ? and(
              eq(tasteExperiments.ownerId, ownerId),
              eq(tasteExperiments.projectId, projectId),
            )
          : eq(tasteExperiments.ownerId, ownerId),
      )
      .orderBy(desc(tasteExperiments.createdAt));
    return rows.map((r) => tasteExperimentSchema.parse(r.experimentPayload));
  }

  async savePassport(passport: TastePassport): Promise<TastePassport> {
    this.requireTransaction();
    tastePassportSchema.parse(passport);
    await this.db
      .insert(tastePassports)
      .values({
        id: passport.id,
        ownerId: passport.ownerId,
        passportPayload: passport as unknown as Record<string, unknown>,
        visibility: passport.visibility,
        version: passport.version,
      })
      .onConflictDoUpdate({
        target: tastePassports.id,
        set: {
          passportPayload: passport as unknown as Record<string, unknown>,
          visibility: passport.visibility,
          version: passport.version,
          updatedAt: sql`now()`,
        },
      });
    return passport;
  }

  async listPassports(ownerId: string): Promise<TastePassport[]> {
    const rows = await this.db
      .select()
      .from(tastePassports)
      .where(eq(tastePassports.ownerId, ownerId))
      .orderBy(desc(tastePassports.updatedAt));
    return rows.map((r) => tastePassportSchema.parse(r.passportPayload));
  }

  async saveCollaborativeContract(
    contract: CollaborativeTasteContract,
  ): Promise<CollaborativeTasteContract> {
    this.requireTransaction();
    collaborativeTasteContractSchema.parse(contract);
    await this.db
      .insert(collaborativeTasteContracts)
      .values({
        id: contract.id,
        workspaceId: contract.workspaceId,
        projectId: contract.projectId ?? null,
        contractPayload: contract as unknown as Record<string, unknown>,
        version: contract.version,
      })
      .onConflictDoUpdate({
        target: collaborativeTasteContracts.id,
        set: {
          contractPayload: contract as unknown as Record<string, unknown>,
          version: contract.version,
          updatedAt: sql`now()`,
        },
      });
    return contract;
  }

  async getCollaborativeContract(
    workspaceId: string,
    contractId: string,
  ): Promise<CollaborativeTasteContract | null> {
    const [row] = await this.db
      .select()
      .from(collaborativeTasteContracts)
      .where(
        and(
          eq(collaborativeTasteContracts.workspaceId, workspaceId),
          eq(collaborativeTasteContracts.id, contractId),
        ),
      )
      .limit(1);
    return row
      ? collaborativeTasteContractSchema.parse(row.contractPayload)
      : null;
  }

  async saveCulturalReport(
    report: CulturalPositioningReport,
  ): Promise<CulturalPositioningReport> {
    this.requireTransaction();
    culturalPositioningReportSchema.parse(report);
    await this.db.insert(culturalPositioningReports).values({
      id: report.id,
      ownerId: report.ownerId,
      reportPayload: report as unknown as Record<string, unknown>,
    });
    return report;
  }

  async recordEvaluationEvent(
    event: TasteEvaluationEvent,
  ): Promise<TasteEvaluationEvent> {
    this.requireTransaction();
    tasteEvaluationEventSchema.parse(event);
    await this.db.insert(tasteEvaluationEvents).values({
      id: event.id,
      ownerId: event.ownerId,
      workspaceId: event.workspaceId ?? null,
      projectId: event.projectId ?? null,
      evaluationType: event.evaluationType,
      eventPayload: event as unknown as Record<string, unknown>,
      modelVersion: event.modelVersion,
      occurredAt: new Date(event.occurredAt),
    });
    return event;
  }

  async saveSavedReasonHypothesis(
    ownerId: string,
    hypothesis: SavedReasonHypothesis,
  ): Promise<SavedReasonHypothesis> {
    this.requireTransaction();
    savedReasonHypothesisSchema.parse(hypothesis);
    await this.db.insert(savedReasonHypotheses).values({
      id: hypothesis.id,
      ownerId,
      artifactId: hypothesis.artifactId,
      hypothesisPayload: hypothesis as unknown as Record<string, unknown>,
      userStatus: hypothesis.userStatus,
    });
    return hypothesis;
  }

  async upsertSavedReasonHypothesis(
    ownerId: string,
    hypothesis: SavedReasonHypothesis,
  ): Promise<SavedReasonHypothesis> {
    this.requireTransaction();
    savedReasonHypothesisSchema.parse(hypothesis);
    await this.db
      .insert(savedReasonHypotheses)
      .values({
        id: hypothesis.id,
        ownerId,
        artifactId: hypothesis.artifactId,
        hypothesisPayload: hypothesis as unknown as Record<string, unknown>,
        userStatus: hypothesis.userStatus,
      })
      .onConflictDoUpdate({
        target: savedReasonHypotheses.id,
        set: {
          hypothesisPayload: hypothesis as unknown as Record<string, unknown>,
          userStatus: hypothesis.userStatus,
        },
      });
    return hypothesis;
  }

  async listSavedReasonHypotheses(
    ownerId: string,
    artifactId?: string,
  ): Promise<SavedReasonHypothesis[]> {
    const rows = await this.db
      .select()
      .from(savedReasonHypotheses)
      .where(
        artifactId
          ? and(
              eq(savedReasonHypotheses.ownerId, ownerId),
              eq(savedReasonHypotheses.artifactId, artifactId),
            )
          : eq(savedReasonHypotheses.ownerId, ownerId),
      )
      .orderBy(desc(savedReasonHypotheses.createdAt));
    return rows.map((r) =>
      savedReasonHypothesisSchema.parse(r.hypothesisPayload),
    );
  }

  async upsertSentinelPolicy(
    policy: SentinelMemoryPolicy,
  ): Promise<SentinelMemoryPolicy> {
    this.requireTransaction();
    sentinelMemoryPolicySchema.parse(policy);
    await this.db
      .insert(sentinelMemoryPolicies)
      .values({
        id: policy.id,
        ownerId: policy.ownerId,
        projectId: policy.projectId ?? null,
        targetObjectId: policy.targetObjectId,
        policyPayload: policy as unknown as Record<string, unknown>,
        epistemicState: policy.epistemicState,
      })
      .onConflictDoUpdate({
        target: sentinelMemoryPolicies.id,
        set: {
          policyPayload: policy as unknown as Record<string, unknown>,
          epistemicState: policy.epistemicState,
          updatedAt: sql`now()`,
        },
      });
    return policy;
  }

  async listSentinelPolicies(
    ownerId: string,
    projectId?: string,
  ): Promise<SentinelMemoryPolicy[]> {
    const rows = await this.db
      .select()
      .from(sentinelMemoryPolicies)
      .where(
        projectId
          ? and(
              eq(sentinelMemoryPolicies.ownerId, ownerId),
              eq(sentinelMemoryPolicies.projectId, projectId),
            )
          : eq(sentinelMemoryPolicies.ownerId, ownerId),
      )
      .orderBy(desc(sentinelMemoryPolicies.updatedAt));
    return rows.map((r) =>
      sentinelMemoryPolicySchema.parse(r.policyPayload),
    );
  }

  async findLegacyMapping(
    legacySystem: string,
    legacyCollection: string,
    legacyId: string,
  ): Promise<string | null> {
    const [row] = await this.db
      .select()
      .from(legacyRecordMap)
      .where(
        and(
          eq(legacyRecordMap.legacySystem, legacySystem),
          eq(legacyRecordMap.legacyCollection, legacyCollection),
          eq(legacyRecordMap.legacyId, legacyId),
        ),
      )
      .limit(1);
    return row?.canonicalId ?? null;
  }

  async recordLegacyMapping(input: {
    legacySystem: string;
    legacyCollection: string;
    legacyId: string;
    canonicalTable: string;
    canonicalId: string;
    migrationStatus: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    this.requireTransaction();
    await this.db
      .insert(legacyRecordMap)
      .values({
        id: randomUUID(),
        legacySystem: input.legacySystem,
        legacyCollection: input.legacyCollection,
        legacyId: input.legacyId,
        canonicalTable: input.canonicalTable,
        canonicalId: input.canonicalId,
        migrationStatus: input.migrationStatus,
        metadata: input.metadata ?? {},
      })
      .onConflictDoNothing();
  }
}
