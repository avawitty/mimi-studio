import { readJsonBody, requireMethod, sendJson } from "../lib/apiUtils.js";
import {
  getServerFirebaseAdmin,
  verifyMimiSession,
} from "../lib/serverFirebaseAdmin.js";
import { getStripeClient } from "../lib/stripeMembership.js";
import {
  getMimiPlanForCheckout,
  getStripePriceForPlan,
  parseCheckoutPlan,
} from "../lib/stripePlans.js";

export default async function handler(req: any, res: any) {
  if (!requireMethod(req, res, "POST")) return;

  try {
    const body = await readJsonBody(req);
    const plan = parseCheckoutPlan(body.plan);
    if (!plan) {
      sendJson(res, 400, { error: "Choose a valid Mimi plan." });
      return;
    }

    const decoded = await verifyMimiSession(req.headers || {});
    if (decoded.firebase?.sign_in_provider === "anonymous") {
      sendJson(res, 403, { error: "Link a Google or email account before subscribing." });
      return;
    }

    const { db } = getServerFirebaseAdmin();
    if (!db) {
      sendJson(res, 503, { error: "Mimi billing is temporarily unavailable." });
      return;
    }

    const userSnapshot = await db.collection("users").doc(decoded.uid).get();
    const existingCustomerId = String(userSnapshot.data()?.stripeCustomerId || "");
    const stripe = getStripeClient();
    const mimiPlan = getMimiPlanForCheckout(plan);
    const priceId = getStripePriceForPlan(plan);

    const configuredBase = String(process.env.MIMI_PUBLIC_BASE_URL || "")
      .trim()
      .replace(/\/$/, "");
    const forwardedHost = String(
      req.headers["x-forwarded-host"] || req.headers.host || "localhost:3000",
    ).split(",")[0];
    const protocol = String(req.headers["x-forwarded-proto"] || "https").split(",")[0];
    const baseUrl = configuredBase || `${protocol}://${forwardedHost}`;

    const session = await stripe.checkout.sessions.create({
      integration_identifier: "mimi_subs_qfjrmtaz",
      mode: "subscription",
      ...(existingCustomerId.startsWith("cus_")
        ? { customer: existingCustomerId }
        : { customer_email: decoded.email || undefined }),
      client_reference_id: decoded.uid,
      metadata: {
        plan: mimiPlan,
        userId: decoded.uid,
      },
      subscription_data: {
        metadata: {
          plan: mimiPlan,
          userId: decoded.uid,
        },
      },
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/?checkout=success&plan=${plan}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/?checkout=canceled`,
    });

    sendJson(res, 200, { url: session.url });
  } catch (error: any) {
    console.error("MIMI // Stripe checkout error:", error);
    sendJson(res, error?.status || 500, {
      error: error.message || "Failed to create checkout session",
    });
  }
}
