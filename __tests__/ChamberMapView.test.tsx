import React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ChamberMapView,
  getCanonStatusCounts,
} from "../components/chambers/ChamberMapView";
import {
  DossierProvider,
  type StudioContextState,
} from "../components/studio-os/DossierContext";
import {
  CHAMBER_INTENT_EVENT,
  type ChamberIntent,
} from "../lib/chamberIntents";

vi.mock("../contexts/UserContext", () => ({
  useUser: vi.fn(() => ({ user: { uid: "test-user", isAnonymous: false } })),
}));

const renderMap = (
  initialMode: "studio-map" | "architecture-registry" = "studio-map",
  initialState?: StudioContextState,
) =>
  render(
    <DossierProvider
      storageKey="test:mimi:chamber-map"
      initialState={initialState}
    >
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

  it("keeps the approve phase in approval instead of publishing", () => {
    let dispatchedIntent: ChamberIntent | null = null;
    const onIntent = (event: Event) => {
      dispatchedIntent = (
        event as CustomEvent<{ intent: ChamberIntent }>
      ).detail.intent;
    };
    window.addEventListener(CHAMBER_INTENT_EVENT, onIntent);

    renderMap("studio-map", {
      activeDossier: {
        id: "dossier-proof",
        title: "Studio OS proof",
        phase: "approve",
        fragmentCount: 5,
        sourceCount: 3,
        directionStatus: "approved",
        updatedAt: Date.now(),
      },
      recentMaterials: [],
      lastIntent: null,
      updatedAt: Date.now(),
    });

    fireEvent.click(
      screen.getByRole("button", { name: /Review the final proof/i }),
    );

    expect(dispatchedIntent).toEqual({
      type: "approve",
      dossierId: "dossier-proof",
      decisionId: "dossier-proof:final-proof",
    });
    window.removeEventListener(CHAMBER_INTENT_EVENT, onIntent);
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

  it("returns to Studio Map when its Registry entry is opened", () => {
    renderMap("architecture-registry");
    const studioMapEntry = screen
      .getByRole("heading", { name: "Studio Map" })
      .closest("article");

    expect(studioMapEntry).not.toBeNull();
    fireEvent.click(
      within(studioMapEntry as HTMLElement).getByRole("button", {
        name: "Open",
      }),
    );

    expect(
      screen.getByRole("heading", { name: "Loose capture" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Studio Map" }),
    ).toHaveAttribute("aria-pressed", "true");
  });
});
