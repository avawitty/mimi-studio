/**
 * Residue Apify acquisition API — Phase 9.
 * GET  → availability (no secrets)
 * POST → live acquire (requires signed-in session + APIFY_TOKEN)
 *
 * Residue provider modules + Firebase Admin are loaded lazily — static imports
 * of that graph crash Vercel isolates (FUNCTION_INVOCATION_FAILED).
 */

import { cors, readJsonBody, sendError, sendJson } from "../lib/apiUtils.js";
import { extractMimiSessionToken } from "../lib/mimiSessionToken.js";

const RESIDUE_APIFY_QUOTA_WINDOW_MS = 60 * 60 * 1000;
const RESIDUE_APIFY_QUOTA_MAX = 6;
const residueApifyQuotaByUid = new Map<string, { windowStart: number; count: number }>();

function peekQuota(uid: string, now = Date.now()): boolean {
  const existing = residueApifyQuotaByUid.get(uid);
  if (!existing || now - existing.windowStart >= RESIDUE_APIFY_QUOTA_WINDOW_MS) return true;
  return existing.count < RESIDUE_APIFY_QUOTA_MAX;
}

function consumeQuota(uid: string, now = Date.now()): boolean {
  const existing = residueApifyQuotaByUid.get(uid);
  if (!existing || now - existing.windowStart >= RESIDUE_APIFY_QUOTA_WINDOW_MS) {
    residueApifyQuotaByUid.set(uid, { windowStart: now, count: 1 });
    return true;
  }
  if (existing.count >= RESIDUE_APIFY_QUOTA_MAX) return false;
  existing.count += 1;
  return true;
}

export default async function handler(req: any, res: any) {
  if (cors(req, res)) return;

  if (req.method === "GET") {
    const [
      { createApifySourceAcquisitionProvider },
      { resolveResidueApifyActorId },
    ] = await Promise.all([
      import("../services/residue/acquisition/providers/apify/apifySourceAcquisitionProvider.js"),
      import("../services/residue/acquisition/providers/apify/actorRegistry.js"),
    ]);
    const provider = createApifySourceAcquisitionProvider();
    sendJson(res, 200, {
      available: provider.isAvailable(),
      actorId: resolveResidueApifyActorId(),
      notice: provider.isAvailable()
        ? "Apify token configured. Signed-in POST /api/residue-acquire runs live acquisition."
        : "APIFY_TOKEN not configured. Residue still runs offline on manual notes/URLs.",
    });
    return;
  }

  if (req.method !== "POST") {
    sendError(res, 405, "Method not allowed.", "METHOD_NOT_ALLOWED");
    return;
  }

  try {
    const [
      { createApifySourceAcquisitionProvider },
      { resolveResidueApifyActorId },
      { normalizeSources },
      { sourceAcquisitionRequestSchema },
    ] = await Promise.all([
      import("../services/residue/acquisition/providers/apify/apifySourceAcquisitionProvider.js"),
      import("../services/residue/acquisition/providers/apify/actorRegistry.js"),
      import("../services/residue/shared/normalizeSources.js"),
      import("../services/residue/validation.js"),
    ]);

    const body = await readJsonBody(req);
    const parsed = sourceAcquisitionRequestSchema.safeParse({
      inquiry: body?.inquiry || body?.query || body?.experience,
      mode: body?.mode || "cultural",
      sourceUrls: body?.sourceUrls,
      searchTerms: body?.searchTerms,
      maxItems: body?.maxItems ?? 5,
    });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      sendError(
        res,
        400,
        `${issue?.path?.join(".") || "body"}: ${issue?.message || "Invalid body"}`,
        "INVALID_BODY",
      );
      return;
    }

    const provider = createApifySourceAcquisitionProvider();
    if (!provider.isAvailable()) {
      sendJson(res, 200, {
        status: "disabled",
        sources: [],
        sourceReferences: [],
        providerRuns: [],
        failures: [],
        warnings: [
          "APIFY_TOKEN not provided. Apify source acquisition disabled.",
        ],
      });
      return;
    }

    let authenticatedUid: string | null = null;
    const sessionToken = extractMimiSessionToken(req.headers || {});
    if (!sessionToken) {
      sendError(
        res,
        401,
        "Sign in required for billable Residue Apify acquisition.",
        "MISSING_MIMI_SESSION",
      );
      return;
    }
    try {
      const { verifyMimiSession } = await import("../lib/serverFirebaseAdmin.js");
      const decoded = await verifyMimiSession(req.headers);
      authenticatedUid = decoded.uid || null;
    } catch (sessionError: any) {
      const status = Number(sessionError?.status) || 401;
      sendError(
        res,
        status,
        sessionError?.message || "Mimi sign-in is required.",
        sessionError?.code || "AUTH_FAILED",
      );
      return;
    }

    if (!authenticatedUid || !peekQuota(authenticatedUid)) {
      sendError(
        res,
        429,
        "Residue Apify quota exceeded for this hour. Try again later or run offline.",
        "RESIDUE_APIFY_QUOTA_EXCEEDED",
      );
      return;
    }

    // Emotional mode: never forward raw experience text — expect redacted inquiry from client.
    const request = {
      ...parsed.data,
      inquiry:
        parsed.data.mode === "emotional" && !/^\[redacted/i.test(parsed.data.inquiry)
          ? "[redacted-emotional-input]"
          : parsed.data.inquiry,
    };

    const result = await provider.acquire(request);
    if (result.status === "success" || result.status === "partial") {
      consumeQuota(authenticatedUid);
    }

    const sourceReferences = normalizeSources({
      acquired: result.sources,
      accessedAt: new Date().toISOString(),
    });

    sendJson(res, 200, {
      ...result,
      sourceReferences,
      actorId: resolveResidueApifyActorId(),
    });
  } catch (error: any) {
    console.error("MIMI // Residue Apify API error:", error);
    sendError(res, 500, error?.message || "Residue Apify acquisition failed.");
  }
}
