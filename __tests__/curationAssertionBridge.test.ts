import { describe, expect, it } from "vitest";
import {
  buildAssertionInputFromCuration,
  curationAssertionId,
} from "../lib/taste/curationAssertionBridge";

describe("curationAssertionBridge", () => {
  it("builds LIKES assertion on accept", () => {
    const input = buildAssertionInputFromCuration({
      userId: "u1",
      projectId: "p1",
      targetType: "pattern_cluster",
      targetId: "c1",
      action: "accepted",
      label: "Editorial serif",
      confidence: 0.82,
    });
    expect(input?.relation).toBe("LIKES");
    expect(input?.claimType).toBe("user_confirmed");
    expect(input?.conceptA).toBe("Editorial serif");
  });

  it("builds DISLIKES assertion on reject", () => {
    const input = buildAssertionInputFromCuration({
      userId: "u1",
      projectId: "p1",
      targetType: "creative_law",
      targetId: "l1",
      action: "rejected",
      label: "Neon gradients",
      confidence: 0.6,
    });
    expect(input?.relation).toBe("DISLIKES");
    expect(input?.claimType).toBe("user_rejected");
  });

  it("uses stable assertion ids", () => {
    expect(curationAssertionId("pattern_cluster", "abc")).toBe("tailor_pattern_cluster_abc");
  });
});
