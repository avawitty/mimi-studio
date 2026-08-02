import { describe, expect, it } from "vitest";
import {
  isPaidSubscriptionActive,
  needsMembershipCreditHeal,
} from "../lib/mimiFundedGateway.js";
import { buildCreditGrant, isPaidMimiPlan, normalizeMimiPlan } from "../lib/mimiEntitlements.js";

describe("needsMembershipCreditHeal", () => {
  it("heals when membershipCredits were never granted", () => {
    expect(needsMembershipCreditHeal(undefined)).toBe(true);
    expect(needsMembershipCreditHeal(null)).toBe(true);
    expect(needsMembershipCreditHeal({})).toBe(true);
  });

  it("does not heal mid-period when remaining is simply spent", () => {
    const now = Date.now();
    expect(
      needsMembershipCreditHeal(
        {
          allowance: 10000,
          remaining: 0,
          periodEndsAt: now + 7 * 24 * 60 * 60 * 1000,
        },
        now,
      ),
    ).toBe(false);
  });

  it("heals when the billing period has ended", () => {
    const now = Date.now();
    expect(
      needsMembershipCreditHeal(
        {
          allowance: 10000,
          remaining: 0,
          periodEndsAt: now - 1000,
        },
        now,
      ),
    ).toBe(true);
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
    expect(needsMembershipCreditHeal(credits)).toBe(false);
  });
});
