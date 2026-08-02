export interface TrendSource {
  title: string;
  url: string;
  credibility: number;
}

export interface ForecastTrend {
  format: string;
  velocity: "Surging" | "Rising" | "Decaying";
  score: number;
  sources: TrendSource[];
  analysis: string;
}

export interface ResearchSynthesisResponse {
  synthesis: string;
  trends: ForecastTrend[];
  provider: string; // Tells us which API actually supplied this
  /** True when the payload is a local fallback, not a live research pass. */
  simulated?: boolean;
}

type ForecastJson = {
  synthesis?: string;
  trends?: Array<{
    format?: string;
    velocity?: string;
    score?: number;
    analysis?: string;
    sources?: Array<{ title?: string; url?: string; credibility?: number }>;
  }>;
};

const EMPTY_FORECAST = (
  provider: string,
  reason: string,
): ResearchSynthesisResponse => ({
  provider,
  synthesis: reason,
  trends: [],
  simulated: false,
});

const normalizeVelocity = (value?: string): ForecastTrend["velocity"] => {
  const v = (value || "").toLowerCase();
  if (v.includes("surg")) return "Surging";
  if (v.includes("decay") || v.includes("fall") || v.includes("wan")) return "Decaying";
  return "Rising";
};

const parseForecastJson = (raw: string): ForecastJson | null => {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed) as ForecastJson;
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1)) as ForecastJson;
      } catch {
        return null;
      }
    }
    return null;
  }
};

const mapForecast = (
  parsed: ForecastJson,
  provider: string,
): ResearchSynthesisResponse => {
  const trends: ForecastTrend[] = (parsed.trends || [])
    .filter((t) => t?.format && t?.analysis)
    .slice(0, 6)
    .map((t) => ({
      format: String(t.format),
      velocity: normalizeVelocity(t.velocity),
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
    }));

  return {
    provider,
    synthesis:
      parsed.synthesis?.trim() ||
      "Forecast synthesis unavailable — no structured research returned.",
    trends,
    simulated: false,
  };
};

async function authHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  try {
    const { auth } = await import("./firebaseInit");
    const token = await auth.currentUser?.getIdToken();
    if (token) headers["x-user-token"] = `Bearer ${token}`;
  } catch {
    // Ghost / unsigned sessions still may use server gateway keys.
  }
  return headers;
}

async function fetchYouSearchArticles(
  query: string,
  apiKeys?: Record<string, string>,
): Promise<{
  articles: Array<{ title: string; url: string; summary?: string }>;
  provider: string;
  usable: boolean;
}> {
  const headers = await authHeaders();
  const youKey = apiKeys?.["you"] || apiKeys?.["you.com"] || apiKeys?.["YOU_COM_API_KEY"];
  if (youKey) headers["x-api-key"] = youKey;

  const res = await fetch("/api/you-search", {
    method: "POST",
    headers,
    body: JSON.stringify({ query, count: 8 }),
  });
  if (!res.ok) {
    throw new Error(`you-search failed (${res.status})`);
  }
  const payload = await res.json();
  const sourceMode = String(payload?.sourceMode || "");
  // local-demo invents costume URLs — do not feed them into Forecast citations.
  if (sourceMode === "local-demo") {
    return { articles: [], provider: "local-demo", usable: false };
  }
  const results = Array.isArray(payload?.results)
    ? payload.results
    : Array.isArray(payload?.articles)
      ? payload.articles
      : [];
  const articles = results
    .map((r: any) => ({
      title: String(r.title || r.name || ""),
      url: String(r.sourceUrl || r.url || ""),
      summary: String(r.summary || r.description || r.snippet || ""),
    }))
    .filter((a: { title: string; url: string }) => a.title && a.url);
  return {
    articles,
    provider: String(payload?.provider || sourceMode || "You.com"),
    usable: true,
  };
}

async function synthesizeViaGateway(
  evidence: string,
  providerLabel: string,
): Promise<ResearchSynthesisResponse> {
  const headers = await authHeaders();
  const res = await fetch("/api/mimi/generate-text", {
    method: "POST",
    headers,
    body: JSON.stringify({
      role: "textDeep",
      temperature: 0.4,
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
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message =
      err?.error?.message || err?.error || `generate-text failed (${res.status})`;
    throw new Error(typeof message === "string" ? message : "Forecast synthesis failed");
  }

  const payload = await res.json();
  const parsed = parseForecastJson(String(payload?.text || ""));
  if (!parsed) {
    return EMPTY_FORECAST(
      providerLabel,
      "Live synthesis returned unstructured text. Retry the content vector.",
    );
  }
  return mapForecast(parsed, `${providerLabel} → Mimi Gateway`);
}

/**
 * Live content forecast pipeline.
 * Prefer You.com / search evidence, then synthesize via /api/mimi/generate-text.
 * Never costume fake Exa/Perplexity/Tavily payloads when keys are present.
 */
export const fetchContentForecast = async (
  apiKeys?: Record<string, string>,
): Promise<ResearchSynthesisResponse> => {
  const query =
    "emerging content formats editorial archives slow web aesthetic communities 2026";

  try {
    const { articles, provider, usable } = await fetchYouSearchArticles(query, apiKeys);
    if (!usable || articles.length === 0) {
      return await synthesizeViaGateway(
        "No live search articles were returned. Produce at most 2 cautious trends with empty sources arrays. Do not invent URLs.",
        "Mimi Gateway",
      );
    }

    const evidence = articles
      .slice(0, 8)
      .map(
        (a, i) =>
          `[${i + 1}] ${a.title}\nURL: ${a.url}\n${a.summary || ""}`.trim(),
      )
      .join("\n\n");

    return await synthesizeViaGateway(evidence, provider);
  } catch (searchErr) {
    console.warn("MIMI // Forecast search unavailable, trying gateway-only:", searchErr);
    try {
      return await synthesizeViaGateway(
        "Search providers unavailable in this session. Produce at most 2 trends grounded in widely observed 2025–2026 editorial patterns. Leave sources as [].",
        "Mimi Gateway",
      );
    } catch (synthErr) {
      console.warn("MIMI // Forecast synthesis unavailable:", synthErr);
      return EMPTY_FORECAST(
        "Unavailable",
        "Content forecast is offline — configure AI Gateway / You.com, or sign in with membership credits. No simulated trend costume was invented.",
      );
    }
  }
};
