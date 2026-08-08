import { randomUUID } from "node:crypto";
import { z } from "zod";
import { sendJson } from "./apiUtils.js";
import {
  publicOperationalMessage,
  requireOperationalMethod,
  sendOperationalError,
} from "./operationalApiResponse.js";
import { verifyMimiSession } from "./serverFirebaseAdmin.js";
import {
  TASTE_INTELLIGENCE_ALGORITHM_VERSION,
  DEFAULT_CALIBRATION_QUESTION_COUNT,
  applyPairwiseJudgment,
  selectNextCalibrationPair,
  createModelEdit,
  createUndoEdit,
  computeModelDelta,
  applyEditsToSnapshot,
  buildRefusalFromExplicit,
  proposeSavedReasonHypotheses,
  applySavedReasonReview,
  assertUndoableEdit,
  deriveEditBaseline,
  replayTasteSnapshot,
  type CalibrationCandidate,
} from "./tasteIntelligence/index.js";
import type {
  TasteCalibrationPair,
  TasteModelEditOperation,
  TasteRefusalType,
  GenerationMedium,
  GenerationMode,
  TasteGenerationContract,
  TasteCritique,
  SavedReasonHypothesis,
} from "../schemas/tasteIntelligenceContracts.js";
import type { TasteModelSnapshot } from "./tasteModel/contracts.js";
import type { TailorGenerationContractInput } from "./tasteIntelligence/mergeGenerationContracts.js";

const persistSnapshotSchema = z.object({
  snapshot: z.custom<TasteModelSnapshot>(),
  projectId: z.string().optional(),
  workspaceId: z.string().uuid().optional(),
});

const calibrationStartSchema = z.object({
  projectId: z.string().optional(),
  workspaceId: z.string().uuid().optional(),
  modelSnapshotId: z.string().optional(),
  targetQuestionCount: z.number().int().min(3).max(24).optional(),
  idempotencyKey: z.string().optional(),
  candidates: z
    .array(
      z.object({
        id: z.string(),
        label: z.string().optional(),
        featureIds: z.array(z.string()),
        sourceIds: z.array(z.string()).optional(),
      }),
    )
    .min(2)
    .optional(),
});

const judgmentSchema = z.object({
  sessionId: z.string(),
  pairId: z.string(),
  choice: z.enum(["left", "right", "both", "neither", "skip"]),
  decidingFeatureIds: z.array(z.string()).optional(),
  correctionNote: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  contextScope: z.enum(["persistent", "project", "session"]).optional(),
  idempotencyKey: z.string().optional(),
  leftFeatureIds: z.array(z.string()).optional(),
  rightFeatureIds: z.array(z.string()).optional(),
});

const refusalCreateSchema = z.object({
  featureIds: z.array(z.string()).min(1),
  refusalType: z.enum([
    "always",
    "only_when_combined",
    "wrong_context",
    "too_literal",
    "overexposed",
    "formerly_liked",
    "not_why_i_saved_it",
  ] as [TasteRefusalType, ...TasteRefusalType[]]),
  projectId: z.string().optional(),
  scope: z.enum(["persistent", "project", "session"]).optional(),
  signedWeight: z.number().optional(),
  confidence: z.number().min(0).max(1).optional(),
  sourceIds: z.array(z.string()).optional(),
  idempotencyKey: z.string().optional(),
  snapshot: z.custom<TasteModelSnapshot>().optional(),
});

const modelEditSchema = z.object({
  operation: z.enum([
    "rename",
    "set_alias",
    "merge",
    "split",
    "connect",
    "disconnect",
    "set_polarity",
    "set_weight",
    "set_scope",
    "set_signature",
    "set_contextual",
    "set_saturated",
    "set_dormant",
    "correct_provenance",
  ] as [TasteModelEditOperation, ...TasteModelEditOperation[]]),
  targetIds: z.array(z.string()).min(1),
  before: z.record(z.string(), z.unknown()),
  after: z.record(z.string(), z.unknown()),
  projectId: z.string().optional(),
  rationale: z.string().optional(),
  idempotencyKey: z.string().optional(),
  snapshot: z.custom<TasteModelSnapshot>(),
});

const modelEditUndoSchema = z.object({
  editId: z.string(),
  projectId: z.string().optional(),
  snapshot: z.custom<TasteModelSnapshot>(),
});

const tailorGenerationContractSchema = z.object({
  objective: z.string(),
  preserve: z.array(z.string()),
  emphasize: z.array(z.string()),
  transform: z.array(
    z.object({
      input: z.string(),
      method: z.string(),
      strength: z.number(),
    }),
  ),
  avoid: z.array(z.string()),
  globalRefusals: z.array(z.string()),
  projectConstraints: z.array(z.string()),
});

const compilerCompileSchema = z.object({
  medium: z.enum([
    "image",
    "writing",
    "ui",
    "fashion",
    "editorial",
    "brand",
    "photography",
    "product",
  ] as [GenerationMedium, ...GenerationMedium[]]),
  mode: z.enum(["aligned", "adjacent", "divergent"] as [
    GenerationMode,
    ...GenerationMode[],
  ]),
  projectId: z.string().optional(),
  workspaceId: z.string().uuid().optional(),
  modelSnapshotId: z.string().optional(),
  persist: z.boolean().optional(),
  tailorGenerationContract: tailorGenerationContractSchema.optional(),
});

const criticCritiqueSchema = z.object({
  contractId: z.string().optional(),
  contract: z.custom<TasteGenerationContract>().optional(),
  candidate: z
    .object({
      id: z.string(),
      featureIds: z.array(z.string()).optional(),
      tags: z.array(z.string()).optional(),
    })
    .optional(),
  artifact: z
    .object({
      id: z.string(),
      medium: z.enum([
        "editorial",
        "image",
        "writing",
        "ui",
        "brand",
        "fashion",
        "product",
      ]),
      text: z.string().optional(),
      imageRefs: z.array(z.string()).optional(),
      pages: z
        .array(
          z.object({
            text: z.string().optional(),
            imageRef: z.string().optional(),
            layoutMetadata: z.record(z.string(), z.unknown()).optional(),
          }),
        )
        .optional(),
      generationMetadata: z.record(z.string(), z.unknown()).optional(),
      sourcePromptTags: z.array(z.string()).optional(),
    })
    .optional(),
  persist: z.boolean().optional(),
  projectId: z.string().optional(),
  allowAiExtraction: z.boolean().optional(),
});

const savedReasonProposeSchema = z.object({
  artifactId: z.string(),
  tags: z.array(z.string()).optional(),
  projectId: z.string().optional(),
  scope: z.string().optional(),
});

const savedReasonReviewSchema = z.object({
  hypothesis: z.custom<SavedReasonHypothesis>(),
  action: z.enum(["confirm", "reject", "edit", "skip"]),
  editedText: z.string().optional(),
});

async function resolveMembershipPlan(actorId: string): Promise<string> {
  try {
    const { getNeonUnitOfWork } = await import(
      "../infrastructure/database/neon/unitOfWork.js"
    );
    const membership =
      (await getNeonUnitOfWork().repositories.memberships.findForUser(actorId)) ??
      (await getNeonUnitOfWork().repositories.memberships.ensureFreeMembership(
        actorId,
      ));
    return membership.plan;
  } catch {
    return "free";
  }
}

export async function handleTasteIntelligenceRoute(req: any, res: any) {
  const path = String(req.path || req.url || "").replace(
    /^\/api\/mimi\/taste-intelligence\/?/,
    "",
  );
  const segments = path.split("/").filter(Boolean);
  const action = segments[0] ?? "";

  if (action === "calibration" && segments[1] === "start") {
    if (!requireOperationalMethod(req, res, "POST")) return;
    return handleCalibrationStart(req, res);
  }
  if (action === "calibration" && segments[1] === "judgment") {
    if (!requireOperationalMethod(req, res, "POST")) return;
    return handleCalibrationJudgment(req, res);
  }
  if (action === "calibration" && segments[1] === "session") {
    if (!requireOperationalMethod(req, res, "GET")) return;
    return handleCalibrationSessionGet(req, res);
  }
  if (action === "snapshot" && segments[1] === "latest") {
    if (!requireOperationalMethod(req, res, "GET")) return;
    return handleLatestSnapshot(req, res);
  }
  if (action === "snapshot" && segments[1] === "persist") {
    if (!requireOperationalMethod(req, res, "POST")) return;
    return handlePersistSnapshot(req, res);
  }
  if (action === "refusals") {
    if (req.method === "POST") {
      if (!requireOperationalMethod(req, res, "POST")) return;
      return handleCreateRefusal(req, res);
    }
    if (!requireOperationalMethod(req, res, "GET")) return;
    return handleListRefusals(req, res);
  }
  if (action === "model-edits" && segments[1] === "undo") {
    if (!requireOperationalMethod(req, res, "POST")) return;
    return handleUndoModelEdit(req, res);
  }
  if (action === "model-edits") {
    if (!requireOperationalMethod(req, res, "POST")) return;
    return handleCreateModelEdit(req, res);
  }
  if (action === "compiler" && segments[1] === "compile") {
    if (!requireOperationalMethod(req, res, "POST")) return;
    return handleCompilerCompile(req, res);
  }
  if (action === "critic" && segments[1] === "critique") {
    if (!requireOperationalMethod(req, res, "POST")) return;
    return handleCriticCritique(req, res);
  }
  if (action === "saved-reason" && segments[1] === "propose") {
    if (!requireOperationalMethod(req, res, "POST")) return;
    return handleSavedReasonPropose(req, res);
  }
  if (action === "saved-reason" && segments[1] === "review") {
    if (!requireOperationalMethod(req, res, "POST")) return;
    return handleSavedReasonReview(req, res);
  }
  if (action === "saved-reason") {
    if (!requireOperationalMethod(req, res, "GET")) return;
    return handleListSavedReasons(req, res);
  }

  sendOperationalError(res, 404, "NOT_FOUND", "Unknown taste intelligence route.");
}

async function handleCalibrationStart(req: any, res: any) {
  try {
    const decoded = await verifyMimiSession(req.headers || {});
    const body = calibrationStartSchema.safeParse(req.body || {});
    if (!body.success) {
      sendOperationalError(res, 400, "INVALID_REQUEST", body.error.message);
      return;
    }

    const { hasTasteEntitlement } = await import(
      "./tasteIntelligence/entitlements.js"
    );
    const plan = (await resolveMembershipPlan(decoded.uid)) as
      | "free"
      | "trial"
      | "creator"
      | "studio"
      | "team";
    if (!hasTasteEntitlement(plan, "taste.calibration.active_learning")) {
      sendOperationalError(
        res,
        403,
        "ENTITLEMENT_REQUIRED",
        "Calibration Lab requires Creator plan or trial.",
      );
      return;
    }

    const { getNeonUnitOfWork } = await import(
      "../infrastructure/database/neon/unitOfWork.js"
    );
    const uow = getNeonUnitOfWork();
    const repo = uow.repositories.tasteIntelligence;

    const scope = body.data.projectId ?? "global";
    const snapshotRow =
      body.data.modelSnapshotId
        ? await repo.findSnapshotById(decoded.uid, body.data.modelSnapshotId)
        : await repo.getLatestSnapshot(decoded.uid, scope);

    if (!snapshotRow) {
      sendOperationalError(
        res,
        409,
        "SNAPSHOT_REQUIRED",
        "Compile a taste model before starting calibration.",
      );
      return;
    }

    const sessionId = randomUUID();
    const idempotencyKey =
      body.data.idempotencyKey ?? `calibration-start:${decoded.uid}:${Date.now()}`;

    const session = await uow.transaction(async (repositories) => {
      const existing = await repositories.tasteIntelligence.getActiveCalibrationSession(
        decoded.uid,
        body.data.projectId,
      );
      if (existing) return existing;
      return repositories.tasteIntelligence.createCalibrationSession({
        id: sessionId,
        ownerId: decoded.uid,
        workspaceId: body.data.workspaceId,
        projectId: body.data.projectId,
        modelSnapshotId: snapshotRow.id,
        targetQuestionCount:
          body.data.targetQuestionCount ?? DEFAULT_CALIBRATION_QUESTION_COUNT,
        algorithmVersion: TASTE_INTELLIGENCE_ALGORITHM_VERSION,
        idempotencyKey,
      });
    });

    const candidates: CalibrationCandidate[] = (body.data.candidates ?? []).map(
      (c) => ({
        id: c.id,
        label: c.label,
        featureIds: c.featureIds,
        predictedUtility: 0,
        sourceIds: c.sourceIds ?? [],
      }),
    );

    if (candidates.length < 2) {
      sendJson(res, 200, { session, pair: null, message: "Provide candidates to begin." });
      return;
    }

    const askedPairs = await repo.listCalibrationPairs(session.id);
    const askedKeys = new Set(
      askedPairs.map((p) =>
        p.leftCandidateId < p.rightCandidateId
          ? `${p.leftCandidateId}|${p.rightCandidateId}`
          : `${p.rightCandidateId}|${p.leftCandidateId}`,
      ),
    );

    const next = selectNextCalibrationPair({
      seed: `${session.id}:${session.answeredQuestionCount}`,
      snapshot: snapshotRow.snapshot,
      candidates,
      askedPairKeys: askedKeys,
      fatigueCount: session.answeredQuestionCount,
      uncertainFeatureIds: snapshotRow.snapshot.diagnostics.lowConfidenceFeatureIds,
      contradictionFeatureIds: [],
      emergingFeatureIds: snapshotRow.snapshot.trajectory.emergingFeatureIds,
      projectFeatureIds: body.data.projectId
        ? snapshotRow.snapshot.featureWeights.map((f) => f.featureId)
        : undefined,
    });

    if (!next) {
      sendJson(res, 200, { session, pair: null });
      return;
    }

    const pair: TasteCalibrationPair = {
      id: randomUUID(),
      sessionId: session.id,
      leftCandidateId: next.left.id,
      rightCandidateId: next.right.id,
      isolatedFeatureIds: next.isolatedFeatureIds,
      selectionReason: next.selectionReason,
      predictedLeftPreference: next.predictedLeftPreference,
      expectedInformationGain: next.expectedInformationGain,
      askedAt: Date.now(),
    };

    await uow.transaction(async (repositories) => {
      await repositories.tasteIntelligence.saveCalibrationPair(pair);
    });

    sendJson(res, 200, {
      session,
      pair,
      left: next.left,
      right: next.right,
      modelSnapshotId: snapshotRow.id,
    });
  } catch (error) {
    sendOperationalError(
      res,
      500,
      "CALIBRATION_START_FAILED",
      publicOperationalMessage(500, "Calibration could not start.", String(error)),
    );
  }
}

async function handleCalibrationJudgment(req: any, res: any) {
  try {
    const decoded = await verifyMimiSession(req.headers || {});
    const body = judgmentSchema.safeParse(req.body || {});
    if (!body.success) {
      sendOperationalError(res, 400, "INVALID_REQUEST", body.error.message);
      return;
    }

    const { getNeonUnitOfWork } = await import(
      "../infrastructure/database/neon/unitOfWork.js"
    );
    const uow = getNeonUnitOfWork();
    const repo = uow.repositories.tasteIntelligence;

    const pairs = await repo.listCalibrationPairs(body.data.sessionId);
    const pair = pairs.find((p) => p.id === body.data.pairId);
    if (!pair) {
      sendOperationalError(res, 404, "PAIR_NOT_FOUND", "Calibration pair not found.");
      return;
    }

    const judgment = await uow.transaction(async (repositories) => {
      const j = await repositories.tasteIntelligence.recordPairwiseJudgment({
        id: randomUUID(),
        sessionId: body.data.sessionId,
        pairId: body.data.pairId,
        choice: body.data.choice,
        decidingFeatureIds: body.data.decidingFeatureIds ?? pair.isolatedFeatureIds,
        correctionNote: body.data.correctionNote,
        confidence: body.data.confidence,
        contextScope: body.data.contextScope ?? "persistent",
        idempotencyKey:
          body.data.idempotencyKey ??
          `judgment:${body.data.sessionId}:${body.data.pairId}`,
      });

      const sessions = await repositories.tasteIntelligence.getActiveCalibrationSession(
        decoded.uid,
      );
      if (sessions && sessions.id === body.data.sessionId) {
        const answered = sessions.answeredQuestionCount + 1;
        const completed =
          answered >= sessions.targetQuestionCount ||
          body.data.choice === "skip";
        await repositories.tasteIntelligence.updateCalibrationSession({
          ...sessions,
          answeredQuestionCount: answered,
          status: completed ? "completed" : "active",
          completedAt: completed ? Date.now() : undefined,
        });
      }
      return j;
    });

    const snapshotRow = await repo.getLatestSnapshot(decoded.uid, "global");
    const judgments = await repo.listJudgments(body.data.sessionId);
    const deltas =
      snapshotRow && body.data.choice !== "skip"
        ? applyPairwiseJudgment({
            snapshot: snapshotRow.snapshot,
            choice: body.data.choice,
            leftFeatureIds: body.data.leftFeatureIds ?? pair.isolatedFeatureIds,
            rightFeatureIds: body.data.rightFeatureIds ?? [],
            decidingFeatureIds:
              body.data.decidingFeatureIds ?? pair.isolatedFeatureIds,
            judgmentId: judgment.id,
            existingDeltas: {},
            judgmentCount: judgments.length,
          })
        : {};

    sendJson(res, 200, {
      judgment,
      calibrationDeltas: deltas,
      affectedFeatureIds: Object.keys(deltas),
    });
  } catch (error) {
    sendOperationalError(
      res,
      500,
      "JUDGMENT_FAILED",
      publicOperationalMessage(500, "Judgment could not be recorded.", String(error)),
    );
  }
}

async function handleCalibrationSessionGet(req: any, res: any) {
  try {
    const decoded = await verifyMimiSession(req.headers || {});
    const projectId = req.query?.projectId
      ? String(req.query.projectId)
      : undefined;
    const { getNeonTasteIntelligenceRepository } = await import(
      "../infrastructure/database/neon/tasteIntelligenceRuntime.js"
    );
    const session = await getNeonTasteIntelligenceRepository().getActiveCalibrationSession(
      decoded.uid,
      projectId,
    );
    sendJson(res, 200, { session });
  } catch (error) {
    sendOperationalError(
      res,
      500,
      "SESSION_READ_FAILED",
      publicOperationalMessage(500, "Session unavailable.", String(error)),
    );
  }
}

async function handleLatestSnapshot(req: any, res: any) {
  try {
    const decoded = await verifyMimiSession(req.headers || {});
    const scope = String(req.query?.scope ?? "global");
    const { getNeonTasteIntelligenceRepository } = await import(
      "../infrastructure/database/neon/tasteIntelligenceRuntime.js"
    );
    const row = await getNeonTasteIntelligenceRepository().getLatestSnapshot(
      decoded.uid,
      scope,
    );
    sendJson(res, 200, { snapshot: row?.snapshot ?? null, meta: row });
  } catch (error) {
    sendOperationalError(
      res,
      500,
      "SNAPSHOT_READ_FAILED",
      publicOperationalMessage(500, "Snapshot unavailable.", String(error)),
    );
  }
}

async function handlePersistSnapshot(req: any, res: any) {
  try {
    const decoded = await verifyMimiSession(req.headers || {});
    const body = persistSnapshotSchema.safeParse(req.body || {});
    if (!body.success) {
      sendOperationalError(res, 400, "INVALID_REQUEST", body.error.message);
      return;
    }

    const { getNeonUnitOfWork } = await import(
      "../infrastructure/database/neon/unitOfWork.js"
    );
    await getNeonUnitOfWork().transaction(async (repositories) => {
      await repositories.tasteIntelligence.saveSnapshot(
        decoded.uid,
        body.data.snapshot,
        {
          projectId: body.data.projectId,
          workspaceId: body.data.workspaceId,
        },
      );
    });
    sendJson(res, 200, { ok: true });
  } catch (error) {
    sendOperationalError(
      res,
      500,
      "SNAPSHOT_PERSIST_FAILED",
      publicOperationalMessage(500, "Snapshot could not be saved.", String(error)),
    );
  }
}

async function handleListRefusals(req: any, res: any) {
  try {
    const decoded = await verifyMimiSession(req.headers || {});
    const projectId = req.query?.projectId
      ? String(req.query.projectId)
      : undefined;
    const { getNeonTasteIntelligenceRepository } = await import(
      "../infrastructure/database/neon/tasteIntelligenceRuntime.js"
    );
    const refusals = await getNeonTasteIntelligenceRepository().listActiveRefusals(
      decoded.uid,
      projectId,
    );
    sendJson(res, 200, { refusals });
  } catch (error) {
    sendOperationalError(
      res,
      500,
      "REFUSALS_READ_FAILED",
      publicOperationalMessage(500, "Refusals unavailable.", String(error)),
    );
  }
}

async function handleCreateRefusal(req: any, res: any) {
  try {
    const decoded = await verifyMimiSession(req.headers || {});
    const body = refusalCreateSchema.safeParse(req.body || {});
    if (!body.success) {
      sendOperationalError(res, 400, "INVALID_REQUEST", body.error.message);
      return;
    }

    const refusal = buildRefusalFromExplicit({
      ownerId: decoded.uid,
      projectId: body.data.projectId,
      featureIds: body.data.featureIds,
      refusalType: body.data.refusalType,
      signedWeight: body.data.signedWeight,
      confidence: body.data.confidence,
      explicit: true,
      scope: body.data.scope ?? (body.data.projectId ? "project" : "persistent"),
      sourceIds: body.data.sourceIds ?? [],
    });

    const { getNeonUnitOfWork } = await import(
      "../infrastructure/database/neon/unitOfWork.js"
    );
    const uow = getNeonUnitOfWork();

    const beforeSnapshot = body.data.snapshot;
    let afterSnapshot = beforeSnapshot;

    await uow.transaction(async (repositories) => {
      await repositories.tasteIntelligence.upsertRefusal(refusal);
    });

    if (beforeSnapshot) {
      const { applyRefusalToFeatureWeights } = await import(
        "./tasteIntelligence/applySnapshotEdits.js"
      );
      afterSnapshot = applyRefusalToFeatureWeights(beforeSnapshot, refusal);
      await uow.transaction(async (repositories) => {
        await repositories.tasteIntelligence.saveSnapshot(
          decoded.uid,
          afterSnapshot!,
          { projectId: body.data.projectId },
        );
      });
    }

    const modelDelta =
      beforeSnapshot && afterSnapshot
        ? computeModelDelta(beforeSnapshot, afterSnapshot)
        : null;

    sendJson(res, 200, { refusal, snapshot: afterSnapshot ?? null, modelDelta });
  } catch (error) {
    sendOperationalError(
      res,
      500,
      "REFUSAL_CREATE_FAILED",
      publicOperationalMessage(500, "Refusal could not be saved.", String(error)),
    );
  }
}

async function handleCreateModelEdit(req: any, res: any) {
  try {
    const decoded = await verifyMimiSession(req.headers || {});
    const body = modelEditSchema.safeParse(req.body || {});
    if (!body.success) {
      sendOperationalError(res, 400, "INVALID_REQUEST", body.error.message);
      return;
    }

    if (
      (body.data.operation === "merge" || body.data.operation === "split") &&
      process.env.TASTE_GRAPH_MERGE_SPLIT !== "1"
    ) {
      sendOperationalError(
        res,
        403,
        "FEATURE_DISABLED",
        "Merge and split are behind the tasteGraphMergeSplit feature flag.",
      );
      return;
    }

    const edit = createModelEdit({
      ownerId: decoded.uid,
      projectId: body.data.projectId,
      operation: body.data.operation,
      targetIds: body.data.targetIds,
      before: body.data.before,
      after: body.data.after,
      rationale: body.data.rationale,
    });

    const { getNeonUnitOfWork } = await import(
      "../infrastructure/database/neon/unitOfWork.js"
    );
    const uow = getNeonUnitOfWork();
    const beforeSnapshot = body.data.snapshot;

    await uow.transaction(async (repositories) => {
      await repositories.tasteIntelligence.appendModelEdit(edit);
    });

    const afterSnapshot = applyEditsToSnapshot(beforeSnapshot, [edit]);
    await uow.transaction(async (repositories) => {
      await repositories.tasteIntelligence.saveSnapshot(
        decoded.uid,
        afterSnapshot,
        { projectId: body.data.projectId },
      );
    });

    const modelDelta = computeModelDelta(beforeSnapshot, afterSnapshot);
    sendJson(res, 200, { edit, snapshot: afterSnapshot, modelDelta });
  } catch (error) {
    sendOperationalError(
      res,
      500,
      "MODEL_EDIT_FAILED",
      publicOperationalMessage(500, "Model edit could not be saved.", String(error)),
    );
  }
}

async function handleUndoModelEdit(req: any, res: any) {
  try {
    const decoded = await verifyMimiSession(req.headers || {});
    const body = modelEditUndoSchema.safeParse(req.body || {});
    if (!body.success) {
      sendOperationalError(res, 400, "INVALID_REQUEST", body.error.message);
      return;
    }

    const { getNeonUnitOfWork } = await import(
      "../infrastructure/database/neon/unitOfWork.js"
    );
    const uow = getNeonUnitOfWork();
    const repo = uow.repositories.tasteIntelligence;
    const scope = body.data.projectId ?? "global";

    const edits = await repo.listModelEdits(decoded.uid, {
      projectId: body.data.projectId,
      limit: 50,
    });
    const original = assertUndoableEdit(edits, body.data.editId);
    if (!original) {
      sendOperationalError(
        res,
        409,
        "UNDO_NOT_ALLOWED",
        "Undo is limited to reversing the most recent model edit only. Full history rollback is not supported.",
      );
      return;
    }

    const refusals = await repo.listActiveRefusals(
      decoded.uid,
      body.data.projectId,
    );
    const latestRow = await repo.getLatestSnapshot(decoded.uid, scope);
    const materialized =
      latestRow?.snapshot ?? body.data.snapshot;
    const baseline = deriveEditBaseline(materialized, edits);
    const authoritativeBefore = replayTasteSnapshot({
      baseline,
      edits,
      refusals,
    });

    const undoEdit = createUndoEdit(original);
    const afterSnapshot = replayTasteSnapshot({
      baseline,
      edits: [...edits, undoEdit],
      refusals,
    });

    await uow.transaction(async (repositories) => {
      await repositories.tasteIntelligence.appendModelEdit(undoEdit);
      await repositories.tasteIntelligence.saveSnapshot(
        decoded.uid,
        afterSnapshot,
        { projectId: body.data.projectId },
      );
    });

    const modelDelta = computeModelDelta(authoritativeBefore, afterSnapshot);
    sendJson(res, 200, {
      edit: undoEdit,
      snapshot: afterSnapshot,
      modelDelta,
      undoSemantics: "single_edit_only",
    });
  } catch (error) {
    sendOperationalError(
      res,
      500,
      "MODEL_EDIT_UNDO_FAILED",
      publicOperationalMessage(500, "Undo could not be applied.", String(error)),
    );
  }
}

async function handleCompilerCompile(req: any, res: any) {
  try {
    const decoded = await verifyMimiSession(req.headers || {});
    const body = compilerCompileSchema.safeParse(req.body || {});
    if (!body.success) {
      sendOperationalError(res, 400, "INVALID_REQUEST", body.error.message);
      return;
    }

    const { hasTasteEntitlement } = await import(
      "./tasteIntelligence/entitlements.js"
    );
    const plan = (await resolveMembershipPlan(decoded.uid)) as
      | "free"
      | "trial"
      | "creator"
      | "studio"
      | "team";

    if (!hasTasteEntitlement(plan, "taste.compiler")) {
      sendOperationalError(
        res,
        403,
        "ENTITLEMENT_REQUIRED",
        "Taste compiler requires Studio plan or trial.",
      );
      return;
    }

    if (
      body.data.mode !== "aligned" &&
      !hasTasteEntitlement(plan, "taste.generation_modes")
    ) {
      sendOperationalError(
        res,
        403,
        "ENTITLEMENT_REQUIRED",
        "Adjacent and divergent modes require generation_modes entitlement.",
      );
      return;
    }

    const { getNeonUnitOfWork } = await import(
      "../infrastructure/database/neon/unitOfWork.js"
    );
    const uow = getNeonUnitOfWork();
    const repo = uow.repositories.tasteIntelligence;

    const scope = body.data.projectId ?? "global";
    const snapshotRow = body.data.modelSnapshotId
      ? await repo.findSnapshotById(decoded.uid, body.data.modelSnapshotId)
      : await repo.getLatestSnapshot(decoded.uid, scope);

    if (!snapshotRow) {
      sendOperationalError(
        res,
        409,
        "SNAPSHOT_REQUIRED",
        "Compile a taste model before generating a contract.",
      );
      return;
    }

    const refusals = await repo.listActiveRefusals(
      decoded.uid,
      body.data.projectId,
    );

    const { compileTasteGenerationContract } = await import(
      "./tasteIntelligence/compileGenerationContract.js"
    );
    const { mergeGenerationContracts } = await import(
      "./tasteIntelligence/mergeGenerationContracts.js"
    );

    const compiled = compileTasteGenerationContract(
      snapshotRow.snapshot,
      {
        ownerId: decoded.uid,
        workspaceId: body.data.workspaceId,
        projectId: body.data.projectId,
        refusals,
      },
      body.data.medium,
      body.data.mode,
    );

    const tailorContract = body.data
      .tailorGenerationContract as TailorGenerationContractInput | undefined;
    const { contract, reconciliation } = mergeGenerationContracts(
      compiled,
      tailorContract,
    );

    const persist = body.data.persist !== false;
    if (persist) {
      await uow.transaction(async (repositories) => {
        await repositories.tasteIntelligence.saveGenerationContract(contract);
      });
    }

    sendJson(res, 200, {
      contract,
      reconciliation,
      snapshotId: snapshotRow.id,
      promptBlock: (
        await import("./tasteIntelligence/formatContractPrompt.js")
      ).formatGenerationContractPrompt(contract, reconciliation),
    });
  } catch (error) {
    sendOperationalError(
      res,
      500,
      "COMPILER_FAILED",
      publicOperationalMessage(500, "Contract could not be compiled.", String(error)),
    );
  }
}

async function handleCriticCritique(req: any, res: any) {
  try {
    const decoded = await verifyMimiSession(req.headers || {});
    const body = criticCritiqueSchema.safeParse(req.body || {});
    if (!body.success) {
      sendOperationalError(res, 400, "INVALID_REQUEST", body.error.message);
      return;
    }

    const { hasTasteEntitlement } = await import(
      "./tasteIntelligence/entitlements.js"
    );
    const plan = (await resolveMembershipPlan(decoded.uid)) as
      | "free"
      | "trial"
      | "creator"
      | "studio"
      | "team";

    if (!hasTasteEntitlement(plan, "taste.critic")) {
      sendOperationalError(
        res,
        403,
        "ENTITLEMENT_REQUIRED",
        "Taste critic requires Studio plan or trial.",
      );
      return;
    }

    const { getNeonUnitOfWork } = await import(
      "../infrastructure/database/neon/unitOfWork.js"
    );
    const uow = getNeonUnitOfWork();
    const repo = uow.repositories.tasteIntelligence;

    let contract = body.data.contract ?? null;
    if (!contract && body.data.contractId) {
      contract = await repo.getGenerationContract(
        decoded.uid,
        body.data.contractId,
      );
    }

    if (!contract) {
      sendOperationalError(
        res,
        400,
        "CONTRACT_REQUIRED",
        "Provide contractId or inline contract for critique.",
      );
      return;
    }

    const scope = body.data.projectId ?? "global";
    const snapshotRow = await repo.getLatestSnapshot(decoded.uid, scope);
    if (!snapshotRow) {
      sendOperationalError(
        res,
        409,
        "SNAPSHOT_REQUIRED",
        "Taste model snapshot required for critique.",
      );
      return;
    }

    const refusals = await repo.listActiveRefusals(
      decoded.uid,
      body.data.projectId,
    );

    const {
      critiqueAgainstContract,
      extractionToCritiqueFeatures,
    } = await import("./tasteIntelligence/critiqueCandidate.js");
    const { extractArtifactFeatures, artifactExtractionToCandidate } =
      await import("./tasteIntelligence/extractArtifactFeatures.js");
    const { isCritiquableArtifact } = await import(
      "./tasteIntelligence/generatedArtifact.js"
    );

    const artifact = body.data.artifact;
    if (!artifact) {
      sendOperationalError(
        res,
        400,
        "ARTIFACT_REQUIRED",
        "Post-generation critique requires a generated artifact.",
      );
      return;
    }

    if (!isCritiquableArtifact(artifact)) {
      sendOperationalError(
        res,
        422,
        "ARTIFACT_EMPTY",
        "Generated artifact has no critiquable content.",
      );
      return;
    }

    const extraction = await extractArtifactFeatures({
      artifact,
      snapshot: snapshotRow.snapshot,
      allowAiExtraction: body.data.allowAiExtraction !== false,
    });

    if (extraction.completeness === "failed") {
      sendOperationalError(
        res,
        422,
        "EXTRACTION_FAILED",
        extraction.partialReason ?? "Feature extraction could not run.",
      );
      return;
    }

    const candidate =
      body.data.candidate ??
      artifactExtractionToCandidate(artifact, extraction);

    const extracted = extractionToCritiqueFeatures(extraction);
    const critique = critiqueAgainstContract({
      contract,
      snapshot: snapshotRow.snapshot,
      candidate: { ...candidate, id: artifact.id },
      extracted,
      refusals,
      sourceSnapshotId: snapshotRow.id,
    });

    const persist = body.data.persist !== false;
    if (persist) {
      await uow.transaction(async (repositories) => {
        await repositories.tasteIntelligence.saveCritique(decoded.uid, critique);
      });
    }

    sendJson(res, 200, { critique, extracted: extraction });
  } catch (error) {
    sendOperationalError(
      res,
      500,
      "CRITIC_FAILED",
      publicOperationalMessage(500, "Critique could not be completed.", String(error)),
    );
  }
}

async function handleSavedReasonPropose(req: any, res: any) {
  try {
    const decoded = await verifyMimiSession(req.headers || {});
    const body = savedReasonProposeSchema.safeParse(req.body || {});
    if (!body.success) {
      sendOperationalError(res, 400, "INVALID_REQUEST", body.error.message);
      return;
    }

    const scope = body.data.projectId ?? "global";
    const { getNeonUnitOfWork } = await import(
      "../infrastructure/database/neon/unitOfWork.js"
    );
    const uow = getNeonUnitOfWork();
    const repo = uow.repositories.tasteIntelligence;

    const snapshotRow = await repo.getLatestSnapshot(decoded.uid, scope);
    const hypotheses = proposeSavedReasonHypotheses(
      body.data.artifactId,
      snapshotRow?.snapshot ?? null,
      body.data.tags ?? [],
    );

    await uow.transaction(async (repositories) => {
      for (const hypothesis of hypotheses) {
        await repositories.tasteIntelligence.saveSavedReasonHypothesis(
          decoded.uid,
          hypothesis,
        );
      }
    });

    sendJson(res, 200, { hypotheses, snapshotAvailable: Boolean(snapshotRow) });
  } catch (error) {
    sendOperationalError(
      res,
      500,
      "SAVED_REASON_PROPOSE_FAILED",
      publicOperationalMessage(500, "Could not propose saved reasons.", String(error)),
    );
  }
}

async function handleListSavedReasons(req: any, res: any) {
  try {
    const decoded = await verifyMimiSession(req.headers || {});
    const artifactId = req.query?.artifactId
      ? String(req.query.artifactId)
      : undefined;
    const { getNeonTasteIntelligenceRepository } = await import(
      "../infrastructure/database/neon/tasteIntelligenceRuntime.js"
    );
    const hypotheses =
      await getNeonTasteIntelligenceRepository().listSavedReasonHypotheses(
        decoded.uid,
        artifactId,
      );
    sendJson(res, 200, { hypotheses });
  } catch (error) {
    sendOperationalError(
      res,
      500,
      "SAVED_REASON_LIST_FAILED",
      publicOperationalMessage(500, "Saved reasons unavailable.", String(error)),
    );
  }
}

async function handleSavedReasonReview(req: any, res: any) {
  try {
    const decoded = await verifyMimiSession(req.headers || {});
    const body = savedReasonReviewSchema.safeParse(req.body || {});
    if (!body.success) {
      sendOperationalError(res, 400, "INVALID_REQUEST", body.error.message);
      return;
    }

    const reviewed = applySavedReasonReview(
      body.data.hypothesis,
      body.data.action,
      body.data.editedText,
    );

    if (body.data.action !== "skip") {
      const { getNeonUnitOfWork } = await import(
        "../infrastructure/database/neon/unitOfWork.js"
      );
      await getNeonUnitOfWork().transaction(async (repositories) => {
        await repositories.tasteIntelligence.upsertSavedReasonHypothesis(
          decoded.uid,
          reviewed,
        );
      });
    }

    sendJson(res, 200, { hypothesis: reviewed });
  } catch (error) {
    sendOperationalError(
      res,
      500,
      "SAVED_REASON_REVIEW_FAILED",
      publicOperationalMessage(500, "Review could not be saved.", String(error)),
    );
  }
}
