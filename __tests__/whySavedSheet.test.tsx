/** @vitest-environment jsdom */
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WhySavedSheet } from "../components/pocket/WhySavedSheet";
import type { SavedReasonHypothesis } from "../schemas/tasteIntelligenceContracts";

const hypothesis = (
  overrides: Partial<SavedReasonHypothesis> = {},
): SavedReasonHypothesis => ({
  id: "hyp-1",
  artifactId: "artifact-1",
  hypothesis: "Saved for soft contrast.",
  featureIds: ["f1"],
  source: "model_proposed",
  confidence: 0.72,
  userStatus: "unreviewed",
  createdAt: Date.now(),
  ...overrides,
});

describe("WhySavedSheet accessibility", () => {
  afterEach(() => {
    cleanup();
  });

  it("exposes dialog semantics with aria-modal", () => {
    render(
      <WhySavedSheet
        open
        onDismiss={vi.fn()}
        onDone={vi.fn()}
        hypotheses={[hypothesis()]}
        onReview={vi.fn()}
      />,
    );

    const dialog = screen.getByRole("dialog", { name: "Why did you save this?" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("calls onDismiss for backdrop and Escape", () => {
    const onDismiss = vi.fn();
    render(
      <WhySavedSheet
        open
        onDismiss={onDismiss}
        onDone={vi.fn()}
        hypotheses={[hypothesis()]}
        onReview={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Dismiss why-saved sheet" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onDismiss).toHaveBeenCalledTimes(2);
  });

  it("calls onDone from Done control and shows queue position", () => {
    const onDone = vi.fn();
    render(
      <WhySavedSheet
        open
        onDismiss={vi.fn()}
        onDone={onDone}
        hypotheses={[hypothesis()]}
        queuePosition={2}
        queueLength={3}
        onReview={vi.fn()}
      />,
    );

    expect(screen.getByText(/2 of 3/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Done — skip remaining" }));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("shows inferred label for model hypotheses and per-item review errors", () => {
    render(
      <WhySavedSheet
        open
        onDismiss={vi.fn()}
        onDone={vi.fn()}
        hypotheses={[hypothesis({ source: "model_proposed" })]}
        reviewErrors={{ "hyp-1": "Review failed" }}
        onReview={vi.fn()}
      />,
    );

    expect(screen.getByText("Inferred")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Review failed");
  });

  it("shows observed label for rule-based hypotheses", () => {
    render(
      <WhySavedSheet
        open
        onDismiss={vi.fn()}
        onDone={vi.fn()}
        hypotheses={[hypothesis({ source: "rule_based" })]}
        onReview={vi.fn()}
      />,
    );

    expect(screen.getByText("Observed")).toBeInTheDocument();
  });

  it("disables only the hypothesis under review", () => {
    render(
      <WhySavedSheet
        open
        onDismiss={vi.fn()}
        onDone={vi.fn()}
        hypotheses={[
          hypothesis({ id: "hyp-1" }),
          hypothesis({ id: "hyp-2", hypothesis: "Second hypothesis" }),
        ]}
        isReviewing={(id) => id === "hyp-1"}
        onReview={vi.fn()}
      />,
    );

    const confirmButtons = screen.getAllByRole("button", { name: "That fits" });
    expect(confirmButtons[0]).toBeDisabled();
    expect(confirmButtons[1]).not.toBeDisabled();
    expect(screen.getByText("Saving review…")).toBeInTheDocument();
  });
});
