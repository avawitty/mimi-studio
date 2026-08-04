import { describe, expect, it } from "vitest";
import { normalizeZineArtifact } from "../lib/zine/normalizeZineArtifact";
import { buildZineIssuePlanFromArtifact } from "../lib/zine/buildZineIssuePlan";
import { buildZineProofSequence } from "../lib/zine/zineIssuePlanner";
import { summarizeZinePlanEvaluation } from "../lib/zine/evaluateZineIssuePlan";
import { makeLegacyZineMetadata } from "./fixtures/zineMetadata";

describe("Zine issue planner", () => {
  it("builds a deterministic plan with cover first and colophon last", () => {
    const artifact = normalizeZineArtifact(makeLegacyZineMetadata());
    const plan = artifact.issuePlan!;

    expect(artifact.issuePlan!.pages.length).toBeLessThanOrEqual(6);
    expect(artifact.issuePlan!.pages[0].sectionType).toBe("cover");
    expect(artifact.issuePlan!.pages.at(-1)?.sectionType).toBe("colophon");
    expect(plan.pages.every((page) => page.earnsExistenceBy.length > 0)).toBe(
      true,
    );
    expect(summarizeZinePlanEvaluation(plan.evaluation).canRealize).toBe(true);
  });

  it("aligns proof sequence length and order with the issue plan", () => {
    const artifact = normalizeZineArtifact(makeLegacyZineMetadata());
    const proofSequence = buildZineProofSequence(artifact);

    expect(proofSequence.length).toBe(artifact.issuePlan!.pages.length);
    expect(proofSequence.map((page) => page.sectionType)).toEqual(
      artifact.issuePlan!.pages.map((page) => page.sectionType),
    );
  });

  it("assigns authored pages from the plan into visual, evidence, and essay slots", () => {
    const artifact = normalizeZineArtifact(makeLegacyZineMetadata());
    const authoredPlans = artifact.issuePlan!.pages.filter((page) => !page.derived);

    expect(authoredPlans).toHaveLength(artifact.pages.length);
    expect(authoredPlans.some((page) => page.sectionType === "visual-plate")).toBe(
      true,
    );
    expect(artifact.pages.every((page) => page.sectionType && page.grammar)).toBe(
      true,
    );
  });

  it("rebuilds consistently from artifact inputs", () => {
    const artifact = normalizeZineArtifact(makeLegacyZineMetadata());
    const rebuilt = buildZineIssuePlanFromArtifact(artifact);

    expect(rebuilt.pages.map((page) => page.sectionType)).toEqual(
      artifact.issuePlan!.pages.map((page) => page.sectionType),
    );
  });
});
