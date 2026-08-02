import { z } from "zod";
import { sendJson } from "./apiUtils.js";
import {
  publicOperationalMessage,
  requireOperationalMethod,
  sendOperationalError,
} from "./operationalApiResponse.js";
import { verifyMimiSession } from "./serverFirebaseAdmin.js";

const workspaceSchema = z.string().uuid().optional();

function safeCreditNumber(value: bigint): number {
  const number = Number(value);
  if (!Number.isSafeInteger(number)) {
    throw new Error("Credit amount exceeds the JSON safe-integer range.");
  }
  return number;
}

export async function handleCreditSummaryRoute(req: any, res: any) {
  if (!requireOperationalMethod(req, res, "GET")) return;
  try {
    const decoded = await verifyMimiSession(req.headers || {});
    const workspace = workspaceSchema.safeParse(req.query?.workspaceId);
    if (!workspace.success) {
      sendOperationalError(
        res,
        400,
        "INVALID_REQUEST",
        "workspaceId must be a UUID.",
      );
      return;
    }
    const { getNeonCreditService } = await import(
      "../infrastructure/database/neon/creditRuntime.js"
    );
    const { balance, membership } =
      await getNeonCreditService().getSummary(
        decoded.uid,
        workspace.data,
      );
    sendJson(res, 200, {
      available: safeCreditNumber(balance.available),
      reserved: safeCreditNumber(balance.reserved),
      plan: membership.plan,
      periodEndsAt: membership.currentPeriodEnd?.toISOString() ?? null,
      grants: balance.grants.map((grant) => ({
        source: grant.source,
        remaining: safeCreditNumber(grant.remainingAmount),
        expiresAt: grant.expiresAt?.toISOString() ?? null,
      })),
    });
  } catch (error) {
    const status = Number((error as { status?: unknown })?.status);
    const code = String(
      (error as { code?: unknown })?.code || "CREDIT_SUMMARY_FAILED",
    );
    const message =
      error instanceof Error ? error.message : "Credit summary is unavailable.";
    console.error("MIMI // Credit summary failed:", { code, message });
    const responseStatus =
      Number.isFinite(status) && status >= 400 && status < 600 ? status : 500;
    sendOperationalError(
      res,
      responseStatus,
      code,
      publicOperationalMessage(
        responseStatus,
        "Credit summary is temporarily unavailable.",
        message,
      ),
    );
  }
}
