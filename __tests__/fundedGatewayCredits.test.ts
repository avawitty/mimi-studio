import { describe, expect, it } from "vitest";
import {
  hasTrustedPaidBillingSignal,
  isPaidSubscriptionActive,
  needsMembershipCreditHeal,
  needsMembershipCreditMint,
  needsMembershipPeriodReload,
  rollForwardMembershipGrant,
} from "../lib/mimiFundedGateway.js";
import { collectStripeCustomerIdCandidates } from "../lib/verifyStripeEntitlement.js";
import { buildCreditGrant, isPaidMimiPlan, normalizeMimiPlan } from "../lib/mimiEntitlements.js";

describe("needsMembershipPeriodReload", () => {
  it("reloads only when an existing allowance period has ended", () => {
    const now = Date.now();
    expect(
      needsMembershipPeriodReload(
        {
          allowance: 10000,
          remaining: 0,
          periodEndsAt: now - 1000,
        },
        now,
      ),
    ).toBe(true);
    expect(
      needsMembershipPeriodReload(
        {
          allowance: 10000,
          remaining: 0,
          periodEndsAt: now + 7 * 24 * 60 * 60 * 1000,
        },
        now,
      ),
    ).toBe(false);
  });

  it("does not reload zero-allowance grants (malformed / client-spoofed)", () => {
    const now = Date.now();
    expect(
      needsMembershipPeriodReload(
        { allowance: 0, remaining: 0, periodEndsAt: now - 1000 },
        now,
      ),
    ).toBe(false);
  });

  it("does not reload a missing grant (mint is separate + must be trusted)", () => {
    expect(needsMembershipPeriodReload(undefined)).toBe(false);
    expect(needsMembershipPeriodReload({})).toBe(false);
  });
});

describe("needsMembershipCreditMint", () => {
  it("mints when membershipCredits were never granted", () => {
    expect(needsMembershipCreditMint(undefined)).toBe(true);
    expect(needsMembershipCreditMint(null)).toBe(true);
    expect(needsMembershipCreditMint({})).toBe(true);
  });

  it("mints malformed remaining:0 grants that never received an allowance", () => {
    expect(needsMembershipCreditMint({ remaining: 0 })).toBe(true);
    expect(needsMembershipCreditMint({ remaining: 0, allowance: 0 })).toBe(true);
  });

  it("does not mint mid-period when remaining is simply spent", () => {
    expect(
      needsMembershipCreditMint({
        allowance: 10000,
        remaining: 0,
        periodEndsAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      }),
    ).toBe(false);
  });
});

describe("needsMembershipCreditHeal (compat)", () => {
  it("heals missing grants or expired periods", () => {
    expect(needsMembershipCreditHeal(undefined)).toBe(true);
    const now = Date.now();
    expect(
      needsMembershipCreditHeal(
        { allowance: 10000, remaining: 0, periodEndsAt: now - 1 },
        now,
      ),
    ).toBe(true);
  });
});

describe("hasTrustedPaidBillingSignal", () => {
  it("is only a cus_* shape check — not sufficient for mint without Stripe verify", () => {
    expect(hasTrustedPaidBillingSignal({ plan: "lab", mimiPlan: "lab" })).toBe(false);
    expect(hasTrustedPaidBillingSignal({ stripeCustomerId: "promo_code" })).toBe(false);
    expect(hasTrustedPaidBillingSignal({ stripeCustomerId: "cus_123" })).toBe(true);
    // Patron markers alone are never treated as trusted shape signals.
    expect(
      hasTrustedPaidBillingSignal({
        isPatron: true,
        patronActivatedAt: Date.now(),
      }),
    ).toBe(false);
  });
});

describe("collectStripeCustomerIdCandidates", () => {
  it("collects cus_* from user and billing sources", () => {
    expect(
      collectStripeCustomerIdCandidates(
        { stripeCustomerId: "cus_user" },
        { stripeCustomerId: "cus_billing" },
        { stripeCustomerId: "promo_code" },
      ),
    ).toEqual(["cus_user", "cus_billing"]);
  });

  it("also scans customerId (Functions/lib parity)", () => {
    expect(
      collectStripeCustomerIdCandidates({ customerId: "cus_alt" }, { stripeCustomerId: "cus_main" }),
    ).toEqual(["cus_alt", "cus_main"]);
  });
});

describe("rollForwardMembershipGrant", () => {
  it("preserves existing allowance instead of re-deriving from client plan", () => {
    const now = Date.now();
    const rolled = rollForwardMembershipGrant({ allowance: 4321 }, "month", now);
    expect(rolled.allowance).toBe(4321);
    expect(rolled.remaining).toBe(4321);
    expect(rolled.periodEndsAt).toBeGreaterThan(now);
  });
});

describe("isPaidSubscriptionActive", () => {
  it("treats missing status as active for patron / lab seats", () => {
    expect(isPaidSubscriptionActive(undefined)).toBe(true);
    expect(isPaidSubscriptionActive("")).toBe(true);
    expect(isPaidSubscriptionActive("active")).toBe(true);
  });

  it("denies explicitly canceled seats", () => {
    expect(isPaidSubscriptionActive("inactive")).toBe(false);
    expect(isPaidSubscriptionActive("canceled")).toBe(false);
    expect(isPaidSubscriptionActive("cancelled")).toBe(false);
  });
});

describe("lab plan credit grant", () => {
  it("normalizes lab and grants plan credits for funded gateway", () => {
    expect(normalizeMimiPlan("lab")).toBe("lab");
    expect(isPaidMimiPlan("lab")).toBe(true);
    const { credits } = buildCreditGrant({ plan: "lab", interval: "month" });
    expect(credits.remaining).toBeGreaterThanOrEqual(10000);
    expect(needsMembershipCreditMint(credits)).toBe(false);
    expect(needsMembershipPeriodReload(credits)).toBe(false);
  });

  it("includes membershipPlan in plan normalization path", () => {
    expect(normalizeMimiPlan("lab")).toBe("lab");
    expect(isPaidMimiPlan(normalizeMimiPlan("lab"))).toBe(true);
  });
});
