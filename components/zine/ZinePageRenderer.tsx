import { memo } from "react";
import { elementsInReadingOrder } from "../../lib/zine/zineReadingOrder";
import { pageHasCustomLayout } from "../../lib/zineSpreadLayout";
import type {
  MimiZineArtifact,
  ZinePageGrammar,
  ZinePageSpec,
} from "../../types";
import { ZineSpreadCanvas } from "../ZineSpreadCanvas";
import { DarkPlatePage } from "./grammars/DarkPlatePage";
import { DebrisPage } from "./grammars/DebrisPage";
import { EditorialSplitPage } from "./grammars/EditorialSplitPage";
import { EvidenceLedgerPage } from "./grammars/EvidenceLedgerPage";
import { ReadingPage } from "./grammars/ReadingPage";
import { SpecimenPage } from "./grammars/SpecimenPage";
import { CelestialPlatePage } from "./grammars/CelestialPlatePage";
import { ScreenwritePage } from "./grammars/ScreenwritePage";
import { SonicPlatePage } from "./grammars/SonicPlatePage";
import { SignalIndexPage } from "./grammars/SignalIndexPage";
import { ChromaticPlatePage } from "./grammars/ChromaticPlatePage";
import { OwnerCarouselPage } from "./grammars/OwnerCarouselPage";

interface ZinePageRendererProps {
  artifact: MimiZineArtifact;
  page: ZinePageSpec;
  pageIndex: number;
  className?: string;
}

function grammarComponent(
  grammar: ZinePageGrammar,
  props: ZinePageRendererProps,
) {
  switch (grammar) {
    case "specimen":
      return <SpecimenPage {...props} />;
    case "reading":
      return <ReadingPage {...props} />;
    case "evidence-ledger":
      return <EvidenceLedgerPage {...props} />;
    case "editorial-split":
      return <EditorialSplitPage {...props} />;
    case "dark-plate":
      return <DarkPlatePage {...props} />;
    case "debris":
      return <DebrisPage {...props} />;
    case "celestial":
      return <CelestialPlatePage {...props} />;
    case "screenwrite":
      return <ScreenwritePage {...props} />;
    case "sonic":
      return <SonicPlatePage {...props} />;
    case "signal-index":
      return <SignalIndexPage {...props} />;
    case "chromatic":
      return <ChromaticPlatePage {...props} />;
    case "owner-carousel":
      return <OwnerCarouselPage {...props} />;
    default: {
      const exhaustive: never = grammar;
      return exhaustive;
    }
  }
}

function ZinePageRendererComponent(props: ZinePageRendererProps) {
  const { artifact, page, pageIndex, className = "" } = props;

  if (pageHasCustomLayout(page)) {
    const orderedElements = elementsInReadingOrder(page);
    return (
      <article
        className={className}
        aria-label={`Composed page ${page.pageNumber}: ${page.headline}`}
        data-zine-grammar="custom"
        data-page-id={page.id}
      >
        <div aria-hidden="true">
          <ZineSpreadCanvas page={page} aspectClassName="aspect-[4/5]" />
        </div>
        <ol className="sr-only">
          {orderedElements.map((element) => (
            <li key={element.id}>
              {element.type === "image"
                ? element.notes || page.altText || `Image for ${page.headline}`
                : element.content}
            </li>
          ))}
        </ol>
      </article>
    );
  }

  const grammar = page.grammar || "editorial-split";
  return grammarComponent(grammar, {
    artifact,
    page,
    pageIndex,
    className,
  });
}

export const ZinePageRenderer = memo(
  ZinePageRendererComponent,
  (previous, next) =>
    previous.artifact.revision === next.artifact.revision &&
    previous.page.id === next.page.id &&
    previous.page.revision === next.page.revision &&
    previous.page.assetRevision === next.page.assetRevision &&
    previous.page.layoutRevision === next.page.layoutRevision &&
    previous.pageIndex === next.pageIndex &&
    previous.className === next.className,
);
