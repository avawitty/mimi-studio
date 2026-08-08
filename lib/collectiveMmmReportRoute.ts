/**
 * GET /api/collective/mmm-report
 * Live collective perception: Mean Median Mode + Mesopic from consented public structure.
 */

import { cors, requireMethod, sendError, sendJson } from "./apiUtils.js";
import { buildCollectivePerceptionReports } from "../services/collective/buildMeanMedianModeReport.js";
import { extractSignalsFromCorpus } from "../services/collective/loadConsentedPublicCorpus.js";
import type { ZineMetadata } from "../types.js";

async function loadPublicZineCorpus(limit = 200): Promise<ZineMetadata[]> {
  try {
    const { isSovereignEnabled, getSovereignDb } = await import("./sovereign/db.js");
    const { listPublicZines } = await import("./sovereign/store.js");
    if (isSovereignEnabled()) {
      const db = await getSovereignDb();
      if (db) {
        const zines = await listPublicZines(limit);
        if (zines.length > 0) return zines;
      }
    }
  } catch (err) {
    console.warn("MIMI // collective mmm-report sovereign read failed:", err);
  }

  try {
    const { getServerFirebaseAdmin } = await import("./serverFirebaseAdmin.js");
    const { db } = getServerFirebaseAdmin();
    if (!db) return [];

    const snap = await db
      .collection("zines")
      .where("isPublic", "==", true)
      .limit(Math.min(limit * 2, 400))
      .get();

    return snap.docs
      .map((doc: { id: string; data: () => ZineMetadata }) => ({
        ...(doc.data() as ZineMetadata),
        id: doc.id,
      }))
      .sort(
        (a: ZineMetadata, b: ZineMetadata) =>
          (b.timestamp || b.createdAt || 0) - (a.timestamp || a.createdAt || 0),
      )
      .slice(0, limit);
  } catch (err) {
    console.warn("MIMI // collective mmm-report firestore read failed:", err);
    return [];
  }
}

export async function handleCollectiveMmmReportRoute(req: any, res: any) {
  if (cors(req, res)) return;
  if (!requireMethod(req, res, "GET")) return;

  try {
    const rawDays = Number(req.query?.days ?? 7);
    const days = Number.isFinite(rawDays) ? Math.min(Math.max(rawDays, 1), 90) : 7;
    const windowMs = days * 24 * 60 * 60 * 1000;

    const zines = await loadPublicZineCorpus(200);
    const corpus = extractSignalsFromCorpus(zines);
    const { meanMedianMode, mesopic } = buildCollectivePerceptionReports(corpus.signals, {
      windowMs,
      runId: `live-collective-${Date.now()}`,
    });

    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    return sendJson(res, 200, {
      report: meanMedianMode,
      mesopic,
      corpus: {
        zinesScanned: corpus.zinesScanned,
        contributingZines: corpus.contributingZines,
        signalCount: corpus.signals.length,
        windowDays: days,
      },
    });
  } catch (error: any) {
    return sendError(
      res,
      500,
      error?.message || String(error),
      "COLLECTIVE_MMM_REPORT_FAILED",
    );
  }
}
