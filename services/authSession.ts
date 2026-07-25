import {
  getSessionLoginUrl,
  getSessionLogoutUrl,
} from "./firebaseFunctionsUrl";

type SessionEndpoint = {
  url: string;
  credentials: RequestCredentials;
  label: string;
};

const sessionLoginEndpoints = (): SessionEndpoint[] => [
  { url: "/api/sessionLogin", credentials: "same-origin", label: "Vercel" },
  {
    url: getSessionLoginUrl(),
    credentials: "include",
    label: "Firebase Functions",
  },
];

const sessionLogoutEndpoints = (): SessionEndpoint[] => [
  { url: "/api/sessionLogout", credentials: "same-origin", label: "Vercel" },
  {
    url: getSessionLogoutUrl(),
    credentials: "include",
    label: "Firebase Functions",
  },
];

const shouldTryNextEndpoint = (endpoint: SessionEndpoint, status: number) =>
  endpoint.url.startsWith("/api/") && (status === 503 || status >= 500);

/**
 * Exchange a Firebase ID token for an HttpOnly __session cookie.
 * Tries Vercel /api/sessionLogin first, then Firebase Functions.
 * Non-fatal: client auth still works if both fail (Firebase ID token only).
 */
export const syncSessionCookie = async (idToken?: string): Promise<boolean> => {
  try {
    const token =
      idToken ||
      (await import("./firebaseInit").then(async ({ auth }) => {
        const user = auth.currentUser;
        return user ? user.getIdToken() : null;
      }));

    if (!token) return false;

    for (const endpoint of sessionLoginEndpoints()) {
      try {
        const response = await fetch(endpoint.url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: endpoint.credentials,
          body: JSON.stringify({ idToken: token }),
        });

        if (response.ok) return true;

        if (shouldTryNextEndpoint(endpoint, response.status)) {
          console.warn(
            `MIMI // Session cookie sync via ${endpoint.label} failed (${response.status}), trying fallback...`
          );
          continue;
        }

        console.warn(
          `MIMI // Session cookie sync via ${endpoint.label} failed (${response.status}) — client auth still active.`
        );
        return false;
      } catch (error) {
        if (endpoint.url.startsWith("/api/")) {
          console.warn(
            `MIMI // Session cookie sync via ${endpoint.label} error, trying fallback...`,
            error
          );
          continue;
        }
        console.warn(
          "MIMI // Session cookie sync error — client auth still active.",
          error
        );
        return false;
      }
    }

    console.warn(
      "MIMI // Session cookie sync unavailable — client auth still active."
    );
    return false;
  } catch (error) {
    console.warn(
      "MIMI // Session cookie sync error — client auth still active.",
      error
    );
    return false;
  }
};

export const clearSessionCookie = async (): Promise<void> => {
  for (const endpoint of sessionLogoutEndpoints()) {
    try {
      const response = await fetch(endpoint.url, {
        method: "POST",
        credentials: endpoint.credentials,
      });

      if (response.ok) return;

      if (shouldTryNextEndpoint(endpoint, response.status)) {
        console.warn(
          `MIMI // Session cookie clear via ${endpoint.label} failed (${response.status}), trying fallback...`
        );
        continue;
      }

      console.warn(
        `MIMI // Session cookie clear via ${endpoint.label} failed (${response.status}).`
      );
      return;
    } catch (error) {
      if (endpoint.url.startsWith("/api/")) {
        console.warn(
          `MIMI // Session cookie clear via ${endpoint.label} error, trying fallback...`,
          error
        );
        continue;
      }
      console.warn("MIMI // Session cookie clear error:", error);
    }
  }
};
