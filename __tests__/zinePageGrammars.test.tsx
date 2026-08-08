import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ZinePageRenderer } from "../components/zine/ZinePageRenderer";
import { normalizeZineArtifact } from "../lib/zine/normalizeZineArtifact";
import type { ZinePageGrammar, ZinePageSpec } from "../types";
import { makeLegacyZineMetadata } from "./fixtures/zineMetadata";

const GRAMMARS: ZinePageGrammar[] = [
  "specimen",
  "reading",
  "evidence-ledger",
  "editorial-split",
  "dark-plate",
  "debris",
  "celestial",
  "screenwrite",
  "sonic",
  "signal-index",
  "chromatic",
  "owner-carousel",
  "used-context",
  "contact-sheet",
  "material-specimen",
  "forecast-drift",
];

describe("exemplary zine page grammars", () => {
  it.each(GRAMMARS)("renders the %s grammar as a 4:5 page", (grammar) => {
    const artifact = normalizeZineArtifact(makeLegacyZineMetadata());
    const page: ZinePageSpec = {
      ...artifact.pages[0],
      grammar,
      customLayout: undefined,
    };
    const markup = renderToStaticMarkup(
      <ZinePageRenderer artifact={artifact} page={page} pageIndex={0} />,
    );

    expect(markup).toContain(`data-zine-grammar="${grammar}"`);
    expect(markup).toContain("aspect-[4/5]");
  });

  it("renders custom layouts with a separate logical reading order", () => {
    const artifact = normalizeZineArtifact(makeLegacyZineMetadata());
    const page = artifact.pages[1];
    const markup = renderToStaticMarkup(
      <ZinePageRenderer artifact={artifact} page={page} pageIndex={1} />,
    );

    expect(markup.indexOf("Evidence remains handled")).toBeLessThan(
      markup.indexOf("Observed material and inferred pattern"),
    );
    expect(markup).toContain('data-zine-grammar="custom"');
  });
});
