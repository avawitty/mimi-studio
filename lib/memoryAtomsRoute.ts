import { z } from "zod";
import { sendJson } from "./apiUtils.js";
import {
  publicOperationalMessage,
  requireOperationalMethod,
  sendOperationalError,
} from "./operationalApiResponse.js";
import { verifyMimiSession } from "./serverFirebaseAdmin.js";

const querySchema = z.object({
  projectId: z.string().trim().min(1).max(200).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

export async function handleMemoryAtomsRoute(req: any, res: any) {
  if (!requireOperationalMethod(req, res, "GET")) return;
  try {
    const decoded = await verifyMimiSession(req.headers || {});
    const query = querySchema.safeParse(req.query || {});
    if (!query.success) {
      sendOperationalError(
        res,
        400,
        "INVALID_REQUEST",
        query.error.issues[0]?.message || "Query is invalid.",
      );
      return;
    }
    const { getNeonMemoryRepositories } = await import(
      "../infrastructure/database/neon/memoryRuntime.js"
    );
    const atoms = await getNeonMemoryRepositories().listActiveAtoms(
      decoded.uid,
      query.data.projectId,
      query.data.limit,
    );
    sendJson(res, 200, {
      atoms: atoms.map((atom) => ({
        id: atom.id,
        projectId: atom.projectId,
        proposalId: atom.proposalId,
        atomType: atom.atomType,
        content: atom.content,
        confidence: atom.confidence,
        status: atom.status,
        createdAt: atom.createdAt.toISOString(),
        updatedAt: atom.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    const status = Number((error as { status?: unknown })?.status);
    const responseStatus =
      Number.isFinite(status) && status >= 400 && status < 600 ? status : 500;
    const internalMessage =
      error instanceof Error ? error.message : "Memory is unavailable.";
    console.error("MIMI // Memory atom read failed:", {
      code: (error as { code?: unknown })?.code,
      message: internalMessage,
    });
    sendOperationalError(
      res,
      responseStatus,
      responseStatus < 500 ? "MEMORY_READ_DENIED" : "MEMORY_READ_FAILED",
      publicOperationalMessage(
        responseStatus,
        "Memory is temporarily unavailable.",
        internalMessage,
      ),
    );
  }
}
