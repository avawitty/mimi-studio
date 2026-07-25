
import { ensureDb, ensureAuth } from "./firebase";
import { truncateUid } from "../lib/privacyUtils";

/**
 * MIMI HEALTH CHECK PROTOCOL
 * Dev-only confirmation of registry handshakes.
 * Call via window.mimiCheck() in console.
 */
export const checkSystemHealth = async () => {
  console.group("%cMIMI // System Health Audit", "font-family: serif; font-style: italic; font-size: 16px; color: #78716c;");
  
  // 1. SSL/HSTS Check
  const isSecure = window.location.protocol === 'https:';
  if (isSecure) {
    console.log("✅ Security: Sovereign SSL (Required for .app)");
  } else {
    console.warn("❌ Security: Insecure (Handshake will fail on .app)");
  }

  // 2. Auth Handshake
  try {
    const auth = await ensureAuth();
    console.log("✅ Auth Registry: Ready", { 
      currentUser: auth.currentUser?.uid ? truncateUid(auth.currentUser.uid) : 'Anonymous',
      isSwan: auth.currentUser && !auth.currentUser.isAnonymous 
    });
  } catch (e) {
    console.error("❌ Auth Registry: Obscured", e);
  }

  // 3. Database Write Path
  try {
    const db = await ensureDb();
    console.log("✅ Firestore: Handshake Stable");
  } catch (e) {
    console.error("❌ Firestore: Operating in Offline Mode", e);
  }

  // 4. UA/Webview Status
  const ua = navigator.userAgent;
  const inWebview = /FBAN|FBAV|Instagram|TikTok|Thread/i.test(ua);
  console.log(inWebview ? "⚠️ UA State: Captured in Webview" : "✅ UA State: Sovereign Browser", { ua });

  console.groupEnd();
};

export const diagnoseZines = async () => {
    console.group("MIMI // Zine Diagnostic");
    console.log("Network Status:", navigator.onLine ? "Online" : "Offline");
    
    // Check Local
    try {
        const { getLocalZines } = await import("./localArchive");
        const local = await getLocalZines();
        console.log("Local Archive Count:", local.length);
        if (local.length > 0) console.table(local.slice(0, 3).map(z => ({ id: z.id, title: z.title })));
    } catch (e) {
        console.error("Local Archive Error:", e);
    }

    // Check Cloud
    try {
        const { fetchCommunityZines } = await import("./firebaseUtils");
        const cloud = await fetchCommunityZines(5);
        console.log("Cloud Community Fetch (Limit 5):", cloud.length);
        if (cloud.length > 0) console.table(cloud.slice(0, 3).map(z => ({ id: z.id, title: z.title })));
    } catch (e) {
        console.error("Cloud Fetch Error:", e);
    }
    console.groupEnd();
}

if (typeof window !== 'undefined') {
  (window as any).mimiCheck = checkSystemHealth;
  (window as any).mimiDiagnose = diagnoseZines;
}
