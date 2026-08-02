import { FieldValue } from "firebase-admin/firestore";
import { extractMimiSessionToken, getServerFirebaseAdmin } from "./serverFirebaseAdmin.js";
import { isPaidMimiPlan, normalizeMimiPlan } from "./mimiEntitlements.js";
import { proxyToFunctions } from "./proxyToFunctions.js";

export type FundedGatewayAccess = {
  allowed: boolean;
  billable: boolean;
  uid?: string;
  cost: number;
};

export const fundedGatewayCreditCost = (taskCost?: number) => {
  // Preserve explicit zero (free_internal tasks like embedding indexing).
  if (taskCost === 0) return 0;
  const value = Number(taskCost ?? process.env.MIMI_TEXT_CREDIT_COST ?? 1);
  return Number.isFinite(value) && value > 0 ? value : 1;
};

export const resolveMimiFundedGatewayAccess = async (
  req: { headers?: Record<string, unknown> },
  cost = fundedGatewayCreditCost(),
): Promise<FundedGatewayAccess> => {
  const { auth, db } = getServerFirebaseAdmin();
  if (!auth || !db) {
    const token = extractMimiSessionToken(req.headers || {});
    if (!token) return { allowed: false, billable: false, cost };

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
  }

  const token = extractMimiSessionToken(req.headers || {});
  if (!token) return { allowed: false, billable: false, cost };

  const decoded = await auth.verifyIdToken(token);
  const adminUids = String(process.env.MIMI_ADMIN_UIDS || process.env.MIMI_ADMIN_UID || "")
    .split(",")
    .map((uid) => uid.trim())
    .filter(Boolean);
  if (adminUids.includes(decoded.uid)) {
    return { allowed: true, billable: false, uid: decoded.uid, cost };
  }

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
};

export const chargeMimiFundedGateway = async (
  access: FundedGatewayAccess,
  meta: { model?: string; usage?: unknown; feature?: string },
) => {
  if (!access.billable || !access.uid) return;

  const { db } = getServerFirebaseAdmin();
  if (!db) {
    await proxyToFunctions("/api/funded-gateway/charge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access, meta }),
    });
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
    access = await resolveMimiFundedGatewayAccess(req, cost);
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
