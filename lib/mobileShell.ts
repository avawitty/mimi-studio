/**
 * Mobile shell contract — one surface, quiet chrome, flat rows (not nested cards).
 * Chambers opt in via these helpers; do not invent per-route mobile chrome.
 */

/** Narrow viewport: app header is Menu + Mimi identity + account only. */
export function isMobileQuietChrome(isNarrow: boolean): boolean {
  return isNarrow;
}

export const mobileCanvasClass = "mimi-mobile-canvas";

export const mobileRowClass =
  "mimi-mobile-row w-full text-left py-3.5 px-4 min-h-[44px] transition-colors";

export const mobileRowStackClass = "mimi-mobile-row-stack divide-y divide-[var(--mimi-hairline,#d4d4d4)]";

export const mobileComposerShellClass = "mimi-mobile-composer";

export const mobileHairlineFieldClass =
  "w-full bg-transparent border-0 border-b border-[var(--mimi-hairline,#d4d4d4)] px-0 py-2.5 min-h-[44px] font-serif text-sm outline-none focus:border-[var(--mimi-ink,#0a0a0a)]";
