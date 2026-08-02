import { cors, readJsonBody, requireMethod, sendJson } from "../lib/apiUtils.js";
import { buildCreditGrant } from "../lib/mimiEntitlements.js";
import { extractMimiSessionToken, getServerFirebaseAdmin } from "../lib/serverFirebaseAdmin.js";

const VALID_PROMO_CODES = new Set([
  "MIMIMUSE",
  "AQ.Ab8RN6Lb2tRMQaHqr8ew4UEKcGRZCTOfrhXjJ6FyiJNtSdIokA",
  "AQ.Ab8RN6IyzxKcsBHawVk9iETDEseYnhnPb7yjfXuvYGiUbZLTqw",
]);

export default async function handler(req: any, res: any) {
  if (cors(req, res)) return;
  if (!requireMethod(req, res, "POST")) return;

  try {
    const body = await readJsonBody(req);
    const code = String(body?.code || "").trim();
    const normalizedCode = code.toUpperCase().replace(/\s+/g, "");
    if (!VALID_PROMO_CODES.has(normalizedCode) && !VALID_PROMO_CODES.has(code)) {
      return sendJson(res, 400, { ok: false, error: "Invalid cipher." });
    }

    const token = extractMimiSessionToken(req.headers || {});
    if (!token) {
      return sendJson(res, 401, { ok: false, error: "Sign in required to redeem a promo." });
    }

    const { auth, db } = getServerFirebaseAdmin();
    if (!auth || !db) {
      return sendJson(res, 503, {
        ok: false,
        error: "Promo redemption requires server Admin credentials.",
      });
    }

    let decoded: { uid: string };
    try {
      decoded = await auth.verifyIdToken(token);
    } catch {
      return sendJson(res, 401, { ok: false, error: "Invalid session." });
    }

    const requestedUid = String(body?.userId || "").trim();
    if (requestedUid && requestedUid !== decoded.uid) {
      return sendJson(res, 403, { ok: false, error: "Promo can only be applied to the signed-in user." });
    }

    const uid = decoded.uid;
    const now = Date.now();
    const promoKey = normalizedCode.slice(0, 32);

    // Idempotent redeem: do not refill credits / extend the year window on repeat POSTs.
    const [userSnap, membershipSnap] = await Promise.all([
      db.collection("users").doc(uid).get(),
      db.collection("memberships").doc(uid).get(),
    ]);
    const existingUser = (userSnap.data() || {}) as Record<string, unknown>;
    const existingMembership = (membershipSnap.data() || {}) as Record<string, unknown>;
    const existingCredits =
      (existingUser.membershipCredits as { remaining?: unknown; periodEndsAt?: unknown } | undefined) ||
      (existingMembership.credits as { remaining?: unknown; periodEndsAt?: unknown } | undefined);
    const periodEndsAt = Number(
      existingCredits?.periodEndsAt ?? existingMembership.currentPeriodEnd ?? 0,
    );
    // Idempotent only for THIS promo key — not any active patron / any prior promo.
    const alreadyRedeemed =
      periodEndsAt > now && String(existingUser.patronKey || "") === promoKey;

    if (alreadyRedeemed) {
      const remaining = Number(existingCredits?.remaining ?? NaN);
      const allowance = Number(
        (existingCredits as { allowance?: unknown } | undefined)?.allowance ?? NaN,
      );
      const creditsDrained =
        !Number.isFinite(remaining) ||
        remaining <= 0 ||
        !Number.isFinite(allowance) ||
        allowance <= 0;

      if (creditsDrained) {
        const { credits: membershipCredits } = buildCreditGrant({
          plan: "lab",
          interval: "year",
          currentPeriodEnd: periodEndsAt,
        });
        await Promise.all([
          db.collection("users").doc(uid).set({ membershipCredits }, { merge: true }),
          db.collection("profiles_public").doc(uid).set({ membershipCredits }, { merge: true }),
          db.collection("users").doc(uid).collection("billing").doc("subscription").set(
            { credits: membershipCredits, updatedAt: now },
            { merge: true },
          ),
          db.collection("memberships").doc(uid).set(
            { credits: membershipCredits, updatedAt: now },
            { merge: true },
          ),
        ]);
        return sendJson(res, 200, {
          ok: true,
          applied: false,
          alreadyRedeemed: true,
          creditsRestored: true,
          success: true,
          message: "Promo credits restored.",
          membershipCredits,
        });
      }

      return sendJson(res, 200, {
        ok: true,
        applied: false,
        alreadyRedeemed: true,
        success: true,
        message: "Promo already applied.",
        membershipCredits: existingCredits || null,
      });
    }

    const oneYearFromNow = now + 365 * 24 * 60 * 60 * 1000;
    const { credits: membershipCredits } = buildCreditGrant({
      plan: "lab",
      interval: "year",
      currentPeriodEnd: oneYearFromNow,
    });

    const userPatch = {
      planStatus: "lab",
      plan: "lab",
      membershipPlan: "lab",
      mimiPlan: "lab",
      subscriptionStatus: "active",
      subscriptionInterval: "year",
      membershipCredits,
      isPatron: true,
      patronActivatedAt: now,
      patronKey: promoKey,
    };

    await Promise.all([
      db.collection("users").doc(uid).set(userPatch, { merge: true }),
      db.collection("profiles_public").doc(uid).set(
        {
          planStatus: "lab",
          plan: "lab",
          membershipPlan: "lab",
          mimiPlan: "lab",
          subscriptionStatus: "active",
          membershipCredits,
          isPatron: true,
          patronActivatedAt: now,
        },
        { merge: true },
      ),
      db.collection("users").doc(uid).collection("billing").doc("subscription").set(
        {
          plan: "lab",
          mimiPlan: "lab",
          status: "active",
          currentPeriodEnd: oneYearFromNow,
          interval: "year",
          credits: membershipCredits,
          source: "promo",
          updatedAt: now,
        },
        { merge: true },
      ),
      db.collection("memberships").doc(uid).set(
        {
          plan: "lab",
          mimiPlan: "lab",
          status: "active",
          currentPeriodEnd: oneYearFromNow,
          interval: "year",
          credits: membershipCredits,
          source: "promo",
          updatedAt: now,
        },
        { merge: true },
      ),
    ]);

    return sendJson(res, 200, {
      ok: true,
      applied: true,
      success: true,
      message: "1-Year Lab Access Granted.",
      membershipCredits,
    });
  } catch (error: any) {
    return sendJson(res, 500, {
      ok: false,
      error: error?.message || "Promo redemption failed.",
    });
  }
}
