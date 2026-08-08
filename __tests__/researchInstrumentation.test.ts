/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../services/firebase", () => ({
  ensureDb: vi.fn().mockResolvedValue({}),
}));

vi.mock("../services/firebaseUtils", () => ({
  sanitizeFirestoreData: <T>(data: T) => data,
}));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(() => "research_sessions"),
  addDoc: vi.fn().mockResolvedValue({ id: "evt-1" }),
}));

vi.mock("../lib/researchMode", () => ({
  isResearchMode: () => true,
  getResearchTaskName: () => "test-task",
}));

import {
  __resetResearchInstrumentationForTests,
  exportResearchSession,
  getResearchEvents,
  handleResearchClick,
  logAbandonment,
  logResearchEvent,
  logResearchNote,
  logTaskStart,
} from "../services/researchInstrumentation";

describe("researchInstrumentation", () => {
  beforeEach(() => {
    __resetResearchInstrumentationForTests();
    sessionStorage.clear();
  });

  it("records events with the required schema fields", () => {
    logResearchEvent("note", "research-note-widget", { note: "observer note" });

    const [event] = getResearchEvents();
    expect(event).toMatchObject({
      sessionId: expect.any(String),
      taskName: "test-task",
      event: "note",
      elementId: "research-note-widget",
      ts: expect.any(Number),
      note: "observer note",
    });
  });

  it("logs task start once per session", () => {
    logTaskStart();
    logTaskStart();

    const starts = getResearchEvents().filter((event) => event.event === "task_start");
    expect(starts).toHaveLength(1);
    expect(starts[0]?.elementId).toBe("session");
  });

  it("captures first meaningful click, time-to-first-action, and dead clicks", () => {
    logTaskStart();

    const button = document.createElement("button");
    button.id = "cta";
    button.textContent = "Continue";
    document.body.appendChild(button);

    handleResearchClick(button);
    handleResearchClick(document.body);

    const events = getResearchEvents().map((event) => event.event);
    expect(events).toContain("first_meaningful_click");
    expect(events).toContain("time_to_first_action");
    expect(events).toContain("dead_click");
  });

  it("logs abandonment only once", () => {
    logAbandonment("page_hide");
    logAbandonment("idle_timeout");

    const abandonments = getResearchEvents().filter(
      (event) => event.event === "abandonment",
    );
    expect(abandonments).toHaveLength(1);
    expect(abandonments[0]?.elementId).toBe("page_hide");
  });

  it("writes observer notes through the same event store", () => {
    logResearchNote("  participant hesitated  ");
    const [event] = getResearchEvents();
    expect(event?.event).toBe("note");
    expect(event?.note).toBe("participant hesitated");
  });

  it("exports the raw session payload", () => {
    logTaskStart();
    logResearchEvent("dead_click", "body");

    const exported = exportResearchSession();
    expect(exported).toMatchObject({
      sessionId: expect.any(String),
      taskName: "test-task",
      startedAt: expect.any(Number),
      exportedAt: expect.any(Number),
      events: expect.arrayContaining([
        expect.objectContaining({ event: "task_start" }),
        expect.objectContaining({ event: "dead_click", elementId: "body" }),
      ]),
    });
  });
});
