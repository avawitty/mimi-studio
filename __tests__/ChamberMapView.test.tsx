import React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ChamberMapView,
  getCanonStatusCounts,
} from "../components/chambers/ChamberMapView";
import { DossierProvider } from "../components/studio-os/DossierContext";

const renderMap = (
  initialMode: "studio-map" | "architecture-registry" = "studio-map",
) =>
  render(
    <DossierProvider storageKey="test:mimi:chamber-map">
      <ChamberMapView initialMode={initialMode} />
    </DossierProvider>,
  );

describe("ChamberMapView", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("shows the quiet Studio Map hierarchy before the full index", () => {
    renderMap();
    expect(
      screen.getByRole("heading", { name: "Loose capture" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Unfiled material")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Continue the thought/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Codex")).not.toBeInTheDocument();
  });

  it("hides registry-level modules until All chambers is expanded", () => {
    renderMap();
    expect(screen.queryByText("Codex")).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /All chambers/i }),
    );

    expect(screen.getByText("Codex")).toBeInTheDocument();
    expect(screen.getAllByText("Registry").length).toBeGreaterThan(0);
  });

  it("retains Architecture Registry status counts", () => {
    const counts = getCanonStatusCounts();
    renderMap("architecture-registry");

    expect(
      screen.getByRole("button", { name: `all ${counts.all}` }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: `live ${counts.live}` }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: `aliased ${counts.aliased}` }),
    ).toBeInTheDocument();
    expect(screen.getByText(/modules ·/)).toHaveTextContent(
      `${counts.all} modules`,
    );
  });
});
