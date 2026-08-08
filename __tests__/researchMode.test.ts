/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  bootstrapResearchMode,
  getResearchTaskName,
  isResearchMode,
  setResearchTaskName,
} from "../lib/researchMode";

function setLocation(url: string): void {
  window.history.replaceState({}, "", url);
}

describe("researchMode", () => {
  beforeEach(() => {
    sessionStorage.clear();
    setLocation("/");
  });

  afterEach(() => {
    sessionStorage.clear();
    setLocation("/");
  });

  it("is disabled without ?research=1", () => {
    expect(isResearchMode()).toBe(false);
  });

  it("enables and persists ?research=1 for the session", () => {
    setLocation("/?research=1&task=onboarding-v1");
    bootstrapResearchMode();

    expect(isResearchMode()).toBe(true);
    expect(getResearchTaskName()).toBe("onboarding-v1");

    setLocation("/studio");
    expect(isResearchMode()).toBe(true);
    expect(getResearchTaskName()).toBe("onboarding-v1");
  });

  it("falls back to unspecified when no task is provided", () => {
    setLocation("/?research=1");
    bootstrapResearchMode();
    expect(getResearchTaskName()).toBe("unspecified");
  });

  it("allows updating the task name in session storage", () => {
    setLocation("/?research=1");
    bootstrapResearchMode();
    setResearchTaskName("follow-up-task");
    expect(getResearchTaskName()).toBe("follow-up-task");
  });
});
