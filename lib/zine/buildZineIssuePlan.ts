import type {
  EditorialDirection,
  IssueRhythm,
  MimiZineArtifact,
  PageContribution,
  ZineCoverSpec,
  ZineIssuePlan,
  ZineNarrativeFunction,
  ZinePageGrammar,
  ZinePagePlan,
  ZinePageSpec,
  ZineReading,
  ZineSectionType,
  ZineSourcePacket,
} from "../../types";
import { grammarForSection, stableZinePageId } from "./zineIssuePlanner";
import { compressZineIssuePlan } from "./compressZineIssuePlan";
import { evaluateZineIssuePlan } from "./evaluateZineIssuePlan";

export const ZINE_ISSUE_PLAN_SCHEMA_VERSION = 1 as const;

export interface BuildZineIssuePlanInput {
  artifactId: string;
  revision: number;
  title: string;
  sourcePacket: ZineSourcePacket;
  reading: ZineReading;
  direction: EditorialDirection;
  cover: ZineCoverSpec;
  authoredPages: ZinePageSpec[];
  createdAt?: number;
}

function clampUnit(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(1, Math.max(0, value));
}

function planPageId(artifactId: string, sectionType: ZineSectionType, index: number): string {
  return `${artifactId}:plan:${sectionType}:${index + 1}`;
}

function contribution(
  kind: PageContribution["kind"],
  rationale: string,
  sourceIds: string[] = [],
  claimLabel?: string,
): PageContribution {
  return {
    kind,
    rationale,
    sourceIds: sourceIds.length > 0 ? [...sourceIds] : undefined,
    claimLabel,
  };
}

function narrativeForSection(
  sectionType: ZineSectionType,
  derived: boolean,
): ZineNarrativeFunction {
  switch (sectionType) {
    case "cover":
      return derived ? "invitation" : "orientation";
    case "opening":
      return "orientation";
    case "reading":
      return "revelation";
    case "signal-index":
    case "evidence":
      return "evidence";
    case "visual-plate":
      return "intensification";
    case "essay":
      return "complication";
    case "interlude":
      return "release";
    case "roadmap":
      return "application";
    case "debris":
      return "residue";
    case "colophon":
      return "residue";
    default: {
      const exhaustive: never = sectionType;
      return exhaustive;
    }
  }
}

function assignAuthoredSection(
  page: ZinePageSpec,
  index: number,
  total: number,
): ZineSectionType {
  if (page.sectionType) return page.sectionType;
  if (page.pageType === "thread_timeline") return "evidence";
  if (page.sourceIds?.length && index % 2 === 1) return "evidence";
  if (index === total - 1 && total > 4) return "interlude";
  if (index === Math.floor(total / 2) && total >= 6) return "essay";
  return "visual-plate";
}

function grammarForPlanPage(
  sectionType: ZineSectionType,
  index: number,
  total: number,
): ZinePageGrammar {
  if (sectionType === "visual-plate" && total >= 6 && index === Math.floor(total / 2)) {
    return "dark-plate";
  }
  return grammarForSection(sectionType, index, total);
}

function rhythmFromPages(pages: ZinePagePlan[]): IssueRhythm {
  return {
    pageIds: pages.map((page) => page.id),
    densityCurve: pages.map((page) => page.informationDensity),
    visualIntensityCurve: pages.map((page) => page.visualIntensity),
    textImageRatioCurve: pages.map((page) => page.textImageRatio),
    darkPlatePageIds: pages
      .filter((page) => page.grammar === "dark-plate")
      .map((page) => page.id),
    pausePageIds: pages
      .filter(
        (page) =>
          page.narrativeFunction === "release" || page.kind === "pause",
      )
      .map((page) => page.id),
  };
}

function coverPlan(
  input: BuildZineIssuePlanInput,
  pageNumber: number,
): ZinePagePlan {
  return {
    id: planPageId(input.artifactId, "cover", 0),
    pageNumber,
    kind: "cover",
    sectionType: "cover",
    grammar: "specimen",
    narrativeFunction: "invitation",
    headline: input.cover.title || input.title,
    purpose: "Establish the issue threshold and title.",
    earnsExistenceBy: [
      contribution(
        "emotional-movement",
        "Invites the reader into the issue threshold before any evidence appears.",
      ),
    ],
    sourceIds: [],
    informationDensity: 0.35,
    visualIntensity: 0.55,
    textImageRatio: 0.4,
    requiresGeneratedMedia: Boolean(
      !input.cover.imageUrl && !input.cover.bakedImageUrl,
    ),
    derived: true,
  };
}

function colophonPlan(
  input: BuildZineIssuePlanInput,
  pageNumber: number,
): ZinePagePlan {
  return {
    id: planPageId(input.artifactId, "colophon", 0),
    pageNumber,
    kind: "colophon",
    sectionType: "colophon",
    grammar: "editorial-split",
    narrativeFunction: "residue",
    headline: "Colophon",
    purpose: "Close the issue with provenance and authorship custody.",
    earnsExistenceBy: [
      contribution(
        "provenance",
        "Records public source custody and authorship for this revision.",
        input.sourcePacket.fragmentIds,
      ),
    ],
    sourceIds: input.sourcePacket.fragmentIds,
    informationDensity: 0.25,
    visualIntensity: 0.15,
    textImageRatio: 0.85,
    requiresGeneratedMedia: false,
    derived: true,
  };
}

function contentPlanFromAuthored(
  input: BuildZineIssuePlanInput,
  page: ZinePageSpec,
  index: number,
  total: number,
  pageNumber: number,
): ZinePagePlan {
  const sectionType = assignAuthoredSection(page, index, total);
  const grammar = grammarForPlanPage(sectionType, index, total);
  const sourceIds = page.sourceIds || [];
  const id = page.id || stableZinePageId(input.artifactId, page, index);
  const contributions: PageContribution[] = [];

  if (sourceIds.length > 0) {
    contributions.push(
      contribution(
        "new-evidence",
        "Makes source material inspectable on the page.",
        sourceIds,
        page.headline,
      ),
    );
  }
  if (page.bodyCopy.trim()) {
    contributions.push(
      contribution(
        "new-interpretation",
        "Advances the approved reading through authored copy.",
        sourceIds,
        page.headline,
      ),
    );
  }
  if (page.imagePrompt || page.image_url) {
    contributions.push(
      contribution(
        "visual-information",
        "Adds visual information that develops the issue rather than repeating prior plates.",
        sourceIds,
      ),
    );
  }
  if (contributions.length === 0) {
    contributions.push(
      contribution(
        "emotional-movement",
        "Maintains narrative movement through this authored plate.",
      ),
    );
  }

  return {
    id,
    pageNumber,
    kind: sectionType === "interlude" ? "pause" : "content",
    sectionType,
    grammar,
    narrativeFunction: narrativeForSection(sectionType, false),
    headline: page.headline,
    purpose:
      sectionType === "evidence"
        ? "Make support inspectable before conclusions harden."
        : sectionType === "essay"
          ? "Introduce complication or sustained editorial argument."
          : "Develop the issue through visual and textual material.",
    earnsExistenceBy: contributions,
    sourceIds,
    transitionFromPrevious:
      index === 0
        ? undefined
        : "Continues the editorial movement from the preceding beat.",
    informationDensity: clampUnit(input.direction.compositionDensity, 0.5),
    visualIntensity:
      grammar === "dark-plate" ? 0.85 : sectionType === "visual-plate" ? 0.7 : 0.45,
    textImageRatio:
      page.image_url || page.imagePrompt
        ? 0.35
        : page.customLayout?.elements.length
          ? 0.5
          : 0.75,
    requiresGeneratedMedia: Boolean(page.imagePrompt && !page.image_url),
    realizedPageId: id,
    derived: false,
  };
}

function derivedContentPlan(
  input: BuildZineIssuePlanInput,
  sectionType: ZineSectionType,
  pageNumber: number,
  headline: string,
  purpose: string,
  contributions: PageContribution[],
  sourceIds: string[] = [],
  grammar?: ZinePageGrammar,
): ZinePagePlan {
  const derivedGrammar = grammar || grammarForSection(sectionType, 0, 1);
  return {
    id: planPageId(input.artifactId, sectionType, pageNumber),
    pageNumber,
    kind: sectionType === "interlude" ? "pause" : "content",
    sectionType,
    grammar: derivedGrammar,
    narrativeFunction: narrativeForSection(sectionType, true),
    headline,
    purpose,
    earnsExistenceBy: contributions,
    sourceIds,
    informationDensity: clampUnit(input.direction.compositionDensity, 0.5),
    visualIntensity: sectionType === "reading" ? 0.35 : 0.5,
    textImageRatio: sectionType === "reading" ? 0.9 : 0.6,
    requiresGeneratedMedia: false,
    derived: true,
  };
}

export function buildZineIssuePlan(input: BuildZineIssuePlanInput): ZineIssuePlan {
  const pages: ZinePagePlan[] = [];
  let pageNumber = 1;

  pages.push(coverPlan(input, pageNumber));
  pageNumber += 1;

  const hasOpening = Boolean(
    input.sourcePacket.originalInput?.trim() || input.direction.purpose?.trim(),
  );
  const hasReading = Boolean(input.reading.centralObservation.trim());
  const hasSignals = input.reading.signals.length > 0;
  const hasRoadmap = Boolean(
    input.direction.thesis?.trim() || input.reading.strategicHypothesis?.trim(),
  );
  const hasDebris = Boolean(input.sourcePacket.originalInput?.trim());

  if (hasOpening) {
    pages.push(
      derivedContentPlan(
        input,
        "opening",
        pageNumber,
        "Threshold",
        "Orient the reader to scope, intent, and editorial purpose.",
        [
          contribution(
            "new-interpretation",
            "Establishes reading position before the central observation.",
            input.sourcePacket.fragmentIds,
            input.direction.purpose,
          ),
        ],
        input.sourcePacket.fragmentIds,
      ),
    );
    pageNumber += 1;
  }

  if (hasReading) {
    pages.push(
      derivedContentPlan(
        input,
        "reading",
        pageNumber,
        "The Reading",
        "Carry the approved central observation and interpretive turn.",
        [
          contribution(
            "new-interpretation",
            "Introduces the issue's central interpretive turn.",
            input.sourcePacket.fragmentIds,
            input.reading.centralObservation,
          ),
        ],
        input.sourcePacket.fragmentIds,
        "reading",
      ),
    );
    pageNumber += 1;
  }

  if (hasSignals) {
    pages.push(
      derivedContentPlan(
        input,
        "signal-index",
        pageNumber,
        "Signal Index",
        "Index inspectable motifs tied to source material.",
        [
          contribution(
            "new-evidence",
            "Indexes durable signals before visual plates develop them.",
            input.reading.signals.flatMap((signal) => signal.sourceIds || []),
          ),
        ],
        input.reading.signals.flatMap((signal) => signal.sourceIds || []),
        "evidence-ledger",
      ),
    );
    pageNumber += 1;
  }

  input.authoredPages.forEach((page, index) => {
    pages.push(
      contentPlanFromAuthored(
        input,
        page,
        index,
        input.authoredPages.length,
        pageNumber,
      ),
    );
    pageNumber += 1;
  });

  if (hasRoadmap) {
    pages.push(
      derivedContentPlan(
        input,
        "roadmap",
        pageNumber,
        "Application",
        "Translate the reading into direction or next movement.",
        [
          contribution(
            "application",
            "Applies the approved thesis to a decision, experiment, or practice.",
            input.sourcePacket.fragmentIds,
            input.direction.thesis,
          ),
        ],
        input.sourcePacket.fragmentIds,
      ),
    );
    pageNumber += 1;
  }

  if (hasDebris) {
    pages.push(
      derivedContentPlan(
        input,
        "debris",
        pageNumber,
        "Debris",
        "Hold unresolved originating material without promoting it to evidence.",
        [
          contribution(
            "necessary-pause",
            "Preserves originating residue without forcing closure.",
          ),
        ],
      ),
    );
    pageNumber += 1;
  }

  pages.push(colophonPlan(input, pageNumber));

  const editorialThesis =
    input.direction.thesis ||
    input.reading.strategicHypothesis ||
    input.reading.centralObservation ||
    input.title;

  const unresolvedQuestion = input.reading.uncertainty?.[0]?.statement;

  const draft: ZineIssuePlan = {
    schemaVersion: ZINE_ISSUE_PLAN_SCHEMA_VERSION,
    artifactId: input.artifactId,
    revision: input.revision,
    editorialThesis,
    unresolvedQuestion,
    pages,
    rhythm: rhythmFromPages(pages),
    evaluation: { result: "pass", findings: [] },
    createdAt: input.createdAt || Date.now(),
  };

  const compressed = compressZineIssuePlan(draft);
  compressed.rhythm = rhythmFromPages(compressed.pages);
  compressed.evaluation = evaluateZineIssuePlan(compressed);
  return compressed;
}

export function buildZineIssuePlanFromArtifact(
  artifact: MimiZineArtifact,
): ZineIssuePlan {
  return buildZineIssuePlan({
    artifactId: artifact.identity.id,
    revision: artifact.revision,
    title: artifact.identity.title,
    sourcePacket: artifact.sourcePacket,
    reading: artifact.reading,
    direction: artifact.direction,
    cover: artifact.cover,
    authoredPages: artifact.pages,
    createdAt: artifact.updatedAt,
  });
}
