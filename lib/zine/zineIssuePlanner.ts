import type {
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
