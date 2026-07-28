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

    const userSnapshot = await db.collection("users").doc(decoded.uid).get();
    const existingCustomerId = String(userSnapshot.data()?.stripeCustomerId || "");
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
      success_url: `${baseUrl}/?checkout=success&plan=${plan}&interval=${interval}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/?checkout=canceled`,
    });

    sendJson(res, 200, { url: session.url });
  } catch (error: any) {
    console.error("MIMI // Stripe checkout error:", error);
    sendError(res, error?.status || 500, error?.message || "Failed to create checkout session");
  }
}
