import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ArtifactDossier,
  InvocationPlate,
  MimiStateFrame,
  ProvenanceTray,
  ResponsiveCardField,
  RitualButton,
  StatusReceipt,
  UsedContextSummary,
} from "../components/studio-os/card-states";

describe("card-state primitives", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders MimiStateFrame with semantic data attributes", () => {
    render(
      <MimiStateFrame kind="invocation" state="loading" title="Test title">
        <p>Body</p>
      </MimiStateFrame>,
    );

    const frame = screen.getByRole("article");
    expect(frame).toHaveAttribute("data-kind", "invocation");
    expect(frame).toHaveAttribute("data-state", "loading");
    expect(frame).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("heading", { name: "Test title" })).toBeInTheDocument();
    expect(screen.getByText("Body")).toBeInTheDocument();
  });

  it("RitualButton cycles through busy and success labels", () => {
    const { rerender } = render(
      <RitualButton isBusy busyLabel="Anchoring…">
        Anchor Identity
      </RitualButton>,
    );

    expect(screen.getByRole("button", { name: "Anchoring…" })).toBeDisabled();

    rerender(
      <RitualButton isSuccessful successLabel="Identity anchored">
        Anchor Identity
      </RitualButton>,
    );

    expect(screen.getByRole("button", { name: "Identity anchored" })).toBeEnabled();
  });

  it("ArtifactDossier exposes whole-card tap target", () => {
    const onOpen = vi.fn();
    render(
      <ArtifactDossier
        title="Winter issue"
        type="Issue"
        status="published"
        provenance="Saved in archive"
        onOpen={onOpen}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open Winter issue" }));
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Saved in archive")).toBeInTheDocument();
  });

  it("ResponsiveCardField renders children in a list region", () => {
    render(
      <ResponsiveCardField aria-label="Artifacts">
        <ArtifactDossier
          title="One"
          type="Issue"
          status="active"
          onOpen={() => {}}
        />
      </ResponsiveCardField>,
    );

    expect(screen.getByRole("list", { name: "Artifacts" })).toBeInTheDocument();
  });

  it("UsedContextSummary states empty context honestly", () => {
    render(<UsedContextSummary entries={[]} />);
    expect(
      screen.getByText(/No approved context — Mimi will not invent sources/i),
    ).toBeInTheDocument();
  });

  it("StatusReceipt labels demonstration coverage", () => {
    render(
      <StatusReceipt title="Metrics" coverage="demonstration">
        <p>Sample data</p>
      </StatusReceipt>,
    );

    expect(screen.getByText("Demonstration")).toBeInTheDocument();
    expect(screen.getByText("Sample data")).toBeInTheDocument();
  });

  it("InvocationPlate composes proposition and footer actions", () => {
    render(
      <InvocationPlate
        eyebrow="Compose"
        title="What are we making?"
        primaryAction={<button type="button">Issue Manifest</button>}
        secondaryAction={<span>Skip for now</span>}
      >
        <p>Composer slot</p>
      </InvocationPlate>,
    );

    expect(screen.getByText("What are we making?")).toBeInTheDocument();
    expect(screen.getByText("Composer slot")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Issue Manifest" })).toBeInTheDocument();
    expect(screen.getByText("Skip for now")).toBeInTheDocument();
  });

  it("ProvenanceTray exposes accessible label", () => {
    render(
      <ProvenanceTray label="Source lineage">
        <p>From Scribe capture</p>
      </ProvenanceTray>,
    );

    expect(screen.getByLabelText("Source lineage")).toBeInTheDocument();
    expect(screen.getByText("From Scribe capture")).toBeInTheDocument();
  });
});
