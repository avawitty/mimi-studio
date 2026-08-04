import type {
  ZineIssuePlan,
  ZineIssueStructure,
  ZinePageSpec,
  ZineSectionSpec,
  ZineSectionType,
} from "../../types";
import { grammarForSection, stableZinePageId } from "./zineIssuePlanner";

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

export function issueStructureFromPlan(plan: ZineIssuePlan): ZineIssueStructure {
  const pageIdsByType = new Map<ZineSectionType, string[]>();
  plan.pages.forEach((page) => {
    if (page.derived || !page.realizedPageId) return;
    const ids = pageIdsByType.get(page.sectionType) || [];
    ids.push(page.realizedPageId);
    pageIdsByType.set(page.sectionType, ids);
  });

  const sections: ZineSectionSpec[] = SECTION_ORDER.map((type) => ({
    id: `${plan.artifactId}:section:${type}`,
    type,
    title: sectionTitle(type),
    pageIds: pageIdsByType.get(type) || [],
    required: REQUIRED_SECTIONS.has(type),
  }));

  return {
    sections,
    navigationStyle: "sectioned",
    totalPages: plan.pages.length,
  };
}

export function applyIssuePlanToAuthoredPages(
  artifactId: string,
  authoredPages: ZinePageSpec[],
  plan: ZineIssuePlan,
): ZinePageSpec[] {
  const plannedAuthored = plan.pages.filter(
    (page) => !page.derived && page.realizedPageId,
  );
  const authoredById = new Map(
    authoredPages.map((page, index) => [
      page.id || stableZinePageId(artifactId, page, index),
      page,
    ]),
  );

  return plannedAuthored.map((plannedPage, index) => {
    const existing =
      authoredById.get(plannedPage.realizedPageId!) ||
      authoredPages[index] ||
      authoredPages[0];
    if (!existing) {
      throw new Error(`Missing authored page for plan slot ${plannedPage.id}`);
    }

    return {
      ...existing,
      id: plannedPage.realizedPageId,
      sectionId: `${artifactId}:section:${plannedPage.sectionType}`,
      sectionType: plannedPage.sectionType,
      grammar: plannedPage.grammar,
      sourceIds:
        plannedPage.sourceIds.length > 0
          ? [...plannedPage.sourceIds]
          : existing.sourceIds,
      headline: existing.headline || plannedPage.headline,
    };
  });
}

export function planPageById(
  plan: ZineIssuePlan,
  pageId: string | undefined,
): ZineIssuePlan["pages"][number] | undefined {
  if (!pageId) return undefined;
  return plan.pages.find(
    (page) => page.id === pageId || page.realizedPageId === pageId,
  );
}

export function grammarForAuthoredIndex(
  sectionType: ZineSectionType,
  index: number,
  total: number,
): ReturnType<typeof grammarForSection> {
  return grammarForSection(sectionType, index, total);
}
