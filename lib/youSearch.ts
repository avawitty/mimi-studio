import {
  getServerAiGatewayKey,
  openAiMessagesViaGateway,
} from "./aiGatewayCompat.js";

export type YouSearchMappedResult = {
  sourceUrl: string;
  title: string;
  summary: string;
  domain: string;
  graphType: "web_reference";
  confidence: number;
  simulated?: boolean;
  aestheticSignals: {
    keywords: string[];
    references: string[];
    tone: string;
  };
};

export type YouSearchResponse = {
  results: YouSearchMappedResult[];
  simulated?: boolean;
  sourceMode?: "you.com" | "apify" | "gateway-synthesis" | "local-demo";
  notice?: string;
};

export function extractLooseKeywords(text: string): string[] {
  return Array.from(
    new Set(
      text
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .split(/\s+/)
        .filter((word) => word.length > 4)
        .slice(0, 18),
    ),
  );
}

export function extractCulturalReferences(text: string): string[] {
  const matches = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) ?? [];
  return Array.from(new Set(matches)).slice(0, 12);
}

export function inferTone(text: string): string {
  const lower = text.toLowerCase();
  if (lower.match(/luxury|atelier|editorial|heritage|craft/)) {
    return "elevated / editorial";
  }
  if (lower.match(/playful|cute|colorful|whimsical|youth/)) {
    return "playful / expressive";
  }
  if (lower.match(/minimal|clean|modern|system|utility/)) {
    return "minimal / structured";
  }
  if (lower.match(/dark|moody|subversive|underground|noir/)) {
    return "moody / subcultural";
  }
  return "general / contextual";
}

export function generateSimulatedYouResults(query: string): YouSearchMappedResult[] {
  const cleanQuery = query || "brutalist design";
  const domains = [
    "vogue.com",
    "thecut.com",
    "i-d.co",
    "anothermag.com",
    "dezeen.com",
    "archdaily.com",
  ];

  const mockArticles = [
    {
      title: `${cleanQuery.charAt(0).toUpperCase() + cleanQuery.slice(1)}: Aesthetic Coordinates of the Present Mode`,
      description: `An in-depth critique of ${cleanQuery} exploring the intersection of modern material studies with dynamic youth subcultures. Examining structural weight and visual negative space.`,
      domain: domains[0],
      url: `https://${domains[0]}/article/${encodeURIComponent(cleanQuery.replace(/\s+/g, "-"))}-structural-signals`,
    },
    {
      title: `The Seeding Ground of ${cleanQuery.toUpperCase()}`,
      description: `How contemporary curators are archives of ${cleanQuery} to redefine brand narrative and semiotic signals. Tracing lines from historical analogue warm dial memories to digital monoliths.`,
      domain: domains[1],
      url: `https://${domains[1]}/editorial/seeding-ground-of-${encodeURIComponent(cleanQuery.replace(/\s+/g, "-"))}`,
    },
    {
      title: `Materiality & Resonance in ${cleanQuery.charAt(0).toUpperCase() + cleanQuery.slice(1)}`,
      description: `Exploring raw canvas, structured negative space, and concrete brutalism. A complete guide to sovereign taste, tactile textiles, and the limits of findability in mechanical search databases.`,
      domain: domains[2],
      url: `https://${domains[2]}/fashion/materiality-resonance-${encodeURIComponent(cleanQuery.replace(/\s+/g, "-"))}`,
    },
    {
      title: `A Sovereign Study: Under the Hood of ${cleanQuery.charAt(0).toUpperCase() + cleanQuery.slice(1)}`,
      description: `An archival investigation into ${cleanQuery} across creative communities. Standard digital noise is filtered out in favor of clean high-contrast monochrome design language and microtonal harmonics.`,
      domain: domains[3],
      url: `https://${domains[3]}/design/sovereign-study-on-${encodeURIComponent(cleanQuery.replace(/\s+/g, "-"))}`,
    },
  ];

  return mockArticles.map((art) => {
    const text = `${art.title} ${art.description}`;
    return {
      sourceUrl: art.url,
      title: art.title,
      summary: art.description,
      domain: art.domain,
      graphType: "web_reference" as const,
      confidence: 0.88,
      simulated: true,
      aestheticSignals: {
        keywords: extractLooseKeywords(text),
        references: extractCulturalReferences(text),
        tone: inferTone(text),
      },
    };
  });
}

export async function fetchYouSearchForMimiGraph(params: {
  apiKey: string;
  query: string;
  includeDomains?: string[];
  count?: number;
}): Promise<YouSearchMappedResult[]> {
  const { apiKey, query, includeDomains = [], count = 10 } = params;
  const url = new URL("https://api.you.com/v1/search");
  url.searchParams.set("query", query);
  url.searchParams.set("count", String(count));
  if (includeDomains.length > 0) {
    url.searchParams.set("include_domains", includeDomains.join(","));
  }
  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "X-API-Key": apiKey,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    throw new Error(`You.com Search API error: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  const webResults = data.web ?? [];
  return webResults.map((result: any) => {
    const sourceUrl = result.url;
    let domain = "";
    try {
      domain = new URL(sourceUrl).hostname.replace(/^www\./, "");
    } catch {
      domain = "unknown";
    }
    const text = [result.title, result.description, ...(result.snippets ?? [])]
      .filter(Boolean)
      .join(" ");

    return {
      sourceUrl,
      title: result.title ?? "Untitled reference",
      summary: result.description ?? result.snippets?.[0] ?? "",
      domain,
      graphType: "web_reference" as const,
      confidence: 0.72,
      aestheticSignals: {
        keywords: extractLooseKeywords(text),
        references: extractCulturalReferences(text),
        tone: inferTone(text),
      },
    };
  });
}

/**
 * Optional Apify path: use RAG Web Browser for allowlisted domain discovery.
 * Requires APIFY_TOKEN. Prefer low maxResults for serverless latency.
 */
export async function fetchApifyResearchLeads(params: {
  token: string;
  query: string;
  includeDomains?: string[];
  count?: number;
}): Promise<YouSearchMappedResult[]> {
  const { token, query, includeDomains = [], count = 5 } = params;
  const domainClause =
    includeDomains.length > 0
      ? includeDomains.map((d) => `site:${d.replace(/^www\./, "")}`).join(" OR ")
      : "";
  const fullQuery = domainClause ? `${query} ${domainClause}` : query;

  const actorId = encodeURIComponent("apify/rag-web-browser");
  const url = `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${encodeURIComponent(token)}&timeout=55`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: fullQuery,
      maxResults: Math.min(Math.max(count, 1), 8),
      outputFormats: ["markdown"],
    }),
    signal: AbortSignal.timeout(58000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Apify research failed: ${res.status} ${body.slice(0, 200)}`);
  }

  const items = (await res.json()) as any[];
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Apify returned no research items.");
  }

  return items.slice(0, count).map((item, index) => {
    const sourceUrl = String(item.url || item.crawl?.loadedUrl || "");
    let domain = "apify";
    try {
      if (sourceUrl) domain = new URL(sourceUrl).hostname.replace(/^www\./, "");
    } catch {
      domain = "apify";
    }
    const title =
      String(item.metadata?.title || item.title || "").trim() ||
      `Apify research lead ${index + 1}`;
    const summary = String(
      item.text || item.markdown || item.description || item.metadata?.description || "",
    )
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 420);
    const text = `${title} ${summary}`;
    return {
      sourceUrl,
      title,
      summary: summary || "Apify extracted page content for this research lead.",
      domain,
      graphType: "web_reference" as const,
      confidence: 0.78,
      aestheticSignals: {
        keywords: extractLooseKeywords(text),
        references: extractCulturalReferences(text),
        tone: inferTone(text),
      },
    };
  });
}

async function synthesizeViaGateway(
  query: string,
  includeDomains: string[],
  gatewayKey: string,
): Promise<YouSearchMappedResult[]> {
  const gatewayResult = await openAiMessagesViaGateway(
    [
      {
        role: "user",
        content: `Build 6 concise research leads for this creative-intelligence query: ${query.trim()}.
Requested domains, if useful: ${includeDomains.length ? includeDomains.join(", ") : "none"}.
Return only JSON in this shape:
{"results":[{"title":"...","summary":"...","confidence":0.0,"keywords":["..."],"references":["..."],"tone":"..."}]}
Do not claim that you browsed the live web and do not invent URLs.`,
      },
    ],
    "You are Mimi's provider-neutral Web Intelligence synthesizer. Produce useful, clearly inferential research hypotheses from model knowledge. Never present synthesis as current live search or fabricate citations.",
    0.35,
    gatewayKey,
    "openai",
  );
  const raw = String(gatewayResult?.choices?.[0]?.message?.content || "")
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const parsed = JSON.parse(raw);
  const leads = Array.isArray(parsed?.results) ? parsed.results.slice(0, 10) : [];
  return leads.map((lead: any, index: number) => ({
    sourceUrl: "",
    title: lead.title || `Gateway research lead ${index + 1}`,
    summary: lead.summary || "",
    domain: "ai-gateway-synthesis",
    graphType: "web_reference" as const,
    confidence: Math.max(0.35, Math.min(0.85, Number(lead.confidence) || 0.62)),
    aestheticSignals: {
      keywords: Array.isArray(lead.keywords) ? lead.keywords : [],
      references: Array.isArray(lead.references) ? lead.references : [],
      tone: lead.tone || "interpretive",
    },
  }));
}

export async function runYouSearch(params: {
  query: string;
  includeDomains?: string[];
  count?: number;
  youApiKey?: string;
}): Promise<YouSearchResponse> {
  const query = String(params.query || "").trim();
  const includeDomains = Array.isArray(params.includeDomains)
    ? params.includeDomains.map((d) => String(d).trim()).filter(Boolean)
    : [];
  const count = typeof params.count === "number" ? params.count : 10;
  const apiKey =
    (params.youApiKey || "").trim() ||
    String(process.env.YOU_API_KEY || process.env.YOU_COM_API_KEY || "").trim();
  const apifyToken = String(process.env.APIFY_TOKEN || "").trim();
  const gatewayKey = getServerAiGatewayKey();

  if (!query) {
    throw Object.assign(new Error("Query string is required."), {
      status: 400,
      code: "MISSING_QUERY",
    });
  }

  if (apiKey) {
    try {
      const results = await fetchYouSearchForMimiGraph({
        apiKey,
        query,
        includeDomains,
        count,
      });
      return { results, sourceMode: "you.com" };
    } catch (searchError: any) {
      console.warn(
        "MIMI // Real You.com search failed. Trying Apify / gateway / demo:",
        searchError,
      );
    }
  }

  if (apifyToken) {
    try {
      const results = await fetchApifyResearchLeads({
        token: apifyToken,
        query,
        includeDomains,
        count: Math.min(count, 5),
      });
      return {
        results,
        sourceMode: "apify",
        notice:
          "Live research via Apify RAG Web Browser. Results are scraped page extracts from your query and domain filters.",
      };
    } catch (apifyError: any) {
      console.warn("MIMI // Apify research failed. Falling back:", apifyError);
    }
  }

  if (gatewayKey) {
    try {
      const results = await synthesizeViaGateway(query, includeDomains, gatewayKey);
      return {
        results,
        simulated: true,
        sourceMode: "gateway-synthesis",
        notice:
          "AI Gateway synthesis is active. These are model-generated research leads, not live web results. Connect You.com or Apify for current sources and citations.",
      };
    } catch (gatewayError: any) {
      console.warn(
        "MIMI // AI Gateway research synthesis failed. Falling back to local demo data:",
        gatewayError,
      );
    }
  }

  console.warn("MIMI // Live search is not configured. Serving labeled local demo coordinates.");
  return {
    results: generateSimulatedYouResults(query),
    simulated: true,
    sourceMode: "local-demo",
    notice:
      "Local demo data is active. Configure YOU_API_KEY / YOU_COM_API_KEY, APIFY_TOKEN, or AI Gateway for live or synthesized research.",
  };
}
