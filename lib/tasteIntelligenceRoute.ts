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
  type CalibrationCandidate,
} from "./tasteIntelligence/index.js";
import type { TasteCalibrationPair } from "../schemas/tasteIntelligenceContracts.js";
import type { TasteModelSnapshot } from "./tasteModel/contracts.js";

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
    if (!requireOperationalMethod(req, res, "GET")) return;
    return handleListRefusals(req, res);
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
