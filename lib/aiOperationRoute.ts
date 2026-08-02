import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  OperationExecutionError,
  WorkflowConflictError,
} from "../application/operations/executeOperation.js";
import type { GatewayErrorCode } from "../domain/ai/types.js";
import { InsufficientCreditsError } from "../domain/credits/errors.js";
import {
  readJsonBody,
  sendJson,
} from "./apiUtils.js";
import {
  publicOperationalMessage,
  requireOperationalMethod,
  sendOperationalError,
} from "./operationalApiResponse.js";
import {
  getServerFirebaseAdmin,
  verifyMimiSession,
} from "./serverFirebaseAdmin.js";

const bodySchema = z.object({
  workspaceId: z.string().uuid().nullable().optional(),
  input: z.unknown(),
  sourceIds: z.array(z.string().min(1).max(300)).max(50).optional(),
});

const idempotencyKeySchema = z.string().uuid();
const PUBLIC_OPERATIONAL_CODES = new Set([
  "MISSING_MIMI_SESSION",
  "INVALID_MIMI_SESSION",
  "FIREBASE_ADMIN_UNAVAILABLE",
  "AUTHORIZATION_UNAVAILABLE",
  "SOURCE_ACCESS_DENIED",
  "INVALID_REQUEST",
  "ENTITLEMENT_REQUIRED",
  "PAYMENT_STATE_UNRESOLVED",
  "WORKFLOW_CONFLICT",
]);
const PUBLIC_EXECUTION_CODES = new Set([
  "INVALID_REQUEST",
  "UNAUTHORIZED",
  "CONTENT_REJECTED",
  "RATE_LIMITED",
  "TIMEOUT",
  "PROVIDER_UNAVAILABLE",
  "INVALID_PROVIDER_OUTPUT",
  "CONTEXT_TOO_LARGE",
  "INTERNAL_ERROR",
  "ENTITLEMENT_REQUIRED",
  "PAYMENT_STATE_UNRESOLVED",
  "WORKFLOW_CANCELED",
]);

function headerValue(value: unknown): string {
  return String(Array.isArray(value) ? value[0] : value || "").trim();
}

function operationIdFromRequest(req: any): string {
  const value = req.params?.operationId ?? req.query?.operationId;
  return headerValue(value);
}

function statusForGatewayCode(code: GatewayErrorCode | string): number {
  switch (code) {
    case "INVALID_REQUEST":
      return 400;
    case "UNAUTHORIZED":
      return 401;
    case "CONTENT_REJECTED":
      return 422;
    case "RATE_LIMITED":
      return 429;
    case "TIMEOUT":
      return 504;
    case "PROVIDER_UNAVAILABLE":
      return 503;
    case "INVALID_PROVIDER_OUTPUT":
      return 502;
    case "CONTEXT_TOO_LARGE":
      return 413;
    case "INTERNAL_ERROR":
      return 500;
    default:
      return 409;
  }
}

export async function handleAiOperationRoute(req: any, res: any) {
  if (!requireOperationalMethod(req, res, "POST")) return;
  const operationId = operationIdFromRequest(req);
  if (!operationId) {
    sendOperationalError(
      res,
      400,
      "INVALID_REQUEST",
      "Operation ID is required.",
    );
    return;
  }

  const idempotency = idempotencyKeySchema.safeParse(
    headerValue(req.headers?.["idempotency-key"]),
  );
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
    const body = await readJsonBody(req);
    const parsedBody = bodySchema.safeParse(body);
    if (!parsedBody.success) {
      sendOperationalError(
        res,
        400,
        "INVALID_REQUEST",
        parsedBody.error.issues[0]?.message || "Request body is invalid.",
      );
      return;
    }
    const input = parsedBody.data;
    const projectId =
      operationId === "scribe.propose-atoms" &&
      typeof input.input === "object" &&
      input.input !== null &&
      "projectId" in input.input
        ? String((input.input as { projectId?: unknown }).projectId || "").trim()
        : "";
    if (projectId) {
      const { db } = getServerFirebaseAdmin();
      if (!db) {
        sendOperationalError(
          res,
          503,
          "AUTHORIZATION_UNAVAILABLE",
          "Project authorization is temporarily unavailable.",
        );
        return;
      }
      const project = await db
        .collection("users")
        .doc(decoded.uid)
        .collection("tailorProjects")
        .doc(projectId)
        .get();
      if (!project.exists) {
        sendOperationalError(
          res,
          403,
          "SOURCE_ACCESS_DENIED",
          "The requested source scope is unavailable.",
        );
        return;
      }
    }
    const { getNeonAiOperationService } = await import(
      "../infrastructure/database/neon/aiRuntime.js"
    );
    const result = await getNeonAiOperationService().execute({
      operationId,
      actorId: decoded.uid,
      workspaceId: input.workspaceId ?? undefined,
      input: input.input,
      sourceIds: input.sourceIds,
      idempotencyKey: idempotency.data,
      requestId: headerValue(req.headers?.["x-request-id"]) || randomUUID(),
    });
    sendJson(res, 200, result);
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      sendJson(res, 402, {
        code: "INSUFFICIENT_CREDITS",
        message: "There are not enough spendable credits for this operation.",
        required: Number(error.required),
        available: Number(error.available),
        operationId: error.operationId,
      });
      return;
    }
    if (error instanceof WorkflowConflictError) {
      sendJson(res, 409, {
        code:
          error.kind === "idempotency_mismatch"
            ? "IDEMPOTENCY_KEY_REUSED"
            : "WORKFLOW_CONFLICT",
        message: error.message,
        workflowRunId: error.workflow.id,
        status: error.workflow.status,
        terminal: error.kind === "idempotency_mismatch",
      });
      return;
    }
    if (error instanceof OperationExecutionError) {
      const code = PUBLIC_EXECUTION_CODES.has(error.code)
        ? error.code
        : "INTERNAL_ERROR";
      const status = statusForGatewayCode(code);
      sendJson(res, status, {
        code,
        message: publicOperationalMessage(
          status,
          "Mimi's operational service is temporarily unavailable.",
          error.message,
        ),
        workflowRunId: error.workflowRunId,
        terminal: error.terminal,
      });
      return;
    }
    const status = Number((error as { status?: unknown })?.status);
    const internalCode = String(
      (error as { code?: unknown })?.code || "INTERNAL_ERROR",
    );
    const code = PUBLIC_OPERATIONAL_CODES.has(internalCode)
      ? internalCode
      : "INTERNAL_ERROR";
    const message =
      error instanceof Error ? error.message : "The operation could not be completed.";
    console.error("MIMI // Operational AI route failed:", { code, message });
    sendOperationalError(
      res,
      Number.isFinite(status) && status >= 400 && status < 600 ? status : 500,
      code,
      publicOperationalMessage(
        Number.isFinite(status) ? status : 500,
        "Mimi's operational service is temporarily unavailable.",
        message,
      ),
    );
  }
}
