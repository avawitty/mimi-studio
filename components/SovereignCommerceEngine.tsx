import React, { useState } from "react";
import { Check, Sparkles, Loader2, Crown } from "lucide-react";
import { useUser } from "../contexts/UserContext";
import { createCheckoutSession } from "../services/stripe";
import { ManifestIdentityGate } from "./ManifestIdentityGate";
import { BeforeAfterGrid } from "./BeforeAfterGrid";
import {
  PLAN_MONTHLY_USD,
  PLAN_ANNUAL_USD,
  hasAccess,
  type BillingInterval,
  type PlanTier,
} from "../constants";

// 1. MONETIZATION TIERS DEFINITION
type CheckoutPlan = "core" | "optioning" | "pro" | "lab";

export interface SubscriptionTier {
  plan: CheckoutPlan;
  name: string;
  role: string;
  tagline: string;
  features: string[];
  ctaText: string;
  recommended?: boolean;
  dark?: boolean;
}

export const COMMERCE_TIERS: SubscriptionTier[] = [
  {
    plan: "core",
    name: "The Initiation",
    role: "Interpreter",
    tagline: "Begin decoding your aesthetic signal.",
    ctaText: "Understand Your Taste",
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
    tagline: "Shape and direct your visual language.",
    ctaText: "Tailor Your Taste",
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
    tagline: "Apply taste across brand and strategy.",
    ctaText: "Apply Your Taste",
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
    tagline: "Shape the system itself.",
    ctaText: "Shape The System",
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
  const { user, profile } = useUser();
  const [interval, setInterval] = useState<BillingInterval>("year");
  const [loadingPlan, setLoadingPlan] = useState<CheckoutPlan | null>(null);

  const activePaidPlan: PlanTier | null =
    profile?.subscriptionStatus === "active" ? (profile?.planStatus as PlanTier) : null;

  const handleSubscribe = async (plan: CheckoutPlan) => {
    if (!user) return;
    setLoadingPlan(plan);
    try {
      await createCheckoutSession(plan, interval);
    } catch (error) {
      console.error("Checkout failed:", error);
      window.dispatchEvent(
        new CustomEvent("mimi:registry_alert", {
          detail: {
            message: error instanceof Error ? error.message : "Checkout failed",
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
        <div className="flex justify-center text-foreground opacity-80">
          <Crown size={26} strokeWidth={1} />
        </div>
        <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground font-bold">
          Maison Mimi Patronage
        </span>
        <h2 className="font-serif italic text-4xl md:text-5xl tracking-tighter text-foreground text-balance">
          Choose your atelier.
        </h2>
        <p className="font-sans text-xs text-muted-foreground leading-relaxed text-balance">
          Every membership unlocks generation credits, persistent archives, and deeper aesthetic
          tooling. Move from interpreting your taste to shaping the system itself.
        </p>
      </div>

      {/* BILLING TOGGLE */}
      <div className="mb-12 flex flex-col items-center gap-2">
        <div
          role="tablist"
          aria-label="Billing interval"
          className="inline-flex border border-border p-1 bg-muted/40"
        >
          <button
            role="tab"
            aria-selected={interval === "month"}
            onClick={() => setInterval("month")}
            className={`min-h-9 px-4 font-mono text-[10px] uppercase tracking-[0.2em] transition-colors ${
              interval === "month"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Monthly
          </button>
          <button
            role="tab"
            aria-selected={interval === "year"}
            onClick={() => setInterval("year")}
            className={`min-h-9 px-4 font-mono text-[10px] uppercase tracking-[0.2em] transition-colors flex items-center gap-2 ${
              interval === "year"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Annual
            <span className={`text-[9px] ${interval === "year" ? "text-background" : "text-foreground"}`}>
              2 months free
            </span>
          </button>
        </div>
      </div>

      {/* TIERS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 items-stretch w-full">
        {COMMERCE_TIERS.map((tier) => {
          const price = formatPrice(tier.plan, interval);
          const isCurrent =
            activePaidPlan === tier.plan &&
            (!profile?.subscriptionInterval || profile.subscriptionInterval === interval);
          const loading = loadingPlan === tier.plan;
          return (
            <div
              key={tier.plan}
              className={`border p-6 relative flex flex-col transition-all duration-500 rounded-sm ${
                tier.dark
                  ? "bg-foreground text-background border-foreground"
                  : tier.recommended
                    ? "bg-background border-foreground border-2 z-10 shadow-lg"
                    : "bg-background border-border"
              }`}
            >
              {tier.recommended && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-foreground text-background font-mono text-[8px] uppercase tracking-widest py-1 px-3 flex items-center gap-1 whitespace-nowrap">
                  <Sparkles size={8} /> Most Chosen
                </div>
              )}

              <h3 className={`font-serif italic text-2xl tracking-tight ${tier.dark ? "text-background" : "text-foreground"}`}>
                {tier.name}
              </h3>
              <div className={`font-mono text-[10px] uppercase tracking-[0.2em] mb-4 ${tier.dark ? "text-background/60" : "text-muted-foreground"}`}>
                {tier.role}
              </div>

              <div className="mb-1 flex items-baseline gap-1">
                <span className="font-serif text-4xl font-light tracking-tight">{price.big}</span>
                <span className={`text-sm ${tier.dark ? "text-background/60" : "text-muted-foreground"}`}>
                  {price.small}
                </span>
              </div>
              <div className={`text-[10px] font-mono uppercase tracking-[0.15em] mb-6 ${tier.dark ? "text-background/50" : "text-muted-foreground"}`}>
                {price.note}
              </div>

              <ul className={`space-y-3 mb-8 flex-1 text-sm leading-relaxed ${tier.dark ? "text-background/80" : "text-muted-foreground"}`}>
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check size={14} className="mt-1 shrink-0" /> {feature}
                  </li>
                ))}
              </ul>

              <ManifestIdentityGate>
                <button
                  onClick={() => handleSubscribe(tier.plan)}
                  disabled={loadingPlan !== null || isCurrent}
                  className={`w-full min-h-11 py-3 font-sans text-[10px] uppercase tracking-[0.2em] font-bold transition-colors flex justify-center items-center gap-2 border ${
                    isCurrent
                      ? "cursor-not-allowed opacity-50 border-current"
                      : tier.dark
                        ? "border-background/40 hover:bg-background hover:text-foreground"
                        : tier.recommended
                          ? "bg-foreground text-background border-foreground hover:opacity-90"
                          : "border-foreground/30 hover:bg-foreground hover:text-background"
                  }`}
                >
                  {loading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : isCurrent ? (
                    "Current Plan"
                  ) : (
                    tier.ctaText
                  )}
                </button>
              </ManifestIdentityGate>
            </div>
          );
        })}
      </div>

      {/* AESTHETICS LAB PREVIEW */}
      <div className="mt-24 mb-12">
        <div className="text-center mb-8">
          <h3 className="font-serif italic text-2xl tracking-tighter">The Aesthetics Lab Preview</h3>
          <p className="font-sans text-[10px] uppercase tracking-widest text-muted-foreground mt-2">
            Before &amp; After Translations Capability (Unlocked in paid tiers)
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
  { domain: "farfetch.com", name: "Farfetch", commissionRate: 0.1 },
  { domain: "net-a-porter.com", name: "Net-A-Porter", commissionRate: 0.1 },
  { domain: "grailed.com", name: "Grailed Archive", commissionRate: 0.08 },
  { domain: "facebook.com/marketplace", name: "Marketplace Specimen", commissionRate: 0.05 },
];

export const parseSovereignAffiliateLink = (
  rawUrl: string,
  curatorUid: string,
  itemId: string,
): { isMatched: boolean; finalUrl: string; partnerName?: string } => {
  try {
    const urlObj = new URL(rawUrl);
    const host = urlObj.hostname.toLowerCase().replace("www.", "");
    const fullPath = (urlObj.hostname + urlObj.pathname).toLowerCase();

    const matchedPartner = BRAND_PARTNERS.find((partner) => {
      if (partner.domain.includes("/")) {
        return fullPath.includes(partner.domain);
      }
      return host.endsWith(partner.domain);
    });

    if (!matchedPartner) {
      return { isMatched: false, finalUrl: rawUrl };
    }

    const trackingRedirectUrl = `https://mimi.af/track?curator=${encodeURIComponent(
      curatorUid,
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

  const hasAccessToFeature = (
    feature: "cloudSync" | "affiliate" | "layer4Prompts",
  ): boolean => {
    switch (feature) {
      case "cloudSync":
        return hasAccess(userRole, "core");
      case "affiliate":
        return hasAccess(userRole, "pro");
      case "layer4Prompts":
        return hasAccess(userRole, "lab");
      default:
        return false;
    }
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
