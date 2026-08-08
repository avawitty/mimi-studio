/** @vitest-environment jsdom */
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useWhySavedPrompt } from "../hooks/useWhySavedPrompt";
import type { SavedReasonHypothesis } from "../schemas/tasteIntelligenceContracts";

const mockHypothesis = (
  id: string,
  artifactId: string,
): SavedReasonHypothesis => ({
  id,
  artifactId,
  hypothesis: `Hypothesis for ${artifactId}`,
  featureIds: [],
  source: "model_proposed",
  confidence: 0.7,
  userStatus: "unreviewed",
  createdAt: Date.now(),
});

const proposeSavedReasonHypotheses = vi.fn();
const reviewSavedReasonHypothesis = vi.fn();

vi.mock("../services/tasteIntelligenceClient", () => ({
  proposeSavedReasonHypotheses: (...args: unknown[]) =>
    proposeSavedReasonHypotheses(...args),
  reviewSavedReasonHypothesis: (...args: unknown[]) =>
    reviewSavedReasonHypothesis(...args),
}));

describe("useWhySavedPrompt", () => {
  beforeEach(() => {
    proposeSavedReasonHypotheses.mockReset();
    reviewSavedReasonHypothesis.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("serializes multi-image enqueue without overlapping propose requests", async () => {
    const responses = new Map([
      [
        "artifact-a",
        { hypotheses: [mockHypothesis("h-a", "artifact-a")], snapshotAvailable: true },
      ],
      [
        "artifact-b",
        { hypotheses: [mockHypothesis("h-b", "artifact-b")], snapshotAvailable: true },
      ],
      [
        "artifact-c",
        { hypotheses: [mockHypothesis("h-c", "artifact-c")], snapshotAvailable: true },
      ],
    ]);

    proposeSavedReasonHypotheses.mockImplementation(async ({ artifactId }: { artifactId: string }) => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      return responses.get(artifactId);
    });

    const { result } = renderHook(() => useWhySavedPrompt("user-1"));

    act(() => {
      result.current.enqueueArtifacts([
        { artifactId: "artifact-a", tags: ["a.jpg"] },
        { artifactId: "artifact-b", tags: ["b.jpg"] },
        { artifactId: "artifact-c", tags: ["c.jpg"] },
      ]);
    });

    await waitFor(() => {
      expect(result.current.prompt?.artifactId).toBe("artifact-a");
    });
    expect(proposeSavedReasonHypotheses).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.dismiss();
    });

    await waitFor(() => {
      expect(result.current.prompt?.artifactId).toBe("artifact-b");
    });
    expect(proposeSavedReasonHypotheses).toHaveBeenCalledTimes(2);

    act(() => {
      result.current.done();
    });

    expect(result.current.prompt).toBeNull();
    expect(result.current.queueLength).toBe(0);
  });

  it("done exits the queue without processing remaining artifacts", async () => {
    proposeSavedReasonHypotheses.mockResolvedValue({
      hypotheses: [mockHypothesis("h-a", "artifact-a")],
      snapshotAvailable: true,
    });

    const { result } = renderHook(() => useWhySavedPrompt("user-1"));

    act(() => {
      result.current.enqueueArtifacts([
        { artifactId: "artifact-a" },
        { artifactId: "artifact-b" },
      ]);
    });

    await waitFor(() => expect(result.current.prompt).not.toBeNull());

    act(() => {
      result.current.done();
    });

    expect(result.current.prompt).toBeNull();
    expect(proposeSavedReasonHypotheses).toHaveBeenCalledTimes(1);
  });

  it("confirm persists confirmed status via review API", async () => {
    const hypothesis = mockHypothesis("h-1", "artifact-1");
    proposeSavedReasonHypotheses.mockResolvedValue({
      hypotheses: [hypothesis],
      snapshotAvailable: true,
    });
    reviewSavedReasonHypothesis.mockResolvedValue({
      hypothesis: { ...hypothesis, userStatus: "confirmed", source: "creator_authored" },
    });

    const { result } = renderHook(() => useWhySavedPrompt("user-1"));

    act(() => {
      result.current.enqueueForArtifact("artifact-1");
    });

    await waitFor(() => expect(result.current.hypotheses).toHaveLength(1));

    await act(async () => {
      await result.current.review(hypothesis, "confirm");
    });

    expect(reviewSavedReasonHypothesis).toHaveBeenCalledWith({
      hypothesis,
      action: "confirm",
      editedText: undefined,
    });
    expect(result.current.hypotheses[0]?.userStatus).toBe("confirmed");
  });

  it("failed review leaves recoverable UI state for other hypotheses", async () => {
    const first = mockHypothesis("h-1", "artifact-1");
    const second = mockHypothesis("h-2", "artifact-1");
    proposeSavedReasonHypotheses.mockResolvedValue({
      hypotheses: [first, second],
      snapshotAvailable: true,
    });
    reviewSavedReasonHypothesis
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce({
        hypothesis: { ...second, userStatus: "rejected" },
      });

    const { result } = renderHook(() => useWhySavedPrompt("user-1"));

    act(() => {
      result.current.enqueueForArtifact("artifact-1");
    });

    await waitFor(() => expect(result.current.hypotheses).toHaveLength(2));

    await act(async () => {
      await result.current.review(first, "confirm");
    });

    expect(result.current.reviewErrors["h-1"]).toBe("Network error");
    expect(result.current.prompt).not.toBeNull();
    expect(result.current.hypotheses).toHaveLength(2);

    await act(async () => {
      await result.current.review(second, "reject");
    });

    expect(result.current.hypotheses[1]?.userStatus).toBe("rejected");
    expect(result.current.reviewErrors["h-2"]).toBeUndefined();
  });

  it("ignores enqueue for ineligible users", () => {
    const { result } = renderHook(() => useWhySavedPrompt("ghost"));

    act(() => {
      result.current.enqueueArtifacts([{ artifactId: "artifact-a" }]);
    });

    expect(proposeSavedReasonHypotheses).not.toHaveBeenCalled();
    expect(result.current.prompt).toBeNull();
  });
});
