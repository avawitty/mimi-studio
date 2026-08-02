import { describe, expect, it, vi } from "vitest";
import {
  buildExportManifest,
  validateExportManifest,
} from "../services/exportManifestService";
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
