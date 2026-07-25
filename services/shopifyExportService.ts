import JSZip from "jszip";
import { ZineMetadata } from "../types";

export interface ShopifyDropSource {
  id: string;
  name: string;
  category: string;
  vibe: string;
  price: number;
  tagline?: string;
  conceptThesis?: string;
  materiality?: string;
  ambiance?: string;
  statusConferred?: string;
  mimiCritique?: string;
  imageUrl?: string;
}

export interface ShopifyProductDraft {
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
  status: "draft" | "active";
  jsonLd: Record<string, unknown>;
  provenance: {
    source: "mimi-zine" | "mimi-drop";
    artifactId: string;
    tone?: string;
    creatorHandle?: string;
    fragmentsUsed?: string[];
    usedContextSnapshots?: import("../types").UsedContextSnapshot[];
  };
}

export type ShopifyPackCheckStatus = "pass" | "warning" | "fail";

export interface ShopifyPackCheck {
  id: string;
  label: string;
  status: ShopifyPackCheckStatus;
  detail: string;
}

export interface ShopifyPackInspection {
  status: "ready" | "needs-review" | "invalid";
  filename?: string;
  product: ShopifyProductDraft | null;
  files: string[];
  checks: ShopifyPackCheck[];
}

export interface ShopifyConnectionStatus {
  configured: boolean;
  shop: string | null;
  mode: "client_credentials" | "access_token" | null;
  apiVersion: string;
}

export interface ShopifyCatalogSearchInput {
  query: string;
  intent?: string;
  country?: string;
  limit?: number;
}

export interface ShopifyCatalogSearchResult {
  products: unknown[];
  ucp?: unknown;
  messages?: unknown[];
}

const LEGACY_SHOPIFY_CREDENTIALS_KEY = "mimi_shopify_credentials";

const removeLegacyBrowserCredentials = (): void => {
  try {
    localStorage.removeItem(LEGACY_SHOPIFY_CREDENTIALS_KEY);
  } catch {
    // Storage can be disabled. The server-owned connection does not depend on it.
  }
};

const mimiSessionHeaders = async (): Promise<Record<string, string>> => {
  const { auth } = await import("./firebaseInit");
  const token = await auth.currentUser?.getIdToken();
  if (!token) {
    throw new Error("Sign in to Mimi before accessing the Shopify connection.");
  }
  return { "x-user-token": `Bearer ${token}` };
};

export const fetchShopifyConnectionStatus = async (): Promise<ShopifyConnectionStatus> => {
  removeLegacyBrowserCredentials();
  const response = await fetch("/api/shopify/connection", {
    method: "GET",
    headers: await mimiSessionHeaders(),
    credentials: "same-origin",
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `Shopify connection status failed (${response.status})`);
  }
  return payload as ShopifyConnectionStatus;
};

export const searchShopifyCatalog = async (
  input: ShopifyCatalogSearchInput,
): Promise<ShopifyCatalogSearchResult> => {
  const response = await fetch("/api/shopify/catalog-search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(await mimiSessionHeaders()),
    },
    credentials: "same-origin",
    body: JSON.stringify(input),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `Shopify catalog search failed (${response.status})`);
  }
  return {
    products: Array.isArray(payload.products) ? payload.products : [],
    ucp: payload.ucp,
    messages: Array.isArray(payload.messages) ? payload.messages : [],
  };
};

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "mimi-artifact";

const stripHtml = (html: string): string =>
  html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

const escapeCsv = (value: string): string => {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

const collectZineImages = (metadata: ZineMetadata): string[] => {
  const urls: string[] = [];
  if (metadata.coverImageUrl) urls.push(metadata.coverImageUrl);
  const hypothesis = (metadata.content as { hypothesis_image_url?: string }).hypothesis_image_url;
  if (hypothesis) urls.push(hypothesis);
  metadata.content?.pages?.forEach((page) => {
    if (page.image_url) urls.push(page.image_url);
  });
  return [...new Set(urls.filter(Boolean))];
};

const buildZineBodyHtml = (metadata: ZineMetadata): string => {
  const mirror = metadata.content?.oracular_mirror || "";
  const thesis = metadata.content?.strategic_hypothesis || "";
  const pages =
    metadata.content?.pages
      ?.map(
        (page, index) => `
      <hr />
      <p style="font-family:monospace;font-size:11px;color:#666;">PLATE_0${index + 1}</p>
      <h2 style="font-family:Georgia,serif;font-size:24px;font-style:italic;">${page.headline || ""}</h2>
      ${page.image_url ? `<img src="${page.image_url}" alt="${page.headline || "Visual plate"}" style="width:100%;max-width:720px;height:auto;margin:16px 0;" />` : ""}
      <p style="font-family:Georgia,serif;font-size:15px;line-height:1.6;">${page.bodyCopy || ""}</p>
    `,
      )
      .join("\n") || "";

  return `<div>
    <p style="font-family:monospace;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#888;">Compiled via Mimi // The Press</p>
    <p style="font-family:Georgia,serif;font-size:18px;font-style:italic;color:#444;">"${mirror}"</p>
    <blockquote style="border-left:3px solid #111;padding-left:16px;margin:24px 0;font-style:italic;">${thesis}</blockquote>
    ${pages}
    <p style="font-family:monospace;font-size:9px;color:#999;margin-top:32px;">Provenance: Mimi Zine ${metadata.id} · @${metadata.userHandle}</p>
  </div>`;
};

export const buildShopifyProductFromZine = (
  metadata: ZineMetadata,
  options?: { price?: string; productType?: string },
): ShopifyProductDraft => {
  const title = metadata.title || "Mimi Editorial Artifact";
  const handle = slugify(title);
  const bodyHtml = buildZineBodyHtml(metadata);
  const imageUrls = collectZineImages(metadata);
  const tags = [
    "mimi-zine",
    metadata.tone,
    ...(metadata.tags || []),
    metadata.theme,
  ].filter(Boolean) as string[];
  const seoDescription =
    stripHtml(metadata.content?.strategic_hypothesis || metadata.content?.oracular_mirror || title).slice(
      0,
      320,
    );

  const jsonLd = buildShopifyProductJsonLd({
    title,
    description: seoDescription,
    imageUrls,
    brand: metadata.userHandle,
    sku: metadata.id,
  });

  return {
    handle,
    title,
    bodyHtml,
    vendor: `@${metadata.userHandle}`,
    productType: options?.productType || "Editorial Artifact",
    tags,
    imageUrls,
    seoTitle: `${title} | Mimi Editorial`,
    seoDescription,
    price: options?.price || "0.00",
    requiresShipping: false,
    taxable: true,
    status: "draft",
    jsonLd,
    provenance: {
      source: "mimi-zine",
      artifactId: metadata.id,
      tone: metadata.tone,
      creatorHandle: metadata.userHandle,
      fragmentsUsed: metadata.fragmentsUsed,
      usedContextSnapshots: metadata.usedContextSnapshots,
    },
  };
};

export const buildShopifyProductFromDrop = (
  drop: ShopifyDropSource,
  options?: { productType?: string },
): ShopifyProductDraft => {
  const title = drop.name;
  const handle = slugify(`${drop.name}-${drop.id}`);
  const bodyHtml = `<div>
    <p style="font-family:Georgia,serif;font-size:18px;font-style:italic;">${drop.tagline || ""}</p>
    <p>${drop.conceptThesis || ""}</p>
    <ul>
      <li><strong>Materiality:</strong> ${drop.materiality || "—"}</li>
      <li><strong>Ambiance:</strong> ${drop.ambiance || "—"}</li>
      <li><strong>Status:</strong> ${drop.statusConferred || "—"}</li>
    </ul>
    <p style="font-style:italic;color:#555;">${drop.mimiCritique || ""}</p>
    <p style="font-family:monospace;font-size:9px;color:#999;">Provenance: Mimi Drop ${drop.id}</p>
  </div>`;
  const imageUrls = drop.imageUrl ? [drop.imageUrl] : [];
  const tags = ["mimi-drop", drop.category, drop.vibe].filter(Boolean);
  const seoDescription = (drop.conceptThesis || drop.tagline || title).slice(0, 320);

  const jsonLd = buildShopifyProductJsonLd({
    title,
    description: seoDescription,
    imageUrls,
    brand: "Mimi Drop",
    sku: drop.id,
    price: drop.price,
  });

  return {
    handle,
    title,
    bodyHtml,
    vendor: "Mimi Drop",
    productType: options?.productType || drop.category || "Product Drop",
    tags,
    imageUrls,
    seoTitle: `${title} | Mimi Drop`,
    seoDescription,
    price: String(drop.price ?? "0.00"),
    requiresShipping: true,
    taxable: true,
    status: "draft",
    jsonLd,
    provenance: {
      source: "mimi-drop",
      artifactId: drop.id,
    },
  };
};

export const buildShopifyProductJsonLd = (input: {
  title: string;
  description: string;
  imageUrls: string[];
  brand: string;
  sku: string;
  price?: number | string;
}): Record<string, unknown> => {
  const price = typeof input.price === "number" ? input.price.toFixed(2) : input.price || "0.00";
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.title,
    description: input.description,
    image: input.imageUrls,
    sku: input.sku,
    brand: {
      "@type": "Brand",
      name: input.brand,
    },
    offers: {
      "@type": "Offer",
      priceCurrency: "USD",
      price,
      availability: "https://schema.org/InStock",
    },
  };
};

export const buildShopifyProductCsv = (product: ShopifyProductDraft): string => {
  const headers = [
    "Handle",
    "Title",
    "Body (HTML)",
    "Vendor",
    "Type",
    "Tags",
    "Published",
    "Variant Price",
    "Variant Requires Shipping",
    "Variant Taxable",
    "Image Src",
    "Image Position",
    "SEO Title",
    "SEO Description",
    "Status",
  ];

  const primaryRow = [
    product.handle,
    product.title,
    product.bodyHtml,
    product.vendor,
    product.productType,
    product.tags.join(", "),
    product.status === "active" ? "TRUE" : "FALSE",
    product.price,
    product.requiresShipping ? "TRUE" : "FALSE",
    product.taxable ? "TRUE" : "FALSE",
    product.imageUrls[0] || "",
    product.imageUrls[0] ? "1" : "",
    product.seoTitle,
    product.seoDescription,
    product.status,
  ];

  const extraImageRows = product.imageUrls.slice(1).map((url, index) => [
    product.handle,
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    url,
    String(index + 2),
    "",
    "",
    "",
  ]);

  const rows = [primaryRow, ...extraImageRows];
  return [headers.join(","), ...rows.map((row) => row.map((cell) => escapeCsv(String(cell))).join(","))].join(
    "\n",
  );
};

export const buildShopifyThemeLiquidSnippet = (product: ShopifyProductDraft): string => {
  return `{%- comment -%}
  Mimi Press // Shopify JSON-LD Product Schema
  Artifact: ${product.provenance.artifactId}
  Paste into theme.liquid before </head> or use a Custom Liquid block.
{%- endcomment -%}
<script type="application/ld+json">
${JSON.stringify(product.jsonLd, null, 2)}
</script>`;
};

const SHOPIFY_PACK_REQUIRED_FILES = [
  "product.csv",
  "product.json",
  "product-jsonld.json",
  "theme-embed.liquid",
  "README.md",
] as const;

const isHttpUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const parsePackProduct = (value: unknown): ShopifyProductDraft | null => {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<ShopifyProductDraft>;
  if (
    typeof candidate.handle !== "string" ||
    typeof candidate.title !== "string" ||
    typeof candidate.bodyHtml !== "string" ||
    typeof candidate.vendor !== "string" ||
    typeof candidate.productType !== "string" ||
    !Array.isArray(candidate.tags) ||
    !Array.isArray(candidate.imageUrls) ||
    typeof candidate.seoTitle !== "string" ||
    typeof candidate.seoDescription !== "string" ||
    typeof candidate.price !== "string" ||
    !candidate.jsonLd ||
    typeof candidate.jsonLd !== "object" ||
    !candidate.provenance ||
    typeof candidate.provenance.artifactId !== "string"
  ) {
    return null;
  }

  return {
    ...candidate,
    tags: candidate.tags.filter((tag): tag is string => typeof tag === "string"),
    imageUrls: candidate.imageUrls.filter((url): url is string => typeof url === "string"),
    requiresShipping: candidate.requiresShipping ?? false,
    taxable: candidate.taxable ?? true,
    status: candidate.status === "active" ? "active" : "draft",
  } as ShopifyProductDraft;
};

export const inspectShopifyProductPack = async (
  source: Blob | ArrayBuffer | Uint8Array,
  filename?: string,
): Promise<ShopifyPackInspection> => {
  const checks: ShopifyPackCheck[] = [];
  let zip: JSZip;

  try {
    zip = await JSZip.loadAsync(source);
  } catch {
    return {
      status: "invalid",
      filename,
      product: null,
      files: [],
      checks: [
        {
          id: "zip",
          label: "Readable Shopify pack",
          status: "fail",
          detail: "This file is not a readable ZIP archive.",
        },
      ],
    };
  }

  const files = Object.keys(zip.files).filter((name) => !zip.files[name].dir);
  const missingFiles = SHOPIFY_PACK_REQUIRED_FILES.filter((name) => !files.includes(name));
  checks.push({
    id: "files",
    label: "Required release files",
    status: missingFiles.length ? "fail" : "pass",
    detail: missingFiles.length
      ? `Missing ${missingFiles.join(", ")}.`
      : "CSV, product JSON, JSON-LD, theme embed, and import guide are present.",
  });

  const productJson = zip.file("product.json");
  let product: ShopifyProductDraft | null = null;
  if (productJson) {
    try {
      product = parsePackProduct(JSON.parse(await productJson.async("string")));
    } catch {
      product = null;
    }
  }
  checks.push({
    id: "product",
    label: "Product contract",
    status: product ? "pass" : "fail",
    detail: product
      ? `${product.title} resolves to handle ${product.handle}.`
      : "product.json is missing or does not match Mimi's Shopify product contract.",
  });

  if (product) {
    const price = Number(product.price);
    checks.push({
      id: "price",
      label: "Price and publication state",
      status: Number.isFinite(price) && price >= 0 ? "pass" : "fail",
      detail:
        Number.isFinite(price) && price >= 0
          ? `$${price.toFixed(2)} · ${product.status === "draft" ? "draft for review" : "active on import"}.`
          : "Variant price must be a valid non-negative number.",
    });

    const invalidImages = product.imageUrls.filter((url) => !isHttpUrl(url));
    const stockImageHosts = product.imageUrls.filter((value) => {
      try {
        const host = new URL(value).hostname;
        return host.includes("unsplash.com") || host.includes("picsum.photos");
      } catch {
        return false;
      }
    });
    checks.push({
      id: "images",
      label: "Product imagery",
      status: invalidImages.length ? "fail" : stockImageHosts.length ? "warning" : "pass",
      detail: invalidImages.length
        ? `${invalidImages.length} image URL${invalidImages.length === 1 ? " is" : "s are"} invalid.`
        : stockImageHosts.length
          ? "The pack uses external stock imagery. Confirm product accuracy and usage rights before publishing."
          : product.imageUrls.length
            ? `${product.imageUrls.length} public product image${product.imageUrls.length === 1 ? "" : "s"} ready for Shopify import.`
            : "No image is included; Shopify will create a text-only product.",
    });

    const csv = zip.file("product.csv") ? await zip.file("product.csv")!.async("string") : "";
    const legacyPhysicalDraft =
      product.provenance.source === "mimi-drop" &&
      !product.requiresShipping &&
      /,FALSE,TRUE,/.test(csv);
    const publishesImmediately = product.status === "active" || /,active\s*$/m.test(csv);
    const fulfillmentWarnings = [
      legacyPhysicalDraft
        ? "This Mimi Drop pack marks shipping as unnecessary. Enable shipping before import."
        : "",
      publishesImmediately
        ? "This pack imports as active. Change it to draft so a publisher can review it first."
        : "",
    ].filter(Boolean);
    checks.push({
      id: "fulfillment",
      label: "Fulfillment safety",
      status: fulfillmentWarnings.length > 0 ? "warning" : "pass",
      detail:
        fulfillmentWarnings.length > 0
          ? fulfillmentWarnings.join(" ")
          : product.requiresShipping
            ? "Physical fulfillment is enabled and the listing stays in draft."
            : "Digital fulfillment is selected and the listing stays in draft.",
    });

    const jsonLdFile = zip.file("product-jsonld.json");
    let jsonLdMatches = false;
    if (jsonLdFile) {
      try {
        const jsonLd = JSON.parse(await jsonLdFile.async("string")) as Record<string, unknown>;
        jsonLdMatches =
          jsonLd["@type"] === "Product" &&
          jsonLd.name === product.title &&
          jsonLd.sku === product.provenance.artifactId;
      } catch {
        jsonLdMatches = false;
      }
    }
    checks.push({
      id: "jsonld",
      label: "Search product schema",
      status: jsonLdMatches ? "pass" : "fail",
      detail: jsonLdMatches
        ? "Product name and provenance SKU match the JSON-LD schema."
        : "product-jsonld.json does not match the product title and provenance SKU.",
    });
  }

  const hasFailure = checks.some((check) => check.status === "fail");
  const hasWarning = checks.some((check) => check.status === "warning");
  return {
    status: hasFailure ? "invalid" : hasWarning ? "needs-review" : "ready",
    filename,
    product,
    files,
    checks,
  };
};

export const buildShopifyReadme = (product: ShopifyProductDraft): string => {
  return `# Mimi → Shopify Product Pack

Artifact: ${product.provenance.artifactId}
Source: ${product.provenance.source}

## Import (no API key required)

1. In Shopify Admin, go to **Products → Import**.
2. Upload \`product.csv\`.
3. Review images, tags, and SEO fields, then publish.

## Theme JSON-LD

- Copy \`product-jsonld.json\` into your SEO app, or
- Paste \`theme-embed.liquid\` into a Custom Liquid section / theme.liquid.

## Direct publish (optional)

Connect your store in **The Press → Shopify Bridge**, then use **Publish to Shopify** from Export Chamber.

Handle: ${product.handle}
`;
};

export const downloadShopifyProductPack = async (
  product: ShopifyProductDraft,
  manifest?: Record<string, unknown>,
): Promise<void> => {
  const zip = new JSZip();
  zip.file("product.csv", buildShopifyProductCsv(product));
  zip.file("product.json", JSON.stringify(product, null, 2));
  zip.file("product-jsonld.json", JSON.stringify(product.jsonLd, null, 2));
  zip.file("theme-embed.liquid", buildShopifyThemeLiquidSnippet(product));
  zip.file("README.md", buildShopifyReadme(product));
  if (product.provenance.usedContextSnapshots?.length) {
    zip.file(
      "used-context.json",
      JSON.stringify(product.provenance.usedContextSnapshots, null, 2),
    );
  }
  if (manifest) {
    zip.file("export-manifest.json", JSON.stringify(manifest, null, 2));
  }

  const blob = await zip.generateAsync({ type: "blob" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `Mimi_Shopify_${product.handle}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};

export const publishProductToShopify = async (
  product: ShopifyProductDraft,
): Promise<{
  productId: string;
  legacyProductId: string;
  adminUrl: string;
  handle: string;
  status: "DRAFT";
}> => {
  const response = await fetch("/api/shopify/publish-product", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(await mimiSessionHeaders()),
    },
    credentials: "same-origin",
    body: JSON.stringify({
      product,
      confirmed: true,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || `Shopify publish failed (${response.status})`);
  }

  return response.json();
};
