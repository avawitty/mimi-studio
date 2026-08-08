import { describe, expect, it } from "vitest";
import { applyDirectPathEditorialIntelligence } from "../lib/zine/applyDirectPathEditorialIntelligence";
import { enhanceZineGenerationLayout, draftZineArtifactId } from "../lib/zine/enhanceZineGenerationLayout";
import { describeZinePageRationale, isDerivedProofPage } from "../lib/zine/zinePageRationale";
import { buildZineProofSequence } from "../lib/zine/zineIssuePlanner";
import { deriveArtifactReleaseReadiness } from "../lib/publisher/releaseReadiness";
import { normalizeZineArtifact } from "../lib/zine/normalizeZineArtifact";
import type { ZineContent, ZineMetadata } from "../types";

function studioDraftContent(): ZineContent {
  return {
    meta: { mode: "editorial", intent: "direct studio path", timestamp: Date.now() },
    taste_context: { active_archetype: "Archivist", active_palette: [] },
    structure: { hero_prompt: "cover study", pages: [] },
    visual_guidance: {
      strict_palette: [],
      negative_prompt: "",
      composition_density: 0.5,
    },
    title: "Direct Path Issue",
    oracular_mirror: "Central observation for the issue.",
    strategic_hypothesis: "A test hypothesis.",
    header_image_prompt: "editorial cover study",
    pages: [
      {
        pageNumber: 1,
        headline: "Cover plate",
        bodyCopy: "Opening body",
        imagePrompt: "cover visual",
      },
      {
        pageNumber: 2,
        headline: "Evidence ledger",
        bodyCopy: "Evidence body",
        imagePrompt: "evidence visual",
        sourceIds: ["atom-1"],
      },
      {
        pageNumber: 3,
        headline: "Duplicate cover echo",
        bodyCopy: "Redundant echo of cover plate",
        imagePrompt: "cover visual",
      },
      {
        pageNumber: 4,
        headline: "Application",
        bodyCopy: "Roadmap body",
        imagePrompt: "application visual",
      },
    ],
  };
}

function directStudioPipeline(content: ZineContent, artifactId: string) {
  const enhanced = enhanceZineGenerationLayout({ content, artifactId });
  return applyDirectPathEditorialIntelligence({
    content: enhanced,
    artifactId,
    originalInput: "source prompt",
    fragmentIds: ["atom-1"],
    usedContextSnapshots: [
      {
        atomId: "atom-1",
        title: "Approved atom",
        content: "Evidence excerpt",
        source: "scribe",
      },
    ],
  });
}

describe("direct studio path editorial intelligence", () => {
  it("preserves fast layout enhancement then runs issue-plan compiler invariants", () => {
    const artifactId = draftZineArtifactId();
    const result = directStudioPipeline(studioDraftContent(), artifactId);

    expect(result.content.pages?.every((page) => page.id && page.grammar)).toBe(true);
    expect(result.issuePlan.pages[0].sectionType).toBe("cover");
    expect(result.issuePlan.pages.at(-1)?.sectionType).toBe("colophon");
    expect(result.issuePlan.evaluation.result).toMatch(/pass|review/);
    expect(result.issuePlan.pages.every((page) => page.earnsExistenceBy.length > 0)).toBe(
      true,
    );
  });

  it("applies structural compression without blocking the direct reveal path", () => {
    const artifactId = draftZineArtifactId();
    const result = directStudioPipeline(studioDraftContent(), artifactId);
    const authoredPlanPages = result.issuePlan.pages.filter((page) => !page.derived);

    expect(result.content.pages?.length).toBe(authoredPlanPages.length);
    if (result.issuePlan.compression) {
      expect(result.issuePlan.compression.removedPageIds.length).toBeGreaterThan(0);
    }
  });

  it("exposes page rationale and proof sequence from compiled plan", () => {
    const artifactId = "draft-direct-rationale";
    const result = directStudioPipeline(studioDraftContent(), artifactId);
    const metadata: ZineMetadata = {
      id: artifactId,
      userId: "u-test",
      userHandle: "tester",
      title: result.content.title || "Direct Path Issue",
      tone: "editorial",
      timestamp: Date.now(),
      likes: 0,
      content: result.content,
      issuePlan: result.issuePlan,
    } as ZineMetadata;
    const artifact = normalizeZineArtifact(metadata);

    const sequence = buildZineProofSequence(artifact);
    expect(sequence.length).toBeGreaterThan(0);

    const authored = sequence.find((page) => !isDerivedProofPage(page, artifact));
    expect(authored).toBeTruthy();
    if (authored) {
      const rationale = describeZinePageRationale(authored, artifact);
      expect(rationale.whyExists.length).toBeGreaterThan(0);
      expect(rationale.narrativeFunction).toBeTruthy();
    }
  });

  it("feeds artifact readiness checks from compiled issue plan", () => {
    const artifactId = draftZineArtifactId();
    const result = directStudioPipeline(studioDraftContent(), artifactId);
    const metadata: ZineMetadata = {
      id: artifactId,
      userId: "u-test",
      userHandle: "tester",
      title: result.content.title || "Direct Path Issue",
      tone: "editorial",
      timestamp: Date.now(),
      likes: 0,
      content: result.content,
      issuePlan: result.issuePlan,
    } as ZineMetadata;

    const readiness = deriveArtifactReleaseReadiness(metadata);
    expect(readiness.stages.length).toBeGreaterThan(0);
    expect(readiness.checks.length).toBeGreaterThan(0);
  });
});
