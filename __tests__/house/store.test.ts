import { beforeEach, describe, expect, it } from "vitest";
import {
  canRedo,
  canUndo,
  getState,
  redo,
  resetState,
  setState,
  undo,
} from "../../components/house/store";

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
});
