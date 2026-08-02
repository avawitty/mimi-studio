import { describe, expect, it } from "vitest";
import { normalizeZineArtifact } from "../lib/zine/normalizeZineArtifact";
import {
  artifactRequiresRevision,
  createArtifactRevision,
  reviseEditorialDirection,
} from "../lib/zine/zineMigrations";
import { makeLegacyZineMetadata } from "./fixtures/zineMetadata";

describe("zine revision safety", () => {
  it("requires a new revision after approval or publication", () => {
    expect(artifactRequiresRevision("proof")).toBe(false);
    expect(artifactRequiresRevision("approved")).toBe(true);
    expect(artifactRequiresRevision("published")).toBe(true);
  });

  it("moves approved edits into a new proof revision", () => {
    const artifact = {
      ...normalizeZineArtifact(makeLegacyZineMetadata()),
      status: "approved" as const,
    };
    const revised = createArtifactRevision(artifact, {
      now: 1_800_000_000_000,
      reason: "Post-approval copy correction",
      changedPageIds: [artifact.pages[0].id!],
    });

    expect(revised.revision).toBe(artifact.revision + 1);
    expect(revised.status).toBe("proof");
    expect(revised.revisions.at(-1)).toMatchObject({
      parentRevision: artifact.revision,
      reason: "Post-approval copy correction",
      changedPageIds: [artifact.pages[0].id],
    });
  });

  it("never destroys custom layouts during a direction restage", () => {
    const artifact = normalizeZineArtifact(makeLegacyZineMetadata());
    const customLayout = structuredClone(artifact.pages[1].customLayout);
    const revised = reviseEditorialDirection(
      artifact,
      {
        ...artifact.direction,
        thesis: "Revised thesis",
        approved: false,
      },
      {
        now: 1_800_000_000_000,
        restageDefaultLayouts: true,
      },
    );

    expect(revised.status).toBe("direction-proposed");
    expect(revised.direction.revision).toBe(
      (artifact.direction.revision || 1) + 1,
    );
    expect(revised.pages[1].customLayout).toEqual(customLayout);
  });
});
