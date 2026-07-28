const DEFAULT_REGION = "us-central1";
const DEFAULT_PROJECT_ID = "mimistudios";

/** Base URL for the `api` Cloud Function (no trailing slash). */
export const getFirebaseFunctionsBaseUrl = (): string => {
  const explicit =
    process.env.FIREBASE_FUNCTIONS_URL ||
    process.env.VITE_FIREBASE_FUNCTIONS_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.VITE_FIREBASE_PROJECT_ID ||
    DEFAULT_PROJECT_ID;
  const region =
    process.env.FIREBASE_FUNCTIONS_REGION ||
    process.env.VITE_FIREBASE_FUNCTIONS_REGION ||
    DEFAULT_REGION;

  return `https://${region}-${projectId}.cloudfunctions.net/api`;
};

export const getSessionLoginUrl = () =>
  `${getFirebaseFunctionsBaseUrl()}/api/sessionLogin`;

export const getSessionLogoutUrl = () =>
  `${getFirebaseFunctionsBaseUrl()}/api/sessionLogout`;
