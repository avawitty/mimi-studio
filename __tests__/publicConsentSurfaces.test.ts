import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("public consent surfaces", () => {
  it("redirects legacy /@ routes without rendering tasteProfile", () => {
    const source = readFileSync(
      resolve(process.cwd(), "components/PublicSharePage.tsx"),
      "utf8",
    );
    expect(source).toMatch(/location\.replace\(`\/u\/\$\{normalized\}`\)/);
    expect(source).not.toMatch(/tasteProfile/);
  });

  it("gates public signature extraction on published snapshot", () => {
    const source = readFileSync(
      resolve(process.cwd(), "lib/signature/publicSignature.ts"),
      "utf8",
    );
    expect(source).toMatch(/extractPublishedPublicSignature/);
    expect(source).toMatch(/publishedAt/);
  });
});
