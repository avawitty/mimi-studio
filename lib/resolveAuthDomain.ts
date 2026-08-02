import firebaseConfig from "../firebase-applet-config.json";

/**
 * Hosts where we same-site proxy Firebase auth helpers (`/__/auth`, `/__/firebase`)
 * via Vercel/Express. Using these as `authDomain` avoids Safari/iOS
 * "missing initial state" on signInWithRedirect.
 */
const SAME_SITE_AUTH_APEXES = new Set([
  "mimi.you",
  "mimi.rip",
  "mimi.fish",
  "avainlife.com",
  "mimizine.app",
  "mimizine.com",
]);

const SAME_SITE_AUTH_HOSTS = new Set([
  "mimi-studio-gateway.vercel.app",
]);

export const FIREBASE_AUTH_HELPER_ORIGIN = "https://mimistudios.firebaseapp.com";

export function resolveAuthDomain(
  envOverride?: string | undefined,
  hostname?: string,
): string {
  const override = String(envOverride || "").trim();
  if (override && override !== "undefined" && override !== "null") {
    return override;
  }

  const host = String(
    hostname ??
      (typeof window !== "undefined" ? window.location.hostname : ""),
  )
    .toLowerCase()
    .trim();

  if (!host || host === "localhost" || host === "127.0.0.1") {
    return firebaseConfig.authDomain;
  }

  if (SAME_SITE_AUTH_HOSTS.has(host)) {
    return host;
  }

  const apex = host.replace(/^www\./, "");
  if (SAME_SITE_AUTH_APEXES.has(apex)) {
    // Preserve www vs apex so redirect state stays on the exact origin.
    return host;
  }

  return firebaseConfig.authDomain;
}
