import type {
  MimiZineArtifact,
  ZineIssueStructure,
  ZinePageGrammar,
  ZinePageSpec,
  ZineSectionSpec,
  ZineSectionType,
} from "../../types";

const SECTION_ORDER: ZineSectionType[] = [
  "cover",
  "opening",
  "reading",
  "signal-index",
  "visual-plate",
  "evidence",
  "essay",
  "interlude",
  "roadmap",
  "debris",
  "colophon",
];

const REQUIRED_SECTIONS = new Set<ZineSectionType>([
  "cover",
  "reading",
  "visual-plate",
  "colophon",
]);

export interface BuildIssueStructureOptions {
  artifactId: string;
  pages: ZinePageSpec[];
  hasOpening: boolean;
  hasReading: boolean;
  hasSignals: boolean;
  hasRoadmap: boolean;
  hasDebris: boolean;
  existing?: ZineIssueStructure;
}

function stableToken(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function stableZinePageId(
  artifactId: string,
  page: ZinePageSpec,
  index: number,
): string {
  if (page.id?.trim()) return page.id;
  const seed = [
    artifactId,
    page.pageNumber || index + 1,
    page.headline || "untitled",
    index,
  ].join(":");
  return `${artifactId}:page:${stableToken(seed)}`;
}

export function inferPageSectionType(
  page: ZinePageSpec,
  index: number,
  pageCount: number,
): ZineSectionType {
  if (page.sectionType) return page.sectionType;
  if (page.pageType === "thread_timeline") return "evidence";

  switch (page.grammar) {
    case "reading":
      return "reading";
    case "evidence-ledger":
      return "evidence";
    case "debris":
      return "debris";
    case "specimen":
    case "editorial-split":
    case "dark-plate":
      return "visual-plate";
    case undefined:
      break;
    default: {
      const exhaustive: never = page.grammar;
      return exhaustive;
    }
  }

  if (index === 0 || pageCount === 1) return "visual-plate";
  if (index === 1) return "evidence";
  if (index === 2) return "essay";
  if (index === 4) return "interlude";
  return "visual-plate";
}

export function grammarForSection(
  sectionType: ZineSectionType,
  index: number,
  pageCount: number,
): ZinePageGrammar {
  switch (sectionType) {
    case "reading":
      return "reading";
    case "signal-index":
    case "evidence":
      return "evidence-ledger";
    case "debris":
      return "debris";
    case "cover":
    case "opening":
    case "visual-plate":
      if (index === 0) return "specimen";
      if (pageCount >= 6 && index === Math.floor(pageCount / 2)) return "dark-plate";
      return "editorial-split";
    case "essay":
    case "interlude":
    case "roadmap":
    case "colophon":
      return "editorial-split";
    default: {
      const exhaustive: never = sectionType;
      return exhaustive;
    }
  }
}

export function prepareArtifactPages(
  artifactId: string,
  pages: ZinePageSpec[],
): ZinePageSpec[] {
  return pages.map((page, index) => {
    const id = stableZinePageId(artifactId, page, index);
    const sectionType = inferPageSectionType(page, index, pages.length);
    return {
      ...page,
      id,
      pageNumber: page.pageNumber || index + 1,
      sectionId: page.sectionId || `${artifactId}:section:${sectionType}`,
      sectionType,
      grammar: page.grammar || grammarForSection(sectionType, index, pages.length),
      revision: page.revision || 1,
      assetRevision: page.assetRevision || 0,
      layoutRevision: page.layoutRevision || (page.customLayout?.elements.length ? 1 : 0),
      originalMediaUrl: page.originalMediaUrl || page.image_url,
      customLayout: page.customLayout
        ? {
            ...page.customLayout,
            elements: page.customLayout.elements.map((element) => ({
              ...element,
              style: { ...element.style },
            })),
            readingOrder: page.customLayout.readingOrder
              ? [...page.customLayout.readingOrder]
              : undefined,
            editTrace: page.customLayout.editTrace
              ? [...page.customLayout.editTrace]
              : undefined,
          }
        : undefined,
    };
  });
}

function sectionTitle(type: ZineSectionType): string {
  switch (type) {
    case "cover":
      return "Cover";
    case "opening":
      return "Threshold";
    case "reading":
      return "The Reading";
    case "signal-index":
      return "Signal Index";
    case "essay":
      return "Editorial Essay";
    case "visual-plate":
      return "Visual Plates";
    case "evidence":
      return "Evidence";
    case "interlude":
      return "Interlude";
    case "roadmap":
      return "Application";
    case "debris":
      return "Debris";
    case "colophon":
      return "Colophon";
    default: {
      const exhaustive: never = type;
      return exhaustive;
    }
  }
}

function sectionHasDerivedPage(
  type: ZineSectionType,
  options: BuildIssueStructureOptions,
): boolean {
  switch (type) {
    case "cover":
    case "colophon":
      return true;
    case "opening":
      return options.hasOpening;
    case "reading":
      return options.hasReading;
    case "signal-index":
      return options.hasSignals;
    case "roadmap":
      return options.hasRoadmap;
    case "debris":
      return options.hasDebris;
    case "essay":
    case "visual-plate":
    case "evidence":
    case "interlude":
      return false;
    default: {
      const exhaustive: never = type;
      return exhaustive;
    }
  }
}

export function buildDefaultIssueStructure(
  options: BuildIssueStructureOptions,
): ZineIssueStructure {
  const existingByType = new Map(
    (options.existing?.sections || []).map((section) => [section.type, section]),
  );
  const pageIdsByType = new Map<ZineSectionType, string[]>();
  options.pages.forEach((page) => {
    if (!page.id || !page.sectionType) return;
    const ids = pageIdsByType.get(page.sectionType) || [];
    ids.push(page.id);
    pageIdsByType.set(page.sectionType, ids);
  });

  const sections: ZineSectionSpec[] = SECTION_ORDER.map((type) => {
    const existing = existingByType.get(type);
    const pageIds = pageIdsByType.get(type) || existing?.pageIds || [];
    return {
      id: existing?.id || `${options.artifactId}:section:${type}`,
      type,
      title: existing?.title || sectionTitle(type),
      pageIds,
      required: existing?.required ?? REQUIRED_SECTIONS.has(type),
    };
  });

  const derivedPageCount = sections.reduce((count, section) => {
    if (section.pageIds.length > 0) return count;
    return count + (sectionHasDerivedPage(section.type, options) ? 1 : 0);
  }, 0);

  return {
    sections,
    navigationStyle: options.existing?.navigationStyle || "sectioned",
    totalPages: options.pages.length + derivedPageCount,
  };
}

function derivedProofPage(
  artifact: MimiZineArtifact,
  section: ZineSectionSpec,
  pageNumber: number,
): ZinePageSpec | null {
  const common = {
    id: `${section.id}:derived`,
    pageNumber,
    sectionId: section.id,
    sectionType: section.type,
    revision: artifact.revision,
    assetRevision: 0,
    layoutRevision: 0,
  };

  switch (section.type) {
    case "cover":
      return {
        ...common,
        headline: artifact.identity.title,
        bodyCopy: `@${artifact.authorship.creatorHandle} · ${artifact.identity.mode} · ${new Date(artifact.createdAt).toLocaleDateString()}`,
        imagePrompt: "",
        image_url: artifact.cover.imageUrl,
        originalMediaUrl: artifact.cover.originalImageUrl,
        altText: `Cover for ${artifact.identity.title}`,
        grammar: "specimen",
      };
    case "opening":
      return artifact.sourcePacket.originalInput
        ? {
            ...common,
            headline: "It began with",
            bodyCopy: artifact.sourcePacket.originalInput,
            imagePrompt: "",
            grammar: "editorial-split",
          }
        : null;
    case "reading":
      return artifact.reading.centralObservation
        ? {
            ...common,
            headline: "The Reading",
            bodyCopy: artifact.reading.centralObservation,
            supportingText: artifact.reading.strategicHypothesis,
            imagePrompt: "",
            grammar: "reading",
          }
        : null;
    case "signal-index":
      return artifact.reading.signals.length > 0
        ? {
            ...common,
            headline: "Signal Index",
            bodyCopy: `${artifact.reading.signals.length} signal${artifact.reading.signals.length === 1 ? "" : "s"} retained.`,
            imagePrompt: "",
            sourceIds: artifact.reading.signals.flatMap(
              (signal) => signal.sourceIds || [],
            ),
            grammar: "evidence-ledger",
          }
        : null;
    case "roadmap":
      return artifact.direction.intensity ||
        artifact.direction.entropyLevel != null ||
        (artifact.direction.materialDirection?.length || 0) > 0
        ? {
            ...common,
            headline: "Application",
            bodyCopy: [artifact.direction.thesis, artifact.direction.purpose]
              .filter(Boolean)
              .join("\n\n"),
            imagePrompt: "",
            grammar: "editorial-split",
          }
        : null;
    case "debris":
      return artifact.sourcePacket.originalInput
        ? {
            ...common,
            headline: "Debris / 00",
            bodyCopy: artifact.sourcePacket.originalInput,
            imagePrompt: "",
            grammar: "debris",
          }
        : null;
    case "colophon":
      return {
        ...common,
        headline: "Colophon",
        bodyCopy: [
          `Created by @${artifact.authorship.creatorHandle}.`,
          `Generated with Mimi · revision ${String(artifact.revision).padStart(2, "0")}.`,
          `${artifact.colophon.sourceCount} source reference${artifact.colophon.sourceCount === 1 ? "" : "s"} retained.`,
        ].join("\n\n"),
        imagePrompt: "",
        sourceIds: artifact.colophon.publicSourceIds,
        grammar: "editorial-split",
      };
    case "essay":
    case "visual-plate":
    case "evidence":
    case "interlude":
      return null;
    default: {
      const exhaustive: never = section.type;
      return exhaustive;
    }
  }
}

/** Materialize the complete section plan for proof without changing persisted pages. */
export function buildZineProofSequence(
  artifact: MimiZineArtifact,
): ZinePageSpec[] {
  const pagesById = new Map(
    artifact.pages
      .filter((page) => Boolean(page.id))
      .map((page) => [page.id as string, page]),
  );
  const sequence: ZinePageSpec[] = [];

  artifact.issueStructure.sections.forEach((section) => {
    const sectionPages = section.pageIds
      .map((id) => pagesById.get(id))
      .filter((page): page is ZinePageSpec => Boolean(page));
    if (sectionPages.length > 0) {
      sectionPages.forEach((page) => {
        sequence.push({
          ...page,
          pageNumber: sequence.length + 1,
        });
      });
      return;
    }

    const derived = derivedProofPage(
      artifact,
      section,
      sequence.length + 1,
    );
    if (derived) sequence.push(derived);
  });

  return sequence;
}
