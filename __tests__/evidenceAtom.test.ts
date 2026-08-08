import { describe, expect, it } from "vitest";
import {
  correctionStateSchema,
  createEvidenceAtomSchema,
} from "../lib/taste/evidenceAtomSchema";


describe("Taste Intelligence evidence atom", () => {
  it("preserves the submitted source and supplies safe defaults", () => {
    const input = {
      kind: "image" as const,
      sourceType: "image",
      originalSource: "https://example.com/reference.jpg",
    };

    const parsed = createEvidenceAtomSchema.parse(input);

    expect(parsed.originalSource).toBe(input.originalSource);
    expect(parsed.sourceMetadata).toEqual({});
    expect(parsed.confidence).toBe(0.5);
    expect(parsed.stabilityClass).toBe("temporary");
    expect(parsed.processingState).toBe("pending");
  });

  it("rejects an empty source rather than inventing evidence", () => {
    expect(() =>
      createEvidenceAtomSchema.parse({
        kind: "note",
        sourceType: "text",
        originalSource: "",
      }),
    ).toThrow();
  });

  it("recognizes the complete correction vocabulary", () => {
    const corrections = [
      "YES",
      "SORT_OF",
      "NOT_ANYMORE",
      "ONLY_HERE",
      "NOT_ME",
      "MORE_LIKE_THIS",
    ] as const;

    for (const correction of corrections) {
      expect(correctionStateSchema.parse(correction)).toBe(correction);
    }
  });
});
