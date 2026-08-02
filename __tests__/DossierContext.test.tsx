import React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DossierProvider,
  useDossierContext,
} from "../components/studio-os/DossierContext";

vi.mock("../contexts/UserContext", () => ({
  useUser: vi.fn(() => ({ user: { uid: "user-a", isAnonymous: false } })),
}));

import { useUser } from "../contexts/UserContext";

const TEST_STORAGE_KEY = "test:mimi:studio-context";

const DossierProbe: React.FC = () => {
  const {
    activeDossier,
    lastIntent,
    setActiveDossier,
    addRecentMaterial,
    dispatchIntent,
  } = useDossierContext();

  return (
    <div>
      <p data-testid="dossier-title">{activeDossier?.title ?? "Loose Desk"}</p>
      <p data-testid="last-intent">{lastIntent?.type ?? "none"}</p>
      <button
        type="button"
        onClick={() => {
          setActiveDossier({
            id: "dossier-quiet",
            title: "The architecture of quiet interfaces",
            phase: "understand",
            fragmentCount: 12,
            sourceCount: 4,
            directionStatus: "proposed",
            updatedAt: Date.now(),
          });
          addRecentMaterial({
            id: "material-board",
            type: "link",
            label: "Pinterest reference board",
            provenance: {
              source: "Pinterest",
              sourceUrl: "https://pinterest.example/board",
            },
            createdAt: Date.now(),
          });
        }}
      >
        Seed dossier
      </button>
      <button
        type="button"
        onClick={() =>
          dispatchIntent({
            type: "shape-direction",
            dossierId: activeDossier?.id ?? "dossier-quiet",
          })
        }
      >
        Shape direction
      </button>
    </div>
  );
};

describe("DossierContext", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("persists dossier and handoff state across navigation remounts", async () => {
    let requestedPath = "";
    const onRouteRequest = (event: Event) => {
      requestedPath =
        (event as CustomEvent<{ path: string }>).detail?.path ?? "";
    };
    window.addEventListener("mimi:route-request", onRouteRequest);

    const firstMount = render(
      <DossierProvider storageKey={TEST_STORAGE_KEY}>
        <DossierProbe />
      </DossierProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Seed dossier" }));
    fireEvent.click(screen.getByRole("button", { name: "Shape direction" }));

    expect(requestedPath).toBe("/the-edit");
    await waitFor(() =>
      expect(window.localStorage.getItem(TEST_STORAGE_KEY)).toContain(
        "The architecture of quiet interfaces",
      ),
    );

    firstMount.unmount();
    render(
      <DossierProvider storageKey={TEST_STORAGE_KEY}>
        <DossierProbe />
      </DossierProvider>,
    );

    expect(screen.getByTestId("dossier-title")).toHaveTextContent(
      "The architecture of quiet interfaces",
    );
    expect(screen.getByTestId("last-intent")).toHaveTextContent(
      "shape-direction",
    );

    window.removeEventListener("mimi:route-request", onRouteRequest);
  });

  it("scopes persisted dossiers to the active user", async () => {
    vi.mocked(useUser).mockReturnValue({
      user: { uid: "user-a", isAnonymous: false },
    } as ReturnType<typeof useUser>);

    const { unmount } = render(
      <DossierProvider>
        <DossierProbe />
      </DossierProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Seed dossier" }));
    await waitFor(() =>
      expect(
        window.localStorage.getItem("mimi:studio-context:v1::user-a"),
      ).toContain("The architecture of quiet interfaces"),
    );

    unmount();

    vi.mocked(useUser).mockReturnValue({
      user: { uid: "user-b", isAnonymous: false },
    } as ReturnType<typeof useUser>);

    render(
      <DossierProvider>
        <DossierProbe />
      </DossierProvider>,
    );

    expect(screen.getByTestId("dossier-title")).toHaveTextContent("Loose Desk");
  });
});
