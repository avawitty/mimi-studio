import { describe, expect, it } from "vitest";
import { deriveArtifactReleaseReadiness } from "../lib/publisher/releaseReadiness";
import { makeLegacyZineMetadata } from "./fixtures/zineMetadata";
import type { ShopifyPackInspection, ShopifyProductDraft } from "../services/shopifyExportService";

function minimalShopifyProduct(): ShopifyProductDraft {
  return {
    handle: "test-product",
    title: "Test Product",
    bodyHtml: "<p>Test</p>",
    vendor: "Mimi",
    productType: "Editorial",
    tags: [],
    imageUrls: [],
    seoTitle: "Test Product",
    seoDescription: "Test",
    price: "10",
    requiresShipping: false,
    taxable: false,
    status: "draft",
    jsonLd: {},
    provenance: {
      source: "mimi-zine",
      artifactId: "zine_legacy_1",
      fragmentsUsed: [],
      usedContextSnapshots: [],
    },
  };
}

describe("release readiness derivation", () => {
  it("puts artifact identity and readiness in the first-class result", () => {
    const metadata = makeLegacyZineMetadata();
    const readiness = deriveArtifactReleaseReadiness(metadata);

    expect(readiness.artifactId).toBe(metadata.id);
    expect(readiness.title).toBeTruthy();
    expect(readiness.stages.length).toBeGreaterThanOrEqual(6);
    expect(readiness.destinations.length).toBeGreaterThanOrEqual(5);
    expect(readiness.recommendation.headline).toBeTruthy();
  });

  it("does not include hard-coded production metrics", () => {
    const readiness = deriveArtifactReleaseReadiness(makeLegacyZineMetadata());
    const serialized = JSON.stringify(readiness);

    expect(serialized).not.toContain("14,821");
    expect(serialized).not.toContain("Canonical Reach");
    expect(serialized).not.toContain("High Flow");
    expect(serialized).not.toContain("tokens saved");
  });

  it("blocks publish when proof has blocking diagnostics", () => {
    const metadata = makeLegacyZineMetadata();
    metadata.title = "";
    metadata.content = { ...metadata.content, title: undefined as unknown as string };

    const readiness = deriveArtifactReleaseReadiness(metadata);
    const web = readiness.destinations.find((d) => d.id === "web-issue");

    expect(readiness.overallStatus).toBe("blocked");
    expect(web?.publishAvailable).toBe(false);
  });

  it("allows warnings on some destinations while blocking others", () => {
    const metadata = makeLegacyZineMetadata();
    metadata.coverImageUrl = undefined;

    const readiness = deriveArtifactReleaseReadiness(metadata, {
      shopifyConnection: {
        configured: false,
        shop: "",
        mode: "client_credentials",
        apiVersion: "2024-01",
      },
    });

    const pdf = readiness.destinations.find((d) => d.id === "archival-pdf");
    const shopify = readiness.destinations.find((d) => d.id === "shopify-draft");

    expect(pdf?.status === "ready" || pdf?.status === "needs-review").toBe(true);
    expect(shopify?.status).toBe("not-configured");
  });

  it("reflects deterministic recommendation from approval queue", () => {
    const metadata = makeLegacyZineMetadata();
    metadata.isPublic = false;
    metadata.coverImageUrl = undefined;

    const readiness = deriveArtifactReleaseReadiness(metadata);
    expect(readiness.approvals.some((a) => a.label.includes("cover"))).toBe(true);
    expect(readiness.unresolvedCount).toBeGreaterThan(0);
    expect(readiness.recommendation.rationale.length).toBeGreaterThan(0);
  });

  it("propagates Shopify pack warnings to destinations and checks", () => {
    const inspection: ShopifyPackInspection = {
      status: "needs-review",
      filename: "pack.zip",
      files: ["product.csv"],
      checks: [
        {
          id: "alt-text",
          label: "Image alt text",
          status: "warning",
          detail: "Second image missing alt text",
        },
      ],
      product: minimalShopifyProduct(),
    };

    const readiness = deriveArtifactReleaseReadiness(makeLegacyZineMetadata(), {
      shopifyConnection: {
        configured: true,
        shop: "test.myshopify.com",
        apiVersion: "2024-01",
        mode: "client_credentials",
      },
      shopifyInspection: inspection,
    });

    const shopify = readiness.destinations.find((d) => d.id === "shopify-draft");
    expect(shopify?.status).toBe("needs-review");
    expect(
      readiness.checks.some((c) => c.id.startsWith("dest-shopify") || c.summary.includes("review")),
    ).toBe(true);
  });

  it("includes editorial compile in context stage when present on metadata", () => {
    const metadata = makeLegacyZineMetadata();
    metadata.editorialCompileMarkdown = "# Compile";
    metadata.editorialCompileOwnerUid = metadata.userId;

    const readiness = deriveArtifactReleaseReadiness(metadata);
    const context = readiness.stages.find((s) => s.id === "context");
    expect(
      context?.checks.some((c) => c.id === "context-editorial-compile" && c.status === "ready"),
    ).toBe(true);
  });

  it("uses honest not-configured for newsletter destination", () => {
    const readiness = deriveArtifactReleaseReadiness(makeLegacyZineMetadata());
    const newsletter = readiness.destinations.find((d) => d.id === "newsletter");
    expect(newsletter?.status).toBe("not-configured");
    expect(newsletter?.description).toMatch(/provider connected|not configured/i);
  });
});
