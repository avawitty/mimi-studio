export type CookieConsentLevel = "all" | "essential";

const STORAGE_KEY = "mimi_cookie_consent";
export const COOKIE_CONSENT_CHANGED = "mimi:cookie_consent_changed";

export function getCookieConsent(): CookieConsentLevel | null {
  if (typeof window === "undefined") return null;
  const value = localStorage.getItem(STORAGE_KEY);
  if (value === "all" || value === "essential") return value;
  return null;
}

export function hasCookieConsentChoice(): boolean {
  return getCookieConsent() !== null;
}

export function setCookieConsent(level: CookieConsentLevel): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, level);
  window.dispatchEvent(
    new CustomEvent(COOKIE_CONSENT_CHANGED, { detail: { level } }),
  );
}

/** Analytics and optional marketing/affiliate tracking require explicit opt-in. */
export function isAnalyticsAllowed(): boolean {
  return getCookieConsent() === "all";
}

/** Auth session cookies and strictly necessary storage always allowed. */
export function isEssentialStorageAllowed(): boolean {
  return true;
}
