import {
  getShopifyConnectionStatus,
  publishShopifyDraft,
  type ShopifyPublishProductInput,
} from "../lib/shopifyAdmin";
import { searchShopifyGlobalCatalog } from "../lib/shopifyCatalog";

const assert: (condition: unknown, message: string) => asserts condition = (condition, message) => {
  if (!condition) throw new Error(message);
};

const product: ShopifyPublishProductInput = {
  handle: "ivory-study",
  title: "Ivory Study",
  bodyHtml: "<p>A reviewable artifact.</p>",
  vendor: "Mimi Editions",
  productType: "Editorial Artifact",
  tags: ["mimi", "ivory"],
  imageUrls: ["https://cdn.example.com/ivory-study.jpg"],
  seoTitle: "Ivory Study | Mimi",
  seoDescription: "A reviewable artifact.",
  price: "180.00",
  requiresShipping: true,
  taxable: true,
  provenance: {
    artifactId: "artifact_001",
    source: "mimi-drop",
  },
};

const env = {
  SHOPIFY_SHOP: "mimi-editions-2",
  SHOPIFY_CLIENT_ID: "client-id",
  SHOPIFY_CLIENT_SECRET: "server-secret",
  SHOPIFY_API_VERSION: "2026-07",
};

const status = getShopifyConnectionStatus(env);
assert(status.configured, "Client credentials should configure a server-owned connection.");
assert(status.shop === "mimi-editions-2.myshopify.com", "Store domain should normalize safely.");
assert(status.mode === "client_credentials", "Client credentials should be the active auth mode.");

const requests: Array<{ url: string; init?: RequestInit }> = [];
const shopifyFetch = (async (url: string | URL | Request, init?: RequestInit) => {
  requests.push({ url: String(url), init });
  if (requests.length === 1) {
    return new Response(
      JSON.stringify({
        access_token: "short-lived-token",
        scope: "read_products,write_products",
        expires_in: 86399,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify({
      data: {
        productSet: {
          product: {
            id: "gid://shopify/Product/12345",
            legacyResourceId: "12345",
            handle: "ivory-study",
            status: "DRAFT",
          },
          userErrors: [],
        },
      },
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}) as typeof fetch;

const publishResult = await publishShopifyDraft(product, {
  env,
  fetchImpl: shopifyFetch,
});
assert(requests.length === 2, "Publishing should exchange credentials and then call GraphQL.");
assert(
  requests[0].url.endsWith("/admin/oauth/access_token"),
  "The first request should acquire a short-lived token.",
);
assert(
  requests[1].url.endsWith("/admin/api/2026-07/graphql.json"),
  "Publishing should use the configured GraphQL Admin API version.",
);
const graphBody = JSON.parse(String(requests[1].init?.body || "{}"));
assert(graphBody.query.includes("productSet"), "Publishing should use productSet, not legacy REST.");
assert(graphBody.variables.input.status === "DRAFT", "The server must force draft status.");
assert(
  graphBody.variables.input.metafields[0].value.includes("artifact_001"),
  "Provenance should remain attached to the Shopify draft.",
);
assert(publishResult.legacyProductId === "12345", "The Admin URL should use the legacy resource ID.");

let catalogRequest: { url: string; body: any } | null = null;
const catalogFetch = (async (url: string | URL | Request, init?: RequestInit) => {
  catalogRequest = {
    url: String(url),
    body: JSON.parse(String(init?.body || "{}")),
  };
  return new Response(
    JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      result: {
        structuredContent: {
          products: [{ id: "gid://shopify/p/example", title: "Quiet Linen Coat" }],
        },
      },
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}) as typeof fetch;

const catalog = await searchShopifyGlobalCatalog(
  {
    query: "oversized linen coat",
    intent: "Restrained natural fibers and architectural silhouette",
    country: "US",
    limit: 6,
    agentProfileUrl: "https://mimi.example/.well-known/ucp-profile.json",
  },
  catalogFetch,
);
assert(catalog.products.length === 1, "Catalog discovery should return structured candidates.");
assert(catalogRequest?.body.params.name === "search_catalog", "Catalog discovery should call search_catalog.");
assert(
  catalogRequest?.body.params.arguments.catalog.context.intent.includes("architectural"),
  "Catalog intent should carry richer approved creative direction.",
);

console.log("Server-owned Shopify connection contract: PASS");
console.log("GraphQL draft-only publish contract: PASS");
console.log("Provenance handoff contract: PASS");
console.log("Read-only Shopify Global Catalog adapter: PASS");
