import type { ZineIssuePlan, ZinePlanEvaluation, ZinePlanFinding } from "../../types";

const MIN_PAGES = 4;
const MAX_PAGES = 24;

export function evaluateZineIssuePlan(plan: ZineIssuePlan): ZinePlanEvaluation {
  const findings: ZinePlanFinding[] = [];

  if (plan.pages.length < MIN_PAGES) {
    findings.push({
      id: "PLAN-LEN-MIN",
      severity: "blocking",
      message: `Issue plan has ${plan.pages.length} pages; minimum is ${MIN_PAGES}.`,
      correction: "Add substantive material or choose a different artifact form.",
    });
  }
  if (plan.pages.length > MAX_PAGES) {
    findings.push({
      id: "PLAN-LEN-MAX",
      severity: "blocking",
      message: `Issue plan has ${plan.pages.length} pages; maximum is ${MAX_PAGES}.`,
      correction: "Compress or merge pages before realization.",
    });
  }

  const first = plan.pages[0];
  const last = plan.pages.at(-1);
  if (first?.sectionType !== "cover") {
    findings.push({
      id: "PLAN-ORDER-COVER",
      severity: "blocking",
      message: "Issue plan must begin with a cover page.",
      correction: "Move cover to page 1.",
    });
  }
  if (last?.sectionType !== "colophon") {
    findings.push({
      id: "PLAN-ORDER-COLOPHON",
      severity: "blocking",
      message: "Issue plan must end with a colophon page.",
      correction: "Move colophon to the final page.",
    });
  }

  const pageNumbers = plan.pages.map((page) => page.pageNumber);
  const expected = plan.pages.map((_, index) => index + 1);
  if (pageNumbers.join(",") !== expected.join(",")) {
    findings.push({
      id: "PLAN-NUMBERING",
      severity: "blocking",
      message: "Issue plan page numbers must be contiguous starting at 1.",
      correction: "Renumber pages before freezing the plan.",
    });
  }

  const developmentBeats = new Set([
    "revelation",
    "evidence",
    "complication",
    "contrast",
    "intensification",
    "application",
  ]);
  const hasDevelopment = plan.pages.some((page) =>
    developmentBeats.has(page.narrativeFunction),
  );
  if (!hasDevelopment) {
    findings.push({
      id: "ARC-DEVELOPMENT",
      severity: "blocking",
      message: "Issue plan has no substantive development beat.",
      correction: "Add reading, evidence, visual, or application material.",
    });
  }

  plan.pages.forEach((page) => {
    if (page.earnsExistenceBy.length === 0) {
      findings.push({
        id: "EARN-001",
        severity: "blocking",
        pageId: page.id,
        message: `Page ${page.pageNumber} (${page.headline}) has no recorded contribution.`,
        correction: "Assign evidence, interpretation, visual, pause, or provenance.",
      });
    }
    page.earnsExistenceBy.forEach((contribution) => {
      if (!contribution.rationale.trim()) {
        findings.push({
          id: "EARN-RATIONALE",
          severity: "blocking",
          pageId: page.id,
          message: `Page ${page.pageNumber} contribution "${contribution.kind}" lacks rationale.`,
          correction: "Explain why this page earns its place in the sequence.",
        });
      }
    });
  });

  if (!plan.editorialThesis.trim()) {
    findings.push({
      id: "PLAN-THESIS",
      severity: "warning",
      message: "Issue plan has no editorial thesis.",
      correction: "Record the approved direction thesis in the plan.",
    });
  }

  const blocking = findings.filter((finding) => finding.severity === "blocking").length;
  const warnings = findings.filter((finding) => finding.severity === "warning").length;
  const result =
    blocking > 0 ? "blocked" : warnings > 0 ? "warning" : "pass";

  return { result, findings };
}

export function summarizeZinePlanEvaluation(
  evaluation: ZinePlanEvaluation,
): { canRealize: boolean; blocking: number; warnings: number } {
  const blocking = evaluation.findings.filter(
    (finding) => finding.severity === "blocking",
  ).length;
  const warnings = evaluation.findings.filter(
    (finding) => finding.severity === "warning",
  ).length;
  return {
    canRealize: evaluation.result !== "blocked",
    blocking,
    warnings,
  };
}
