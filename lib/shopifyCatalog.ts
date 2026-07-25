const SHOPIFY_GLOBAL_CATALOG_ENDPOINT = "https://catalog.shopify.com/api/ucp/mcp";

type FetchLike = typeof fetch;

export interface ShopifyCatalogSearchInput {
  query: string;
  intent?: string;
  country?: string;
  limit?: number;
  agentProfileUrl: string;
}

export interface ShopifyCatalogSearchResult {
  products: unknown[];
  ucp?: unknown;
  messages?: unknown[];
}

const validProfileUrl = (value: string): boolean => {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
};

export const searchShopifyGlobalCatalog = async (
  input: ShopifyCatalogSearchInput,
  fetchImpl: FetchLike = fetch,
): Promise<ShopifyCatalogSearchResult> => {
  const query = input.query.trim();
  if (!query) throw new Error("A catalog query is required.");
  if (!validProfileUrl(input.agentProfileUrl)) {
    throw new Error("A public HTTPS UCP agent profile URL is required.");
  }

  const limit = Math.max(1, Math.min(20, Math.floor(input.limit || 8)));
  const country = (input.country || "US").trim().toUpperCase().slice(0, 2);
  const response = await fetchImpl(SHOPIFY_GLOBAL_CATALOG_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "MCP-Protocol-Version": "2026-03-26",
      Accept: "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "tools/call",
      id: 1,
      params: {
        name: "search_catalog",
        arguments: {
          meta: {
            "ucp-agent": {
              profile: input.agentProfileUrl,
            },
          },
          catalog: {
            query,
            filters: {
              ships_to: { country },
              available: true,
            },
            context: {
              address_country: country,
              ...(input.intent?.trim() ? { intent: input.intent.trim().slice(0, 1_000) } : {}),
            },
            pagination: { limit },
          },
        },
      },
    }),
  });
  const payload = (await response.json().catch(() => ({}))) as {
    error?: { message?: string };
    result?: {
      structuredContent?: {
        products?: unknown[];
        ucp?: unknown;
        messages?: unknown[];
      };
    };
  };

  if (!response.ok || payload.error) {
    throw new Error(payload.error?.message || `Shopify catalog search failed (${response.status}).`);
  }

  const content = payload.result?.structuredContent || {};
  return {
    products: Array.isArray(content.products) ? content.products : [],
    ucp: content.ucp,
    messages: Array.isArray(content.messages) ? content.messages : [],
  };
};

