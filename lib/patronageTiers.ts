import {
  PLAN_ANNUAL_USD,
  PLAN_MONTHLY_USD,
  type BillingInterval,
} from "../constants.js";

/** Checkout plan keys used by Stripe session creation. */
export type PatronageCheckoutPlan = "core" | "optioning" | "pro" | "lab";

export interface PatronageTier {
  plan: PatronageCheckoutPlan;
  name: string;
  role: string;
  cta: string;
  features: string[];
  recommended?: boolean;
  dark?: boolean;
}

/** Canonical Maison Mimi Patronage catalog — keep UI surfaces in sync. */
export const PATRONAGE_TIERS: PatronageTier[] = [
  {
    plan: "core",
    name: "The Initiation",
    role: "Interpreter",
    cta: "Understand Your Taste",
    features: [
      "500 generation credits monthly",
      "Persistent Archive saves",
      "Full Aesthetic DNA editing",
      "Advanced Analysis maps",
    ],
  },
  {
    plan: "optioning",
    name: "Optioning",
    role: "Tailor",
    cta: "Tailor Your Taste",
    recommended: true,
    features: [
      "Everything in Initiation",
      "1,500 generation credits monthly",
      "Tailor visual treatments",
      "Priority generation queue",
    ],
  },
  {
    plan: "pro",
    name: "The Atelier",
    role: "Couturier",
    cta: "Apply Your Taste",
    features: [
      "Everything in Optioning",
      "3,000 generation credits monthly",
      "Multi-project workspaces",
      "Brand positioning outputs",
      "Strategic roadmap generation",
    ],
  },
  {
    plan: "lab",
    name: "The Lab",
    role: "Maison",
    cta: "Shape The System",
    dark: true,
    features: [
      "Everything in the Atelier",
      "10,000 generation credits monthly",
      "Experimental features",
      "Advanced embeddings tuning",
      "API / Integrations",
    ],
  },
];

export const formatPatronagePrice = (
  plan: PatronageCheckoutPlan,
  interval: BillingInterval,
) => {
  if (interval === "year") {
    const perMonth = Math.round(PLAN_ANNUAL_USD[plan] / 12);
    return {
      big: `$${perMonth}`,
      small: "/mo",
      note: `$${PLAN_ANNUAL_USD[plan]} billed yearly`,
    };
  }
  return {
    big: `$${PLAN_MONTHLY_USD[plan]}`,
    small: "/mo",
    note: "Billed monthly",
  };
};

/** Map checkout plan → canonical mimi plan id. */
export const CHECKOUT_PLAN_TO_MIMI: Record<PatronageCheckoutPlan, string> = {
  core: "initiation",
  optioning: "optioning",
  pro: "atelier",
  lab: "lab",
};

/**
 * Resolve the active checkout plan from profile fields.
 * Prefers `mimiPlan` when present; falls back to legacy planStatus/membershipPlan.
 */
export const resolveActiveCheckoutPlan = (profile?: {
  subscriptionStatus?: string | null;
  mimiPlan?: string | null;
  planStatus?: string | null;
  membershipPlan?: string | null;
  plan?: string | null;
} | null): PatronageCheckoutPlan | null => {
  if (!profile || profile.subscriptionStatus !== "active") return null;

  const mimi = String(profile.mimiPlan || "").trim().toLowerCase();
  if (mimi === "initiation") return "core";
  if (mimi === "optioning") return "optioning";
  if (mimi === "atelier") return "pro";
  if (mimi === "lab" || mimi === "sovereign") return "lab";

  const legacy = String(
    profile.planStatus || profile.membershipPlan || profile.plan || "",
  )
    .trim()
    .toLowerCase();
  if (legacy === "core" || legacy === "initiation") return "core";
  if (legacy === "optioning") return "optioning";
  if (legacy === "pro" || legacy === "atelier") return "pro";
  if (legacy === "lab" || legacy === "sovereign") return "lab";
  return null;
};
