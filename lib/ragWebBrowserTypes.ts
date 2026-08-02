/**
 * Dataset item shape from Apify Actor `apify/rag-web-browser`.
 * Every field is treated as optional/nullable — Store runs are unpredictable.
 * Source of truth: Actor Output type / dataset pushes (not invented).
 */
export type RagWebBrowserSearchResult = {
  title?: string | null;
  description?: string | null;
  url?: string | null;
  rank?: number | null;
  resultType?: "ORGANIC" | "SUGGESTED" | string | null;
};

export type RagWebBrowserCrawl = {
  createdAt?: string | null;
  httpStatusCode?: number | null;
  httpStatusMessage?: string | null;
  loadedAt?: string | null;
  requestStatus?: string | null;
  uniqueKey?: string | null;
  debug?: unknown;
};

export type RagWebBrowserMetadata = {
  title?: string | null;
  url?: string | null;
  redirectedUrl?: string | null;
  description?: string | null;
  author?: string | null;
  languageCode?: string | null;
};

export type RagWebBrowserItem = {
  text?: string | null;
  html?: string | null;
  markdown?: string | null;
  query?: string | null;
  crawl?: RagWebBrowserCrawl | null;
  searchResult?: RagWebBrowserSearchResult | null;
  metadata?: RagWebBrowserMetadata | null;
};

/** Default Actor for Web Intelligence live scrape. */
export const RAG_WEB_BROWSER_ACTOR_ID = "apify/rag-web-browser";
