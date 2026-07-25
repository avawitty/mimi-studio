import { requireMethod, sendJson } from "../lib/apiUtils.js";
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
      sendJson(res, 403, { error: "Link a Google or email account to manage billing." });
      return;
    }

    const { db } = getServerFirebaseAdmin();
    if (!db) {
      sendJson(res, 503, { error: "Mimi billing is temporarily unavailable." });
      return;
    }

    const userSnapshot = await db.collection("users").doc(decoded.uid).get();
    const customerId = String(userSnapshot.data()?.stripeCustomerId || "");
    if (!customerId.startsWith("cus_")) {
      sendJson(res, 404, { error: "No Stripe subscription is connected to this account." });
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
      return_url: `${baseUrl}/profile`,
    });

    sendJson(res, 200, { url: session.url });
  } catch (error: any) {
    console.error("MIMI // Stripe billing portal error:", error);
    sendJson(res, error?.status || 500, {
      error: error.message || "Failed to open billing portal",
    });
  }
}
