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
    expect(manifest.fragmentsUsed).toEqual(["atom-export"]);
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
    metadata.artifacts = [
      {
        id: "private-media",
        type: "image",
        url: "",
        data: "data:image/png;base64,private",
        mimeType: "image/png",
        transcription: "private transcription",
      },
    ];
    metadata.editorialCompileMarkdown = "Private working compile";
    (metadata as ZineMetadata & { secretWorkingField?: string }).secretWorkingField =
      "must not survive";
    const workingPages = JSON.parse(metadata.content.pagesJson || "[]");
    workingPages[0].customLayout = {
      elements: [
        {
          id: "private-image-seed",
          type: "image",
          content: workingPages[0].originalMediaUrl,
          notes: "owner-only crop note",
          negativePrompt: "private prompt",
          style: {
            top: 10,
            left: 10,
            width: 80,
            height: 60,
            backgroundImage: "url(https://private.example/texture.png)",
          },
        },
      ],
      readingOrder: ["private-image-seed"],
      editTrace: [{ timestamp: 1, note: "private edit trace" }],
    };
    metadata.content.pagesJson = JSON.stringify(workingPages);
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
    const publicPages = JSON.parse(publicZine.content.pagesJson || "[]");
    expect(publicPages[0].sourceIds).toEqual([]);
    expect(publicPages[1].sourceIds).toEqual([]);
    expect(publicPages[0].originalMediaUrl).toBeUndefined();
    expect(publicPages[0].imagePrompt).toBe("");
    expect(publicPages[0].customLayout.editTrace).toBeUndefined();
    expect(publicPages[0].customLayout.elements[0]).toMatchObject({
      content: "https://cdn.example.test/developed-master.jpg",
    });
    expect(publicPages[0].customLayout.elements[0].notes).toBeUndefined();
    expect(
      publicPages[0].customLayout.elements[0].style.backgroundImage,
    ).toBeUndefined();
    expect(
      publicZine.content.structure.pages[0].sourceIds,
    ).toEqual([]);
    expect(publicZine.content.structure.hero_prompt).toBe("");
    expect(publicZine.content.visual_guidance.negative_prompt).toBe("");
    expect(publicZine.artifacts).toBeUndefined();
    expect(publicZine.editorialCompileMarkdown).toBeUndefined();
    expect(publicZine).not.toHaveProperty("secretWorkingField");
  });

  it("prefers canonical source-packet visibility during export", () => {
    const metadata = makeLegacyZineMetadata();
    metadata.usedContextSnapshots = undefined;
    metadata.sourcePacket = {
      originalInput: metadata.originalInput,
      fragmentIds: ["canonical-private"],
      attachedAssets: [],
      usedContextSnapshots: [
        {
          atomId: "canonical-private",
          title: "Working only",
          content: "Do not export",
          visibility: { working: true, export: false, public: false },
        },
      ],
    };

    const manifest = buildExportManifest(metadata);
    expect(manifest.fragmentsUsed).toEqual([]);
    expect(manifest.usedContextSnapshots).toEqual([]);
    const product = buildShopifyProductFromZine(metadata);
    expect(product.provenance.fragmentsUsed).toEqual([]);
    expect(product.provenance.usedContextSnapshots).toEqual([]);
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
