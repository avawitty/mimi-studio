import { STRIPE_PRICES } from "../constants.js";

export type MimiCheckoutPlan = "core" | "optioning" | "pro" | "lab";

// Canonical fallback price IDs live in constants.ts (STRIPE_PRICES) so the
// client and server never drift. Env vars (STRIPE_PRICE_*) still take priority.
const TEST_PRICE_IDS: Record<MimiCheckoutPlan, string> = {
  core: STRIPE_PRICES.core,
  optioning: STRIPE_PRICES.optioning,
  pro: STRIPE_PRICES.pro,
  lab: STRIPE_PRICES.lab,
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

export const parseCheckoutPlan = (input: unknown): MimiCheckoutPlan | null => {
  const value = String(input || "").trim().toLowerCase();
  return value === "core" || value === "optioning" || value === "pro" || value === "lab"
    ? (value as MimiCheckoutPlan)
    : null;
};

export const getStripePriceForPlan = (plan: MimiCheckoutPlan) => {
  const configured = String(process.env[PRICE_ENV_KEYS[plan]] || "").trim();
  return configured || TEST_PRICE_IDS[plan];
};

export const getMimiPlanForCheckout = (plan: MimiCheckoutPlan) =>
  PLAN_TO_MIMI_PLAN[plan];
