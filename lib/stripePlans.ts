import { STRIPE_PRICES, STRIPE_PRICES_ANNUAL, type BillingInterval } from "../constants.js";

export type MimiCheckoutPlan = "core" | "optioning" | "pro" | "lab";
export type { BillingInterval } from "../constants.js";

// Canonical fallback price IDs live in constants.ts (STRIPE_PRICES) so the
// client and server never drift. Env vars (STRIPE_PRICE_*) still take priority.
const TEST_PRICE_IDS: Record<MimiCheckoutPlan, string> = {
  core: STRIPE_PRICES.core,
  optioning: STRIPE_PRICES.optioning,
  pro: STRIPE_PRICES.pro,
  lab: STRIPE_PRICES.lab,
};

const TEST_PRICE_IDS_ANNUAL: Record<MimiCheckoutPlan, string> = {
  core: STRIPE_PRICES_ANNUAL.core,
  optioning: STRIPE_PRICES_ANNUAL.optioning,
  pro: STRIPE_PRICES_ANNUAL.pro,
  lab: STRIPE_PRICES_ANNUAL.lab,
};

const PLAN_TO_MIMI_PLAN = {
  core: "initiation",
  optioning: "optioning",
  pro: "atelier",
  lab: "lab",
} as const;

const PRICE_ENV_KEYS: Record<MimiCheckoutPlan, string> = {
  core: "STRIPE_PRICE_CORE",
  optioning: "STRIPE_PRICE_OPTIONING",
  pro: "STRIPE_PRICE_PRO",
  lab: "STRIPE_PRICE_LAB",
};

const PRICE_ENV_KEYS_ANNUAL: Record<MimiCheckoutPlan, string> = {
  core: "STRIPE_PRICE_CORE_ANNUAL",
  optioning: "STRIPE_PRICE_OPTIONING_ANNUAL",
  pro: "STRIPE_PRICE_PRO_ANNUAL",
  lab: "STRIPE_PRICE_LAB_ANNUAL",
};

export const parseCheckoutPlan = (input: unknown): MimiCheckoutPlan | null => {
  const value = String(input || "").trim().toLowerCase();
  return value === "core" || value === "optioning" || value === "pro" || value === "lab"
    ? (value as MimiCheckoutPlan)
    : null;
};

export const parseBillingInterval = (input: unknown): BillingInterval => {
  const value = String(input || "").trim().toLowerCase();
  return value === "year" || value === "annual" || value === "yearly" ? "year" : "month";
};

export const getStripePriceForPlan = (
  plan: MimiCheckoutPlan,
  interval: BillingInterval = "month",
) => {
  if (interval === "year") {
    const configuredAnnual = String(process.env[PRICE_ENV_KEYS_ANNUAL[plan]] || "").trim();
    return configuredAnnual || TEST_PRICE_IDS_ANNUAL[plan];
  }
  const configured = String(process.env[PRICE_ENV_KEYS[plan]] || "").trim();
  return configured || TEST_PRICE_IDS[plan];
};

export const getMimiPlanForCheckout = (plan: MimiCheckoutPlan) =>
  PLAN_TO_MIMI_PLAN[plan];

export interface ConfiguredStripePricePolicy {
  plan: (typeof PLAN_TO_MIMI_PLAN)[MimiCheckoutPlan];
  interval: BillingInterval;
}

export function getConfiguredStripePricePolicyMap(): Record<
  string,
  ConfiguredStripePricePolicy
> {
  return (Object.keys(PLAN_TO_MIMI_PLAN) as MimiCheckoutPlan[]).reduce<
    Record<string, ConfiguredStripePricePolicy>
  >((policies, plan) => {
    for (const interval of ["month", "year"] as const) {
      policies[getStripePriceForPlan(plan, interval)] = {
        plan: PLAN_TO_MIMI_PLAN[plan],
        interval,
      };
    }
    return policies;
  }, {});
}
