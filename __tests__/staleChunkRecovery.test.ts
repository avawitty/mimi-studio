import { describe, expect, it } from "vitest";
import { isStaleAssetError } from "../lib/staleChunkRecovery";

describe("isStaleAssetError", () => {
  it("detects MIME failures from HTML served as JS", () => {
    expect(
      isStaleAssetError("'text/html' is not a valid JavaScript MIME type."),
    ).toBe(true);
  });

  it("detects dynamic import / chunk load failures", () => {
    expect(
      isStaleAssetError("Failed to fetch dynamically imported module: https://mimi.you/assets/x.js"),
    ).toBe(true);
    expect(isStaleAssetError("Loading chunk 5 failed.")).toBe(true);
  });

  it("ignores unrelated faults", () => {
    expect(isStaleAssetError("Firestore permission denied")).toBe(false);
    expect(isStaleAssetError(undefined)).toBe(false);
  });
});
