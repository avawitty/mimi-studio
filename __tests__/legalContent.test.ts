import { describe, expect, it } from "vitest";
import {
  getLegalDocument,
  legalPathFor,
  legalTypeFromPath,
} from "../lib/legalContent";

describe("legalContent", () => {
  it("resolves privacy and tos paths", () => {
    expect(legalTypeFromPath("/privacy")).toBe("privacy");
    expect(legalTypeFromPath("/tos")).toBe("terms");
    expect(legalTypeFromPath("/terms")).toBe("terms");
    expect(legalTypeFromPath("/other")).toBeNull();
  });

  it("uses canonical paths for links", () => {
    expect(legalPathFor("privacy")).toBe("/privacy");
    expect(legalPathFor("terms")).toBe("/tos");
  });

  it("keeps plain-language privacy and terms documents", () => {
    const privacy = getLegalDocument("privacy");
    const terms = getLegalDocument("terms");

    expect(privacy.title).toBe("Privacy Policy");
    expect(terms.title).toBe("Terms of Service");
    expect(privacy.sections.length).toBeGreaterThan(5);
    expect(terms.sections.length).toBeGreaterThan(5);
    expect(privacy.contactEmail).toContain("@");
    expect(terms.sections.some((s) => s.body.includes("/tos"))).toBe(true);
  });
});
