import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MimiGlyph } from "../components/studio-os/MimiGlyph";
import { StudioNavigation } from "../components/studio-os/StudioNavigation";

describe("Studio OS accessibility", () => {
  afterEach(() => {
    cleanup();
  });

  it("gives semantic glyphs an accessible label", () => {
    render(<MimiGlyph name="spark" label="Generate from this material" />);
    expect(
      screen.getByRole("img", { name: "Generate from this material" }),
    ).toBeInTheDocument();
  });

  it("gives every icon-only navigation button an accessible name", () => {
    const { container } = render(
      <StudioNavigation
        active="map"
        onMap={vi.fn()}
        onDossier={vi.fn()}
        onFind={vi.fn()}
      />,
    );

    const iconOnlyButtons = [...container.querySelectorAll("button")].filter(
      (button) => button.textContent?.trim() === "",
    );
    expect(iconOnlyButtons.length).toBeGreaterThan(0);
    for (const button of iconOnlyButtons) {
      expect(button).toHaveAccessibleName();
    }
  });
});
