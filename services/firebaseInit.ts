

import { FirebaseApp, initializeApp, getApps } from "firebase/app";
import { Auth, getAuth } from "firebase/auth";
import { Firestore, initializeFirestore, getFirestore, doc, getDocFromServer } from "firebase/firestore";
import { FirebaseStorage, getStorage } from "firebase/storage";
import { getAnalytics, Analytics, isSupported } from "firebase/analytics";
import { isAnalyticsAllowed, COOKIE_CONSENT_CHANGED } from "../lib/cookieConsent";
import { devLog } from "../lib/devLog";
import { resolveAuthDomain } from "../lib/resolveAuthDomain";

import firebaseConfig from '../firebase-applet-config.json';

// Session cookies: production Vercel does not need FIREBASE_SERVICE_ACCOUNT when Cloud
// Functions are deployed. /api/sessionLogin proxies to Functions (see lib/proxySessionToFunctions.ts).
// Deploy: cd functions && npm run build && firebase deploy --only functions --project gen-lang-client-0210674664
// Optional env: VITE_FIREBASE_FUNCTIONS_URL or FIREBASE_FUNCTIONS_URL (defaults to us-central1 + projectId).

// Authorized domains (Firebase Console → Authentication → Settings → Authorized domains):
// Primary production host: www.mimi.you (keep apex mimi.you authorized for redirects).
// - localhost (dev)
// - mimistudios.firebaseapp.com / mimistudios.web.app (default auth hosts)
// - www.mimi.you, mimi.you (production)
// - mimi.rip, www.mimi.rip (inverse public skin)
// - mimi.fish, www.mimi.fish (future share skin)
// - avainlife.com, www.avainlife.com (production)
// - mimi-studio-gateway.vercel.app and other *.vercel.app preview URLs
// Custom domains must also be listed in Vercel project Domains and use the same Firebase web app.

// Support environment variable overrides for all Firebase config fields safely
const getOverride = (key: string): string | undefined => {
  const val = import.meta.env?.[key];
  if (!val || val === "undefined" || val === "null" || val.trim() === "") return undefined;
  return val;
};

const resolvedAuthDomain = resolveAuthDomain(getOverride("VITE_FIREBASE_AUTH_DOMAIN"));

const config = {
  apiKey: getOverride("VITE_FIREBASE_API_KEY") || firebaseConfig.apiKey,
  // Same-site authDomain on www.mimi.you / mimi.rip (etc.) + /__/auth proxy
  // fixes Safari "missing initial state" on Google redirect sign-in.
  authDomain: resolvedAuthDomain,
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
  devLog.info("MIMI // Auth Domain:", resolvedAuthDomain);
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

export let db: Firestore = dbInstance;

const isMissingDatabaseError = (error: unknown) => {
  const msg = error instanceof Error ? error.message : String(error);
  return (
    (msg.includes('not-found') && msg.includes('Database')) ||
    msg.includes('does not exist in project')
  );
};

// Test connection on boot (Required Constraint)
async function testConnection() {
  if (typeof window === 'undefined') return;
  try {
    await getDocFromServer(doc(db, 'system', 'connection_test'));
  } catch (error) {
    if (isMissingDatabaseError(error) && TARGET_DB_ID !== '(default)') {
      try {
        db = getFirestore(app);
        await getDocFromServer(doc(db, 'system', 'connection_test'));
        window.dispatchEvent(new CustomEvent('mimi:registry_alert', {
          detail: {
            type: 'error',
            message: `Configured Firestore database "${TARGET_DB_ID}" was not found. Falling back to default database.`
          }
        }));
        console.warn(`MIMI // Missing Firestore database "${TARGET_DB_ID}". Using "(default)" instead.`);
        return;
      } catch (fallbackError) {
        console.error("MIMI // Default database fallback failed:", fallbackError);
      }
    }
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
