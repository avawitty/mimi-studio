import { afterEach, describe, expect, it, vi } from "vitest";
import { copyHouseShareLink } from "../../components/house/share";

describe("copyHouseShareLink", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("copies issue URL via clipboard API", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    vi.stubGlobal("location", { origin: "https://mimi.you" });

    const ok = await copyHouseShareLink("issue", "abc123");
    expect(ok).toBe(true);
    expect(writeText).toHaveBeenCalledWith("https://mimi.you/house/issue/abc123");
  });

  it("copies plate query URL", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    vi.stubGlobal("location", { origin: "https://mimi.asia" });

    const ok = await copyHouseShareLink("plate", "pl9");
    expect(ok).toBe(true);
    expect(writeText).toHaveBeenCalledWith("https://mimi.asia/house?plate=pl9");
  });
});
