import { z } from "zod";
import {
  readJsonBody,
  sendJson,
} from "./apiUtils.js";
import {
  publicOperationalMessage,
  requireOperationalMethod,
  sendOperationalError,
} from "./operationalApiResponse.js";
import { verifyMimiSession } from "./serverFirebaseAdmin.js";

const bodySchema = z.object({
  proposalIds: z.array(z.string().uuid()).min(1).max(50),
});

function headerValue(value: unknown): string {
  return String(Array.isArray(value) ? value[0] : value || "").trim();
}

export async function handleMemoryApprovalRoute(req: any, res: any) {
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
    const parsedBody = bodySchema.safeParse(await readJsonBody(req));
    if (!parsedBody.success) {
      sendOperationalError(
        res,
        400,
        "INVALID_REQUEST",
        parsedBody.error.issues[0]?.message || "Request body is invalid.",
      );
      return;
    }
    const body = parsedBody.data;
    const { getNeonMemoryApprovalService } = await import(
      "../infrastructure/database/neon/memoryRuntime.js"
    );
    const atoms = await getNeonMemoryApprovalService().execute({
      actorId: decoded.uid,
      proposalIds: body.proposalIds,
      idempotencyKey: idempotency.data,
    });
    sendJson(res, 200, {
      status: "approved",
      atoms: atoms.map((atom) => ({
        id: atom.id,
        proposalId: atom.proposalId,
        atomType: atom.atomType,
        content: atom.content,
        confidence: atom.confidence,
        status: atom.status,
        createdAt: atom.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    const status = Number((error as { status?: unknown })?.status);
    const internalCode = String(
      (error as { code?: unknown })?.code || "MEMORY_APPROVAL_FAILED",
    );
    const code = new Set([
      "MISSING_MIMI_SESSION",
      "INVALID_MIMI_SESSION",
      "FIREBASE_ADMIN_UNAVAILABLE",
      "SOURCE_ACCESS_DENIED",
      "IDEMPOTENCY_KEY_REUSED",
    ]).has(internalCode)
      ? internalCode
      : "MEMORY_APPROVAL_FAILED";
    const message =
      error instanceof Error
        ? error.message
        : "Memory proposals could not be approved.";
    console.error("MIMI // Memory approval failed:", { code, message });
    const candidateStatus =
      Number.isFinite(status) && status >= 400 && status < 600 ? status : 500;
    const responseStatus =
      code === "MEMORY_APPROVAL_FAILED" ? 500 : candidateStatus;
    sendOperationalError(
      res,
      responseStatus,
      code,
      publicOperationalMessage(
        responseStatus,
        "Memory approval is temporarily unavailable.",
        message,
      ),
    );
  }
}
