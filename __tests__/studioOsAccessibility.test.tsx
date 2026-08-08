import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MimiGlyph } from "../components/studio-os/MimiGlyph";
import { StudioHeader } from "../components/studio-os/StudioHeader";
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

  it("gives every navigation button an accessible name", () => {
    const { container } = render(
      <StudioNavigation
        active="map"
        onMap={vi.fn()}
        onDossier={vi.fn()}
        onFind={vi.fn()}
      />,
    );

    const buttons = [...container.querySelectorAll("button")];
    expect(buttons.length).toBeGreaterThan(0);
    for (const button of buttons) {
      expect(button).toHaveAccessibleName();
    }
  });

  it("exposes the shared full-menu control when wired", () => {
    const onOpenMenu = vi.fn();
    render(<StudioHeader phase="collect" onOpenMenu={onOpenMenu} />);
    fireEvent.click(screen.getByRole("button", { name: "Open full menu" }));
    expect(onOpenMenu).toHaveBeenCalledTimes(1);
  });
});
