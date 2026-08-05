import { describe, expect, it } from "vitest";
import { isMobileQuietChrome } from "../lib/mobileShell";

describe("mobileShell", () => {
  it("enables quiet chrome on narrow viewports", () => {
    expect(isMobileQuietChrome(true)).toBe(true);
    expect(isMobileQuietChrome(false)).toBe(false);
  });
});
