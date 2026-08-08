/**
 * Installed-PWA shell helpers — edge-to-edge viewport on iOS/Android A2HS.
 * See index.css `.mimi-pwa-shell` and e2e/ios-pwa-shell.spec.ts.
 */

export function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia?.("(display-mode: standalone)")?.matches) return true;
  return (
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
    true
  );
}

export function isFullscreenDisplayMode(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(display-mode: fullscreen)")?.matches ?? false;
}

/** True when the app runs outside browser tab chrome (Add to Home Screen / PWA). */
export function isInstalledAppShell(): boolean {
  return isStandalonePwa() || isFullscreenDisplayMode();
}

const PWA_SHELL_CLASS = "mimi-pwa-shell";

function syncViewportMetrics(): void {
  const root = document.documentElement;
  const height = window.visualViewport?.height ?? window.innerHeight;
  const offsetTop = window.visualViewport?.offsetTop ?? 0;
  root.style.setProperty("--mimi-viewport-height", `${Math.round(height)}px`);
  root.style.setProperty("--mimi-viewport-offset-top", `${Math.round(offsetTop)}px`);
}

/** Apply shell class + keep --mimi-viewport-height in sync (keyboard, rotation). */
export function bootstrapPwaShell(): void {
  if (typeof document === "undefined" || typeof window === "undefined") return;

  const root = document.documentElement;
  if (isInstalledAppShell()) {
    root.classList.add(PWA_SHELL_CLASS);
  }

  syncViewportMetrics();

  const onViewportChange = () => syncViewportMetrics();
  window.addEventListener("resize", onViewportChange, { passive: true });
  window.addEventListener("orientationchange", onViewportChange, { passive: true });
  window.visualViewport?.addEventListener("resize", onViewportChange, { passive: true });
  window.visualViewport?.addEventListener("scroll", onViewportChange, { passive: true });
}
