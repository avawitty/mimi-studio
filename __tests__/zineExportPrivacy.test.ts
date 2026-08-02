import { describe, expect, it, vi } from "vitest";
import {
  buildExportManifest,
  validateExportManifest,
} from "../services/exportManifestService";
import { buildShopifyProductFromZine } from "../services/shopifyExportService";
import { sanitizeShopifyProvenance } from "../lib/shopifyAdmin";
import { sanitizeZineForPublicView } from "../lib/privacyUtils";
import type { ZineMetadata } from "../types";
import { makeLegacyZineMetadata } from "./fixtures/zineMetadata";

describe("zine export privacy and ownership", () => {
  it("excludes non-export context and redacts allowed snapshot bodies", () => {
    const manifest = buildExportManifest(makeLegacyZineMetadata());

    expect(manifest.usedContextSnapshots).toHaveLength(1);
    expect(manifest.usedContextSnapshots[0]).toMatchObject({
      atomId: "atom-export",
      title: "Exportable source",
      content: "",
    });
    expect(
      manifest.usedContextSnapshots.some(
        (snapshot) => snapshot.atomId === "atom-private",
      ),
    ).toBe(false);
  });

  it("refuses editorial compile metadata owned by another user", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const metadata: ZineMetadata = {
      ...makeLegacyZineMetadata(),
      editorialCompileMarkdown: "# Foreign compile",
      editorialCompileOwnerUid: "another-owner",
      editorialCompileOwnerHandle: "other",
    };

    const manifest = buildExportManifest(metadata);
    expect(manifest.editorialCompileMarkdown).toBeUndefined();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("exposes only explicitly public context on public zine reads", () => {
    const metadata = makeLegacyZineMetadata();
    metadata.usedContextSnapshots![1].visibility = {
      working: true,
      export: true,
      public: true,
    };
    const publicZine = sanitizeZineForPublicView(metadata);

    expect(publicZine.fragmentsUsed).toEqual(["atom-export"]);
    expect(publicZine.usedContextSnapshots).toHaveLength(1);
    expect(publicZine.usedContextSnapshots?.[0].content).toBe(
      "Source body must still be redacted.",
    );
  });

  it("redacts Shopify provenance on both client and server boundaries", () => {
    const metadata = makeLegacyZineMetadata();
    const product = buildShopifyProductFromZine(metadata);
    expect(product.provenance.fragmentsUsed).toEqual(["atom-export"]);
    expect(product.provenance.usedContextSnapshots).toHaveLength(1);
    expect(product.provenance.usedContextSnapshots?.[0].content).toBe("");

    const serverSafe = sanitizeShopifyProvenance(
      {
        artifactId: metadata.id,
        source: "mimi-zine",
        fragmentsUsed: ["atom-export", "atom-private"],
        usedContextSnapshots: metadata.usedContextSnapshots,
        secretWorkingNote: "must not survive",
      },
      metadata.id,
    );
    expect(serverSafe.fragmentsUsed).toEqual(["atom-export"]);
    expect(
      (serverSafe.usedContextSnapshots as Array<{ content: string }>)[0].content,
    ).toBe("");
    expect(serverSafe).not.toHaveProperty("secretWorkingNote");
  });

  it("keeps cover and compile optional while blocking core identity failures", () => {
    const metadata: ZineMetadata = {
      ...makeLegacyZineMetadata(),
      coverImageUrl: undefined,
      editorialCompileMarkdown: undefined,
    };
    expect(validateExportManifest(buildExportManifest(metadata)).ok).toBe(true);

    const invalid: ZineMetadata = {
      ...metadata,
      title: "",
      content: { ...metadata.content, title: undefined },
    };
    const result = validateExportManifest(buildExportManifest(invalid));
    expect(result.ok).toBe(false);
    expect(result.failures).toContain("Missing title");
  });
});
