import React, { useState } from "react";
import { Check, Sparkles, Shield, Coins, ExternalLink, Link2, Loader2, ArrowRight } from "lucide-react";
import { useUser } from "../contexts/UserContext";
import { db } from "../services/firebase";
import { collection, addDoc, onSnapshot } from "firebase/firestore";
import { logFirestoreError, OperationType } from "../services/firebaseUtils";
import { BeforeAfterGrid } from "./BeforeAfterGrid";

// 1. MONETIZATION TIERS DEFINITION
export interface SubscriptionTier {
  id: string;
  priceId: string;
  name: string;
  price: number;
  interval: "month" | "year";
  tagline: string;
  features: string[];
  role: "free" | "pro" | "lab";
  ctaText: string;
  highlighted: boolean;
}

export const COMMERCE_TIERS: SubscriptionTier[] = [
  {
    id: "tier_free",
    priceId: "",
    name: "Sovereign Free",
    price: 0,
    interval: "month",
    tagline: "Uncompromised local-first archival workspace.",
    features: [
      "Access to Local Worktable, Stand, and Canvas",
      "3 AI-powered generations per day",
      "Sovereign Keychain BYOK support",
      "Offline local-first data storage",
    ],
    role: "free",
    ctaText: "Explore Workspace",
    highlighted: false,
  },
  {
    id: "tier_pro",
    priceId: "price_1Pro_Patron_18", // Replace with real Stripe Price ID
    name: "Patron Curator",
    price: 18,
    interval: "month",
    tagline: "Direct reader supported, unified cloud sync.",
    features: [
      "Unlimited AI generations & zine builds",
      "Full cloud-sync across unlimited devices",
      "High-Fidelity PDF and Markdown exporting",
      "Priority Oracle AI reasoning & fast queues",
      "Custom cover curation & aesthetic layout editing",
    ],
    role: "pro",
    ctaText: "Claim Patron Identity",
    highlighted: true,
  },
  {
    id: "tier_lab",
    priceId: "price_1Lab_Partner_49", // Replace with real Stripe Price ID
    name: "Aesthetics Lab",
    price: 49,
    interval: "month",
    tagline: "Deep psychographic research & sovereign commerce.",
    features: [
      "All Patron features included",
      "Layer 4 Prompts: Transformation Path & Taste Audit",
      "Anti-WGSN Macro Trend Curation System",
      "Mimi Sovereign Affiliate Network access",
      "Direct deep-linking: mimi.af/identifier",
      "Exclusive WhatsApp Curator roundtable channel",
    ],
    role: "lab",
    ctaText: "Enter Aesthetics Lab",
    highlighted: false,
  },
];

// 2. SUBSCRIPTION MATRIX COMPONENT
export const SubscriptionMatrix: React.FC = () => {
  const { user, profile } = useUser();
  const [loadingPriceId, setLoadingPriceId] = useState<string | null>(null);

  const handleCheckout = async (tier: SubscriptionTier) => {
    if (tier.role === "free") {
      window.dispatchEvent(new CustomEvent("mimi:change_view", { detail: "studio" }));
      return;
    }

    if (!user || user.isAnonymous) {
      window.dispatchEvent(new CustomEvent("mimi:registry_alert", { 
        detail: { message: "Please register your Sovereign identity first.", type: "error" } 
      }));
      window.dispatchEvent(new CustomEvent("mimi:change_view", { detail: "profile" }));
      return;
    }

    setLoadingPriceId(tier.priceId);

    try {
      if (!db) throw new Error("Firestore not initialized");

      // Write doc to Stripe extension's checkout_sessions collection
      const sessionsRef = collection(db, "customers", user.uid, "checkout_sessions");
      const docRef = await addDoc(sessionsRef, {
        price: tier.priceId,
        success_url: window.location.origin + "/checkout-success",
        cancel_url: window.location.href,
      });

      // Listen for session completion URL from Stripe extension
      const unsubscribe = onSnapshot(docRef, (snap) => {
        const data = snap.data();
        if (data && data.url) {
          unsubscribe();
          window.location.href = data.url; // Redirect directly to Stripe Checkout
        }
        if (data && data.error) {
          unsubscribe();
          setLoadingPriceId(null);
          console.error("Stripe Extension Error:", data.error);
        }
      }, (error) => {
        logFirestoreError(error, OperationType.GET, `customers/${user.uid}/checkout_sessions`);
        setLoadingPriceId(null);
      });
    } catch (err) {
      console.error("Checkout initiation failed:", err);
      setLoadingPriceId(null);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-12 flex flex-col items-center">
      <div className="text-center max-w-2xl mb-12 space-y-4">
        <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-stone-500 font-bold">
          Sovereign Financial Layers
        </span>
        <h2 className="font-serif italic text-4xl md:text-5xl tracking-tighter text-stone-900 dark:text-stone-100">
          The Membership Alliance
        </h2>
        <p className="font-sans text-xs text-stone-600 dark:text-stone-400 leading-relaxed text-balance">
          MimiZine rejects generic advertising. We monetize directly through reader patronage and high-utility sovereign tooling. Build uncompromised editorial worlds.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch w-full">
        {COMMERCE_TIERS.map((tier) => {
          const isActive = profile?.planStatus === tier.role;
          return (
            <div
              key={tier.id}
              className={`border p-8 relative flex flex-col justify-between transition-all duration-500 rounded-sm hover:shadow-2xl ${
                tier.highlighted
                  ? "bg-stone-50 dark:bg-stone-950 border-stone-900 dark:border-stone-100 scale-[1.02] md:translate-y-[-8px] z-10 shadow-lg"
                  : "bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800"
              }`}
            >
              {tier.highlighted && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-stone-900 dark:bg-stone-100 text-stone-100 dark:text-stone-900 font-mono text-[8px] uppercase tracking-widest py-1 px-4 border border-border shadow-sm flex items-center gap-1">
                  <Sparkles size={8} /> Highly Curated Choice
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <h3 className="font-serif italic text-2xl tracking-tight text-foreground">
                    {tier.name}
                  </h3>
                  <p className="font-sans text-[11px] text-muted-foreground mt-2 leading-relaxed h-8">
                    {tier.tagline}
                  </p>
                </div>

                <div className="flex items-baseline gap-1 py-4 border-y border-border">
                  <span className="font-serif text-4xl font-light text-foreground">
                    ${tier.price}
                  </span>
                  <span className="font-sans text-xs text-muted-foreground">
                    USD / {tier.interval === "month" ? "mo" : "yr"}
                  </span>
                </div>

                <div className="space-y-3.5 pt-4">
                  <p className="font-mono text-[8px] uppercase tracking-widest text-[#777] font-black">
                    Conferred Capabilities:
                  </p>
                  <ul className="space-y-3">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <Check size={12} className="text-stone-800 dark:text-stone-200 mt-0.5 shrink-0" />
                        <span className="font-sans text-xs text-muted-foreground leading-relaxed text-left">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pt-8 mt-auto w-full">
                <button
                  onClick={() => handleCheckout(tier)}
                  disabled={loadingPriceId !== null || isActive}
                  className={`w-full py-3.5 px-4 font-mono text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 border transition-all ${
                    isActive
                      ? "bg-transparent text-stone-400 border-stone-200 dark:border-stone-800 cursor-default"
                      : tier.highlighted
                      ? "bg-stone-900 text-stone-100 border-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:border-stone-100 dark:hover:bg-stone-200 hover:scale-[1.01]"
                      : "bg-transparent text-stone-900 hover:bg-stone-50 border-stone-900 dark:text-stone-100 dark:hover:bg-stone-950 dark:border-stone-100"
                  }`}
                >
                  {loadingPriceId === tier.priceId ? (
                    <>
                      <Loader2 size={12} className="animate-spin" /> Securing Pipeline...
                    </>
                  ) : isActive ? (
                    "Active Sovereign Tier"
                  ) : (
                    <>
                      {tier.ctaText} <ArrowRight size={11} />
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-24 mb-12">
        <div className="text-center mb-8">
          <h3 className="font-serif italic text-2xl tracking-tighter">The Aesthetics Lab Preview</h3>
          <p className="font-sans text-[10px] uppercase tracking-widest text-muted-foreground mt-2">Before & After Translations Capability (Unlocked in Sovereign Tiers)</p>
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

  const userRole = profile?.planStatus || "free";

  const hasAccessToFeature = (feature: "cloudSync" | "affiliate" | "layer4Prompts"): boolean => {
    if (userRole === "lab") {
      return true; // Lab tier gets absolute access to all layers
    }
    if (userRole === "pro") {
      return feature === "cloudSync" || feature === "affiliate" ? true : false;
    }
    return false; // Free tier gets none
  };

  const checkGenerationsQuota = (currentUsed: number): { canProceed: boolean; limit: number } => {
    const limit = userRole === "lab" ? 9999 : userRole === "pro" ? 9999 : 3;
    return {
      canProceed: currentUsed < limit,
      limit,
    };
  };

  return { userRole, hasAccessToFeature, checkGenerationsQuota };
};
