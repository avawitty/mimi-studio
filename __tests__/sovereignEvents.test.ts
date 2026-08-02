/** @vitest-environment node */
import { describe, expect, it } from "vitest";
import { emitSovereignEvent, subscribeSovereignEvents } from "../lib/sovereign/events";

describe("sovereign events", () => {
  it("delivers upsert events to subscribers and unsubscribes cleanly", () => {
    const seen: string[] = [];
    const unsub = subscribeSovereignEvents((event) => {
      if (event.type === "zine_upsert") seen.push(event.id);
    });

    emitSovereignEvent({
      type: "zine_upsert",
      id: "z1",
      userId: "u1",
      isPublic: true,
    });
    unsub();
    emitSovereignEvent({
      type: "zine_upsert",
      id: "z2",
      userId: "u1",
      isPublic: true,
    });

    expect(seen).toEqual(["z1"]);
  });
});
