import React, { useState } from "react";
import { Check, Loader2, ArrowRight } from "lucide-react";
import { useUser } from "../contexts/UserContext";
import { createCheckoutSession } from "../services/stripe";
import { ManifestIdentityGate } from "./ManifestIdentityGate";
import { BeforeAfterGrid } from "./BeforeAfterGrid";
import {
  PLAN_MONTHLY_USD,
  PLAN_ANNUAL_USD,
  type BillingInterval,
  type PlanTier,
} from "../constants";

// 1. MONETIZATION TIERS DEFINITION
type CheckoutPlan = "core" | "optioning" | "pro" | "lab";

export interface SubscriptionTier {
  plan: CheckoutPlan;
  name: string;
  role: string;
  cta: string;
  features: string[];
  recommended?: boolean;
  dark?: boolean;
}

export const COMMERCE_TIERS: SubscriptionTier[] = [
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

const formatPrice = (plan: CheckoutPlan, interval: BillingInterval) => {
  if (interval === "year") {
    const perMonth = Math.round(PLAN_ANNUAL_USD[plan] / 12);
    return { big: `$${perMonth}`, small: "/mo", note: `$${PLAN_ANNUAL_USD[plan]} billed yearly` };
  }
  return { big: `$${PLAN_MONTHLY_USD[plan]}`, small: "/mo", note: "billed monthly" };
};

// 2. SUBSCRIPTION MATRIX COMPONENT
export const SubscriptionMatrix: React.FC = () => {
  const { profile } = useUser();
  const [interval, setInterval] = useState<BillingInterval>("year");
  const [loadingPlan, setLoadingPlan] = useState<CheckoutPlan | null>(null);

  const activePaidPlan: PlanTier | null =
    profile?.subscriptionStatus === "active" ? (profile?.planStatus as PlanTier) : null;

  const handleCheckout = async (plan: CheckoutPlan) => {
    setLoadingPlan(plan);
    try {
      await createCheckoutSession(plan, interval);
    } catch (error) {
      console.error("Checkout failed:", error);
      window.dispatchEvent(
        new CustomEvent("mimi:registry_alert", {
          detail: {
            message: error instanceof Error ? error.message : "Checkout unavailable.",
            type: "error",
          },
        }),
      );
      setLoadingPlan(null);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-12 flex flex-col items-center">
      {/* HEADER */}
      <div className="text-center max-w-2xl mb-8 space-y-4">
        <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-nous-subtle">
          Maison Mimi Patronage
        </span>
        <h2 className="font-serif italic text-4xl md:text-5xl tracking-tight text-nous-text text-balance">
          Choose your atelier.
        </h2>
        <p className="font-sans text-xs text-nous-subtle leading-relaxed text-balance">
          Mimi rejects generic advertising. We monetize directly through patronage and high-utility
          tooling — pick the membership that matches how far you want to take your taste.
        </p>
      </div>

      {/* BILLING TOGGLE */}
      <div className="mb-10 flex flex-col items-center gap-2">
        <div
          role="tablist"
          aria-label="Billing interval"
          className="inline-flex border border-nous-text/20 p-1 bg-nous-base/40"
        >
          <button
            role="tab"
            aria-selected={interval === "month"}
            onClick={() => setInterval("month")}
            className={`min-h-9 px-5 font-mono text-[10px] uppercase tracking-[0.2em] transition-colors ${
              interval === "month" ? "bg-nous-text text-nous-base" : "text-nous-subtle hover:text-nous-text"
            }`}
          >
            Monthly
          </button>
          <button
            role="tab"
            aria-selected={interval === "year"}
            onClick={() => setInterval("year")}
            className={`min-h-9 px-5 font-mono text-[10px] uppercase tracking-[0.2em] transition-colors flex items-center gap-2 ${
              interval === "year" ? "bg-nous-text text-nous-base" : "text-nous-subtle hover:text-nous-text"
            }`}
          >
            Annual
            <span className={`text-[9px] ${interval === "year" ? "text-nous-base" : "text-nous-text"}`}>
              2 months free
            </span>
          </button>
        </div>
      </div>

      {/* TIERS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-5 items-stretch w-full text-left">
        {COMMERCE_TIERS.map((tier) => {
          const price = formatPrice(tier.plan, interval);
          const isCurrent =
            activePaidPlan === tier.plan &&
            (!profile?.subscriptionInterval || profile.subscriptionInterval === interval);
          const loading = loadingPlan === tier.plan;
          return (
            <div
              key={tier.plan}
              className={`p-6 flex flex-col relative border transition-all ${
                tier.dark
                  ? "bg-nous-text text-nous-base border-nous-text"
                  : tier.recommended
                    ? "bg-nous-base border-nous-text border-2"
                    : "bg-nous-base/60 border-nous-text/20"
              }`}
            >
              {tier.recommended && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-nous-text text-nous-base text-[9px] font-mono uppercase tracking-[0.2em] px-3 py-1 whitespace-nowrap">
                  Most Chosen
                </div>
              )}
              <h3 className={`font-serif italic text-2xl ${tier.dark ? "text-nous-base" : "text-nous-text"}`}>
                {tier.name}
              </h3>
              <div
                className={`font-mono text-[10px] uppercase tracking-[0.2em] mb-4 ${
                  tier.dark ? "text-nous-base/60" : "text-nous-subtle"
                }`}
              >
                {tier.role}
              </div>
              <div className="mb-1 flex items-baseline gap-1">
                <span className="text-3xl font-light tracking-tight">{price.big}</span>
                <span className={`text-sm ${tier.dark ? "text-nous-base/60" : "text-nous-subtle"}`}>
                  {price.small}
                </span>
              </div>
              <div
                className={`text-[10px] font-mono uppercase tracking-[0.15em] mb-6 ${
                  tier.dark ? "text-nous-base/50" : "text-nous-subtle"
                }`}
              >
                {price.note}
              </div>
              <ul
                className={`space-y-3 mb-8 flex-1 text-sm leading-relaxed ${
                  tier.dark ? "text-nous-base/80" : "text-nous-subtle"
                }`}
              >
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check size={14} className="mt-1 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <ManifestIdentityGate>
                <button
                  onClick={() => handleCheckout(tier.plan)}
                  disabled={!!loadingPlan || isCurrent}
                  className={`w-full min-h-11 py-3 font-sans text-[10px] uppercase tracking-[0.2em] font-bold transition-colors flex justify-center items-center gap-2 border ${
                    isCurrent
                      ? "cursor-not-allowed opacity-50 border-current"
                      : tier.dark
                        ? "border-nous-base/40 hover:bg-nous-base hover:text-nous-text"
                        : tier.recommended
                          ? "bg-nous-text text-nous-base border-nous-text hover:opacity-90"
                          : "border-nous-text/30 hover:bg-nous-text hover:text-nous-base"
                  }`}
                >
                  {loading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : isCurrent ? (
                    "Current Plan"
                  ) : (
                    <>
                      {tier.cta} <ArrowRight size={11} />
                    </>
                  )}
                </button>
              </ManifestIdentityGate>
            </div>
          );
        })}
      </div>

      <div className="mt-24 mb-12">
        <div className="text-center mb-8">
          <h3 className="font-serif italic text-2xl tracking-tight text-nous-text">The Atelier Preview</h3>
          <p className="font-sans text-[10px] uppercase tracking-widest text-nous-subtle mt-2">
            Before &amp; After Translations Capability (Unlocked in Paid Tiers)
          </p>
        </div>
        <BeforeAfterGrid />
      </div>
    </div>
  );
};

// 3. AFFILIATE DEEP-LINK PARSER UTILITY
export interface PartnerBrand {
  domain: string;
  name: string;
  commissionRate: number;
}

const BRAND_PARTNERS: PartnerBrand[] = [
  { domain: "ssense.com", name: "SSENSE", commissionRate: 0.12 },
  { domain: "farfetch.com", name: "Farfetch", commissionRate: 0.10 },
  { domain: "net-a-porter.com", name: "Net-A-Porter", commissionRate: 0.10 },
  { domain: "grailed.com", name: "Grailed Archive", commissionRate: 0.08 },
  { domain: "facebook.com/marketplace", name: "Marketplace Specimen", commissionRate: 0.05 },
];

export const parseSovereignAffiliateLink = (
  rawUrl: string,
  curatorUid: string,
  itemId: string
): { isMatched: boolean; finalUrl: string; partnerName?: string } => {
  try {
    const urlObj = new URL(rawUrl);
    const host = urlObj.hostname.toLowerCase().replace("www.", "");
    const fullPath = (urlObj.hostname + urlObj.pathname).toLowerCase();

    // Match against partner brands
    const matchedPartner = BRAND_PARTNERS.find((partner) => {
      if (partner.domain.includes("/")) {
        return fullPath.includes(partner.domain);
      }
      return host.endsWith(partner.domain);
    });

    if (!matchedPartner) {
      return { isMatched: false, finalUrl: rawUrl };
    }

    // Wrap in sovereign, high-conversion direct redirection tracking
    const trackingRedirectUrl = `https://mimi.af/track?curator=${encodeURIComponent(
      curatorUid
    )}&item=${encodeURIComponent(itemId)}&dest=${encodeURIComponent(rawUrl)}`;

    return {
      isMatched: true,
      finalUrl: trackingRedirectUrl,
      partnerName: matchedPartner.name,
    };
  } catch {
    return { isMatched: false, finalUrl: rawUrl };
  }
};

// 4. CLIENT-SIDE PREMIUM GATING RULES CHECKER
export const useSovereignGate = () => {
  const { profile } = useUser();

  const userRole: string = profile?.planStatus || "free";

  const hasAccessToFeature = (feature: "cloudSync" | "affiliate" | "layer4Prompts"): boolean => {
    if (userRole === "lab" || userRole === "pro") {
      return true; // Top tiers get access to all layers
    }
    if (userRole === "optioning") {
      return feature === "cloudSync" || feature === "affiliate";
    }
    return false; // Free / Initiation get none of the sovereign layers
  };

  const checkGenerationsQuota = (currentUsed: number): { canProceed: boolean; limit: number } => {
    const limit =
      userRole === "lab"
        ? 10000
        : userRole === "pro"
          ? 3000
          : userRole === "optioning"
            ? 1500
            : userRole === "core"
              ? 500
              : 3;
    return {
      canProceed: currentUsed < limit,
      limit,
    };
  };

  return { userRole, hasAccessToFeature, checkGenerationsQuota };
};
