import { z } from "zod";
import { readJsonBody, requireMethod, sendError, sendJson, validateBody } from "../lib/apiUtils.js";
import {
  getServerFirebaseAdmin,
  verifyMimiSession,
} from "../lib/serverFirebaseAdmin.js";
import { getStripeClient } from "../lib/stripeMembership.js";
import {
  getMimiPlanForCheckout,
  getStripePriceForPlan,
  parseBillingInterval,
  parseCheckoutPlan,
} from "../lib/stripePlans.js";

const checkoutSchema = z.object({
  plan: z.enum(["core", "optioning", "pro", "lab"]),
  interval: z.enum(["month", "year"]).optional(),
});

const PAID_LEGACY = new Set(["core", "optioning", "pro", "lab"]);

export default async function handler(req: any, res: any) {
  if (!requireMethod(req, res, "POST")) return;

  try {
    const body = await readJsonBody(req);
    const parsed = validateBody(res, checkoutSchema, body);
    if (!parsed) return;
    const plan = parseCheckoutPlan(parsed.plan);
    if (!plan) {
      sendError(res, 400, "Choose a valid Mimi plan.", "INVALID_PLAN");
      return;
    }
    const interval = parseBillingInterval(parsed.interval);

    const decoded = await verifyMimiSession(req.headers || {});
    if (decoded.firebase?.sign_in_provider === "anonymous") {
      sendError(res, 403, "Link a Google or email account before subscribing.", "ANONYMOUS_USER");
      return;
    }

    const { db } = getServerFirebaseAdmin();
    if (!db) {
      sendError(res, 503, "Mimi billing is temporarily unavailable.", "BILLING_UNAVAILABLE");
      return;
    }

    const userRef = db.collection("users").doc(decoded.uid);
    const userSnapshot = await userRef.get();
    const userData = userSnapshot.data() || {};
    let customerId = String(userData.stripeCustomerId || "");
    const stripe = getStripeClient();
    const mimiPlan = getMimiPlanForCheckout(plan);
    const priceId = getStripePriceForPlan(plan, interval);

    const configuredBase = String(process.env.MIMI_PUBLIC_BASE_URL || "")
      .trim()
      .replace(/\/$/, "");
    const forwardedHost = String(
      req.headers["x-forwarded-host"] || req.headers.host || "localhost:3000",
    ).split(",")[0];
    const protocol = String(req.headers["x-forwarded-proto"] || "https").split(",")[0];
    const baseUrl = configuredBase || `${protocol}://${forwardedHost}`;

    // Ensure a durable Stripe Customer exists before Checkout so portal + webhooks
    // always resolve to the same Firebase uid.
    if (!customerId.startsWith("cus_")) {
      const customer = await stripe.customers.create({
        email: decoded.email || undefined,
        metadata: { userId: decoded.uid },
      });
      customerId = customer.id;
      await userRef.set({ stripeCustomerId: customerId }, { merge: true });
    }

    const hasActiveSubscription =
      userData.subscriptionStatus === "active" &&
      PAID_LEGACY.has(String(userData.planStatus || userData.membershipPlan || ""));

    // Existing subscribers change plans via Customer Portal (proration / cancel)
    // instead of opening a second Checkout Session that could double-bill.
    if (hasActiveSubscription) {
      const portal = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${baseUrl}/memberships`,
      });
      sendJson(res, 200, { url: portal.url, mode: "portal" });
      return;
    }

    const session = await stripe.checkout.sessions.create({
      integration_identifier: "mimi_subs_qfjrmtaz",
      mode: "subscription",
      customer: customerId,
      client_reference_id: decoded.uid,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      metadata: {
        plan: mimiPlan,
        userId: decoded.uid,
        interval,
      },
      subscription_data: {
        metadata: {
          plan: mimiPlan,
          userId: decoded.uid,
          interval,
        },
      },
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/?checkout=success&plan=${plan}&interval=${interval}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/memberships`,
    });

    sendJson(res, 200, { url: session.url, mode: "checkout" });
  } catch (error: any) {
    console.error("MIMI // Stripe checkout error:", error);
    sendError(res, error?.status || 500, error?.message || "Failed to create checkout session");
  }
}
