/** @vitest-environment node */
import type Stripe from "stripe";
import { describe, expect, it, vi } from "vitest";
import { normalizeStripeMembershipEvent } from "../infrastructure/stripe/normalizeMembershipEvent.js";

const initiationPrice = "price_1TfuI49AUz0q2nVCHuy4k4Sq";

function subscription(overrides: Record<string, unknown> = {}) {
  return {
    id: "sub_123",
    object: "subscription",
    customer: "cus_123",
    status: "active",
    metadata: { firebaseUid: "firebase-user" },
    items: { data: [{ price: { id: initiationPrice } }] },
    current_period_start: 1_785_600_000,
    current_period_end: 1_788_192_000,
    ...overrides,
  };
}

function event(type: string, object: Record<string, unknown>): Stripe.Event {
  return {
    id: `evt_${type.replaceAll(".", "_")}`,
    object: "event",
    api_version: "2026-06-24.dahlia",
    created: 1_785_600_100,
    data: { object },
    livemode: false,
    pending_webhooks: 1,
    request: null,
    type,
  } as unknown as Stripe.Event;
}

function stripeMock(
  currentSubscription = subscription(),
  interval: "month" | "year" = "month",
) {
  return {
    prices: {
      retrieve: vi.fn(async () => ({
        id: initiationPrice,
        metadata: { plan: "initiation" },
        recurring: { interval },
      })),
    },
    subscriptions: {
      retrieve: vi.fn(async () => currentSubscription),
    },
    checkout: {
      sessions: {
        listLineItems: vi.fn(async () => ({
          data: [{ price: { id: initiationPrice } }],
        })),
      },
    },
  } as unknown as Stripe;
}

describe("Stripe membership normalization", () => {
  it("does not mint subscription credits from checkout completion", async () => {
    const normalized = await normalizeStripeMembershipEvent(
      stripeMock(),
      event("checkout.session.completed", {
        id: "cs_123",
        client_reference_id: "firebase-user",
        customer: "cus_123",
        subscription: "sub_123",
        metadata: {},
      }),
    );
    expect(normalized).toMatchObject({
      userId: "firebase-user",
      plan: "creator",
      status: "active",
      providerSubscriptionId: "sub_123",
    });
    expect(normalized?.grant).toBeUndefined();
  });

  it("issues the exact legacy tier allowance from the paid invoice period", async () => {
    const normalized = await normalizeStripeMembershipEvent(
      stripeMock(),
      event("invoice.payment_succeeded", {
        id: "in_123",
        customer: "cus_123",
        subscription: "sub_123",
        billing_reason: "subscription_cycle",
        lines: {
          data: [
            {
              amount: 1_200,
              price: { id: initiationPrice },
              period: { start: 1_785_600_000, end: 1_788_192_000 },
            },
          ],
        },
      }),
    );
    expect(normalized?.plan).toBe("creator");
    expect(normalized?.grant?.amount).toBe(500n);
    expect(normalized?.grant?.idempotencyKey).toContain("sub_123");
    expect(normalized?.grant?.idempotencyKey).toContain(initiationPrice);
  });

  it("returns ended subscriptions to an active free membership", async () => {
    const normalized = await normalizeStripeMembershipEvent(
      stripeMock(subscription({ status: "canceled" })),
      event("customer.subscription.deleted", subscription({ status: "canceled" })),
    );
    expect(normalized).toMatchObject({
      plan: "free",
      status: "active",
    });
    expect(normalized?.grant).toBeUndefined();
  });

  it("multiplies exact tier allowances for annual invoice periods", async () => {
    const normalized = await normalizeStripeMembershipEvent(
      stripeMock(subscription(), "year"),
      event("invoice.payment_succeeded", {
        id: "in_annual",
        customer: "cus_123",
        subscription: "sub_123",
        billing_reason: "subscription_cycle",
        lines: {
          data: [
            {
              amount: 12_000,
              price: { id: initiationPrice },
              period: { start: 1_785_600_000, end: 1_817_136_000 },
            },
          ],
        },
      }),
    );
    expect(normalized?.grant?.amount).toBe(6_000n);
  });

  it("does not grant a full allowance for proration invoices", async () => {
    const normalized = await normalizeStripeMembershipEvent(
      stripeMock(),
      event("invoice.payment_succeeded", {
        id: "in_proration",
        customer: "cus_123",
        subscription: "sub_123",
        billing_reason: "subscription_update",
        lines: {
          data: [
            {
              amount: 400,
              price: { id: initiationPrice },
              period: { start: 1_785_600_000, end: 1_788_192_000 },
              proration: true,
            },
          ],
        },
      }),
    );
    expect(normalized?.plan).toBe("creator");
    expect(normalized?.grant).toBeUndefined();
  });
});
