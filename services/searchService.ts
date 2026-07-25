import { collection, getDocs, query, where } from "firebase/firestore";
import { auth, db } from "./firebase";
import { getClient } from "./geminiClient";
import { getLocalPocket, getLocalZines } from "./localArchive";

export type CreatorArchiveHit = {
  id: string;
  type: "zine" | "pocket";
  title: string;
  snippet?: string;
  relevanceScore: number;
  url?: string;
  content_preview?: string;
  display_image?: string;
};

export type SearchGroundingResult = {
  results: CreatorArchiveHit[];
  summary: string;
};

const tokenize = (value: string): string[] =>
  value
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter((token) => token.length > 2);

const scoreText = (haystack: string, tokens: string[]): number => {
  if (!tokens.length || !haystack.trim()) return 0;
  const normalized = haystack.toLowerCase();
  let hits = 0;
  for (const token of tokens) {
    if (normalized.includes(token)) hits += 1;
  }
  return hits / tokens.length;
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const readString = (...values: unknown[]): string => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
};

const pocketSnippet = (item: Record<string, unknown>): string => {
  const content = asRecord(item.content);
  return readString(
    item.notes,
    content.text,
    content.prompt,
    content.summary,
    content.url,
    item.source,
    Array.isArray(item.tags) ? item.tags.join(" ") : "",
  );
};

const zineSnippet = (item: Record<string, unknown>): string =>
  readString(
    item.summary,
    item.concept,
    item.theme,
    item.tone,
    item.editorialCompileMarkdown,
    Array.isArray(item.fragmentsUsed) ? item.fragmentsUsed.join(" ") : "",
  );

const rankArchive = (
  searchQuery: string,
  zines: Record<string, unknown>[],
  pocketItems: Record<string, unknown>[],
): CreatorArchiveHit[] => {
  const tokens = tokenize(searchQuery);
  const scored: CreatorArchiveHit[] = [];

  for (const zine of zines) {
    const id = readString(zine.id);
    if (!id) continue;
    const title = readString(zine.title) || "Untitled zine";
    const snippet = zineSnippet(zine);
    const relevanceScore = Math.max(
      scoreText(`${title} ${snippet}`, tokens),
      // Soft floor so an empty archive query still surfaces recent work.
      tokens.length === 0 ? 0.35 : 0.05,
    );
    if (relevanceScore < 0.12 && tokens.length > 0) continue;
    scored.push({
      id,
      type: "zine",
      title,
      snippet: snippet.slice(0, 280) || undefined,
      content_preview: snippet.slice(0, 280) || undefined,
      relevanceScore,
      display_image: readString(zine.coverImageUrl) || undefined,
    });
  }

  for (const item of pocketItems) {
    const id = readString(item.id);
    if (!id) continue;
    const title = readString(item.title) || "Untitled pocket item";
    const snippet = pocketSnippet(item);
    const content = asRecord(item.content);
    const relevanceScore = Math.max(
      scoreText(`${title} ${snippet}`, tokens),
      tokens.length === 0 ? 0.3 : 0.05,
    );
    if (relevanceScore < 0.12 && tokens.length > 0) continue;
    scored.push({
      id,
      type: "pocket",
      title,
      snippet: snippet.slice(0, 280) || undefined,
      content_preview: snippet.slice(0, 280) || undefined,
      relevanceScore,
      url: readString(content.url, item.source) || undefined,
      display_image: readString(content.imageUrl, content.url) || undefined,
    });
  }

  return scored
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 12);
};

const loadCreatorArchive = async (
  userId?: string,
): Promise<{
  zines: Record<string, unknown>[];
  pocketItems: Record<string, unknown>[];
}> => {
  const localZines = (await getLocalZines().catch(() => [])) as Record<
    string,
    unknown
  >[];
  const localPocket = (await getLocalPocket().catch(() => [])) as Record<
    string,
    unknown
  >[];

  const uid = auth.currentUser?.uid || userId;
  if (!uid || uid === "ghost" || !auth.currentUser) {
    return { zines: localZines, pocketItems: localPocket };
  }

  try {
    const [zinesSnapshot, pocketSnapshot] = await Promise.all([
      getDocs(query(collection(db, "zines"), where("userId", "==", uid))),
      getDocs(query(collection(db, "pocket"), where("userId", "==", uid))),
    ]);
    const cloudZines = zinesSnapshot.docs.map((entry) => ({
      id: entry.id,
      ...entry.data(),
    })) as Record<string, unknown>[];
    const cloudPocket = pocketSnapshot.docs.map((entry) => ({
      id: entry.id,
      ...entry.data(),
    })) as Record<string, unknown>[];

    const zineMap = new Map<string, Record<string, unknown>>();
    [...localZines, ...cloudZines].forEach((item) => {
      const id = readString(item.id);
      if (id) zineMap.set(id, item);
    });
    const pocketMap = new Map<string, Record<string, unknown>>();
    [...localPocket, ...cloudPocket].forEach((item) => {
      const id = readString(item.id);
      if (id) pocketMap.set(id, item);
    });

    return {
      zines: [...zineMap.values()],
      pocketItems: [...pocketMap.values()],
    };
  } catch (error) {
    console.warn(
      "MIMI // Creator archive cloud read deferred; using local archive.",
      error,
    );
    return { zines: localZines, pocketItems: localPocket };
  }
};

const summarizeLocally = (
  searchQuery: string,
  results: CreatorArchiveHit[],
): string => {
  if (!results.length) {
    return `No close matches in your zines or pocket for “${searchQuery}”. Publish or save work so Scry can connect new signals to your archive.`;
  }
  const zineCount = results.filter((item) => item.type === "zine").length;
  const pocketCount = results.filter((item) => item.type === "pocket").length;
  const top = results
    .slice(0, 3)
    .map((item) => item.title)
    .join("; ");
  return `Found ${results.length} archive connection${results.length === 1 ? "" : "s"} (${zineCount} zine${zineCount === 1 ? "" : "s"}, ${pocketCount} pocket). Closest: ${top}.`;
};

/**
 * Search the creator archive (zines + pocket) for connections to past work.
 * Always falls back to local IndexedDB so ghost / offline sessions still work.
 */
export const searchGrounding = async (
  searchQuery: string,
  userId?: string,
): Promise<SearchGroundingResult> => {
  const queryText = searchQuery.trim();
  if (!queryText) {
    return { results: [], summary: "Enter a query to search your archive." };
  }

  try {
    const { zines, pocketItems } = await loadCreatorArchive(userId);
    let results = rankArchive(queryText, zines, pocketItems);
    let summary = summarizeLocally(queryText, results);

    // Optional Gemini re-rank when we have candidates and a usable client.
    if (results.length > 0) {
      try {
        const { ai } = getClient();
        const compact = results.slice(0, 10).map((item) => ({
          id: item.id,
          type: item.type,
          title: item.title,
          snippet: item.snippet,
        }));
        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: `You are ranking a creator's own archive against a research query.
Query: "${queryText}"
Candidates:
${JSON.stringify(compact)}

Return JSON only:
{"results":[{"id":"...","type":"zine|pocket","title":"...","relevanceScore":0.0,"snippet":"..."}],"summary":"..."}
Keep only relevant items. relevanceScore is 0-1.`,
          config: {
            responseMimeType: "application/json",
          },
        });
        const parsed = JSON.parse(response.text || "{}") as {
          results?: Array<Record<string, unknown>>;
          summary?: string;
        };
        if (Array.isArray(parsed.results) && parsed.results.length > 0) {
          const byId = new Map(results.map((item) => [item.id, item]));
          const reranked: CreatorArchiveHit[] = [];
          for (const raw of parsed.results) {
            const id = readString(raw.id);
            const prior = byId.get(id);
            if (!prior) continue;
            reranked.push({
              ...prior,
              title: readString(raw.title) || prior.title,
              snippet: readString(raw.snippet) || prior.snippet,
              relevanceScore:
                typeof raw.relevanceScore === "number"
                  ? raw.relevanceScore
                  : prior.relevanceScore,
            });
          }
          if (reranked.length > 0) {
            results = reranked.sort(
              (a, b) => b.relevanceScore - a.relevanceScore,
            );
          }
        }
        if (typeof parsed.summary === "string" && parsed.summary.trim()) {
          summary = parsed.summary.trim();
        }
      } catch (error) {
        console.warn(
          "MIMI // Archive re-rank deferred; using local relevance.",
          error,
        );
      }
    }

    return { results, summary };
  } catch (error) {
    console.error("Search error:", error);
    return {
      results: [],
      summary: "Archive search could not complete. Local and cloud reads failed.",
    };
  }
};
