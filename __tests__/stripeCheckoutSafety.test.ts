/** @vitest-environment node */
import type Stripe from "stripe";
import { describe, expect, it, vi } from "vitest";
import {
  expireOpenSubscriptionSessions,
  hasNonTerminalSubscription,
} from "../lib/stripeCheckoutSafety.js";

describe("Stripe checkout safety", () => {
  it("derives retry generation from the latest session and expires every open session", async () => {
    const expire = vi.fn(async () => ({}));
    const list = vi.fn(async (params: { status?: string }) => {
      if (!params.status) {
        return {
          data: [{ id: "cs_latest", mode: "subscription" }],
          has_more: false,
        };
      }
      return {
        data: [
          { id: "cs_open_1", mode: "subscription" },
          { id: "cs_open_2", mode: "subscription" },
        ],
        has_more: false,
      };
    });
    const stripe = {
      checkout: { sessions: { list, expire } },
    } as unknown as Stripe;

    await expect(
      expireOpenSubscriptionSessions(stripe, "cus_123"),
    ).resolves.toEqual({
      expiredIds: ["cs_open_1", "cs_open_2"],
      generationSeed: "cs_latest",
    });
    expect(expire).toHaveBeenCalledTimes(2);
  });

  it("paginates until it finds a non-terminal subscription", async () => {
    const list = vi
      .fn()
      .mockResolvedValueOnce({
        data: Array.from({ length: 100 }, (_, index) => ({
          id: `sub_canceled_${index}`,
          status: "canceled",
        })),
        has_more: true,
      })
      .mockResolvedValueOnce({
        data: [{ id: "sub_active", status: "active" }],
        has_more: false,
      });
    const stripe = {
      subscriptions: { list },
    } as unknown as Stripe;

    await expect(
      hasNonTerminalSubscription(stripe, "cus_123"),
    ).resolves.toBe(true);
    expect(list).toHaveBeenCalledTimes(2);
    expect(list.mock.calls[1][0].starting_after).toBe("sub_canceled_99");
  });
});
