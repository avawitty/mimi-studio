import { describe, expect, it } from "vitest";
import type { MemoryAtom, PocketItem } from "../types";
import {
  chamberReportFromMemoryAtom,
  chamberReportFromPocketItem,
  deriveConversationThemes,
  isOracleChamberPocketItem,
} from "../lib/oracleChamberArchive";

describe("oracleChamberArchive", () => {
  it("detects Oracle Chamber pocket shards", () => {
    const item = {
      id: "item_1",
      userId: "u1",
      title: "Chamber Log (Cyrus)",
      source: "Oracle Chamber",
      timestamp: Date.now(),
      type: "text" as const,
      savedAt: Date.now(),
      content: {
        content: "We discussed brutalist typography and wet plate photography.",
        metadata: {
          source: "Oracle Chamber",
          title: "Chamber Log (Cyrus)",
        },
      },
      tags: ["oracle", "dialogue"],
    } satisfies PocketItem;

    expect(isOracleChamberPocketItem(item)).toBe(true);
    const report = chamberReportFromPocketItem(item);
    expect(report?.entity).toBe("cyrus");
    expect(report?.preview).toContain("brutalist");
  });

  it("maps Scribe conversation atoms into chamber reports", () => {
    const atom: MemoryAtom = {
      id: "a1",
      projectId: "p1",
      content: "User: What is my palette?\nAssistant: Obsidian and bone.",
      title: "Dialogue capture",
      timestamp: Date.now(),
      source: "AI Conversation Log",
      signalType: "conversation_log",
      tags: ["scribe", "conversation"],
    };

    const report = chamberReportFromMemoryAtom(atom);
    expect(report?.entity).toBe("unknown");
    expect(report?.fullText).toContain("Obsidian");
  });

  it("derives recurring themes from reports and profile keywords", () => {
    const reports = [
      {
        id: "r1",
        title: "Chamber Log (Mimi)",
        entity: "mimi" as const,
        preview: "brutalist editorial rhythm",
        fullText: "brutalist editorial rhythm across seasons",
        timestamp: 1,
        source: "Oracle Chamber",
        tags: ["editorial", "brutalist"],
      },
      {
        id: "r2",
        title: "Chamber Log (Cyrus)",
        entity: "cyrus" as const,
        preview: "editorial futures",
        fullText: "editorial futures and brutalist departures",
        timestamp: 2,
        source: "Oracle Chamber",
        tags: ["editorial"],
      },
    ];

    const themes = deriveConversationThemes(reports, ["ceramic"]);
    const labels = themes.map((t) => t.label.toLowerCase());
    expect(labels).toContain("editorial");
    expect(labels).toContain("brutalist");
    expect(labels).toContain("ceramic");
  });
});
