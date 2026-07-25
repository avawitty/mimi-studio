

import { FirebaseApp, initializeApp, getApps } from "firebase/app";
import { Auth, getAuth } from "firebase/auth";
import { Firestore, initializeFirestore, getFirestore, doc, getDocFromServer } from "firebase/firestore";
import { FirebaseStorage, getStorage } from "firebase/storage";
import { getAnalytics, Analytics, isSupported } from "firebase/analytics";
import { isAnalyticsAllowed, COOKIE_CONSENT_CHANGED } from "../lib/cookieConsent";
import { devLog } from "../lib/devLog";

import firebaseConfig from '../firebase-applet-config.json';

// Session cookies: production Vercel does not need FIREBASE_SERVICE_ACCOUNT when Cloud
// Functions are deployed. /api/sessionLogin proxies to Functions (see lib/proxySessionToFunctions.ts).
// Deploy: cd functions && npm run build && firebase deploy --only functions --project gen-lang-client-0210674664
// Optional env: VITE_FIREBASE_FUNCTIONS_URL or FIREBASE_FUNCTIONS_URL (defaults to us-central1 + projectId).

// Authorized domains (Firebase Console → Authentication → Settings → Authorized domains):
// - localhost (dev)
// - gen-lang-client-02106746-1e8ee.firebaseapp.com (default authDomain)
// - mimi.you, www.mimi.you (production)
// - avainlife.com, www.avainlife.com (production)
// - *.vercel.app preview URLs for this project
// Custom domains must also be listed in Vercel project Domains and use the same Firebase web app.

// Support environment variable overrides for all Firebase config fields safely
const getOverride = (key: string): string | undefined => {
  const val = import.meta.env?.[key];
  if (!val || val === "undefined" || val === "null" || val.trim() === "") return undefined;
  return val;
};

const config = {
  apiKey: getOverride("VITE_FIREBASE_API_KEY") || firebaseConfig.apiKey,
  authDomain: getOverride("VITE_FIREBASE_AUTH_DOMAIN") || firebaseConfig.authDomain,
  projectId: getOverride("VITE_FIREBASE_PROJECT_ID") || firebaseConfig.projectId,
  storageBucket: getOverride("VITE_FIREBASE_STORAGE_BUCKET") || firebaseConfig.storageBucket,
  messagingSenderId: getOverride("VITE_FIREBASE_MESSAGING_SENDER_ID") || firebaseConfig.messagingSenderId,
  appId: getOverride("VITE_FIREBASE_APP_ID") || firebaseConfig.appId,
  measurementId: getOverride("VITE_FIREBASE_MEASUREMENT_ID") || firebaseConfig.measurementId,
  firestoreDatabaseId: getOverride("VITE_FIREBASE_FIRESTORE_DATABASE_ID") || (firebaseConfig as any).firestoreDatabaseId,
};

const apps = getApps();
export let app: FirebaseApp;
try {
  app = apps.length > 0 ? apps[0] : initializeApp(config);
} catch (e) {
  console.error("MIMI // Firebase Init Failed:", e);
  throw new Error("MIMI // Firebase Init Failed: Please check your configuration.");
}

// TARGET DATABASE
const TARGET_DB_ID = config.firestoreDatabaseId || '(default)';

// MIMI // REGISTRY AUDIT
if (typeof window !== 'undefined') {
  devLog.info(`%c MIMI // Registry Active: ${config.projectId} [TARGET DB: ${TARGET_DB_ID}]`, "color: #78716c; font-weight: bold; font-family: serif; font-style: italic;");
  devLog.info("MIMI // Database ID:", TARGET_DB_ID);
  if (import.meta.env?.VITE_FIREBASE_API_KEY) {
    devLog.info("MIMI // Using API Key from environment override.");
  }
}

export const auth: Auth = getAuth(app);

// Modern Firestore Initialization with Long Polling for restricted environments
const isIframe = typeof window !== 'undefined' && window.self !== window.top;

let dbInstance: Firestore;
try {
  // Use initializeFirestore with auto-detect long polling for maximum compatibility without forcing problematic fetch streams
  dbInstance = initializeFirestore(app, {
    experimentalAutoDetectLongPolling: true,
  }, TARGET_DB_ID);
  console.info("MIMI // Firestore Initialized with Auto-Detected Long Polling");
} catch (e) {
  console.warn("MIMI // initializeFirestore failed, falling back to getFirestore:", e);
  try {
    dbInstance = getFirestore(app, TARGET_DB_ID);
  } catch (e2) {
    console.error("MIMI // getFirestore failed:", e2);
    dbInstance = getFirestore(app);
  }
}

export const db = dbInstance;

// Test connection on boot (Required Constraint)
async function testConnection() {
  if (typeof window === 'undefined') return;
  try {
    await getDocFromServer(doc(dbInstance, 'system', 'connection_test'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

export const storage: FirebaseStorage = getStorage(app);

// Sovereign Analytics — opt-in only via cookie consent
export let analytics: Analytics | null = null;

const tryInitAnalytics = () => {
  if (typeof window === 'undefined' || isIframe || !isAnalyticsAllowed()) return;
  if (analytics) return;
  isSupported().then(supported => {
    if (supported && isAnalyticsAllowed()) {
      try {
        analytics = getAnalytics(app);
      } catch {
        // Silently maintain structural integrity if the feed is blocked
      }
    }
  }).catch(() => {
    // Silently ignore support check failure
  });
};

if (typeof window !== 'undefined') {
  tryInitAnalytics();
  window.addEventListener(COOKIE_CONSENT_CHANGED, () => {
    if (isAnalyticsAllowed()) {
      tryInitAnalytics();
    }
  });
}
