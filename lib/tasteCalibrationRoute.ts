import { z } from "zod";
import { readJsonBody, sendJson } from "./apiUtils.js";
import {
  publicOperationalMessage,
  requireOperationalMethod,
  sendOperationalError,
} from "./operationalApiResponse.js";
import { verifyMimiSession } from "./serverFirebaseAdmin.js";
import {
  completeCalibrationSessionBodySchema,
  createCalibrationSessionBodySchema,
  submitCalibrationJudgmentBodySchema,
} from "./tasteCalibration/index.js";

const sessionIdQuerySchema = z.object({
  sessionId: z.string().uuid(),
});

function headerValue(value: unknown): string {
  return String(Array.isArray(value) ? value[0] : value || "").trim();
}

function handleRouteError(res: any, error: unknown, fallback: string): void {
  const status = Number((error as { status?: unknown })?.status);
  const internalCode = String((error as { code?: unknown })?.code || "CALIBRATION_FAILED");
  const code = new Set([
    "MISSING_MIMI_SESSION",
    "INVALID_MIMI_SESSION",
    "FIREBASE_ADMIN_UNAVAILABLE",
    "SESSION_ACCESS_DENIED",
  ]).has(internalCode)
    ? internalCode
    : "CALIBRATION_FAILED";
  const message =
    error instanceof Error ? error.message : fallback;
  console.error("MIMI // Taste calibration failed:", { code, message });
  const candidateStatus =
    Number.isFinite(status) && status >= 400 && status < 600 ? status : 500;
  const responseStatus =
    code === "CALIBRATION_FAILED" && !Number.isFinite(status) ? 500 : candidateStatus;
  sendOperationalError(
    res,
    responseStatus,
    code,
    publicOperationalMessage(responseStatus, fallback, message),
  );
}

export async function handleCreateCalibrationSessionRoute(req: any, res: any) {
  if (!requireOperationalMethod(req, res, "POST")) return;

  try {
    const decoded = await verifyMimiSession(req.headers || {});
    const parsedBody = createCalibrationSessionBodySchema.safeParse(
      await readJsonBody(req),
    );
    if (!parsedBody.success) {
      sendOperationalError(
        res,
        400,
        "INVALID_REQUEST",
        parsedBody.error.issues[0]?.message || "Request body is invalid.",
      );
      return;
    }

    const { getTasteCalibrationService } = await import(
      "../infrastructure/database/neon/tasteCalibrationRuntime.js"
    );
    const { getNeonUnitOfWork } = await import(
      "../infrastructure/database/neon/unitOfWork.js"
    );
    await getNeonUnitOfWork().repositories.memberships.ensureFreeMembership(
      decoded.uid,
    );
    const result = await getTasteCalibrationService().createSession({
      ownerId: decoded.uid,
      projectId: parsedBody.data.projectId,
      workspaceId: parsedBody.data.workspaceId,
      targetQuestionCount: parsedBody.data.targetQuestionCount,
      scope: parsedBody.data.scope,
      seed: parsedBody.data.seed,
    });

    sendJson(res, 200, result);
  } catch (error) {
    handleRouteError(res, error, "Could not create calibration session.");
  }
}

export async function handleGetCalibrationSessionRoute(req: any, res: any) {
  if (!requireOperationalMethod(req, res, "GET")) return;

  try {
    const decoded = await verifyMimiSession(req.headers || {});
    const parsed = sessionIdQuerySchema.safeParse(req.query || {});
    if (!parsed.success) {
      sendOperationalError(res, 400, "INVALID_REQUEST", "sessionId is required.");
      return;
    }

    const { getTasteCalibrationService } = await import(
      "../infrastructure/database/neon/tasteCalibrationRuntime.js"
    );
    const session = await getTasteCalibrationService().getSession(
      parsed.data.sessionId,
      decoded.uid,
    );

    sendJson(res, 200, { session });
  } catch (error) {
    handleRouteError(res, error, "Could not load calibration session.");
  }
}

export async function handleGetNextCalibrationPairRoute(req: any, res: any) {
  if (!requireOperationalMethod(req, res, "GET")) return;

  try {
    const decoded = await verifyMimiSession(req.headers || {});
    const parsed = sessionIdQuerySchema.safeParse(req.query || {});
    if (!parsed.success) {
      sendOperationalError(res, 400, "INVALID_REQUEST", "sessionId is required.");
      return;
    }

    const { getTasteCalibrationService } = await import(
      "../infrastructure/database/neon/tasteCalibrationRuntime.js"
    );
    const pair = await getTasteCalibrationService().getNextPair(
      parsed.data.sessionId,
      decoded.uid,
    );

    sendJson(res, 200, pair);
  } catch (error) {
    handleRouteError(res, error, "Could not select next calibration pair.");
  }
}

export async function handleSubmitCalibrationJudgmentRoute(req: any, res: any) {
  if (!requireOperationalMethod(req, res, "POST")) return;
  const idempotency = z
    .string()
    .uuid()
    .safeParse(headerValue(req.headers?.["idempotency-key"]));
  if (!idempotency.success) {
    sendOperationalError(
      res,
      400,
      "INVALID_REQUEST",
      "A UUID Idempotency-Key header is required.",
    );
    return;
  }

  try {
    const decoded = await verifyMimiSession(req.headers || {});
    const parsedBody = submitCalibrationJudgmentBodySchema.safeParse(
      await readJsonBody(req),
    );
    if (!parsedBody.success) {
      sendOperationalError(
        res,
        400,
        "INVALID_REQUEST",
        parsedBody.error.issues[0]?.message || "Request body is invalid.",
      );
      return;
    }

    const { getTasteCalibrationService } = await import(
      "../infrastructure/database/neon/tasteCalibrationRuntime.js"
    );
    const result = await getTasteCalibrationService().submitJudgment({
      ownerId: decoded.uid,
      sessionId: parsedBody.data.sessionId,
      pairId: parsedBody.data.pairId,
      choice: parsedBody.data.choice,
      decidingFeatureIds: parsedBody.data.decidingFeatureIds,
      correctionNote: parsedBody.data.correctionNote,
    });

    sendJson(res, 200, result);
  } catch (error) {
    handleRouteError(res, error, "Could not submit calibration judgment.");
  }
}

export async function handleCompleteCalibrationSessionRoute(req: any, res: any) {
  if (!requireOperationalMethod(req, res, "POST")) return;

  try {
    const decoded = await verifyMimiSession(req.headers || {});
    const parsedBody = completeCalibrationSessionBodySchema.safeParse(
      await readJsonBody(req),
    );
    if (!parsedBody.success) {
      sendOperationalError(
        res,
        400,
        "INVALID_REQUEST",
        parsedBody.error.issues[0]?.message || "Request body is invalid.",
      );
      return;
    }

    const { getTasteCalibrationService } = await import(
      "../infrastructure/database/neon/tasteCalibrationRuntime.js"
    );
    const summary = await getTasteCalibrationService().completeSession(
      parsedBody.data.sessionId,
      decoded.uid,
    );

    sendJson(res, 200, summary);
  } catch (error) {
    handleRouteError(res, error, "Could not complete calibration session.");
  }
}

export async function handlePauseCalibrationSessionRoute(req: any, res: any) {
  if (!requireOperationalMethod(req, res, "POST")) return;

  try {
    const decoded = await verifyMimiSession(req.headers || {});
    const parsedBody = completeCalibrationSessionBodySchema.safeParse(
      await readJsonBody(req),
    );
    if (!parsedBody.success) {
      sendOperationalError(res, 400, "INVALID_REQUEST", "sessionId is required.");
      return;
    }

    const { getTasteCalibrationService } = await import(
      "../infrastructure/database/neon/tasteCalibrationRuntime.js"
    );
    const session = await getTasteCalibrationService().pauseSession(
      parsedBody.data.sessionId,
      decoded.uid,
    );

    sendJson(res, 200, { session });
  } catch (error) {
    handleRouteError(res, error, "Could not pause calibration session.");
  }
}
