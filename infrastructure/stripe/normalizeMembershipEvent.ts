import type Stripe from "stripe";
import {
  canonicalPlanFromLegacy,
  PLAN_GRANTS,
} from "../../application/credits/creditService.js";
import type { MembershipReconciliationEvent } from "../../application/memberships/reconcileMembership.js";
import {
  buildCreditGrant,
  MIMI_PRICE_ID_PLAN_MAP,
  normalizeMimiPlan,
  type MimiBillingInterval,
} from "../../lib/mimiEntitlements.js";
import { getConfiguredStripePricePolicyMap } from "../../lib/stripePlans.js";

function asId(
  value: string | { id: string } | null | undefined,
): string | null {
  return typeof value === "string" ? value : value?.id ?? null;
}

function fromUnix(value: unknown): Date | null {
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds > 0
    ? new Date(seconds * 1_000)
    : null;
}

async function resolvePricePolicy(
  stripe: Stripe,
  priceId: string | null,
  metadataPlan?: string | null,
): Promise<{
  plan: MembershipReconciliationEvent["plan"];
  interval: MimiBillingInterval;
  grantAmount: bigint;
}> {
  const configuredPolicy = priceId
    ? getConfiguredStripePricePolicyMap()[priceId]
    : undefined;
  let interval: MimiBillingInterval = configuredPolicy?.interval ?? "month";
  let rawPlan: string | null | undefined =
    configuredPolicy?.plan ||
    (priceId ? MIMI_PRICE_ID_PLAN_MAP[priceId] : null);
  if (priceId) {
    const price = await stripe.prices.retrieve(priceId);
    if (
      price.recurring?.interval !== "month" &&
      price.recurring?.interval !== "year"
    ) {
      throw new Error(
        `Stripe price ${price.id} is not a monthly or annual recurring Price.`,
      );
    }
    const actualInterval: MimiBillingInterval = price.recurring.interval;
    if (configuredPolicy && configuredPolicy.interval !== actualInterval) {
      throw new Error(
        `Stripe price ${price.id} cadence does not match its Mimi configuration.`,
      );
    }
    interval = actualInterval;
    rawPlan =
      getConfiguredStripePricePolicyMap()[price.id]?.plan ||
      MIMI_PRICE_ID_PLAN_MAP[price.id] ||
      price.metadata?.canonicalPlan ||
      price.metadata?.plan ||
      metadataPlan;
  } else {
    rawPlan = metadataPlan;
  }
  if (!rawPlan) {
    throw new Error(`Stripe price ${priceId || "unknown"} has no Mimi plan mapping.`);
  }
  const plan = canonicalPlanFromLegacy(rawPlan);
  const legacyPlan = normalizeMimiPlan(rawPlan);
  const legacyGrant = buildCreditGrant({ plan: legacyPlan, interval }).credits.allowance;
  const canonicalGrant =
    PLAN_GRANTS[plan].credits * (interval === "year" ? 12n : 1n);
  return {
    plan,
    interval,
    grantAmount: BigInt(legacyGrant > 0 ? legacyGrant : canonicalGrant),
  };
}

function payloadReference(event: Stripe.Event): Record<string, unknown> {
  return {
    stripeEventId: event.id,
    stripeEventType: event.type,
    apiVersion: event.api_version,
    created: event.created,
    livemode: event.livemode,
    objectId:
      typeof event.data.object === "object" &&
      event.data.object !== null &&
      "id" in event.data.object
        ? String(event.data.object.id)
        : null,
  };
}

function eventCreatedAt(event: Stripe.Event): Date {
  return new Date(event.created * 1_000);
}

function subscriptionPeriod(subscription: Stripe.Subscription): {
  start: Date | null;
  end: Date | null;
} {
  const item = subscription.items.data[0] as Stripe.SubscriptionItem & {
    current_period_start?: number;
    current_period_end?: number;
  };
  const legacy = subscription as Stripe.Subscription & {
    current_period_start?: number;
    current_period_end?: number;
  };
  return {
    start: fromUnix(item?.current_period_start ?? legacy.current_period_start),
    end: fromUnix(item?.current_period_end ?? legacy.current_period_end),
  };
}

function subscriptionStatus(
  value: Stripe.Subscription.Status,
): MembershipReconciliationEvent["status"] {
  switch (value) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
    case "unpaid":
    case "paused":
      return "past_due";
    case "canceled":
    case "incomplete":
    case "incomplete_expired":
      return "canceled";
    default: {
      const exhaustive: never = value;
      return exhaustive;
    }
  }
}

async function findNonTerminalSubscription(
  stripe: Stripe,
  customerId: string,
): Promise<Stripe.Subscription | null> {
  const statuses = new Set([
    "active",
    "trialing",
    "past_due",
    "unpaid",
    "paused",
    "incomplete",
  ]);
  let startingAfter: string | undefined;
  do {
    const page = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });
    const current = page.data.find((subscription) =>
      statuses.has(subscription.status),
    );
    if (current) return current;
    startingAfter = page.has_more ? page.data.at(-1)?.id : undefined;
  } while (startingAfter);
  return null;
}

export async function normalizeStripeMembershipEvent(
  stripe: Stripe,
  event: Stripe.Event,
): Promise<MembershipReconciliationEvent | null> {
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const items = await stripe.checkout.sessions.listLineItems(session.id, {
      limit: 1,
    });
    const priceId = items.data[0]?.price?.id ?? null;
    const policy = await resolvePricePolicy(
      stripe,
      priceId,
      session.metadata?.canonicalPlan || session.metadata?.plan,
    );
    const subscriptionId = asId(session.subscription);
    if (subscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const currentItem = subscription.items.data[0];
      const currentPolicy = await resolvePricePolicy(
        stripe,
        currentItem?.price?.id ?? priceId,
        subscription.metadata?.canonicalPlan ||
          subscription.metadata?.plan ||
          session.metadata?.canonicalPlan ||
          session.metadata?.plan,
      );
      const period = subscriptionPeriod(subscription);
      return {
        eventId: event.id,
        eventType: event.type,
        userId:
          session.client_reference_id ||
          session.metadata?.userId ||
          subscription.metadata?.firebaseUid ||
          subscription.metadata?.userId ||
          null,
        plan: currentPolicy.plan,
        status: subscriptionStatus(subscription.status),
        providerCustomerId: asId(subscription.customer) || asId(session.customer),
        providerSubscriptionId: subscription.id,
        providerEventCreatedAt: eventCreatedAt(event),
        currentPeriodStart: period.start,
        currentPeriodEnd: period.end,
        // Subscription credits are granted by invoice.payment_succeeded.
        payloadReference: payloadReference(event),
      };
    }
    if (session.mode === "subscription") {
      throw new Error(
        `Checkout Session ${session.id} completed without a subscription reference.`,
      );
    }

    const periodStart = eventCreatedAt(event);
    const periodEnd = new Date(periodStart.getTime() + 30 * 24 * 60 * 60 * 1_000);
    return {
      eventId: event.id,
      eventType: event.type,
      userId: session.client_reference_id || session.metadata?.userId || null,
      plan: policy.plan,
      status: "active",
      providerCustomerId: asId(session.customer),
      providerSubscriptionId: null,
      providerEventCreatedAt: eventCreatedAt(event),
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      grant:
        policy.grantAmount > 0n
          ? {
              amount: policy.grantAmount,
              idempotencyKey: `stripe:checkout:${session.id}`,
              expiresAt: periodEnd,
              externalReference: session.id,
            }
          : undefined,
      payloadReference: payloadReference(event),
    };
  }

  if (
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const eventSubscription = event.data.object as Stripe.Subscription;
    const customerId = asId(eventSubscription.customer);
    const replacement =
      event.type === "customer.subscription.deleted" && customerId
        ? await findNonTerminalSubscription(stripe, customerId)
        : null;
    const subscription =
      event.type === "customer.subscription.updated"
        ? await stripe.subscriptions.retrieve(eventSubscription.id)
        : replacement || eventSubscription;
    const ended =
      (event.type === "customer.subscription.deleted" && !replacement) ||
      subscription.status === "canceled" ||
      subscription.status === "incomplete_expired";
    if (ended) {
      return {
        eventId: event.id,
        eventType: event.type,
        userId:
          subscription.metadata?.firebaseUid ||
          subscription.metadata?.userId ||
          null,
        plan: "free",
        status: "active",
        providerCustomerId: asId(subscription.customer) || customerId,
        providerSubscriptionId: subscription.id,
        providerEventCreatedAt: eventCreatedAt(event),
        currentPeriodStart: null,
        currentPeriodEnd: null,
        payloadReference: payloadReference(event),
      };
    }
    const item = subscription.items.data[0];
    const policy = await resolvePricePolicy(
      stripe,
      item?.price?.id ?? null,
      subscription.metadata?.canonicalPlan || subscription.metadata?.plan,
    );
    const period = subscriptionPeriod(subscription);
    return {
      eventId: event.id,
      eventType: event.type,
      userId:
        subscription.metadata?.firebaseUid ||
        subscription.metadata?.userId ||
        null,
      plan: policy.plan,
      status: subscriptionStatus(subscription.status),
      providerCustomerId: asId(subscription.customer) || customerId,
      providerSubscriptionId: subscription.id,
      providerEventCreatedAt: eventCreatedAt(event),
      currentPeriodStart: period.start,
      currentPeriodEnd: period.end,
      payloadReference: payloadReference(event),
    };
  }

  if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object as Stripe.Invoice;
    type MembershipInvoiceLine = Stripe.InvoiceLineItem & {
      price?: Stripe.Price;
      period?: { start?: number; end?: number };
      pricing?: { price_details?: { price?: string } };
      proration?: boolean;
      parent?: {
        subscription_item_details?: {
          proration?: boolean;
        };
      };
    };
    const eligibleLines = (invoice.lines.data as MembershipInvoiceLine[]).filter(
      (candidate) =>
        Number(candidate.amount || 0) > 0 &&
        candidate.proration !== true &&
        candidate.parent?.subscription_item_details?.proration !== true &&
        Boolean(
          candidate.price?.id ||
            candidate.pricing?.price_details?.price,
        ),
    );
    const line = eligibleLines.length === 1 ? eligibleLines[0] : null;
    const invoiceWithSubscription = invoice as Stripe.Invoice & {
      subscription?: string | Stripe.Subscription | null;
      parent?: {
        subscription_details?: {
          subscription?: string | Stripe.Subscription | null;
        };
      };
    };
    const subscriptionId =
      asId(invoiceWithSubscription.subscription) ||
      asId(invoiceWithSubscription.parent?.subscription_details?.subscription);
    const subscription = subscriptionId
      ? await stripe.subscriptions.retrieve(subscriptionId)
      : null;
    const currentPriceId = subscription?.items.data[0]?.price?.id;
    const invoicePriceId =
      line?.price?.id || line?.pricing?.price_details?.price || null;
    const membershipPolicy = await resolvePricePolicy(
      stripe,
      currentPriceId || invoicePriceId,
      subscription?.metadata?.canonicalPlan || subscription?.metadata?.plan,
    );
    const grantPolicy = line
      ? await resolvePricePolicy(stripe, invoicePriceId, null)
      : null;
    const currentStatus = subscription
      ? subscriptionStatus(subscription.status)
      : "active";
    const ended = currentStatus === "canceled" || currentStatus === "expired";
    const periodStart = fromUnix(line?.period?.start);
    const periodEnd = fromUnix(line?.period?.end);
    const grantKey = [
      "stripe",
      "period",
      subscriptionId || asId(invoice.customer) || invoice.id,
      String(line?.period?.start || "unknown"),
      String(line?.period?.end || "unknown"),
      invoicePriceId || "unknown",
    ].join(":");
    const billingReason = String(invoice.billing_reason || "");
    const grantsFullPeriod =
      billingReason === "subscription_create" ||
      billingReason === "subscription_cycle";
    if (grantsFullPeriod && eligibleLines.length !== 1) {
      throw new Error(
        `Invoice ${invoice.id} has ${eligibleLines.length} eligible membership lines; grant reconciliation requires exactly one.`,
      );
    }
    return {
      eventId: event.id,
      eventType: event.type,
      userId:
        subscription?.metadata?.firebaseUid ||
        subscription?.metadata?.userId ||
        null,
      plan: ended ? "free" : membershipPolicy.plan,
      status: ended ? "active" : currentStatus,
      providerCustomerId: asId(invoice.customer),
      providerSubscriptionId: subscriptionId,
      providerEventCreatedAt: eventCreatedAt(event),
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      grant:
        !ended &&
        grantsFullPeriod &&
        grantPolicy &&
        grantPolicy.grantAmount > 0n &&
        periodStart &&
        periodEnd
          ? {
              amount: grantPolicy.grantAmount,
              idempotencyKey: grantKey,
              expiresAt: periodEnd,
              externalReference: invoice.id,
            }
          : undefined,
      payloadReference: payloadReference(event),
    };
  }

  return null;
}
