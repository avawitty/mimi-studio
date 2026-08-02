import { cors, readJsonBody, sendError, sendJson, validateBody } from "../../lib/apiUtils.js";
import { isSovereignEnabled } from "../../lib/sovereign/db.js";
import { importZines, sovereignStatus, upsertProfile } from "../../lib/sovereign/store.js";
import type { UserProfile, ZineMetadata } from "../../types";

const importBodySchema = {
  safeParse: (
    input: unknown,
  ): {
    success: boolean;
    data?: { zines?: ZineMetadata[]; profiles?: UserProfile[] };
    error?: any;
  } => {
    const body = input as { zines?: ZineMetadata[]; profiles?: UserProfile[] };
    if (!Array.isArray(body?.zines) && !Array.isArray(body?.profiles)) {
      return {
        success: false,
        error: { issues: [{ path: ["zines"], message: "zines or profiles array required" }] },
      };
    }
    return { success: true, data: body };
  },
};

const authorizeImport = (req: any): boolean => {
  const ingestKey = process.env.MIMI_SOVEREIGN_INGEST_KEY?.trim();
  const provided =
    String(req.headers?.["x-mimi-ingest-key"] || "").trim() ||
    String(req.headers?.["x-api-key"] || "").trim();
  if (ingestKey) return Boolean(provided && provided === ingestKey);
  // Local / self-hosted without a key: allow (single-tenant archive).
  return !process.env.VERCEL;
};

/**
 * POST /api/sovereign/import
 * Bulk ingest for migrations. Prefer MIMI_SOVEREIGN_INGEST_KEY in shared hosts.
 */
export default async function handler(req: any, res: any) {
  if (cors(req, res)) return;
  if (req.method !== "POST") {
    return sendError(res, 405, `Method ${req.method} not allowed`, "METHOD_NOT_ALLOWED");
  }

  if (!isSovereignEnabled()) {
    return sendError(res, 503, "Sovereign archive disabled on this host.", "SOVEREIGN_DISABLED");
  }

  if (!authorizeImport(req)) {
    return sendError(res, 401, "Import requires MIMI_SOVEREIGN_INGEST_KEY", "UNAUTHORIZED");
  }

  try {
    const body = await readJsonBody(req);
    const parsed = validateBody<{ zines?: ZineMetadata[]; profiles?: UserProfile[] }>(
      res,
      importBodySchema,
      body,
    );
    if (!parsed) return;

    let profilesUpserted = 0;
    for (const profile of parsed.profiles || []) {
      if (!profile?.uid) continue;
      upsertProfile(profile);
      profilesUpserted += 1;
    }

    const { imported, skipped } = importZines(parsed.zines || []);
    return sendJson(res, 200, {
      ok: true,
      imported,
      skipped,
      profilesUpserted,
      archive: sovereignStatus(),
    });
  } catch (error: any) {
    return sendError(res, 500, error?.message || String(error), "SOVEREIGN_IMPORT_FAILED");
  }
}
