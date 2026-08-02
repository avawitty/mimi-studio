import React, { useState } from "react";
import { Check, Crown, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { useUser } from "../contexts/UserContext";
import { createCheckoutSession, openBillingPortal } from "../services/stripe";
import { ManifestIdentityGate } from "./ManifestIdentityGate";
import type { BillingInterval } from "../constants";
import {
  PATRONAGE_TIERS,
  formatPatronagePrice,
  resolveActiveCheckoutPlan,
  type PatronageCheckoutPlan,
} from "../lib/patronageTiers";

// 1. SUBSCRIPTION MATRIX — Maison Mimi Patronage
export const SubscriptionMatrix: React.FC = () => {
  const { user, profile } = useUser();
  const [interval, setInterval] = useState<BillingInterval>("month");
  const [loadingPlan, setLoadingPlan] = useState<PatronageCheckoutPlan | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activePaidPlan = resolveActiveCheckoutPlan(profile);
  const hasActiveSubscription = !!activePaidPlan;

  const handleSubscribe = async (plan: PatronageCheckoutPlan) => {
    if (!user || user.isAnonymous) {
      window.dispatchEvent(
        new CustomEvent("mimi:registry_alert", {
          detail: { message: "Sign in to choose your atelier.", type: "error" },
        }),
      );
      window.dispatchEvent(new CustomEvent("mimi:change_view", { detail: "profile" }));
      return;
    }

    setError(null);
    setLoadingPlan(plan);
    try {
      await createCheckoutSession(plan, interval);
    } catch (err) {
      console.error("Checkout initiation failed:", err);
      setError(err instanceof Error ? err.message : "Checkout failed");
      setLoadingPlan(null);
    }
  };

  const handleManageBilling = async () => {
    setError(null);
    setPortalLoading(true);
    try {
      await openBillingPortal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open billing portal");
      setPortalLoading(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-12 flex flex-col items-center text-nous-text">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="text-center max-w-2xl mb-10 space-y-4"
      >
        <div className="flex justify-center text-nous-text/80">
          <Crown size={28} strokeWidth={1} />
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-nous-subtle block">
          Maison Mimi Patronage
        </span>
        <h2 className="font-serif italic text-4xl md:text-5xl tracking-tight text-balance leading-none">
          Choose your atelier.
        </h2>
      </motion.div>

      <div
        role="tablist"
        aria-label="Billing interval"
        className="inline-flex border border-nous-text/20 p-1 bg-nous-base/40 mb-10"
      >
        <button
          role="tab"
          aria-selected={interval === "month"}
          onClick={() => setInterval("month")}
          className={`min-h-9 px-4 font-mono text-[10px] uppercase tracking-[0.2em] transition-colors ${
            interval === "month"
              ? "bg-nous-text text-nous-base"
              : "text-nous-subtle hover:text-nous-text"
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
              ? "bg-nous-text text-nous-base"
              : "text-nous-subtle hover:text-nous-text"
          }`}
        >
          Annual
          <span className={`text-[9px] ${interval === "year" ? "text-nous-base" : "text-nous-text"}`}>
            2 months free
          </span>
        </button>
      </div>

      {error && (
        <p className="mb-6 font-sans text-xs text-red-600 text-center max-w-md" role="alert">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-5 w-full text-left">
        {PATRONAGE_TIERS.map((tier, index) => {
          const price = formatPatronagePrice(tier.plan, interval);
          const isCurrent =
            activePaidPlan === tier.plan &&
            (!profile?.subscriptionInterval || profile.subscriptionInterval === interval);
          const loading = loadingPlan === tier.plan;

          return (
            <motion.div
              key={tier.plan}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05 * index }}
              className={`p-6 flex flex-col relative border ${
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

              <h3
                className={`font-serif italic text-2xl ${tier.dark ? "text-nous-base" : "text-nous-text"}`}
              >
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
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check size={14} className="mt-1 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <ManifestIdentityGate>
                <button
                  onClick={() => handleSubscribe(tier.plan)}
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
                  ) : hasActiveSubscription ? (
                    "Change plan"
                  ) : (
                    tier.cta
                  )}
                </button>
              </ManifestIdentityGate>
            </motion.div>
          );
        })}
      </div>

      {hasActiveSubscription && (
        <div className="mt-12 text-center">
          <button
            onClick={handleManageBilling}
            disabled={portalLoading}
            className="min-h-11 px-6 py-3 border border-nous-text/20 font-mono text-[10px] uppercase tracking-[0.2em] text-nous-subtle hover:text-nous-text hover:border-nous-text/40 transition-colors inline-flex items-center gap-2 disabled:opacity-60"
          >
            {portalLoading ? <Loader2 size={12} className="animate-spin" /> : null}
            Manage billing
          </button>
        </div>
      )}
    </div>
  );
};

// 2. AFFILIATE DEEP-LINK PARSER UTILITY
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

// 3. CLIENT-SIDE PREMIUM GATING RULES CHECKER
export const useSovereignGate = () => {
  const { profile } = useUser();

  const userRole = profile?.planStatus || "free";

  const hasAccessToFeature = (feature: "cloudSync" | "affiliate" | "layer4Prompts"): boolean => {
    if (userRole === "lab") {
      return true;
    }
    if (userRole === "pro" || userRole === "optioning") {
      return feature === "cloudSync" || feature === "affiliate";
    }
    return false;
  };

  const checkGenerationsQuota = (currentUsed: number): { canProceed: boolean; limit: number } => {
    const limit = userRole === "lab" || userRole === "pro" || userRole === "optioning" || userRole === "core" ? 9999 : 3;
    return {
      canProceed: currentUsed < limit,
      limit,
    };
  };

  return { userRole, hasAccessToFeature, checkGenerationsQuota };
};
