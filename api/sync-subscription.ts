import { cors, requireMethod, sendError, sendJson } from "../lib/apiUtils.js";
import { extractMimiSessionToken } from "../lib/mimiSessionToken.js";
import { proxyToFunctions } from "../lib/proxyToFunctions.js";

export default async function handler(req: any, res: any) {
  if (cors(req, res)) return;
  if (!requireMethod(req, res, "POST")) return;

  try {
    // Prefer Cloud Functions when Admin is not opted-in — loading firebase-admin
    // / Stripe on Vercel has crashed isolates (FUNCTION_INVOCATION_FAILED).
    const preferLocalAdmin = process.env.MIMI_USE_VERCEL_FIREBASE_ADMIN === "1";
    if (!preferLocalAdmin) {
      const token = extractMimiSessionToken(req.headers || {});
      if (!token) {
        sendError(res, 401, "Mimi sign-in is required.", "AUTH_REQUIRED");
        return;
      }
      const proxied = await proxyToFunctions("/api/sync-subscription", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      res.statusCode = proxied.status;
      res.setHeader("Content-Type", proxied.headers.get("content-type") || "application/json");
      res.end(proxied.text);
      return;
    }

    const { getServerFirebaseAdmin, verifyMimiSession } = await import(
      "../lib/serverFirebaseAdmin.js"
    );
    const { auth, db } = getServerFirebaseAdmin();
    if (!auth || !db) {
      const token = extractMimiSessionToken(req.headers || {});
      if (!token) {
        sendError(res, 401, "Mimi sign-in is required.", "AUTH_REQUIRED");
        return;
      }
      const proxied = await proxyToFunctions("/api/sync-subscription", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      res.statusCode = proxied.status;
      res.setHeader("Content-Type", proxied.headers.get("content-type") || "application/json");
      res.end(proxied.text);
      return;
    }

    const decoded = await verifyMimiSession(req.headers || {});

    const uid = decoded.uid;
    const email = "email" in decoded ? decoded.email : undefined;

    if (!email) {
      sendError(res, 400, "No email address associated with this account token.", "NO_EMAIL");
      return;
    }

    const pendingRef = db.collection("pending_memberships").doc(email.toLowerCase());
    const pendingSnap = await pendingRef.get();

    if (!pendingSnap.exists) {
      sendJson(res, 200, {
        success: true,
        plan: null,
        message: "No pending subscription found.",
      });
      return;
    }

    const {
      subscriptionPeriodEnd,
      writeMembershipEntitlements,
    } = await import("../lib/stripeMembership.js");

    const data = pendingSnap.data() || {};
    await writeMembershipEntitlements({
      db,
      uid,
      plan: data.plan,
      interval: data.interval || "month",
      stripeCustomerId: data.stripeCustomerId,
      currentPeriodEnd:
        data.currentPeriodEnd ||
        subscriptionPeriodEnd(undefined, data.interval || "month"),
      status: "active",
    });

    await pendingRef.delete();

    sendJson(res, 200, { success: true, plan: data.plan });
  } catch (error: any) {
    const status = error?.status || 500;
    console.error("MIMI // Sync subscription error:", error);
    sendError(res, status, error?.message || "Failed to sync subscription", "SYNC_FAILED");
  }
}
