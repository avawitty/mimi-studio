export type MimiCheckoutPlan = "core" | "pro" | "lab";

const TEST_PRICE_IDS: Record<MimiCheckoutPlan, string> = {
  core: "price_1TwwYS8wdWcoxOPehfAp8HnJ",
  pro: "price_1TwwYZ8wdWcoxOPeUxr0fReB",
  lab: "price_1TwwYh8wdWcoxOPeK7j6HSm0",
};

const PLAN_TO_MIMI_PLAN = {
  core: "initiation",
  pro: "atelier",
  lab: "lab",
} as const;

const PRICE_ENV_KEYS: Record<MimiCheckoutPlan, string> = {
  core: "STRIPE_PRICE_CORE",
  pro: "STRIPE_PRICE_PRO",
  lab: "STRIPE_PRICE_LAB",
};

export const parseCheckoutPlan = (input: unknown): MimiCheckoutPlan | null => {
  const value = String(input || "").trim().toLowerCase();
  return value === "core" || value === "pro" || value === "lab" ? value : null;
};

export const getStripePriceForPlan = (plan: MimiCheckoutPlan) => {
  const configured = String(process.env[PRICE_ENV_KEYS[plan]] || "").trim();
  return configured || TEST_PRICE_IDS[plan];
};

export const getMimiPlanForCheckout = (plan: MimiCheckoutPlan) =>
  PLAN_TO_MIMI_PLAN[plan];

