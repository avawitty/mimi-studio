/**
 * Server-side forecast composition — search evidence, build ForecastReport, persist snapshot.
 */

import { generateGatewayText } from "../ai/generate.js";
import { getServerAiGatewayKey } from "../aiGatewayCompat.js";
import { getServerFirebaseAdmin } from "../serverFirebaseAdmin.js";
import {
  buildForecastSearchQuery,
  type ForecastIntakeScope,
  type ForecastIntakeSnapshot,
} from "../forecastIntake.js";
import { runYouSearch } from "../youSearch.js";
import { buildForecastReport } from "../../services/collective/buildForecastReport.js";
import { loadApprovedFeedEntries } from "../../services/collective/approvedFeeds.js";
import { loadMeanMedianModeReport } from "../../services/collective/loadMeanMedianModeReport.js";
import { forecastReportSchema, type ForecastReport } from "../../schemas/collectiveIntelligenceContracts.js";
import {
  residueForecastArtifactSchema,
  type ResidueForecastArtifact,
} from "../../services/residue/adapters/forecastAdapter.js";
import { RESIDUE_COLLECTION } from "../../services/residue/constants.js";
import type { ResearchSynthesisResponse } from "../../services/researchService.js";
import type { UserPreferences, UserProfile } from "../../types.js";

export type ForecastSnapshot = {
  scope: ForecastIntakeScope;
  savedAt: number;
  report: ForecastReport;
  contentProvider?: string;
  residueForecast?: ResidueForecastArtifact | null;
};

type AdminDb = {
  collection: (path: string) => {
    doc: (id: string) => {
      get: () => Promise<{ exists: boolean; data: () => unknown }>;
      set: (data: unknown, opts?: { merge?: boolean }) => Promise<void>;
    };
  };
  collectionGroup?: never;
};

type ArtifactQuery = {
  where: (field: string, op: string, value: unknown) => ArtifactQuery;
  get: () => Promise<{ docs: Array<{ id: string; data: () => unknown }> }>;
};

type UsersCollection = {
  doc: (id: string) => {
    collection: (sub: string) => ArtifactQuery;
  };
};

async function loadServerUserProfile(
  db: AdminDb & { collection: (path: string) => any },
  uid: string,
): Promise<UserProfile | null> {
  const [pubSnap, prefSnap] = await Promise.all([
    db.collection("profiles_public").doc(uid).get(),
    db.collection("userPreferences").doc(uid).get(),
  ]);
  if (!pubSnap.exists) return null;
  const identity = pubSnap.data() as UserProfile;
  const prefs = prefSnap.exists ? (prefSnap.data() as UserPreferences) : {};
  return { ...identity, ...prefs, uid };
}

async function loadLatestResidueForecast(
  db: AdminDb & { collection: (path: string) => any },
  uid: string,
): Promise<ResidueForecastArtifact | null> {
  try {
    const usersCol = db.collection("users") as unknown as UsersCollection;
    const snap = await usersCol
      .doc(uid)
      .collection(RESIDUE_COLLECTION.artifacts)
      .where("kind", "==", "forecast")
      .get();
    const sorted = snap.docs
      .map((d) => d.data() as { payload?: unknown; createdAt?: string })
      .filter((d) => d.payload)
      .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
    if (!sorted[0]?.payload) return null;
    return residueForecastArtifactSchema.parse(sorted[0].payload);
  } catch (err) {
    console.warn("MIMI // loadLatestResidueForecast failed:", err);
    return null;
  }
}

async function synthesizeContentForecast(
  evidence: string,
  providerLabel: string,
  apiKey: string,
): Promise<ResearchSynthesisResponse> {
  const text = await generateGatewayText({
    role: "textDeep",
    temperature: 0.4,
    apiKey,
    system:
      "You are Mimi's content forecast engine. Return ONLY valid JSON. Never invent URLs — only cite URLs present in the evidence. If evidence is thin, return fewer trends.",
    prompt: `Synthesize a content-format forecast from the evidence below.

Return JSON:
{
  "synthesis": "2-4 sentences",
  "trends": [
    {
      "format": "short format name",
      "velocity": "Surging" | "Rising" | "Decaying",
      "score": 0-100,
      "analysis": "1-2 sentences",
      "sources": [{ "title": "...", "url": "https://...", "credibility": 0-1 }]
    }
  ]
}

EVIDENCE:
${evidence}`,
  });

  const raw = String(text || "").trim();
  let parsed: {
    synthesis?: string;
    trends?: Array<{
      format?: string;
      velocity?: ResearchSynthesisResponse["trends"][number]["velocity"];
      score?: number;
      analysis?: string;
      sources?: Array<{ title?: string; url?: string; credibility?: number }>;
    }>;
  } | null = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        parsed = JSON.parse(raw.slice(start, end + 1));
      } catch {
        parsed = null;
      }
    }
  }

  if (!parsed) {
    return {
      provider: providerLabel,
      synthesis: "Live synthesis returned unstructured text.",
      trends: [],
      simulated: false,
    };
  }

  return {
    provider: `${providerLabel} → Mimi Gateway`,
    synthesis:
      parsed.synthesis?.trim() ||
      "Forecast synthesis unavailable — no structured research returned.",
    trends: (parsed.trends || [])
      .filter((t) => t?.format && t?.analysis)
      .slice(0, 6)
      .map((t) => ({
        format: String(t.format),
        velocity: t.velocity || "Rising",
        score: Math.max(0, Math.min(100, Number(t.score) || 50)),
        analysis: String(t.analysis),
        sources: (t.sources || [])
          .filter((s) => s?.title && s?.url)
          .slice(0, 4)
          .map((s) => ({
            title: String(s.title),
            url: String(s.url),
            credibility: Math.max(0, Math.min(1, Number(s.credibility) || 0.7)),
          })),
      })),
    simulated: false,
  };
}

export async function composeServerContentForecast(input: {
  query: string;
  uid: string;
  gatewayKey: string;
}): Promise<ResearchSynthesisResponse> {
  const search = await runYouSearch({
    query: input.query,
    count: 8,
    authenticatedUid: input.uid,
  });

  if (search.sourceMode === "local-demo") {
    return synthesizeContentForecast(
      "No live search articles were returned. Produce at most 2 cautious trends with empty sources arrays. Do not invent URLs.",
      "Mimi Gateway",
      input.gatewayKey,
    );
  }

  const articles = (search.results || [])
    .map((r) => ({
      title: String(r.title || ""),
      url: String(r.sourceUrl || ""),
      summary: String(r.summary || ""),
    }))
    .filter((a) => a.title && a.url);

  if (articles.length === 0) {
    return synthesizeContentForecast(
      "Search returned no usable URLs. Produce at most 2 cautious trends with empty sources arrays.",
      String(search.sourceMode || "Mimi Gateway"),
      input.gatewayKey,
    );
  }

  const evidence = articles
    .slice(0, 8)
    .map((a, i) => `[${i + 1}] ${a.title}\nURL: ${a.url}\n${a.summary || ""}`.trim())
    .join("\n\n");

  return synthesizeContentForecast(
    evidence,
    String(search.sourceMode || "you.com"),
    input.gatewayKey,
  );
}

export async function composeForecastSnapshot(input: {
  uid: string;
  scope: ForecastIntakeScope;
  profile: UserProfile;
  gatewayKey: string;
  db: AdminDb & { collection: (path: string) => any };
}): Promise<ForecastSnapshot> {
  const intake = input.profile.forecastIntake as ForecastIntakeSnapshot | undefined;
  const query = buildForecastSearchQuery({
    scope: input.scope,
    intake: intake ?? null,
    profile: input.profile,
  });

  const [external, residueForecast] = await Promise.all([
    composeServerContentForecast({
      query,
      uid: input.uid,
      gatewayKey: input.gatewayKey,
    }),
    loadLatestResidueForecast(input.db, input.uid),
  ]);

  const observed = loadMeanMedianModeReport("demonstration");
  const feedEntryCount = loadApprovedFeedEntries().length;
  const report = buildForecastReport({
    observed,
    external,
    feedEntryCount,
    runId: `forecast-server-${Date.now()}`,
  });
  forecastReportSchema.parse(report);

  return {
    scope: input.scope,
    savedAt: Date.now(),
    report,
    contentProvider: external.provider,
    residueForecast,
  };
}

export async function persistForecastSnapshot(
  db: AdminDb & { collection: (path: string) => any },
  uid: string,
  snapshot: ForecastSnapshot,
): Promise<void> {
  await db.collection("userPreferences").doc(uid).set(
    {
      forecastSnapshot: snapshot,
    },
    { merge: true },
  );
}

export async function handleForecastCompose(input: {
  uid: string;
  scope: ForecastIntakeScope;
}): Promise<ForecastSnapshot> {
  const { db } = getServerFirebaseAdmin();
  if (!db) {
    throw Object.assign(new Error("Firestore is temporarily unavailable."), {
      status: 503,
      code: "FIREBASE_ADMIN_UNAVAILABLE",
    });
  }

  const gatewayKey = getServerAiGatewayKey();
  if (!gatewayKey) {
    throw Object.assign(new Error("AI Gateway is not configured on this server."), {
      status: 503,
      code: "server_gateway_unconfigured",
    });
  }

  const profile = await loadServerUserProfile(db, input.uid);
  if (!profile) {
    throw Object.assign(new Error("Profile not found."), {
      status: 404,
      code: "PROFILE_NOT_FOUND",
    });
  }

  const snapshot = await composeForecastSnapshot({
    uid: input.uid,
    scope: input.scope,
    profile,
    gatewayKey,
    db,
  });

  await persistForecastSnapshot(db, input.uid, snapshot);
  return snapshot;
}
