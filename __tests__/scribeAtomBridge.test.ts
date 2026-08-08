import { describe, expect, it } from "vitest";
import { memoryAtomToAtomInput, scribeEvidenceAtomId } from "../lib/taste/scribeAtomBridge";

describe("scribeAtomBridge", () => {
  it("maps memory atoms to editorial evidence", () => {
    const input = memoryAtomToAtomInput({
      id: "mem_1",
      projectId: "proj_1",
      content: "Cormorant at large scale on parchment.",
      title: "Type note",
      timestamp: Date.now(),
      source: "Scribe",
      signalType: "highlight_selection",
    });

    expect(input.ingestSource).toBe("scribe");
    expect(input.contextScope).toBe("editorial");
    expect(input.sourceMetadata?.scribeMemoryAtomId).toBe("mem_1");
    expect(scribeEvidenceAtomId("mem_1")).toBe("scribe_mem_1");
  });
});
