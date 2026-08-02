/** @vitest-environment node */
import { describe, expect, it } from "vitest";
import {
  emitSovereignEvent,
  publicFloorSsePayload,
  subscribeSovereignEvents,
} from "../lib/sovereign/events";

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
      wasPublic: false,
    });
    unsub();
    emitSovereignEvent({
      type: "zine_upsert",
      id: "z2",
      userId: "u1",
      isPublic: true,
      wasPublic: false,
    });

    expect(seen).toEqual(["z1"]);
  });

  it("publicFloorSsePayload hides private-only activity", () => {
    expect(
      publicFloorSsePayload({
        type: "zine_upsert",
        id: "priv",
        userId: "u1",
        isPublic: false,
        wasPublic: false,
      }),
    ).toBeNull();

    expect(
      publicFloorSsePayload({
        type: "zine_delete",
        id: "priv",
        userId: "u1",
        wasPublic: false,
      }),
    ).toBeNull();

    expect(
      publicFloorSsePayload({
        type: "zine_upsert",
        id: "pub",
        userId: "u1",
        isPublic: true,
        wasPublic: false,
      }),
    ).toEqual({
      type: "zine_upsert",
      id: "pub",
      userId: "u1",
      isPublic: true,
    });

    // Unpublish: Floor nudge without leaking userId
    expect(
      publicFloorSsePayload({
        type: "zine_upsert",
        id: "was-pub",
        userId: "u1",
        isPublic: false,
        wasPublic: true,
      }),
    ).toEqual({ type: "zine_delete", id: "was-pub" });

    expect(
      publicFloorSsePayload({
        type: "zine_delete",
        id: "was-pub",
        userId: "u1",
        wasPublic: true,
      }),
    ).toEqual({ type: "zine_delete", id: "was-pub" });

    expect(publicFloorSsePayload({ type: "floor_refresh" })).toEqual({
      type: "floor_refresh",
    });
  });
});
