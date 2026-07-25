import firebaseConfig from "../firebase-applet-config.json";

const DEFAULT_REGION = "us-central1";

/** Base URL for the `api` Cloud Function (no trailing slash). */
export const getFirebaseFunctionsBaseUrl = (): string => {
  const explicit = import.meta.env?.VITE_FIREBASE_FUNCTIONS_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  const projectId =
    import.meta.env?.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId;
  const region =
    import.meta.env?.VITE_FIREBASE_FUNCTIONS_REGION || DEFAULT_REGION;

  return `https://${region}-${projectId}.cloudfunctions.net/api`;
};

export const getSessionLoginUrl = () =>
  `${getFirebaseFunctionsBaseUrl()}/api/sessionLogin`;

export const getSessionLogoutUrl = () =>
  `${getFirebaseFunctionsBaseUrl()}/api/sessionLogout`;
