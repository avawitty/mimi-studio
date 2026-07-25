import Stripe from "stripe";
import type { Firestore } from "firebase-admin/firestore";
import {
  buildCreditGrant,
  MIMI_PRICE_ID_PLAN_MAP,
  normalizeMimiPlan,
  type MimiBillingInterval,
  type MimiPlan,
} from "./mimiEntitlements.js";

/** Legacy checkout price IDs (constants.ts STRIPE_PRICES). */
const LEGACY_PRICE_ID_PLAN_MAP: Record<string, MimiPlan> = {
  price_1TEfvx9AUz0q2nVC6zAP1OkZ: "initiation",
  price_1TEfzZ9AUz0q2nVC3qMmMyXk: "atelier",
  price_1TEg3S9AUz0q2nVCS7Jo0ens: "lab",
};

const PRICE_ID_PLAN_MAP: Record<string, MimiPlan> = {
  ...MIMI_PRICE_ID_PLAN_MAP,
  ...LEGACY_PRICE_ID_PLAN_MAP,
};

export type LegacyPlanStatus = "ghost" | "trial" | "free" | "core" | "pro" | "lab" | "expired";

export const toLegacyPlanStatus = (planInput?: unknown): LegacyPlanStatus => {
  const plan = normalizeMimiPlan(planInput);
  switch (plan) {
    case "initiation":
      return "core";
    case "optioning":
    case "atelier":
      return "pro";
    case "lab":
    case "sovereign":
      return "lab";
    case "trial":
      return "trial";
    case "free":
      return "free";
    default: {
      const value = String(planInput || "free").trim().toLowerCase();
      if (value === "core") return "core";
      if (value === "pro") return "pro";
      if (value === "lab") return "lab";
      if (value === "ghost") return "ghost";
      if (value === "expired") return "expired";
      return "free";
    }
  }
};

let stripeClient: Stripe | null = null;

export const getStripeClient = (): Stripe => {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY environment variable is required");
    }
    stripeClient = new Stripe(key);
  }
  return stripeClient;
};

export const readRawBody = async (req: any): Promise<Buffer> => {
  if (Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === "string") return Buffer.from(req.body);
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
};

export const subscriptionPeriodEnd = (
  startMs: number | undefined,
  interval: MimiBillingInterval | string = "month",
): number => {
  const start = startMs || Date.now();
  const days = interval === "year" ? 365 : 30;
  return start + days * 24 * 60 * 60 * 1000;
};

const resolvePlanFromPriceId = async (
  stripe: Stripe,
  priceId?: string | null,
  metadataPlan?: string | null,
): Promise<{ plan: MimiPlan; interval: MimiBillingInterval }> => {
  if (metadataPlan) {
    return {
      plan: normalizeMimiPlan(metadataPlan),
      interval: "month",
    };
  }
  if (priceId && PRICE_ID_PLAN_MAP[priceId]) {
    return { plan: PRICE_ID_PLAN_MAP[priceId], interval: "month" };
  }
  if (priceId) {
    try {
      const price = await stripe.prices.retrieve(priceId);
      const fromMeta = price.metadata?.plan;
      if (fromMeta) {
        return {
          plan: normalizeMimiPlan(fromMeta),
          interval: price.recurring?.interval === "year" ? "year" : "month",
        };
      }
      if (price.id && PRICE_ID_PLAN_MAP[price.id]) {
        return {
          plan: PRICE_ID_PLAN_MAP[price.id],
          interval: price.recurring?.interval === "year" ? "year" : "month",
        };
      }
    } catch (error) {
      console.warn("MIMI // Stripe: failed to retrieve price", priceId, error);
    }
  }
  return { plan: "free", interval: "month" };
};

const findUidByStripeCustomer = async (db: Firestore, customerId: string): Promise<string | null> => {
  const snapshot = await db.collection("users").where("stripeCustomerId", "==", customerId).limit(1).get();
  if (!snapshot.empty) return snapshot.docs[0].id;
  return null;
};

export interface WriteMembershipEntitlementsInput {
  db: Firestore;
  uid: string;
  plan?: unknown;
  interval?: MimiBillingInterval | string;
  stripeCustomerId?: string;
  currentPeriodEnd?: number;
  status?: "active" | "inactive" | "canceled" | "past_due";
}

export const writeMembershipEntitlements = async ({
  db,
  uid,
  plan,
  interval = "month",
  stripeCustomerId,
  currentPeriodEnd,
  status = "active",
}: WriteMembershipEntitlementsInput) => {
  const mimiPlan = normalizeMimiPlan(plan);
  const legacyPlan = toLegacyPlanStatus(mimiPlan);
  const normalizedInterval: MimiBillingInterval = interval === "year" ? "year" : "month";
  const periodEnd = currentPeriodEnd || subscriptionPeriodEnd(undefined, normalizedInterval);
  const { credits } = buildCreditGrant({
    plan: mimiPlan,
    interval: normalizedInterval,
    currentPeriodEnd: periodEnd,
  });
  const now = Date.now();
  const isActive = status === "active";

  const userPatch: Record<string, unknown> = {
    plan: legacyPlan === "free" || legacyPlan === "ghost" ? "free" : legacyPlan,
    planStatus: legacyPlan,
    membershipPlan: legacyPlan,
    subscriptionStatus: isActive ? "active" : "inactive",
    subscriptionInterval: normalizedInterval,
    membershipCredits: credits,
    ...(stripeCustomerId ? { stripeCustomerId } : {}),
  };

  if (mimiPlan === "trial") {
    userPatch.trial = {
      startedAt: now,
      endsAt: credits.periodEndsAt,
      grantedCredits: credits.allowance,
      usedCredits: 0,
      remainingCredits: credits.remaining,
      source: "stripe",
    };
  }

  const profilePatch = {
    plan: userPatch.plan,
    planStatus: legacyPlan,
    membershipPlan: legacyPlan,
    subscriptionStatus: userPatch.subscriptionStatus,
  };

  const membershipPatch = {
    plan: legacyPlan,
    mimiPlan,
    status: isActive ? "active" : "inactive",
    interval: normalizedInterval,
    currentPeriodEnd: periodEnd,
    credits,
    ...(stripeCustomerId ? { stripeCustomerId } : {}),
    updatedAt: now,
  };

  const billingPatch = {
    plan: legacyPlan,
    mimiPlan,
    status: isActive ? "active" : "canceled",
    interval: normalizedInterval,
    currentPeriodEnd: periodEnd,
    credits,
    ...(stripeCustomerId ? { stripeCustomerId } : {}),
    updatedAt: now,
  };

  await Promise.all([
    db.collection("users").doc(uid).set(userPatch, { merge: true }),
    db.collection("profiles_public").doc(uid).set(profilePatch, { merge: true }),
    db.collection("memberships").doc(uid).set(membershipPatch, { merge: true }),
    db.collection("users").doc(uid).collection("billing").doc("subscription").set(billingPatch, { merge: true }),
  ]);
};

const writePendingMembership = async ({
  db,
  email,
  plan,
  interval,
  stripeCustomerId,
  currentPeriodEnd,
}: {
  db: Firestore;
  email: string;
  plan: MimiPlan;
  interval: MimiBillingInterval;
  stripeCustomerId?: string;
  currentPeriodEnd?: number;
}) => {
  await db.collection("pending_memberships").doc(email.toLowerCase()).set(
    {
      plan: toLegacyPlanStatus(plan),
      mimiPlan: plan,
      interval,
      stripeCustomerId: stripeCustomerId || null,
      currentPeriodEnd: currentPeriodEnd || subscriptionPeriodEnd(undefined, interval),
      status: "active",
      createdAt: Date.now(),
    },
    { merge: true },
  );
};

export const handleCheckoutCompleted = async (
  db: Firestore,
  stripe: Stripe,
  session: Stripe.Checkout.Session,
) => {
  const userId = session.client_reference_id || session.metadata?.userId || "";
  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
  const email = session.customer_email || session.customer_details?.email || "";

  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 1 });
  const priceId = lineItems.data[0]?.price?.id;
  const { plan, interval } = await resolvePlanFromPriceId(
    stripe,
    priceId,
    session.metadata?.plan || null,
  );

  const checkoutMode = session.mode;
  const resolvedInterval: MimiBillingInterval =
    checkoutMode === "payment" || plan === "trial" ? "month" : interval;
  const periodEnd = subscriptionPeriodEnd(undefined, resolvedInterval);

  if (userId) {
    await writeMembershipEntitlements({
      db,
      uid: userId,
      plan,
      interval: resolvedInterval,
      stripeCustomerId: customerId || undefined,
      currentPeriodEnd: periodEnd,
      status: "active",
    });
    console.log(`MIMI // Stripe checkout: granted ${plan} to user ${userId}`);
    return;
  }

  if (email) {
    await writePendingMembership({
      db,
      email,
      plan,
      interval: resolvedInterval,
      stripeCustomerId: customerId || undefined,
      currentPeriodEnd: periodEnd,
    });
    console.log(`MIMI // Stripe checkout: pending membership for ${email} (${plan})`);
  }
};

export const handleSubscriptionUpdated = async (
  db: Firestore,
  stripe: Stripe,
  subscription: Stripe.Subscription,
) => {
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;
  if (!customerId) return;

  const uid =
    subscription.metadata?.userId ||
    (await findUidByStripeCustomer(db, customerId));
  if (!uid) {
    console.warn("MIMI // Stripe subscription.updated: no uid for customer", customerId);
    return;
  }

  const priceId = subscription.items.data[0]?.price?.id;
  const { plan, interval } = await resolvePlanFromPriceId(
    stripe,
    priceId,
    subscription.metadata?.plan || null,
  );

  const status = subscription.status;
  const isActive = status === "active" || status === "trialing";
  const periodEndMs =
    typeof (subscription as Stripe.Subscription & { current_period_end?: number }).current_period_end ===
    "number"
      ? (subscription as Stripe.Subscription & { current_period_end: number }).current_period_end * 1000
      : subscriptionPeriodEnd(undefined, interval);

  if (isActive) {
    await writeMembershipEntitlements({
      db,
      uid,
      plan,
      interval,
      stripeCustomerId: customerId,
      currentPeriodEnd: periodEndMs,
      status: "active",
    });
  } else {
    await writeMembershipEntitlements({
      db,
      uid,
      plan: "free",
      stripeCustomerId: customerId,
      status: "inactive",
    });
  }
};

export const handleSubscriptionDeleted = async (db: Firestore, subscription: Stripe.Subscription) => {
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;
  if (!customerId) return;

  const uid =
    subscription.metadata?.userId ||
    (await findUidByStripeCustomer(db, customerId));
  if (!uid) return;

  await writeMembershipEntitlements({
    db,
    uid,
    plan: "free",
    stripeCustomerId: customerId,
    status: "inactive",
  });
  console.log(`MIMI // Stripe subscription.deleted: downgraded user ${uid}`);
};

export const handleInvoicePaymentSucceeded = async (
  db: Firestore,
  stripe: Stripe,
  invoice: Stripe.Invoice,
) => {
  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!customerId) return;

  const uid = await findUidByStripeCustomer(db, customerId);
  if (!uid) return;

  const line = invoice.lines.data[0] as Stripe.InvoiceLineItem & {
    price?: Stripe.Price;
    period?: { end?: number };
  };
  const priceId = line?.price?.id;
  const { plan, interval } = await resolvePlanFromPriceId(stripe, priceId, null);
  const periodEndMs = line?.period?.end
    ? line.period.end * 1000
    : subscriptionPeriodEnd(undefined, interval);

  await writeMembershipEntitlements({
    db,
    uid,
    plan,
    interval,
    stripeCustomerId: customerId,
    currentPeriodEnd: periodEndMs,
    status: "active",
  });
};

export const handleStripeWebhookEvent = async (
  db: Firestore,
  stripe: Stripe,
  event: Stripe.Event,
) => {
  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(db, stripe, event.data.object as Stripe.Checkout.Session);
      break;
    case "customer.subscription.updated":
      await handleSubscriptionUpdated(db, stripe, event.data.object as Stripe.Subscription);
      break;
    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(db, event.data.object as Stripe.Subscription);
      break;
    case "invoice.payment_succeeded":
      await handleInvoicePaymentSucceeded(db, stripe, event.data.object as Stripe.Invoice);
      break;
    default:
      break;
  }
};
