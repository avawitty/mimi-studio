/**
 * Neon Auth (Managed Better Auth) — configuration probe only.
 *
 * Mimi’s identity source of truth remains Firebase Auth (ID token + __session).
 * Neon Auth is available on the mimineon project and stores users in the
 * `neon_auth` schema, but adopting it would duplicate identity with Stripe,
 * credits, and existing Firebase session cookies.
 *
 * Use this module to detect whether Neon Auth env is present for future work.
 * Do not call it from sovereign write auth until a deliberate migration lands.
 *
 * @see https://neon.com/docs/auth/overview
 * @see docs/sovereign-archive.md
 */

export type NeonAuthConfig = {
  enabled: boolean;
  baseUrl: string | null;
  viteUrl: string | null;
  /** True when a cookie signing secret is configured (required for Neon Auth server SDK). */
  cookieSecretConfigured: boolean;
  /** Legacy Stack Auth vars — do not use for new work. */
  legacyStackConfigured: boolean;
};

export const resolveNeonAuthConfig = (): NeonAuthConfig => {
  const baseUrl =
    process.env.NEON_AUTH_BASE_URL?.trim() ||
    process.env.VITE_NEON_AUTH_URL?.trim() ||
    null;
  const viteUrl = process.env.VITE_NEON_AUTH_URL?.trim() || baseUrl;
  const cookieSecretConfigured = Boolean(process.env.NEON_AUTH_COOKIE_SECRET?.trim());
  const legacyStackConfigured = Boolean(
    process.env.STACK_SECRET_SERVER_KEY?.trim() ||
      process.env.NEXT_PUBLIC_STACK_PROJECT_ID?.trim(),
  );

  return {
    enabled: Boolean(baseUrl),
    baseUrl,
    viteUrl,
    cookieSecretConfigured,
    legacyStackConfigured,
  };
};

/** Status snippet for /api/sovereign/status ops visibility. */
export const neonAuthStatusSnippet = () => {
  const config = resolveNeonAuthConfig();
  return {
    neonAuthConfigured: config.enabled,
    neonAuthReady: config.enabled && config.cookieSecretConfigured,
    neonAuthLegacyStack: config.legacyStackConfigured,
    // Never echo secrets or full URLs with credentials — host only.
    neonAuthHost: config.baseUrl
      ? (() => {
          try {
            return new URL(config.baseUrl).host;
          } catch {
            return "invalid";
          }
        })()
      : null,
  };
};
