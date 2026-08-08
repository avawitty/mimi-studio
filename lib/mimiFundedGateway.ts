import { createRequire } from "module";
import { getServerAiGatewayKey } from "./aiGatewayCompat.js";
import { extractMimiSessionToken } from "./mimiSessionToken.js";
import {
  buildCreditGrant,
  entitlementForPlan,
  isPaidMimiPlan,
  normalizeMimiPlan,
  type MimiBillingInterval,
} from "./mimiEntitlements.js";
import { proxyToFunctions } from "./proxyToFunctions.js";
import {
  collectStripeCustomerIdCandidates,
  verifyStripeCustomerEntitlement,
} from "./verifyStripeEntitlement.js";

/**
 * Stripe-verified paid entitlement. Candidate cus_* ids may come from
 * user/profile/billing docs, but only Stripe confirmation grants trust.
 */
export async function resolveTrustedPaidBilling(opts: {
  uid: string;
  email?: string | null;
  sources: Array<Record<string, unknown> | null | undefined>;
}): Promise<boolean> {
  const candidates = collectStripeCustomerIdCandidates(...opts.sources);
  for (const customerId of candidates) {
    if (
      await verifyStripeCustomerEntitlement({
        customerId,
        uid: opts.uid,
        email: opts.email,
      })
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Period rollover: an existing grant with allowance whose period has ended.
 * Safe to rewrite — the user already had a server-issued grant.
 */
export function needsMembershipPeriodReload(
  grant: { remaining?: unknown; allowance?: unknown; periodEndsAt?: unknown } | null | undefined,
  now = Date.now(),
): boolean {
  if (grant == null || typeof grant !== "object") return false;
  const allowance = Number(grant.allowance);
  const hasAllowance = Number.isFinite(allowance) && allowance > 0;
  if (!hasAllowance) return false;
  const periodEndsAt = Number(grant.periodEndsAt ?? 0);
  return Number.isFinite(periodEndsAt) && periodEndsAt > 0 && periodEndsAt < now;
}

/**
 * Missing/malformed grant — only heal when a trusted billing signal exists.
 * Never mint paid credits from client-writable plan fields alone.
 * `remaining: 0` without a positive allowance is malformed (not "spent").
 */
export function needsMembershipCreditMint(
  grant: { remaining?: unknown; allowance?: unknown; periodEndsAt?: unknown } | null | undefined,
): boolean {
  if (grant == null || typeof grant !== "object") return true;
  const allowance = Number(grant.allowance);
  const hasAllowance = Number.isFinite(allowance) && allowance > 0;
  return !hasAllowance;
}

/** @deprecated Use needsMembershipPeriodReload / needsMembershipCreditMint. */
export function needsMembershipCreditHeal(
  grant: { remaining?: unknown; allowance?: unknown; periodEndsAt?: unknown } | null | undefined,
  now = Date.now(),
): boolean {
  return needsMembershipCreditMint(grant) || needsMembershipPeriodReload(grant, now);
}

export function isPaidSubscriptionActive(subscriptionStatus: unknown): boolean {
  const status = String(subscriptionStatus || "active").trim().toLowerCase();
  return status !== "inactive" && status !== "canceled" && status !== "cancelled";
}

/**
 * Synchronous shape check only — NEVER use this alone to mint/reload credits.
 * Firestore user/profile/billing docs are owner-writable; cus_* can be forged.
 * Call `resolveTrustedPaidBilling` (Stripe-verified) before healing.
 */
export function hasTrustedPaidBillingSignal(data: Record<string, unknown>): boolean {
  return String(data.stripeCustomerId || "").trim().startsWith("cus_");
}

/** Admin / promo-granted patron seat — only server routes may write these fields. */
export function hasAdminGrantedPatronSeat(data: Record<string, unknown>): boolean {
  return data.isPatron === true && Number(data.patronActivatedAt ?? 0) > 0;
}

async function resolveTrustedBillingForHeal(opts: {
  uid: string;
  email?: string | null;
  sources: Array<Record<string, unknown> | null | undefined>;
  userData: Record<string, unknown>;
}): Promise<boolean> {
  if (hasAdminGrantedPatronSeat(opts.userData)) return true;
  return resolveTrustedPaidBilling({
    uid: opts.uid,
    email: opts.email,
    sources: opts.sources,
  });
}

function trialDayPassBaseline(plan: string, planStatus: unknown): number {
  if (plan === "free" || planStatus === "ghost") return 4;
  return 12;
}

function isTrialDayPassTier(plan: string, planStatus: unknown, grantedBaseline: number): boolean {
  if (plan === "free" || planStatus === "ghost") return true;
  // Assessment / paid trial pools are not reset to the day-pass drip.
  return plan === "trial" && grantedBaseline <= 12;
}

/** Roll an expired grant forward without re-deriving allowance from client plan. */
export function rollForwardMembershipGrant(
  grant: { allowance?: unknown; interval?: unknown } | null | undefined,
  interval: MimiBillingInterval = "month",
  now = Date.now(),
) {
  const normalizedInterval: MimiBillingInterval = interval === "year" ? "year" : "month";
  const allowance = Number(grant?.allowance ?? 0);
  const periodMs = (normalizedInterval === "year" ? 365 : 30) * 24 * 60 * 60 * 1000;
  return {
    allowance,
    remaining: allowance,
    used: 0,
    interval: normalizedInterval,
    periodStartedAt: now,
    periodEndsAt: now + periodMs,
    lastGrantedAt: now,
  };
}

const require = createRequire(
  typeof __filename === "string" ? __filename : import.meta.url,
);

async function loadAdmin(): Promise<{ auth: any | null; db: any | null }> {
  try {
    const { getServerFirebaseAdmin } = await import("./serverFirebaseAdmin.js");
    return getServerFirebaseAdmin();
  } catch (err) {
    console.warn("MIMI // serverFirebaseAdmin unavailable:", err);
    return { auth: null, db: null };
  }
}

export type FundedGatewayAccess = {
  allowed: boolean;
  billable: boolean;
  uid?: string;
  cost: number;
};

type FieldValueLike = {
  increment: (n: number) => unknown;
};

function getFieldValue(): FieldValueLike | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { FieldValue } = require("firebase-admin/firestore") as typeof import("firebase-admin/firestore");
    return FieldValue;
  } catch (err) {
    console.warn("MIMI // FieldValue unavailable:", err);
    return null;
  }
}

export const fundedGatewayCreditCost = (taskCost?: number) => {
  // Preserve explicit zero (free_internal tasks like embedding indexing).
  if (taskCost === 0) return 0;
  const value = Number(taskCost ?? process.env.MIMI_TEXT_CREDIT_COST ?? 1);
  return Number.isFinite(value) && value > 0 ? value : 1;
};

async function resolveAccessViaFunctions(
  token: string,
  cost: number,
): Promise<FundedGatewayAccess | null> {
  try {
    const proxied = await proxyToFunctions("/api/funded-gateway/access", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ cost }),
    });

    let payload: any = {};
    try {
      payload = JSON.parse(proxied.text);
    } catch {
      payload = {};
    }

    if (!proxied.status.toString().startsWith("2")) {
      return { allowed: false, billable: false, uid: payload.uid, cost };
    }

    return {
      allowed: payload.allowed === true,
      billable: payload.billable === true,
      uid: payload.uid,
      cost: Number(payload.cost || cost),
    };
  } catch (err) {
    console.warn("MIMI // funded-gateway access proxy failed:", err);
    return null;
  }
}

/**
 * Soft-allow a signed-in user when credit infrastructure is down so AI
 * generation is not hard-blocked. Not billable (metering skipped).
 */
function softAllow(uid: string | undefined, cost: number): FundedGatewayAccess {
  console.warn("MIMI // Credit infrastructure unavailable; allowing unmetered gateway access");
  return { allowed: true, billable: false, uid: uid || "unmetered", cost };
}

export const resolveMimiFundedGatewayAccess = async (
  req: { headers?: Record<string, unknown> },
  cost = fundedGatewayCreditCost(),
): Promise<FundedGatewayAccess> => {
  const token = extractMimiSessionToken(req.headers || {});
  if (!token) return { allowed: false, billable: false, cost };

  try {
    const { auth, db } = await loadAdmin();
    if (!auth || !db) {
      const proxied = await resolveAccessViaFunctions(token, cost);
      if (proxied) return proxied;

      // Admin + Functions credit paths unavailable. If Auth still works, verify
      // the session before soft-allowing; otherwise soft-allow only when a
      // Firebase JWT is present (same trust bar as the Functions proxy).
      if (auth) {
        try {
          const decoded = await auth.verifyIdToken(token);
          return softAllow(decoded.uid, cost);
        } catch {
          return { allowed: false, billable: false, cost };
        }
      }
      return { allowed: false, billable: false, cost };
    }

    let decoded: { uid: string; email?: string };
    try {
      decoded = await auth.verifyIdToken(token);
    } catch {
      return { allowed: false, billable: false, cost };
    }

    const adminUids = String(process.env.MIMI_ADMIN_UIDS || process.env.MIMI_ADMIN_UID || "")
      .split(",")
      .map((uid) => uid.trim())
      .filter(Boolean);
    if (adminUids.includes(decoded.uid)) {
      return { allowed: true, billable: false, uid: decoded.uid, cost };
    }

    try {
      const userRef = db.collection("users").doc(decoded.uid);
      const profileRef = db.collection("profiles_public").doc(decoded.uid);
      const [userDoc, profileDoc] = await Promise.all([userRef.get(), profileRef.get()]);
      const data = { ...(profileDoc.data() || {}), ...(userDoc.data() || {}) };

      const plan = normalizeMimiPlan(
        data.plan || data.planStatus || data.mimiPlan || data.membershipPlan,
      );
      const isPaid = isPaidMimiPlan(plan);
      let remaining = 0;

      if (isPaid) {
        // Missing subscriptionStatus is common for patron-activated / manually
        // granted lab seats — treat as active unless explicitly canceled.
        const active = isPaidSubscriptionActive(data.subscriptionStatus);
        if (!active) {
          return { allowed: false, billable: false, uid: decoded.uid, cost };
        }

        // Stripe customer id often lives on billing/subscription, not the user root.
        let billingData: Record<string, unknown> = {};
        try {
          const billingSnap = await userRef.collection("billing").doc("subscription").get();
          billingData = (billingSnap.data() || {}) as Record<string, unknown>;
        } catch (err) {
          console.warn("MIMI // billing/subscription read failed during credit heal:", err);
        }

        // Never trust top-level `subscription.credits` — owners can forge that
        // object. Only Admin-written membershipCredits + billing/** credits.
        let grant = data.membershipCredits || billingData.credits;
        const shouldReloadPeriod = needsMembershipPeriodReload(grant);
        const needsMint = needsMembershipCreditMint(grant);
        // Only hit Stripe when a heal would actually run.
        const trustedBilling =
          shouldReloadPeriod || needsMint
            ? await resolveTrustedBillingForHeal({
                uid: decoded.uid,
                email: decoded.email,
                sources: [billingData, data as Record<string, unknown>],
                userData: data as Record<string, unknown>,
              })
            : false;
        const shouldMintMissing = needsMint && trustedBilling;

        if ((shouldReloadPeriod && trustedBilling) || shouldMintMissing) {
          const interval = (data.subscriptionInterval || "month") as MimiBillingInterval;
          const existingPeriodEnd = Number(grant?.periodEndsAt ?? 0);
          // Period reload preserves stored allowance; mint derives from plan.
          const credits = shouldReloadPeriod
            ? rollForwardMembershipGrant(grant, interval)
            : buildCreditGrant({
                plan,
                interval,
                // Preserve a still-valid period window when minting a partial grant.
                currentPeriodEnd:
                  existingPeriodEnd > Date.now() ? existingPeriodEnd : undefined,
              }).credits;
          const healPatch = {
            membershipCredits: credits,
            subscriptionStatus: data.subscriptionStatus || "active",
            mimiPlan: plan,
          };
          await Promise.all([
            userRef.set(healPatch, { merge: true }),
            profileRef.set(healPatch, { merge: true }),
          ]);
          grant = credits;
          console.info("MIMI // Healed membership credits for funded gateway", {
            uid: decoded.uid,
            plan,
            remaining: credits.remaining,
            reason: shouldReloadPeriod ? "period_reload" : "trusted_mint",
          });
        }
        // Expired period without Stripe verify: do not refill, but still allow
        // spending any leftover remaining credits below.

        remaining = Number(grant?.remaining ?? 0);
        if (!Number.isFinite(remaining) || remaining < cost) {
          return { allowed: false, billable: false, uid: decoded.uid, cost };
        }
      } else {
        const trial = (data.trial || {}) as Record<string, unknown>;
        let trialCredits = Number(trial.remainingCredits ?? 0);
        const lastReload = Number(trial.lastReloadedAt ?? 0);
        const grantedBaseline = Number(trial.grantedCredits ?? 0);
        const now = Date.now();
        const baseline = trialDayPassBaseline(plan, data.planStatus);

        // First-time assessment grant for signed-in trial users missing a pool.
        if (
          plan === "trial" &&
          grantedBaseline <= 0 &&
          trialCredits <= 0 &&
          data.planStatus !== "ghost"
        ) {
          const assessmentCredits = entitlementForPlan("trial").monthlyCredits;
          trialCredits = assessmentCredits;
          const initialTrial = {
            ...trial,
            grantedCredits: assessmentCredits,
            remainingCredits: assessmentCredits,
            usedCredits: Number(trial.usedCredits ?? 0),
            lastReloadedAt: now,
            startedAt: Number(trial.startedAt ?? now),
            endsAt: Number(trial.endsAt ?? now + 7 * 24 * 60 * 60 * 1000),
          };
          await Promise.all([
            userRef.set({ trial: initialTrial }, { merge: true }),
            profileRef.set({ trial: initialTrial }, { merge: true }),
          ]);
        } else if (
          isTrialDayPassTier(plan, data.planStatus, grantedBaseline) &&
          now - lastReload > 24 * 60 * 60 * 1000
        ) {
          trialCredits = baseline;
          const reloadUpdate = {
            "trial.remainingCredits": baseline,
            "trial.lastReloadedAt": now,
            ...(grantedBaseline <= 0 ? { "trial.grantedCredits": baseline } : {}),
          };
          await Promise.all([
            userRef.set(reloadUpdate, { merge: true }),
            profileRef.set(reloadUpdate, { merge: true }),
          ]);
        }

        remaining = trialCredits;
        if (remaining < cost) {
          return { allowed: false, billable: false, uid: decoded.uid, cost };
        }
      }

      return { allowed: true, billable: true, uid: decoded.uid, cost };
    } catch (err) {
      // JWT already verified — soft-allow this uid when credit docs are unreachable.
      console.warn("MIMI // Credit lookup failed; soft-allowing verified user:", err);
      return softAllow(decoded.uid, cost);
    }
  } catch (err) {
    // Never soft-allow without a verified session — deny on unexpected failures.
    console.warn("MIMI // resolveMimiFundedGatewayAccess failed; denying:", err);
    return { allowed: false, billable: false, cost };
  }
};

export const chargeMimiFundedGateway = async (
  access: FundedGatewayAccess,
  meta: { model?: string; usage?: unknown; feature?: string },
) => {
  if (!access.billable || !access.uid || !(access.cost > 0)) return;

  try {
    const { db } = await loadAdmin();
    if (!db) {
      await proxyToFunctions("/api/funded-gateway/charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access, meta }),
      });
      return;
    }

    const FieldValue = getFieldValue();
    if (!FieldValue) {
      console.warn("MIMI // Skipping credit charge; FieldValue unavailable");
      return;
    }

    const userRef = db.collection("users").doc(access.uid);
    const profileRef = db.collection("profiles_public").doc(access.uid);
    const userDoc = await userRef.get();
    const userData = userDoc.data() || {};
    const plan = normalizeMimiPlan(
      userData.plan || userData.planStatus || userData.mimiPlan || userData.membershipPlan,
    );
    const isPaid = isPaidMimiPlan(plan);

    const creditUpdate: Record<string, unknown> = isPaid
      ? {
          "membershipCredits.remaining": FieldValue.increment(-access.cost),
          "membershipCredits.used": FieldValue.increment(access.cost),
          generationCount: FieldValue.increment(1),
          lastGenerationAt: Date.now(),
        }
      : {
          "trial.remainingCredits": FieldValue.increment(-access.cost),
          "trial.usedCredits": FieldValue.increment(access.cost),
          generationCount: FieldValue.increment(1),
          lastGenerationAt: Date.now(),
        };

    const promises: Promise<unknown>[] = [
      userRef.set(creditUpdate, { merge: true }),
      profileRef.set(creditUpdate, { merge: true }),
    ];

    if (isPaid) {
      promises.push(
        userRef.collection("billing").doc("subscription").set(
          {
            "credits.remaining": FieldValue.increment(-access.cost),
            "credits.used": FieldValue.increment(access.cost),
          },
          { merge: true },
        ),
      );
    }

    promises.push(
      db.collection("mimi_usage_events").add({
        userId: access.uid,
        feature: meta.feature || "ai-gateway:text",
        provider: "vercel-ai-gateway",
        model: meta.model,
        creditsCharged: access.cost,
        usage: meta.usage || null,
        createdAt: Date.now(),
      }),
    );

    await Promise.all(promises);
  } catch (err) {
    // Never fail the generation response because metering failed.
    console.warn("MIMI // chargeMimiFundedGateway failed:", err);
  }
};

export const resolveFundedGatewayApiKey = async (
  req: { headers?: Record<string, unknown> },
  cost?: number,
): Promise<{
  apiKey: string;
  access: FundedGatewayAccess | null;
  denialReason?:
    | "missing_personal_or_funded_key"
    | "sign_in_required"
    | "credits_exhausted"
    | "server_gateway_unconfigured"
    | "access_denied";
}> => {
  // Personal AI Gateway BYOK — only accept keys that look like gateway tokens,
  // never treat a Firebase session JWT (ey...) as a provider key.
  const authHeader = String(req.headers?.authorization || "").trim();
  const bearer = authHeader.replace(/^Bearer\s+/i, "");
  const looksLikeFirebaseJwt = bearer.startsWith("ey");
  const personalKey =
    bearer && bearer !== "undefined" && !looksLikeFirebaseJwt ? bearer : "";
  let apiKey = personalKey;
  let access: FundedGatewayAccess | null = null;

  if (!apiKey) {
    const fundedKey = getServerAiGatewayKey();
    if (!fundedKey) {
      return { apiKey: "", access: null, denialReason: "server_gateway_unconfigured" };
    }
    try {
      access = await resolveMimiFundedGatewayAccess(req, cost);
    } catch (err) {
      console.warn("MIMI // funded access resolution crashed; soft-allowing gateway:", err);
      access = softAllow(undefined, fundedGatewayCreditCost(cost));
    }
    if (access?.allowed) {
      return { apiKey: fundedKey, access };
    }
    if (!extractMimiSessionToken(req.headers || {})) {
      return { apiKey: "", access, denialReason: "sign_in_required" };
    }
    return { apiKey: "", access, denialReason: "credits_exhausted" };
  }

  return { apiKey, access };
};
