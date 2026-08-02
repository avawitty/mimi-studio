import { createHash } from "node:crypto";
import { z } from "zod";
import { readJsonBody, requireMethod, sendError, sendJson, validateBody } from "../lib/apiUtils.js";
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

    // Lazy-load Admin + Stripe — static serverFirebaseAdmin imports crash Vercel isolates.
    const { getServerFirebaseAdmin, verifyMimiSession } = await import(
      "../lib/serverFirebaseAdmin.js"
    );
    const { getStripeClient } = await import("../lib/stripeMembership.js");
    const {
      expireOpenSubscriptionSessions,
      hasNonTerminalSubscription,
    } = await import("../lib/stripeCheckoutSafety.js");

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

    if (process.env.MIMI_NEON_STRIPE_RECONCILIATION === "1") {
      const [{ isNeonOperationalDatabaseConfigured }, { getNeonUnitOfWork }] =
        await Promise.all([
          import("../infrastructure/database/neon/connection.js"),
          import("../infrastructure/database/neon/unitOfWork.js"),
        ]);
      if (!isNeonOperationalDatabaseConfigured()) {
        sendError(
          res,
          503,
          "Mimi billing reconciliation is not ready.",
          "BILLING_UNAVAILABLE",
        );
        return;
      }
      const membership =
        await getNeonUnitOfWork().repositories.memberships.findForUser(
          decoded.uid,
        );
      customerId = membership?.providerCustomerId || customerId;
    }

    // Ensure a durable Stripe Customer exists before Checkout so portal + webhooks
    // always resolve to the same Firebase uid.
    if (!customerId.startsWith("cus_")) {
      const customer = await stripe.customers.create({
        email: decoded.email || undefined,
        metadata: { userId: decoded.uid, firebaseUid: decoded.uid },
      }, {
        idempotencyKey: `mimi-customer-${decoded.uid}`,
      });
      customerId = customer.id;
      await userRef.set({ stripeCustomerId: customerId }, { merge: true });
    }

    let hasActiveSubscription = await hasNonTerminalSubscription(
      stripe,
      customerId,
    );

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

    const expiredSessionIds = await expireOpenSubscriptionSessions(
      stripe,
      customerId,
    );
    hasActiveSubscription = await hasNonTerminalSubscription(stripe, customerId);
    if (hasActiveSubscription) {
      const portal = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${baseUrl}/memberships`,
      });
      sendJson(res, 200, { url: portal.url, mode: "portal" });
      return;
    }

    const checkoutKey = createHash("sha256")
      .update(
        `${customerId}:${expiredSessionIds.sort().join(",") || "initial"}`,
      )
      .digest("hex");
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
        firebaseUid: decoded.uid,
        interval,
      },
      subscription_data: {
        metadata: {
          plan: mimiPlan,
          userId: decoded.uid,
          firebaseUid: decoded.uid,
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
    }, {
      idempotencyKey: `mimi-checkout-${checkoutKey}`,
    });

    sendJson(res, 200, { url: session.url, mode: "checkout" });
  } catch (error: any) {
    console.error("MIMI // Stripe checkout error:", error);
    const internalCode = String(error?.code || "");
    const publicCode = new Set([
      "MISSING_MIMI_SESSION",
      "INVALID_MIMI_SESSION",
      "FIREBASE_ADMIN_UNAVAILABLE",
      "ANONYMOUS_USER",
      "INVALID_PLAN",
      "BILLING_UNAVAILABLE",
    ]).has(internalCode)
      ? internalCode
      : "CHECKOUT_FAILED";
    const status =
      publicCode === "CHECKOUT_FAILED"
        ? 502
        : Number(error?.status) || 500;
    sendError(
      res,
      status,
      publicCode === "CHECKOUT_FAILED"
        ? "Mimi could not open checkout. Please try again."
        : error?.message || "Mimi billing is unavailable.",
      publicCode,
    );
  }
}
