import type Stripe from "stripe";

const NON_TERMINAL_SUBSCRIPTION_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
  "unpaid",
  "incomplete",
  "paused",
]);

export async function expireOpenSubscriptionSessions(
  stripe: Stripe,
  customerId: string,
): Promise<string[]> {
  const expiredIds: string[] = [];
  let startingAfter: string | undefined;
  do {
    const page = await stripe.checkout.sessions.list({
      customer: customerId,
      status: "open",
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });
    const openSubscriptions = page.data.filter(
      (session) => session.mode === "subscription",
    );
    for (const session of openSubscriptions) {
      try {
        await stripe.checkout.sessions.expire(session.id);
        expiredIds.push(session.id);
      } catch {
        // It may have completed between list and expire. The authoritative
        // subscription recheck decides whether Checkout may continue.
      }
    }
    startingAfter = page.has_more ? page.data.at(-1)?.id : undefined;
  } while (startingAfter);
  return expiredIds;
}

export async function hasNonTerminalSubscription(
  stripe: Stripe,
  customerId: string,
): Promise<boolean> {
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 100,
  });
  return subscriptions.data.some((subscription) =>
    NON_TERMINAL_SUBSCRIPTION_STATUSES.has(subscription.status),
  );
}
