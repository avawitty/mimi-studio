import { describe, expect, it, vi, afterEach } from "vitest";

import {
  CONFIRMATION_REQUIRED_EVENTS,
  FEEDBACK_EVENTS,
  createFeedbackService,
  feedbackRecipes,
  isFeedbackEvent,
  NoopHapticAdapter,
  WebHapticAdapter,
  webHapticPatterns,
} from "../../lib/feedback";
import {
  motionVariantRecipes,
  recipeHasUnboundedLoop,
  resolveMotionVariant,
  type MotionRecipeName,
} from "../../lib/motion";

describe("WebHapticAdapter", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("safely no-ops when vibrate is unsupported", () => {
    vi.stubGlobal("navigator", {});
    const adapter = new WebHapticAdapter();
    expect(adapter.isSupported()).toBe(false);
    expect(adapter.trigger("selection")).toBe(false);
  });

  it("invokes brief patterns when vibrate is available", () => {
    const vibrate = vi.fn(() => true);
    vi.stubGlobal("navigator", { vibrate });
    const adapter = new WebHapticAdapter();
    expect(adapter.isSupported()).toBe(true);
    expect(adapter.trigger("success")).toBe(true);
    expect(vibrate).toHaveBeenCalledWith(webHapticPatterns.success);
  });

  it("returns false when vibrate throws", () => {
    vi.stubGlobal("navigator", {
      vibrate: () => {
        throw new Error("blocked");
      },
    });
    expect(new WebHapticAdapter().trigger("warning")).toBe(false);
  });
});

describe("FeedbackService haptics", () => {
  it("does not fire when user disables haptics", () => {
    const trigger = vi.fn(() => true);
    const service = createFeedbackService({
      hapticAdapter: {
        isSupported: () => true,
        trigger,
      },
      preferences: { haptics: "off" },
    });
    service.trigger("selection.changed");
    expect(trigger).not.toHaveBeenCalled();
  });

  it("maps semantic events to the expected haptic intent", () => {
    const trigger = vi.fn(() => true);
    const service = createFeedbackService({
      hapticAdapter: { isSupported: () => true, trigger },
    });

    service.trigger("selection.changed");
    expect(trigger).toHaveBeenLastCalledWith("selection");

    service.trigger("source.captured", { confirmed: true });
    expect(trigger).toHaveBeenLastCalledWith("lightImpact");

    service.trigger("proposal.approved", { confirmed: true });
    expect(trigger).toHaveBeenLastCalledWith("success");

    service.trigger("action.failed");
    expect(trigger).toHaveBeenLastCalledWith("warning");
  });

  it("does not fire success haptics before confirmed mutations", () => {
    const trigger = vi.fn(() => true);
    const service = createFeedbackService({
      hapticAdapter: { isSupported: () => true, trigger },
    });

    for (const event of CONFIRMATION_REQUIRED_EVENTS) {
      trigger.mockClear();
      service.trigger(event, { confirmed: false });
      expect(trigger).not.toHaveBeenCalled();
      expect(feedbackRecipes[event].haptic).not.toBeNull();
    }
  });

  it("skips haptic for analysis.started and proposal.created", () => {
    const trigger = vi.fn(() => true);
    const service = createFeedbackService({
      hapticAdapter: { isSupported: () => true, trigger },
    });
    service.trigger("analysis.started");
    service.trigger("proposal.created");
    expect(trigger).not.toHaveBeenCalled();
    expect(feedbackRecipes["analysis.started"].haptic).toBeNull();
    expect(feedbackRecipes["proposal.created"].haptic).toBeNull();
  });

  it("noop adapter never vibrates", () => {
    const service = createFeedbackService({
      hapticAdapter: new NoopHapticAdapter(),
    });
    expect(() => service.trigger("artifact.saved", { confirmed: true })).not.toThrow();
  });
});

describe("feedback event typing and recipes", () => {
  it("rejects unknown feedback event names at runtime guard", () => {
    expect(isFeedbackEvent("proposal.approved")).toBe(true);
    expect(isFeedbackEvent("cute.bounce")).toBe(false);
    expect(FEEDBACK_EVENTS).toContain("artifact.published");
  });

  it("exposes a recipe for every FeedbackEvent", () => {
    for (const event of FEEDBACK_EVENTS) {
      expect(feedbackRecipes[event]).toBeTruthy();
      expect(feedbackRecipes[event]).toHaveProperty("motion");
      expect(feedbackRecipes[event]).toHaveProperty("haptic");
    }
  });

  it("contains no unbounded looping animation recipes", () => {
    const names = Object.keys(motionVariantRecipes) as MotionRecipeName[];
    for (const name of names) {
      expect(recipeHasUnboundedLoop(name)).toBe(false);
    }
  });
});

describe("reduced-motion grammar", () => {
  it("removes large transform movement in reduced mode", () => {
    const full = resolveMotionVariant("gatherIntoPocket", false);
    const reduced = resolveMotionVariant("gatherIntoPocket", true);

    expect(full.initial).toHaveProperty("y");
    expect(full.initial).toHaveProperty("scale");
    expect(reduced.initial).not.toHaveProperty("y");
    expect(reduced.initial).not.toHaveProperty("scale");
    expect(reduced.initial).toHaveProperty("opacity");
    expect(reduced.animate).toHaveProperty("opacity");
  });

  it("replaces sheet spatial travel with opacity", () => {
    const reduced = resolveMotionVariant("sheetEnter", true);
    expect(reduced.initial).toEqual({ opacity: 0 });
    expect(reduced.animate).toEqual({ opacity: 1 });
  });

  it("stabilizes reading pulse under reduced motion", () => {
    const reduced = resolveMotionVariant("readingPulse", true);
    expect(reduced.animate).toEqual({ opacity: 0.85 });
  });
});

describe("StudioWorktable must not call navigator.vibrate directly", () => {
  it("source file uses FeedbackService path", async () => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const source = await fs.readFile(
      path.resolve(
        process.cwd(),
        "components/worktable/StudioWorktable.tsx",
      ),
      "utf8",
    );
    expect(source).not.toMatch(/navigator\.vibrate/);
    expect(source).toMatch(/useFeedback/);
    expect(source).toMatch(/selection\.changed/);
  });
});
