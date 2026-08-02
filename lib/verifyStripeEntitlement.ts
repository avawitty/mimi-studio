import Stripe from "stripe";

/**
 * Verify a Stripe customer id represents a real, entitled subscriber for this
 * Firebase uid. Client-writable Firestore fields must never be trusted alone —
 * owners can forge `stripeCustomerId` on user/profile/billing docs.
 */
export async function verifyStripeCustomerEntitlement(opts: {
  customerId: string;
  uid: string;
  email?: string | null;
}): Promise<boolean> {
  const customerId = String(opts.customerId || "").trim();
  if (!customerId.startsWith("cus_")) return false;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.warn("MIMI // STRIPE_SECRET_KEY missing; cannot verify billing entitlement");
    return false;
  }

  try {
    const stripe = new Stripe(key);
    const customer = await stripe.customers.retrieve(customerId);
    if ((customer as Stripe.DeletedCustomer).deleted) return false;

    const live = customer as Stripe.Customer;
    const metaUid = String(live.metadata?.firebaseUid || live.metadata?.uid || "").trim();
    if (metaUid && metaUid !== opts.uid) return false;

    const email = String(opts.email || "").trim().toLowerCase();
    const customerEmail = String(live.email || "").trim().toLowerCase();
    const hasUidBinding = Boolean(metaUid && metaUid === opts.uid);
    const hasEmailBinding = Boolean(email && customerEmail && customerEmail === email);
    if (!hasUidBinding && !hasEmailBinding) return false;

    const subs = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 10,
    });
    return subs.data.some((sub) =>
      sub.status === "active" ||
      sub.status === "trialing" ||
      sub.status === "past_due"
    );
  } catch (err) {
    console.warn("MIMI // Stripe entitlement verification failed:", err);
    return false;
  }
}

/** Collect candidate cus_* ids from known locations (still must be verified). */
export function collectStripeCustomerIdCandidates(
  ...sources: Array<Record<string, unknown> | null | undefined>
): string[] {
  const ids = new Set<string>();
  for (const source of sources) {
    if (!source) continue;
    for (const key of ["stripeCustomerId", "customerId"] as const) {
      const value = String(source[key] || "").trim();
      if (value.startsWith("cus_")) ids.add(value);
    }
    const nested = (source as { subscription?: { stripeCustomerId?: unknown } }).subscription;
    const nestedId = String(nested?.stripeCustomerId || "").trim();
    if (nestedId.startsWith("cus_")) ids.add(nestedId);
  }
  return [...ids];
}
