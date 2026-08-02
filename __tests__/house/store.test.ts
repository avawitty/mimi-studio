import { beforeEach, describe, expect, it } from "vitest";
import {
  canRedo,
  canUndo,
  getState,
  imageFileToDataUrl,
  redo,
  resetState,
  setState,
  undo,
} from "../../components/house/store";
import type { Debris } from "../../components/house/types";

describe("house store undo/redo", () => {
  beforeEach(() => {
    resetState();
  });

  it("persists patches and supports undo/redo", () => {
    expect(canUndo()).toBe(false);
    setState({ night: true }, "toggle-night");
    expect(getState().night).toBe(true);
    expect(canUndo()).toBe(true);

    undo();
    expect(getState().night).toBe(false);
    expect(canRedo()).toBe(true);

    redo();
    expect(getState().night).toBe(true);
  });

  it("truncates forward history after branching", () => {
    setState({ onboardingComplete: true }, "a");
    setState({ night: true }, "b");
    undo();
    setState({ night: false }, "branch");
    expect(canRedo()).toBe(false);
    expect(getState().onboardingComplete).toBe(true);
    expect(getState().night).toBe(false);
  });

  it("encodes uploaded images as persistent data URLs", async () => {
    const file = new File(["image-bytes"], "palette.png", { type: "image/png" });
    const imageUrl = await imageFileToDataUrl(file);
    const item: Debris = {
      id: "img1",
      kind: "upload",
      raw: "palette.png",
      tags: [],
      status: "held",
      ingestedAt: 1,
      imageUrl,
    };

    setState({ debris: [item] }, "ingest-image");

    expect(imageUrl).toMatch(/^data:image\/png;base64,/);
    expect(imageUrl.startsWith("blob:")).toBe(false);
    expect(localStorage.getItem("mimi.studio.v2")).toContain(imageUrl);
  });
});
