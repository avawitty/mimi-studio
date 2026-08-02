import { sanitizeUsedContextForExport } from "./privacyUtils.js";
import type { UsedContextSnapshot } from "../types";

const DEFAULT_SHOPIFY_API_VERSION = "2026-07";

type FetchLike = typeof fetch;

export type ShopifyConnectionMode = "client_credentials" | "access_token";

export interface ShopifyConnectionStatus {
  configured: boolean;
  shop: string | null;
  mode: ShopifyConnectionMode | null;
  apiVersion: string;
}

export interface ShopifyPublishProductInput {
  handle: string;
  title: string;
  bodyHtml: string;
  vendor: string;
  productType: string;
  tags: string[];
  imageUrls: string[];
  seoTitle: string;
  seoDescription: string;
  price: string;
  requiresShipping: boolean;
  taxable: boolean;
  provenance: {
    artifactId: string;
    [key: string]: unknown;
  };
}

export interface ShopifyPublishResult {
  productId: string;
  legacyProductId: string;
  adminUrl: string;
  handle: string;
  status: "DRAFT";
}

type ShopifyEnvironment = Record<string, string | undefined>;

type ShopifyAccess = {
  accessToken: string;
  scopes: string[];
  mode: ShopifyConnectionMode;
};

const normalizeShopDomain = (rawValue: string): string => {
  const value = rawValue
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");
  const host = value.endsWith(".myshopify.com") ? value : `${value}.myshopify.com`;

  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(host)) {
    throw Object.assign(new Error("SHOPIFY_SHOP must identify a valid *.myshopify.com store."), {
      status: 503,
      code: "SHOPIFY_SHOP_INVALID",
    });
  }

  return host;
};

const shopifyConfig = (env: ShopifyEnvironment) => {
  const rawShop = env.SHOPIFY_SHOP || env.SHOPIFY_STORE_DOMAIN || "";
  const shop = rawShop ? normalizeShopDomain(rawShop) : null;
  const apiVersion = (env.SHOPIFY_API_VERSION || DEFAULT_SHOPIFY_API_VERSION).trim();
  const accessToken = (env.SHOPIFY_ADMIN_ACCESS_TOKEN || "").trim();
  const clientId = (env.SHOPIFY_CLIENT_ID || "").trim();
  const clientSecret = (env.SHOPIFY_CLIENT_SECRET || "").trim();

  const mode: ShopifyConnectionMode | null = accessToken
    ? "access_token"
    : clientId && clientSecret
      ? "client_credentials"
      : null;

  return {
    shop,
    apiVersion,
    accessToken,
    clientId,
    clientSecret,
    mode,
    configured: Boolean(shop && mode),
  };
};

export const getShopifyConnectionStatus = (
  env: ShopifyEnvironment = process.env,
): ShopifyConnectionStatus => {
  const config = shopifyConfig(env);
  return {
    configured: config.configured,
    shop: config.shop,
    mode: config.mode,
    apiVersion: config.apiVersion,
  };
};

const shopifyError = (message: string, status = 502, code = "SHOPIFY_REQUEST_FAILED") =>
  Object.assign(new Error(message), { status, code });

const parseScopes = (value: unknown): string[] =>
  String(value || "")
    .split(",")
    .map((scope) => scope.trim())
    .filter(Boolean);

const acquireShopifyAccess = async (
  env: ShopifyEnvironment,
  fetchImpl: FetchLike,
): Promise<{ shop: string; apiVersion: string; access: ShopifyAccess }> => {
  const config = shopifyConfig(env);
  if (!config.configured || !config.shop || !config.mode) {
    throw shopifyError(
      "Shopify is not configured on the server. Set SHOPIFY_SHOP and either client credentials or an existing Admin access token.",
      503,
      "SHOPIFY_NOT_CONFIGURED",
    );
  }

  if (config.mode === "access_token") {
    return {
      shop: config.shop,
      apiVersion: config.apiVersion,
      access: {
        accessToken: config.accessToken,
        scopes: [],
        mode: "access_token",
      },
    };
  }

  const response = await fetchImpl(`https://${config.shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: config.clientId,
      client_secret: config.clientSecret,
    }),
  });
  const payload = (await response.json().catch(() => ({}))) as {
    access_token?: string;
    scope?: string;
    error?: string;
    error_description?: string;
  };

  if (!response.ok || !payload.access_token) {
    throw shopifyError(
      payload.error_description || payload.error || `Shopify token exchange failed (${response.status}).`,
      response.status >= 400 && response.status < 500 ? 401 : 502,
      "SHOPIFY_TOKEN_EXCHANGE_FAILED",
    );
  }

  const scopes = parseScopes(payload.scope);
  if (scopes.length && !scopes.includes("write_products")) {
    throw shopifyError(
      "The Shopify app is missing the write_products scope.",
      403,
      "SHOPIFY_SCOPE_MISSING",
    );
  }

  return {
    shop: config.shop,
    apiVersion: config.apiVersion,
    access: {
      accessToken: payload.access_token,
      scopes,
      mode: "client_credentials",
    },
  };
};

const text = (value: unknown, max: number): string =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

export function sanitizeShopifyProvenance(
  value: ShopifyPublishProductInput["provenance"] | undefined,
  artifactId: string,
): ShopifyPublishProductInput["provenance"] {
  const candidate = value || { artifactId };
  const rawSnapshots = Array.isArray(candidate.usedContextSnapshots)
    ? candidate.usedContextSnapshots
    : [];
  const snapshots: UsedContextSnapshot[] = rawSnapshots
    .map((raw) => {
      const snapshot = raw as Partial<UsedContextSnapshot>;
      const atomId = text(snapshot.atomId, 255);
      if (!atomId) return null;
      return {
        atomId,
        title: text(snapshot.title, 500) || "Fragment",
        content: text(snapshot.content, 20_000),
        source: text(snapshot.source, 500) || undefined,
        capturedAt:
          typeof snapshot.capturedAt === "number"
            ? snapshot.capturedAt
            : undefined,
        visibility: snapshot.visibility
          ? {
              working: snapshot.visibility.working === true,
              export: snapshot.visibility.export !== false,
              public: snapshot.visibility.public === true,
            }
          : undefined,
      } satisfies UsedContextSnapshot;
    })
    .filter((snapshot): snapshot is UsedContextSnapshot => Boolean(snapshot));
  const safeSnapshots = sanitizeUsedContextForExport(snapshots);
  const safeIds = new Set(safeSnapshots.map((snapshot) => snapshot.atomId));
  const fragmentsUsed = Array.isArray(candidate.fragmentsUsed)
    ? candidate.fragmentsUsed
        .map((id) => text(id, 255))
        .filter((id) => id && safeIds.has(id))
    : [];

  return {
    artifactId,
    source: text(candidate.source, 100) || "mimi-zine",
    tone: text(candidate.tone, 100) || undefined,
    creatorHandle: text(candidate.creatorHandle, 255) || undefined,
    fragmentsUsed,
    usedContextSnapshots: safeSnapshots,
  };
}

const validateProduct = (value: unknown): ShopifyPublishProductInput => {
  if (!value || typeof value !== "object") {
    throw shopifyError("A Shopify product draft is required.", 400, "SHOPIFY_PRODUCT_INVALID");
  }

  const candidate = value as Partial<ShopifyPublishProductInput>;
  const title = text(candidate.title, 255);
  const handle = text(candidate.handle, 255);
  const artifactId = text(candidate.provenance?.artifactId, 255);
  const price = Number(candidate.price);

  if (!title || !handle || !artifactId || !Number.isFinite(price) || price < 0) {
    throw shopifyError(
      "The product draft requires a title, handle, provenance artifact ID, and non-negative price.",
      400,
      "SHOPIFY_PRODUCT_INVALID",
    );
  }

  return {
    handle,
    title,
    bodyHtml: text(candidate.bodyHtml, 1_000_000),
    vendor: text(candidate.vendor, 255),
    productType: text(candidate.productType, 255),
    tags: Array.isArray(candidate.tags)
      ? candidate.tags.map((tag) => text(tag, 255)).filter(Boolean).slice(0, 250)
      : [],
    imageUrls: Array.isArray(candidate.imageUrls)
      ? candidate.imageUrls
          .map((url) => text(url, 2_048))
          .filter((url) => /^https:\/\//i.test(url))
          .slice(0, 20)
      : [],
    seoTitle: text(candidate.seoTitle, 255),
    seoDescription: text(candidate.seoDescription, 500),
    price: price.toFixed(2),
    requiresShipping: candidate.requiresShipping === true,
    taxable: candidate.taxable !== false,
    provenance: sanitizeShopifyProvenance(candidate.provenance, artifactId),
  };
};

const PRODUCT_SET_MUTATION = `#graphql
  mutation MimiCreateDraftProduct($input: ProductSetInput!, $synchronous: Boolean!) {
    productSet(input: $input, synchronous: $synchronous) {
      product {
        id
        legacyResourceId
        handle
        status
      }
      userErrors {
        code
        field
        message
      }
    }
  }
`;

export const publishShopifyDraft = async (
  rawProduct: unknown,
  options: {
    env?: ShopifyEnvironment;
    fetchImpl?: FetchLike;
  } = {},
): Promise<ShopifyPublishResult> => {
  const product = validateProduct(rawProduct);
  const env = options.env || process.env;
  const fetchImpl = options.fetchImpl || fetch;
  const { shop, apiVersion, access } = await acquireShopifyAccess(env, fetchImpl);

  const files = product.imageUrls.map((originalSource, index) => ({
    originalSource,
    alt: index === 0 ? product.title : `${product.title} image ${index + 1}`,
    contentType: "IMAGE",
  }));
  const defaultOption = { optionName: "Title", name: "Default Title" };
  const variables = {
    synchronous: true,
    input: {
      title: product.title,
      handle: product.handle,
      descriptionHtml: product.bodyHtml,
      vendor: product.vendor,
      productType: product.productType,
      tags: product.tags,
      status: "DRAFT",
      seo: {
        title: product.seoTitle,
        description: product.seoDescription,
      },
      metafields: [
        {
          namespace: "mimi",
          key: "provenance",
          type: "json",
          value: JSON.stringify(product.provenance),
        },
      ],
      ...(files.length ? { files } : {}),
      productOptions: [
        {
          name: "Title",
          position: 1,
          values: [{ name: "Default Title" }],
        },
      ],
      variants: [
        {
          optionValues: [defaultOption],
          price: product.price,
          sku: product.provenance.artifactId,
          taxable: product.taxable,
          inventoryItem: {
            requiresShipping: product.requiresShipping,
            tracked: false,
          },
        },
      ],
    },
  };

  const response = await fetchImpl(`https://${shop}/admin/api/${apiVersion}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": access.accessToken,
    },
    body: JSON.stringify({ query: PRODUCT_SET_MUTATION, variables }),
  });
  const payload = (await response.json().catch(() => ({}))) as {
    data?: {
      productSet?: {
        product?: {
          id?: string;
          legacyResourceId?: string;
          handle?: string;
          status?: string;
        } | null;
        userErrors?: Array<{ code?: string; field?: string[]; message?: string }>;
      };
    };
    errors?: Array<{ message?: string }>;
  };

  if (!response.ok) {
    throw shopifyError(
      payload.errors?.map((error) => error.message).filter(Boolean).join("; ") ||
        `Shopify GraphQL request failed (${response.status}).`,
      response.status,
    );
  }

  const result = payload.data?.productSet;
  const userErrors = result?.userErrors || [];
  if (payload.errors?.length || userErrors.length || !result?.product?.id) {
    const message = [
      ...(payload.errors || []).map((error) => error.message),
      ...userErrors.map((error) => error.message),
    ]
      .filter(Boolean)
      .join("; ");
    throw shopifyError(message || "Shopify did not create the draft product.", 422, "SHOPIFY_GRAPHQL_ERROR");
  }

  const legacyProductId = String(result.product.legacyResourceId || "");
  return {
    productId: result.product.id,
    legacyProductId,
    adminUrl: `https://${shop}/admin/products/${legacyProductId}`,
    handle: result.product.handle || product.handle,
    status: "DRAFT",
  };
};

