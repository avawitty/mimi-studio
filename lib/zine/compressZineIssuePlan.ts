import type {
  ZineIssuePlan,
  ZinePagePlan,
  ZinePlanCompressionDecision,
  ZinePlanCompressionResult,
} from "../../types";

function planFingerprint(page: ZinePagePlan): string {
  return [
    page.sectionType,
    page.headline.trim().toLowerCase(),
    [...page.sourceIds].sort().join(","),
    page.grammar,
  ].join("|");
}

function renumberPlanPages(pages: ZinePagePlan[]): ZinePagePlan[] {
  return pages.map((page, index) => ({
    ...page,
    pageNumber: index + 1,
  }));
}

function removePage(
  pages: ZinePagePlan[],
  pageId: string,
  rationale: string,
  decisions: ZinePlanCompressionDecision[],
): ZinePagePlan[] {
  const target = pages.find((page) => page.id === pageId);
  if (!target) return pages;
  decisions.push({
    action: "removed",
    pageId,
    rationale,
  });
  return pages.filter((page) => page.id !== pageId);
}

function authoredPlans(plan: ZineIssuePlan): ZinePagePlan[] {
  return plan.pages.filter((page) => !page.derived);
}

function authoredSourceIds(plan: ZineIssuePlan): Set<string> {
  const ids = new Set<string>();
  authoredPlans(plan).forEach((page) => {
    page.sourceIds.forEach((id) => ids.add(id));
  });
  return ids;
}

function signalSourcesCoveredByAuthored(plan: ZineIssuePlan): boolean {
  const covered = authoredSourceIds(plan);
  const signalPage = plan.pages.find((page) => page.sectionType === "signal-index");
  if (!signalPage) return false;
  return (
    signalPage.sourceIds.length > 0 &&
    signalPage.sourceIds.every((id) => covered.has(id))
  );
}

export function compressZineIssuePlan(plan: ZineIssuePlan): ZineIssuePlan {
  const decisions: ZinePlanCompressionDecision[] = [];
  let pages = [...plan.pages];

  const hasReading = pages.some((page) => page.sectionType === "reading");
  const authoredCount = pages.filter((page) => !page.derived).length;

  if (hasReading) {
    const opening = pages.find((page) => page.sectionType === "opening");
    if (opening) {
      pages = removePage(
        pages,
        opening.id,
        "Reading already orients the reader; threshold beat removed as redundant.",
        decisions,
      );
    }
  }

  if (hasReading || authoredCount <= 3) {
    const debris = pages.find((page) => page.sectionType === "debris");
    if (debris) {
      pages = removePage(
        pages,
        debris.id,
        "Originating residue is already represented by the reading or a short issue does not need a separate debris beat.",
        decisions,
      );
    }
  }

  if (signalSourcesCoveredByAuthored({ ...plan, pages })) {
    const signalIndex = pages.find((page) => page.sectionType === "signal-index");
    if (signalIndex) {
      pages = removePage(
        pages,
        signalIndex.id,
        "Authored evidence pages already inspect the indexed sources.",
        decisions,
      );
    }
  }

  if (authoredCount <= 2) {
    const roadmap = pages.find((page) => page.sectionType === "roadmap");
    if (roadmap) {
      pages = removePage(
        pages,
        roadmap.id,
        "A short issue keeps application inside the reading rather than a separate roadmap beat.",
        decisions,
      );
    }
  }

  const mergedPageIds: string[] = [];
  const compacted: ZinePagePlan[] = [];
  pages.forEach((page) => {
    const previous = compacted.at(-1);
    if (
      previous &&
      !previous.derived &&
      !page.derived &&
      previous.sectionType === "visual-plate" &&
      page.sectionType === "visual-plate" &&
      planFingerprint(previous) === planFingerprint(page)
    ) {
      mergedPageIds.push(page.id);
      decisions.push({
        action: "merged",
        pageId: page.id,
        mergedIntoPageId: previous.id,
        rationale: "Duplicate visual beat merged into the preceding plate.",
      });
      compacted[compacted.length - 1] = {
        ...previous,
        earnsExistenceBy: [
          ...previous.earnsExistenceBy,
          ...page.earnsExistenceBy.filter(
            (entry) =>
              !previous.earnsExistenceBy.some(
                (existing) => existing.kind === entry.kind,
              ),
          ),
        ],
        purpose: `${previous.purpose} Merged duplicate visual material.`,
      };
      return;
    }

    if (page.grammar === "dark-plate" && authoredCount < 4) {
      decisions.push({
        action: "converted",
        pageId: page.id,
        rationale: "Dark-plate intensity removed because the issue lacks enough visual material to earn it.",
      });
      compacted.push({
        ...page,
        grammar: "editorial-split",
        visualIntensity: 0.55,
      });
      return;
    }

    if (
      (page.sectionType === "essay" || page.sectionType === "interlude") &&
      authoredCount <= 4
    ) {
      decisions.push({
        action: "converted",
        pageId: page.id,
        rationale: "Essay/interlude slot compressed into a visual plate for this issue length.",
      });
      compacted.push({
        ...page,
        sectionType: "visual-plate",
        kind: "content",
        grammar: "editorial-split",
        narrativeFunction: "intensification",
      });
      return;
    }

    compacted.push(page);
  });

  pages = renumberPlanPages(compacted);

  const compression: ZinePlanCompressionResult = {
    decisions,
    removedPageIds: decisions
      .filter((decision) => decision.action === "removed")
      .map((decision) => decision.pageId),
    mergedPageIds,
  };

  return {
    ...plan,
    pages,
    compression,
  };
}
