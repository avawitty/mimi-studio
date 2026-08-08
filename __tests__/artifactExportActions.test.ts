import { describe, expect, it } from "vitest";
import {
  destinationRequiresPublish,
  destinationToExportMode,
} from "../lib/publisher/artifactExportActions";

describe("artifact export destination bridge", () => {
  it("maps Press destinations to Export Chamber modes", () => {
    expect(destinationToExportMode("archival-pdf")).toBe("pdf");
    expect(destinationToExportMode("asset-package")).toBe("assets");
    expect(destinationToExportMode("social-plates")).toBe("assets");
    expect(destinationToExportMode("shopify-draft")).toBe("shopify");
    expect(destinationToExportMode("web-issue")).toBeNull();
    expect(destinationToExportMode("newsletter")).toBeNull();
  });

  it("flags web issue as publish intent", () => {
    expect(destinationRequiresPublish("web-issue")).toBe(true);
    expect(destinationRequiresPublish("archival-pdf")).toBe(false);
  });
});
