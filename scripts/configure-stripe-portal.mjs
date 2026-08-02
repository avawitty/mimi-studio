#!/usr/bin/env node
/**
 * Configure the default Customer Portal for Maison Mimi Patronage.
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_live_... node scripts/configure-stripe-portal.mjs
 *
 * Sets:
 * - return URL → /memberships
 * - privacy / terms links
 * - subscription updates across the four patronage products (monthly + annual)
 * - upgrade proration (create_prorations); downgrades stay period-end via conditions
 */

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("STRIPE_SECRET_KEY is required");
  process.exit(1);
}

const CONFIG_ID = process.env.STRIPE_PORTAL_CONFIG_ID || "bpc_1T0fsk9AUz0q2nVCAoh29s7H";
const BASE = (process.env.MIMI_PUBLIC_BASE_URL || "https://mimizine.app").replace(/\/$/, "");

const PRODUCTS = [
  {
    product: "prod_UfElsz9OHHpgEd",
    prices: ["price_1TfuI49AUz0q2nVCHuy4k4Sq", "price_1Tzntj9AUz0q2nVCO66J6Wps"],
  },
  {
    product: "prod_UfqKthj95UDo7m",
    prices: ["price_1TgUdR9AUz0q2nVC1EoBOgBi", "price_1Tznti9AUz0q2nVC83IIz3KG"],
  },
  {
    product: "prod_UfGndT7RktzUlE",
    prices: ["price_1TgVQC9AUz0q2nVC5POSYpI7", "price_1Tznti9AUz0q2nVCo7L96nzL"],
  },
  {
    product: "prod_UfGsM5PmAimbKy",
    prices: ["price_1TfwLC9AUz0q2nVCxNzPtunX", "price_1Tzntj9AUz0q2nVCsBYJKVze"],
  },
];

const body = new URLSearchParams();
body.set("default_return_url", `${BASE}/memberships`);
body.set("business_profile[headline]", "Maison Mimi Patronage");
body.set("business_profile[privacy_policy_url]", `${BASE}/privacy`);
body.set("business_profile[terms_of_service_url]", `${BASE}/tos`);
body.set("features[subscription_update][enabled]", "true");
body.set("features[subscription_update][proration_behavior]", "create_prorations");
body.append("features[subscription_update][default_allowed_updates][]", "price");
body.append("features[subscription_update][default_allowed_updates][]", "promotion_code");
body.append(
  "features[subscription_update][schedule_at_period_end][conditions][0][type]",
  "decreasing_item_amount",
);

PRODUCTS.forEach((entry, index) => {
  body.set(`features[subscription_update][products][${index}][product]`, entry.product);
  entry.prices.forEach((priceId) => {
    body.append(`features[subscription_update][products][${index}][prices][]`, priceId);
  });
});

const response = await fetch(
  `https://api.stripe.com/v1/billing_portal/configurations/${CONFIG_ID}`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  },
);

const json = await response.json();
if (!response.ok) {
  console.error("Portal update failed:", JSON.stringify(json, null, 2));
  process.exit(1);
}

console.log("Portal configured:", {
  id: json.id,
  return: json.default_return_url,
  headline: json.business_profile?.headline,
  products: json.features?.subscription_update?.products?.map((p) => p.product),
  proration: json.features?.subscription_update?.proration_behavior,
});
