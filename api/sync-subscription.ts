import { cors, requireMethod, sendJson } from "../lib/apiUtils.js";
import { extractMimiSessionToken, getServerFirebaseAdmin, verifyMimiSession } from "../lib/serverFirebaseAdmin.js";
import { proxyToFunctions } from "../lib/proxyToFunctions.js";
import {
  subscriptionPeriodEnd,
  writeMembershipEntitlements,
} from "../lib/stripeMembership.js";

export default async function handler(req: any, res: any) {
  if (cors(req, res)) return;
  if (!requireMethod(req, res, "POST")) return;

  try {
    const { auth, db } = getServerFirebaseAdmin();
    if (!auth || !db) {
      const token = extractMimiSessionToken(req.headers || {});
      if (!token) {
        sendJson(res, 401, { error: "Mimi sign-in is required." });
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
      sendJson(res, 400, { error: "No email address associated with this account token." });
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
    sendJson(res, status, { error: error.message || "Failed to sync subscription" });
  }
}
