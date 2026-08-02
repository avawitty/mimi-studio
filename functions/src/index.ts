import * as functions from 'firebase-functions/v1';
import express from 'express';
import cookieParser from 'cookie-parser';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue } from 'firebase-admin/firestore';
import Stripe from 'stripe';
import { getMimiFirestore } from './firestore';

initializeApp();

const app = express();
app.use(cookieParser());

const ALLOWED_ORIGIN_PATTERNS: Array<string | RegExp> = [
  'https://www.mimi.you',
  'https://mimi.you',
  'https://www.mimi.rip',
  'https://mimi.rip',
  'https://mimi.fish',
  'https://www.mimi.fish',
  'https://avainlife.com',
  'https://www.avainlife.com',
  /^https:\/\/[\w-]+\.vercel\.app$/,
  /^http:\/\/localhost:\d+$/,
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGIN_PATTERNS.some((pattern) =>
    typeof pattern === 'string' ? pattern === origin : pattern.test(origin)
  )) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Stripe-Signature');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
});

const db = getMimiFirestore();

type MimiPlan = 'free' | 'trial' | 'initiation' | 'optioning' | 'atelier' | 'lab' | 'sovereign';
type MimiBillingInterval = 'month' | 'year';

const normalizeMimiPlan = (planInput?: unknown): MimiPlan => {
  const value = String(planInput || 'free').trim().toLowerCase();
  if (value === 'core') return 'initiation';
  if (value === 'pro') return 'atelier';
  if (value === 'ghost') return 'free';
  if (['free', 'trial', 'initiation', 'optioning', 'atelier', 'lab', 'sovereign'].includes(value)) {
    return value as MimiPlan;
  }
  return 'free';
};

const toLegacyPlanStatus = (planInput?: unknown) => {
  const plan = normalizeMimiPlan(planInput);
  if (plan === 'initiation') return 'core';
  if (plan === 'optioning') return 'optioning';
  if (plan === 'atelier') return 'pro';
  if (plan === 'lab' || plan === 'sovereign') return 'lab';
  if (plan === 'trial') return 'trial';
  return 'free';
};

const isPaidMimiPlan = (planInput?: unknown) => {
  const plan = normalizeMimiPlan(planInput);
  return ['initiation', 'optioning', 'atelier', 'lab', 'sovereign'].includes(plan);
};

/** Keep in sync with lib/mimiEntitlements.ts MIMI_PLAN_METADATA credits. */
const ALLOWANCE_BY_PLAN: Record<MimiPlan, number> = {
  free: 0,
  trial: 150,
  initiation: 500,
  optioning: 1500,
  atelier: 3000,
  lab: 10000,
  sovereign: 30000,
};

const PRICE_ID_PLAN_MAP: Record<string, MimiPlan> = {
  price_1TfuI49AUz0q2nVCHuy4k4Sq: 'initiation',
  price_1TgUdR9AUz0q2nVC1EoBOgBi: 'optioning',
  price_1TgVQC9AUz0q2nVC5POSYpI7: 'atelier',
  price_1TfwLC9AUz0q2nVCxNzPtunX: 'lab',
  price_1Tzntj9AUz0q2nVCO66J6Wps: 'initiation',
  price_1Tznti9AUz0q2nVC83IIz3KG: 'optioning',
  price_1Tznti9AUz0q2nVCo7L96nzL: 'atelier',
  price_1Tzntj9AUz0q2nVCsBYJKVze: 'lab',
};

const buildCreditGrant = (planInput?: unknown, interval: MimiBillingInterval = 'month') => {
  const plan = normalizeMimiPlan(planInput);
  const multiplier = interval === 'year' ? 12 : 1;
  const allowance = ALLOWANCE_BY_PLAN[plan] * multiplier;
  const currentPeriodEnd = Date.now() + (interval === 'year' ? 365 : 30) * 24 * 60 * 60 * 1000;
  return {
    allowance,
    used: 0,
    remaining: allowance,
    periodEndsAt: currentPeriodEnd,
  };
};

const collectStripeCustomerIdCandidates = (
  ...sources: Array<Record<string, unknown> | null | undefined>
) => {
  // Keep in sync with lib/verifyStripeEntitlement.ts (Functions can't import root lib).
  const ids = new Set<string>();
  for (const source of sources) {
    if (!source) continue;
    for (const key of ['stripeCustomerId', 'customerId'] as const) {
      const value = String(source[key] || '').trim();
      if (value.startsWith('cus_')) ids.add(value);
    }
    const nested = String((source as any).subscription?.stripeCustomerId || '').trim();
    if (nested.startsWith('cus_')) ids.add(nested);
  }
  return [...ids];
};

/** Preserve stored allowance on period reload (mirrors lib/mimiFundedGateway). */
const rollForwardMembershipGrant = (
  grant: { allowance?: unknown; interval?: unknown } | null | undefined,
  interval: MimiBillingInterval = 'month',
  now = Date.now(),
) => {
  const normalizedInterval: MimiBillingInterval = interval === 'year' ? 'year' : 'month';
  const allowance = Number(grant?.allowance ?? 0);
  const periodMs = (normalizedInterval === 'year' ? 365 : 30) * 24 * 60 * 60 * 1000;
  return {
    allowance,
    remaining: allowance,
    used: 0,
    interval: normalizedInterval,
    periodStartedAt: now,
    periodEndsAt: now + periodMs,
    lastGrantedAt: now,
  };
};

/**
 * Verify cus_* against Stripe. Firestore docs are owner-writable (incl. billing/**
 * via users catch-all), so never trust a stored stripeCustomerId alone.
 */
const verifyStripeCustomerEntitlement = async (
  customerId: string,
  uid: string,
  email?: string,
): Promise<boolean> => {
  if (!customerId.startsWith('cus_')) return false;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.warn('MIMI // STRIPE_SECRET_KEY missing; cannot verify billing entitlement');
    return false;
  }
  try {
    const stripe = new Stripe(key);
    const customer = await stripe.customers.retrieve(customerId);
    if ((customer as any).deleted) return false;
    const metaUid = String((customer as any).metadata?.firebaseUid || (customer as any).metadata?.uid || '').trim();
    if (metaUid && metaUid !== uid) return false;
    const wantEmail = String(email || '').trim().toLowerCase();
    const customerEmail = String((customer as any).email || '').trim().toLowerCase();
    const hasUidBinding = Boolean(metaUid && metaUid === uid);
    const hasEmailBinding = Boolean(wantEmail && customerEmail && customerEmail === wantEmail);
    if (!hasUidBinding && !hasEmailBinding) return false;
    const subs = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 10 });
    return subs.data.some((sub) =>
      sub.status === 'active' || sub.status === 'trialing' || sub.status === 'past_due',
    );
  } catch (err) {
    console.warn('MIMI // Stripe entitlement verification failed:', err);
    return false;
  }
};

const resolveTrustedPaidBilling = async (
  uid: string,
  email: string | undefined,
  sources: Array<Record<string, unknown> | null | undefined>,
) => {
  for (const customerId of collectStripeCustomerIdCandidates(...sources)) {
    if (await verifyStripeCustomerEntitlement(customerId, uid, email)) return true;
  }
  return false;
};

const writeMembershipEntitlements = async ({
  uid,
  plan,
  interval = 'month',
  stripeCustomerId,
  status = 'active',
}: {
  uid: string;
  plan?: unknown;
  interval?: MimiBillingInterval;
  stripeCustomerId?: string;
  status?: 'active' | 'inactive';
}) => {
  const mimiPlan = normalizeMimiPlan(plan);
  const legacyPlan = toLegacyPlanStatus(mimiPlan);
  const credits = buildCreditGrant(mimiPlan, interval);
  const isActive = status === 'active';
  const currentPeriodEnd = credits.periodEndsAt;
  const now = Date.now();

  const userPatch = {
    plan: legacyPlan === 'free' ? 'free' : legacyPlan,
    planStatus: legacyPlan,
    membershipPlan: legacyPlan,
    mimiPlan,
    subscriptionStatus: isActive ? 'active' : 'inactive',
    subscriptionInterval: interval,
    membershipCredits: credits,
    ...(stripeCustomerId ? { stripeCustomerId } : {}),
  };

  await Promise.all([
    db.collection('users').doc(uid).set(userPatch, { merge: true }),
    db.collection('profiles_public').doc(uid).set(userPatch, { merge: true }),
    db.collection('memberships').doc(uid).set({
      plan: legacyPlan,
      mimiPlan,
      status: isActive ? 'active' : 'inactive',
      interval,
      currentPeriodEnd,
      credits,
      ...(stripeCustomerId ? { stripeCustomerId } : {}),
      updatedAt: now,
    }, { merge: true }),
    db.collection('users').doc(uid).collection('billing').doc('subscription').set({
      plan: legacyPlan,
      mimiPlan,
      status: isActive ? 'active' : 'canceled',
      interval,
      currentPeriodEnd,
      credits,
      ...(stripeCustomerId ? { stripeCustomerId } : {}),
      updatedAt: now,
    }, { merge: true }),
  ]);
};

let stripeClient: Stripe | null = null;
const getStripe = () => {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY environment variable is required');
    stripeClient = new Stripe(key);
  }
  return stripeClient;
};

const resolvePlanFromPrice = async (stripe: Stripe, priceId?: string | null, metadataPlan?: string | null) => {
  let plan: MimiPlan | null = metadataPlan ? normalizeMimiPlan(metadataPlan) : null;
  let interval: MimiBillingInterval = 'month';

  if (!plan && priceId && PRICE_ID_PLAN_MAP[priceId]) {
    plan = PRICE_ID_PLAN_MAP[priceId];
  }

  if (priceId) {
    try {
      const price = await stripe.prices.retrieve(priceId);
      interval = price.recurring?.interval === 'year' ? 'year' : 'month';
      if (!plan && price.metadata?.plan) {
        plan = normalizeMimiPlan(price.metadata.plan);
      }
      if (!plan && PRICE_ID_PLAN_MAP[price.id]) {
        plan = PRICE_ID_PLAN_MAP[price.id];
      }
    } catch (error) {
      console.warn('MIMI // Functions Stripe: failed to retrieve price', priceId, error);
    }
  }

  return { plan: plan || 'free', interval };
};

app.post('/api/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) {
      res.status(500).send({ error: 'STRIPE_WEBHOOK_SECRET is not configured' });
      return;
    }
    const stripe = getStripe();
    const signature = req.headers['stripe-signature'];
    if (!signature) {
      res.status(400).send('Missing stripe-signature header');
      return;
    }
    const event = stripe.webhooks.constructEvent(req.body, signature as string, secret);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const uid = session.client_reference_id || session.metadata?.userId || '';
      const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 1 });
      const priceId = lineItems.data[0]?.price?.id;
      const { plan, interval } = await resolvePlanFromPrice(stripe, priceId, session.metadata?.plan || null);

      if (uid) {
        await writeMembershipEntitlements({ uid, plan, interval, stripeCustomerId: customerId || undefined });
      } else if (session.customer_email || session.customer_details?.email) {
        const email = String(session.customer_email || session.customer_details?.email).toLowerCase();
        await db.collection('pending_memberships').doc(email).set({
          plan: toLegacyPlanStatus(plan),
          mimiPlan: plan,
          interval,
          stripeCustomerId: customerId || null,
          status: 'active',
          createdAt: Date.now(),
        }, { merge: true });
      }
    }

    if (event.type === 'customer.subscription.updated' || event.type === 'invoice.payment_succeeded') {
      const object = event.data.object as any;
      const customerId = typeof object.customer === 'string' ? object.customer : object.customer?.id;
      if (customerId) {
        const snap = await db.collection('users').where('stripeCustomerId', '==', customerId).limit(1).get();
        if (!snap.empty) {
          const uid = snap.docs[0].id;
          const priceId = object.items?.data?.[0]?.price?.id || object.lines?.data?.[0]?.price?.id;
          const { plan, interval } = await resolvePlanFromPrice(stripe, priceId, object.metadata?.plan || null);
          await writeMembershipEntitlements({ uid, plan, interval, stripeCustomerId: customerId });
        }
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;
      if (customerId) {
        const snap = await db.collection('users').where('stripeCustomerId', '==', customerId).limit(1).get();
        if (!snap.empty) {
          await writeMembershipEntitlements({
            uid: snap.docs[0].id,
            plan: 'free',
            stripeCustomerId: customerId,
            status: 'inactive',
          });
        }
      }
    }

    res.status(200).send({ received: true });
  } catch (error: any) {
    console.error('MIMI // Functions stripe webhook error:', error);
    res.status(400).send(`Webhook Error: ${error?.message || 'Invalid payload'}`);
  }
});

app.use(express.json({ limit: '50mb' }));

// Session login endpoint
app.post('/api/sessionLogin', async (req, res) => {
  const idToken = req.body.idToken;
  const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days

  try {
    const sessionCookie = await getAuth().createSessionCookie(idToken, { expiresIn });
    res.cookie('__session', sessionCookie, {
      maxAge: expiresIn,
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
    });
    res.status(200).send({ status: 'success' });
  } catch (error) {
    res.status(401).send({ error: 'Unauthorized' });
  }
});

// Session logout endpoint
app.post('/api/sessionLogout', (req, res) => {
  res.clearCookie('__session');
  res.status(200).send({ status: 'success' });
});

const extractBearerToken = (req: express.Request) => {
  const header = String(req.headers.authorization || '').trim();
  return header.replace(/^Bearer\s+/i, '');
};

app.post('/api/funded-gateway/access', async (req, res) => {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      res.status(401).send({ allowed: false, billable: false, error: 'Mimi sign-in is required.' });
      return;
    }

    const decoded = await getAuth().verifyIdToken(token);
    const cost = Number(req.body?.cost || 1);
    const userRef = db.collection('users').doc(decoded.uid);
    const profileRef = db.collection('profiles_public').doc(decoded.uid);
    const [userDoc, profileDoc] = await Promise.all([userRef.get(), profileRef.get()]);
    const data = { ...(profileDoc.data() || {}), ...(userDoc.data() || {}) };
    const plan = normalizeMimiPlan(
      data.plan || data.planStatus || data.mimiPlan || data.membershipPlan,
    );
    const paid = isPaidMimiPlan(plan);

    let remaining = 0;
    if (paid) {
      const status = String(data.subscriptionStatus || 'active').trim().toLowerCase();
      const active = status !== 'inactive' && status !== 'canceled' && status !== 'cancelled';
      if (!active) {
        res.status(200).send({ allowed: false, billable: false, uid: decoded.uid, cost });
        return;
      }

      let billingData: Record<string, unknown> = {};
      try {
        const billingSnap = await userRef.collection('billing').doc('subscription').get();
        billingData = (billingSnap.data() || {}) as Record<string, unknown>;
      } catch {
        billingData = {};
      }

      // Never trust top-level subscription.credits (owner-writable forge vector).
      let grant = data.membershipCredits || billingData.credits;
      const allowanceNum = Number(grant?.allowance);
      const hasAllowance = Number.isFinite(allowanceNum) && allowanceNum > 0;
      const periodEndsAt = Number(grant?.periodEndsAt ?? 0);
      const now = Date.now();
      const needsPeriodReload =
        hasAllowance && Number.isFinite(periodEndsAt) && periodEndsAt > 0 && periodEndsAt < now;
      const needsMint = !hasAllowance;
      const trustedBilling =
        needsPeriodReload || needsMint
          ? await resolveTrustedPaidBilling(
              decoded.uid,
              decoded.email,
              [billingData, data as Record<string, unknown>],
            )
          : false;
      const needsTrustedMint = needsMint && trustedBilling;

      if ((needsPeriodReload && trustedBilling) || needsTrustedMint) {
        const interval = (data.subscriptionInterval === 'year' ? 'year' : 'month') as MimiBillingInterval;
        // Period reload preserves stored allowance; mint derives from plan.
        const credits = needsPeriodReload
          ? rollForwardMembershipGrant(grant, interval, now)
          : periodEndsAt > now
            ? { ...buildCreditGrant(plan, interval), periodEndsAt }
            : buildCreditGrant(plan, interval);
        const healPatch = {
          membershipCredits: credits,
          subscriptionStatus: data.subscriptionStatus || 'active',
          mimiPlan: plan,
        };
        await Promise.all([
          userRef.set(healPatch, { merge: true }),
          profileRef.set(healPatch, { merge: true }),
        ]);
        grant = credits;
      }
      // Expired period without Stripe verify: no refill, but leftover remaining
      // credits below can still be spent.

      remaining = Number(grant?.remaining ?? 0);
    } else {
      remaining = Number(data.trial?.remainingCredits ?? 0);
    }

    res.status(200).send({
      allowed: remaining >= cost,
      billable: remaining >= cost,
      uid: decoded.uid,
      cost,
    });
  } catch (error: any) {
    res.status(error?.status || 500).send({ allowed: false, billable: false, error: error?.message || String(error) });
  }
});

app.post('/api/funded-gateway/charge', async (req, res) => {
  try {
    const access = req.body?.access || {};
    const meta = req.body?.meta || {};
    if (!access.billable || !access.uid) {
      res.status(200).send({ charged: false });
      return;
    }

    const userRef = db.collection('users').doc(access.uid);
    const profileRef = db.collection('profiles_public').doc(access.uid);
    const userDoc = await userRef.get();
    const userData = userDoc.data() || {};
    const paid = isPaidMimiPlan(
      userData.plan || userData.planStatus || userData.mimiPlan || userData.membershipPlan,
    );
    const field = paid ? 'membershipCredits' : 'trial';
    const cost = Number(access.cost || 1);
    const patch = {
      [`${field}.remaining${paid ? '' : 'Credits'}`]: FieldValue.increment(-cost),
      [`${field}.used${paid ? '' : 'Credits'}`]: FieldValue.increment(cost),
      generationCount: FieldValue.increment(1),
      lastGenerationAt: Date.now(),
    };

    await Promise.all([
      userRef.set(patch, { merge: true }),
      profileRef.set(patch, { merge: true }),
      db.collection('mimi_usage_events').add({
        userId: access.uid,
        feature: meta.feature || 'ai-gateway:text',
        provider: 'vercel-ai-gateway',
        model: meta.model || null,
        creditsCharged: cost,
        usage: meta.usage || null,
        createdAt: Date.now(),
      }),
    ]);

    res.status(200).send({ charged: true });
  } catch (error: any) {
    res.status(500).send({ error: error?.message || String(error) });
  }
});

app.post('/api/sync-subscription', async (req, res) => {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      res.status(401).send({ error: 'Mimi sign-in is required.' });
      return;
    }

    const decoded = await getAuth().verifyIdToken(token);
    const email = decoded.email;
    if (!email) {
      res.status(400).send({ error: 'No email address associated with this account token.' });
      return;
    }

    const pendingRef = db.collection('pending_memberships').doc(email.toLowerCase());
    const pendingSnap = await pendingRef.get();
    if (!pendingSnap.exists) {
      res.status(200).send({
        success: true,
        plan: null,
        message: 'No pending subscription found.',
      });
      return;
    }

    const data = pendingSnap.data() || {};
    await writeMembershipEntitlements({
      uid: decoded.uid,
      plan: data.mimiPlan || data.plan,
      interval: data.interval === 'year' ? 'year' : 'month',
      stripeCustomerId: data.stripeCustomerId || undefined,
      status: 'active',
    });
    await pendingRef.delete();

    res.status(200).send({ success: true, plan: data.plan || data.mimiPlan });
  } catch (error: any) {
    res.status(500).send({ error: error?.message || String(error) });
  }
});

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

app.get('/api/og/zine', async (req, res) => {
  try {
    const zineId = String(req.query.id || req.query.zineId || '').trim();
    if (!zineId) {
      res.status(400).send({ error: 'id query parameter required' });
      return;
    }

    const snap = await db.collection('zines').doc(zineId).get();
    if (!snap.exists) {
      res.status(404).send({ error: 'Zine not found' });
      return;
    }

    const zine = snap.data() || {};
    const title = String(zine.title || 'Untitled Manifestation');
    const description = String(zine.concept || zine.summary || 'Aesthetic zine created via Mimi Studio.');
    const imageUrl = String(
      zine.coverImageUrl || zine.contentImages?.[0] || 'https://raw.githubusercontent.com/Aris-A-C/mimi-assets/main/mimi_logo_new.png',
    );
    const base = String(process.env.MIMI_PUBLIC_BASE_URL || 'https://www.mimi.you').replace(/\/$/, '');
    const pageUrl = `${base}/zine/${zineId}`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)} | MimiZine Editorial</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${escapeHtml(imageUrl)}" />
  <meta property="og:url" content="${escapeHtml(pageUrl)}" />
  <meta property="og:type" content="article" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta http-equiv="refresh" content="0;url=${escapeHtml(pageUrl)}" />
</head>
<body>
  <p><a href="${escapeHtml(pageUrl)}">${escapeHtml(title)}</a></p>
</body>
</html>`);
  } catch (error: any) {
    res.status(500).send({ error: error?.message || String(error) });
  }
});

import { generateDailyPressIssue } from './pressGenerator'; // I'll need to create this

// ... existing code ...

// Trigger endpoint for press issue generation
app.post('/api/triggerPressGeneration', async (req, res) => {
  try {
    await generateDailyPressIssue();
    res.status(200).send({ status: 'success' });
  } catch (error) {
    res.status(500).send({ error: 'Failed to generate press issues' });
  }
});

export const api = functions.https.onRequest(app);

// Scheduled pubsub jobs require Blaze + Cloud Scheduler on mimistudios.
// Use POST /api/triggerPressGeneration (above) until billing is enabled, then restore:
// export const dailyPressIssueJob = functions.pubsub.schedule('every 24 hours').onRun(async () => {
//   await generateDailyPressIssue();
// });

