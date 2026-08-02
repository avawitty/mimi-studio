import { createRequire } from "module";
import { extractMimiSessionToken } from "./mimiSessionToken.js";
import { isPaidMimiPlan, normalizeMimiPlan } from "./mimiEntitlements.js";
import { proxyToFunctions } from "./proxyToFunctions.js";

const require = createRequire(import.meta.url);

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
      return softAllow(undefined, cost);
    }

    let decoded: { uid: string };
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

      const plan = normalizeMimiPlan(data.plan || data.planStatus);
      const isPaid = isPaidMimiPlan(plan);
      let remaining = 0;

      if (isPaid) {
        const active = data.subscriptionStatus !== "inactive" && data.subscriptionStatus !== "canceled";
        const grant = data.membershipCredits || data.subscription?.credits;
        remaining = Number(grant?.remaining ?? 0);

        if (!active || remaining < cost) {
          return { allowed: false, billable: false, uid: decoded.uid, cost };
        }
      } else {
        let trialCredits = Number(data.trial?.remainingCredits ?? 0);
        const lastReload = Number(data.trial?.lastReloadedAt ?? 0);
        const now = Date.now();
        const baseline = plan === "free" || data.planStatus === "ghost" ? 4 : 12;

        if (now - lastReload > 24 * 60 * 60 * 1000) {
          trialCredits = baseline;
          const reloadUpdate = {
            "trial.remainingCredits": baseline,
            "trial.lastReloadedAt": now,
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
      console.warn("MIMI // Credit lookup failed; soft-allowing verified user:", err);
      return softAllow(decoded.uid, cost);
    }
  } catch (err) {
    console.warn("MIMI // resolveMimiFundedGatewayAccess failed:", err);
    return softAllow(undefined, cost);
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
    const plan = normalizeMimiPlan(userData.plan || userData.planStatus);
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
    const fundedKey = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN || "";
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
