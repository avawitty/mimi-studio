import { describe, expect, it } from "vitest";
import {
  auditShadowEmbeddings,
  selectDocsForReindex,
  textForShadowEmbed,
} from "../lib/shadowMemoryIndex";

describe("shadowMemoryIndex", () => {
  it("prefers embed_text over content_preview", () => {
    expect(
      textForShadowEmbed({
        embed_text: "full aesthetic manifesto text",
        content_preview: "truncated",
      }),
    ).toBe("full aesthetic manifesto text");
  });

  it("flags mixed widths against a gateway query (1536)", () => {
    const docs = [
      {
        id: "a",
        kind: "embedding_shadow" as const,
        embedding_field: Array(768).fill(0.1),
        content_preview: "old gemini vec",
      },
      {
        id: "b",
        kind: "embedding_shadow" as const,
        embedding_field: Array(1536).fill(0.1),
        embed_text: "gateway vec",
      },
      {
        id: "c",
        kind: "embedding_shadow" as const,
        embedding_field: [],
        content_preview: "missing vector but has text",
      },
    ];
    const audit = auditShadowEmbeddings(docs, 1536);
    expect(audit.shadowDocs).toBe(3);
    expect(audit.searchable).toBe(1);
    expect(audit.incompatible).toBe(1);
    expect(audit.missingVector).toBe(1);
    expect(audit.needsReindex).toBe(true);
    expect(selectDocsForReindex(docs, 1536).map((d) => d.id).sort()).toEqual(["a", "c"]);
  });

  it("does not need reindex when all vectors match reference width", () => {
    const docs = [
      {
        id: "a",
        kind: "embedding_shadow" as const,
        embedding_field: Array(1536).fill(0.2),
        embed_text: "ok",
      },
    ];
    const audit = auditShadowEmbeddings(docs, 1536);
    expect(audit.needsReindex).toBe(false);
    expect(selectDocsForReindex(docs, 1536)).toEqual([]);
  });

  it("does not prompt reindex when incompatible docs lack embeddable text", () => {
    const docs = [
      {
        id: "broken",
        kind: "embedding_shadow" as const,
        embedding_field: Array(768).fill(0.1),
        // no embed_text / content_preview
      },
      {
        id: "ok",
        kind: "embedding_shadow" as const,
        embedding_field: Array(1536).fill(0.1),
        embed_text: "searchable",
      },
    ];
    const audit = auditShadowEmbeddings(docs, 1536);
    expect(audit.incompatible).toBe(1);
    expect(audit.reindexable).toBe(0);
    expect(audit.needsReindex).toBe(false);
    expect(selectDocsForReindex(docs, 1536)).toEqual([]);
  });

  it("treats same-width model ID mismatch as incompatible", () => {
    const docs = [
      {
        id: "legacy",
        kind: "embedding_shadow" as const,
        embedding_field: Array(1536).fill(0.1),
        embedding_model: "openai/text-embedding-3-large",
        embed_text: "same width, different space",
      },
      {
        id: "current",
        kind: "embedding_shadow" as const,
        embedding_field: Array(1536).fill(0.2),
        embedding_model: "openai/text-embedding-3-small",
        embed_text: "current",
      },
    ];
    const audit = auditShadowEmbeddings(
      docs,
      1536,
      "openai/text-embedding-3-small",
    );
    expect(audit.searchable).toBe(1);
    expect(audit.incompatible).toBe(1);
    expect(audit.needsReindex).toBe(true);
    expect(
      selectDocsForReindex(docs, 1536, "openai/text-embedding-3-small").map((d) => d.id),
    ).toEqual(["legacy"]);
  });
});
