export type MimiPlan = "free" | "trial" | "initiation" | "optioning" | "atelier" | "lab" | "sovereign";

export type MimiBillingInterval = "month" | "year";

export interface MimiEntitlement {
  plan: MimiPlan;
  monthlyCredits: number;
  rolloverEligible: boolean;
  serverAiAccess: boolean;
  features: {
    cloudSync: boolean;
    affiliate: boolean;
    layer4Prompts: boolean;
    imageGeneration: boolean;
    deepSearch: boolean;
    keyringAccess: boolean;
    clientBilling: boolean;
    commercialWorkflow: boolean;
    priorityExports: boolean;
    advancedControls: boolean;
  };
}

export interface MimiPlanMetadata {
  plan: MimiPlan;
  label: string;
  priceLabel: string;
  creditLabel: string;
  credits: number;
  billingCadence: "one_time" | "month";
  summary: string;
  bullets: string[];
}

export const MIMI_PLAN_ORDER: MimiPlan[] = [
  "free",
  "trial",
  "initiation",
  "optioning",
  "atelier",
  "lab",
  "sovereign",
];

export const MIMI_PRICE_ID_PLAN_MAP: Record<string, MimiPlan> = {
  price_1TwwYS8wdWcoxOPehfAp8HnJ: "initiation",
  price_1TwwYZ8wdWcoxOPeUxr0fReB: "atelier",
  price_1TwwYh8wdWcoxOPeK7j6HSm0: "lab",
  price_1TfuI49AUz0q2nVCHuy4k4Sq: "initiation",
  price_1TgUdR9AUz0q2nVC1EoBOgBi: "optioning",
  price_1TfwGE9AUz0q2nVCwqXHJ6TM: "atelier",
  price_1TgVQC9AUz0q2nVC5POSYpI7: "atelier",
  price_1TfwLC9AUz0q2nVCxNzPtunX: "lab",
  price_1TfwyY9AUz0q2nVC6AVQcM7t: "sovereign",
};

const envNumber = (key: string, fallback: number) => {
  const value = Number(process.env[key]);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
};

export const MIMI_PLAN_METADATA: Record<MimiPlan, MimiPlanMetadata> = {
  free: {
    plan: "free",
    label: "Visitor",
    priceLabel: "$0",
    creditLabel: "Outside the glass",
    credits: 0,
    billingCadence: "month",
    summary: "Local-first exploration before paid generation.",
    bullets: ["Observe stage & sample zines", "Treatment & catalog preview", "Local-first temporary workspace"],
  },
  trial: {
    plan: "trial",
    label: "Assessment",
    priceLabel: "$6.66 one-time",
    creditLabel: "Control experiment",
    credits: 150,
    billingCadence: "one_time",
    summary: "Peek tier for trying the app without a subscription.",
    bullets: ["One taste read experiment", "One Mini Magazine zine draft", "One sample G-channel action", "Temporary room access pass"],
  },
  initiation: {
    plan: "initiation",
    label: "The Initiation",
    priceLabel: "$12/mo",
    creditLabel: "Mimi starts remembering you",
    credits: 500,
    billingCadence: "month",
    summary: "Casual creator tier for steady personal exploration.",
    bullets: ["500 credits per cycle", "Persistent profile memory", "Doubt reports & basic archives", "Access to the House chambers"],
  },
  optioning: {
    plan: "optioning",
    label: "Optioning",
    priceLabel: "$25/mo",
    creditLabel: "Tailor visual treatments",
    credits: 1500,
    billingCadence: "month",
    summary: "Serious individual and fashion workflow tier.",
    bullets: ["1500 credits per cycle", "Mannequin flat-lay snapping", "Outfit logic & styling boards", "Wardrobe fragment curation"],
  },
  atelier: {
    plan: "atelier",
    label: "Atelier",
    priceLabel: "$40/mo",
    creditLabel: "Produce the signal",
    credits: 3000,
    billingCadence: "month",
    summary: "Consistent creator and small brand tier.",
    bullets: ["3000 credits per cycle", "Full campaign zine director", "Exportable creative assets", "Drops & publishing pipeline"],
  },
  lab: {
    plan: "lab",
    label: "Lab",
    priceLabel: "$99/mo",
    creditLabel: "Advanced controls",
    credits: 10000,
    billingCadence: "month",
    summary: "Client work and commercial workflow tier.",
    bullets: ["10000 credits per cycle", "Likeness Proxy & Style Rules", "Approved external Keyring servers", "Commercial workflows", "Client-ready asset preparation"],
  },
  sovereign: {
    plan: "sovereign",
    label: "Sovereign",
    priceLabel: "$249/mo beta",
    creditLabel: "Own a private branch of the world",
    credits: 30000,
    billingCadence: "month",
    summary: "Consulting, collaboration, and private studio tier.",
    bullets: ["30000 credits per cycle", "Private studio & brand custody", "Async taste audits & strategy", "Co-build a licensed private world layer"],
  },
};

export const normalizeMimiPlan = (plan?: unknown): MimiPlan => {
  const value = String(plan || "free").trim().toLowerCase();
  if (MIMI_PRICE_ID_PLAN_MAP[value]) return MIMI_PRICE_ID_PLAN_MAP[value];
  if (value === "on_trial" || value === "on trial" || value === "trial") return "trial";
  if (value === "the initiation" || value === "initiation" || value === "starter") return "initiation";
  if (value === "optioning" || value === "option") return "optioning";
  if (value === "core" || value === "member") return "initiation";
  if (value === "pro" || value === "atelier" || value === "the atelier") return "atelier";
  if (value === "lab" || value === "aesthetics lab" || value === "mimi lab") return "lab";
  if (value === "sovereign" || value === "agency" || value === "enterprise") return "sovereign";
  return "free";
};

/** Canonical set of planStatus values that indicate a paid account (includes legacy aliases). */
export const PAID_PLAN_STATUSES = new Set<string>([
  "core",
  "pro",
  "lab",
  "initiation",
  "optioning",
  "atelier",
  "sovereign",
]);

export const isPaidMimiPlan = (planInput?: unknown) => {
  const plan = normalizeMimiPlan(planInput);
  return MIMI_PLAN_ORDER.indexOf(plan) >= MIMI_PLAN_ORDER.indexOf("initiation");
};

export const hasMimiPlanAccess = (planInput: unknown, requiredPlanInput: unknown) =>
  MIMI_PLAN_ORDER.indexOf(normalizeMimiPlan(planInput)) >=
  MIMI_PLAN_ORDER.indexOf(normalizeMimiPlan(requiredPlanInput));

export const entitlementForPlan = (planInput?: unknown): MimiEntitlement => {
  const plan = normalizeMimiPlan(planInput);
  const monthlyCreditsByPlan: Record<MimiPlan, number> = {
    free: envNumber("MIMI_FREE_MONTHLY_CREDITS", 0),
    trial: envNumber("MIMI_TRIAL_CREDITS", MIMI_PLAN_METADATA.trial.credits),
    initiation: envNumber("MIMI_INITIATION_MONTHLY_CREDITS", MIMI_PLAN_METADATA.initiation.credits),
    optioning: envNumber("MIMI_OPTIONING_MONTHLY_CREDITS", MIMI_PLAN_METADATA.optioning.credits),
    atelier: envNumber("MIMI_ATELIER_MONTHLY_CREDITS", MIMI_PLAN_METADATA.atelier.credits),
    lab: envNumber("MIMI_LAB_MONTHLY_CREDITS", MIMI_PLAN_METADATA.lab.credits),
    sovereign: envNumber("MIMI_SOVEREIGN_MONTHLY_CREDITS", MIMI_PLAN_METADATA.sovereign.credits),
  };

  const serverAiAccess = isPaidMimiPlan(plan);
  const labOrHigher = hasMimiPlanAccess(plan, "lab");
  return {
    plan,
    monthlyCredits: monthlyCreditsByPlan[plan],
    rolloverEligible: serverAiAccess,
    serverAiAccess,
    features: {
      cloudSync: serverAiAccess,
      affiliate: hasMimiPlanAccess(plan, "atelier"),
      layer4Prompts: labOrHigher,
      imageGeneration: serverAiAccess || plan === "trial",
      deepSearch: hasMimiPlanAccess(plan, "atelier"),
      keyringAccess: true,
      clientBilling: labOrHigher,
      commercialWorkflow: labOrHigher,
      priorityExports: labOrHigher,
      advancedControls: labOrHigher,
    },
  };
};

export const buildCreditGrant = ({
  plan,
  interval = "month",
  currentPeriodEnd,
  now = Date.now(),
}: {
  plan?: unknown;
  interval?: MimiBillingInterval | string;
  currentPeriodEnd?: number;
  now?: number;
}) => {
  const entitlement = entitlementForPlan(plan);
  const normalizedInterval: MimiBillingInterval = interval === "year" ? "year" : "month";
  const multiplier = normalizedInterval === "year" ? 12 : 1;
  const allowance = entitlement.monthlyCredits * multiplier;

  return {
    entitlement,
    credits: {
      allowance,
      remaining: allowance,
      used: 0,
      interval: normalizedInterval,
      periodStartedAt: now,
      periodEndsAt:
        currentPeriodEnd ||
        now + (normalizedInterval === "year" ? 365 : 30) * 24 * 60 * 60 * 1000,
      rolloverEligible: entitlement.rolloverEligible,
      lastGrantedAt: now,
    },
  };
};
