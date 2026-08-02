import { requireMethod, sendError, sendJson } from "../lib/apiUtils.js";
import {
  getServerFirebaseAdmin,
  verifyMimiSession,
} from "../lib/serverFirebaseAdmin.js";
import { getStripeClient } from "../lib/stripeMembership.js";

export default async function handler(req: any, res: any) {
  if (!requireMethod(req, res, "POST")) return;

  try {
    const decoded = await verifyMimiSession(req.headers || {});
    if (decoded.firebase?.sign_in_provider === "anonymous") {
      sendError(res, 403, "Link a Google or email account to manage billing.", "ANONYMOUS_USER");
      return;
    }

    const { db } = getServerFirebaseAdmin();
    if (!db) {
      sendError(res, 503, "Mimi billing is temporarily unavailable.", "BILLING_UNAVAILABLE");
      return;
    }

    const userSnapshot = await db.collection("users").doc(decoded.uid).get();
    const customerId = String(userSnapshot.data()?.stripeCustomerId || "");
    if (!customerId.startsWith("cus_")) {
      sendError(res, 404, "No Stripe subscription is connected to this account.", "NO_SUBSCRIPTION");
      return;
    }

    const configuredBase = String(process.env.MIMI_PUBLIC_BASE_URL || "")
      .trim()
      .replace(/\/$/, "");
    const forwardedHost = String(
      req.headers["x-forwarded-host"] || req.headers.host || "localhost:3000",
    ).split(",")[0];
    const protocol = String(req.headers["x-forwarded-proto"] || "https").split(",")[0];
    const baseUrl = configuredBase || `${protocol}://${forwardedHost}`;

    const session = await getStripeClient().billingPortal.sessions.create({
      customer: customerId,
      return_url: `${baseUrl}/memberships`,
    });

    sendJson(res, 200, { url: session.url, mode: "portal" });
  } catch (error: any) {
    console.error("MIMI // Stripe billing portal error:", error);
    sendError(res, error?.status || 500, error?.message || "Failed to open billing portal");
  }
}
