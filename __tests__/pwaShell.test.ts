import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  bootstrapPwaShell,
  isFullscreenDisplayMode,
  isInstalledAppShell,
  isStandalonePwa,
} from "../lib/pwaShell";

describe("pwaShell", () => {
  const matchMediaMock = vi.fn();

  beforeEach(() => {
    document.documentElement.className = "";
    document.documentElement.style.cssText = "";
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: matchMediaMock,
    });
    matchMediaMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("detects legacy iOS standalone", () => {
    matchMediaMock.mockReturnValue({
      matches: false,
      media: "",
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as MediaQueryList);
    Object.defineProperty(window.navigator, "standalone", {
      configurable: true,
      value: true,
    });
    expect(isStandalonePwa()).toBe(true);
    expect(isInstalledAppShell()).toBe(true);
  });

  it("detects display-mode: standalone", () => {
    matchMediaMock.mockImplementation((query: string) => ({
      matches: query === "(display-mode: standalone)",
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    Object.defineProperty(window.navigator, "standalone", {
      configurable: true,
      value: false,
    });
    expect(isStandalonePwa()).toBe(true);
  });

  it("detects display-mode: fullscreen", () => {
    matchMediaMock.mockImplementation((query: string) => ({
      matches: query === "(display-mode: fullscreen)",
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    expect(isFullscreenDisplayMode()).toBe(true);
    expect(isInstalledAppShell()).toBe(true);
  });

  it("bootstrap adds shell class and viewport CSS variables", () => {
    matchMediaMock.mockImplementation((query: string) => ({
      matches: query === "(display-mode: standalone)",
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 932,
    });

    bootstrapPwaShell();

    expect(document.documentElement.classList.contains("mimi-pwa-shell")).toBe(
      true,
    );
    expect(
      document.documentElement.style.getPropertyValue("--mimi-viewport-height"),
    ).toBe("932px");
  });
});
