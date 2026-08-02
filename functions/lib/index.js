"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.api = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const express_1 = __importDefault(require("express"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const app_1 = require("firebase-admin/app");
const auth_1 = require("firebase-admin/auth");
const firestore_1 = require("firebase-admin/firestore");
const stripe_1 = __importDefault(require("stripe"));
const firestore_2 = require("./firestore");
(0, app_1.initializeApp)();
const app = (0, express_1.default)();
app.use((0, cookie_parser_1.default)());
const ALLOWED_ORIGIN_PATTERNS = [
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
    if (origin && ALLOWED_ORIGIN_PATTERNS.some((pattern) => typeof pattern === 'string' ? pattern === origin : pattern.test(origin))) {
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
const db = (0, firestore_2.getMimiFirestore)();
const normalizeMimiPlan = (planInput) => {
    const value = String(planInput || 'free').trim().toLowerCase();
    if (value === 'core')
        return 'initiation';
    if (value === 'pro')
        return 'atelier';
    if (value === 'ghost')
        return 'free';
    if (['free', 'trial', 'initiation', 'optioning', 'atelier', 'lab', 'sovereign'].includes(value)) {
        return value;
    }
    return 'free';
};
const toLegacyPlanStatus = (planInput) => {
    const plan = normalizeMimiPlan(planInput);
    if (plan === 'initiation')
        return 'core';
    if (plan === 'optioning')
        return 'optioning';
    if (plan === 'atelier')
        return 'pro';
    if (plan === 'lab' || plan === 'sovereign')
        return 'lab';
    if (plan === 'trial')
        return 'trial';
    return 'free';
};
const isPaidMimiPlan = (planInput) => {
    const plan = normalizeMimiPlan(planInput);
    return ['initiation', 'optioning', 'atelier', 'lab', 'sovereign'].includes(plan);
};
/** Keep in sync with lib/mimiEntitlements.ts MIMI_PLAN_METADATA credits. */
const ALLOWANCE_BY_PLAN = {
    free: 0,
    trial: 150,
    initiation: 500,
    optioning: 1500,
    atelier: 3000,
    lab: 10000,
    sovereign: 30000,
};
const PRICE_ID_PLAN_MAP = {
    price_1TfuI49AUz0q2nVCHuy4k4Sq: 'initiation',
    price_1TgUdR9AUz0q2nVC1EoBOgBi: 'optioning',
    price_1TgVQC9AUz0q2nVC5POSYpI7: 'atelier',
    price_1TfwLC9AUz0q2nVCxNzPtunX: 'lab',
    price_1Tzntj9AUz0q2nVCO66J6Wps: 'initiation',
    price_1Tznti9AUz0q2nVC83IIz3KG: 'optioning',
    price_1Tznti9AUz0q2nVCo7L96nzL: 'atelier',
    price_1Tzntj9AUz0q2nVCsBYJKVze: 'lab',
};
const buildCreditGrant = (planInput, interval = 'month') => {
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
const collectStripeCustomerIdCandidates = (...sources) => {
    var _a;
    const ids = new Set();
    for (const source of sources) {
        if (!source)
            continue;
        const direct = String(source.stripeCustomerId || '').trim();
        if (direct.startsWith('cus_'))
            ids.add(direct);
        const nested = String(((_a = source.subscription) === null || _a === void 0 ? void 0 : _a.stripeCustomerId) || '').trim();
        if (nested.startsWith('cus_'))
            ids.add(nested);
    }
    return [...ids];
};
/**
 * Verify cus_* against Stripe. Firestore docs are owner-writable (incl. billing/**
 * via users catch-all), so never trust a stored stripeCustomerId alone.
 */
const verifyStripeCustomerEntitlement = async (customerId, uid, email) => {
    var _a, _b;
    if (!customerId.startsWith('cus_'))
        return false;
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
        console.warn('MIMI // STRIPE_SECRET_KEY missing; cannot verify billing entitlement');
        return false;
    }
    try {
        const stripe = new stripe_1.default(key);
        const customer = await stripe.customers.retrieve(customerId);
        if (customer.deleted)
            return false;
        const metaUid = String(((_a = customer.metadata) === null || _a === void 0 ? void 0 : _a.firebaseUid) || ((_b = customer.metadata) === null || _b === void 0 ? void 0 : _b.uid) || '').trim();
        if (metaUid && metaUid !== uid)
            return false;
        const wantEmail = String(email || '').trim().toLowerCase();
        const customerEmail = String(customer.email || '').trim().toLowerCase();
        if (!metaUid && wantEmail && customerEmail && customerEmail !== wantEmail)
            return false;
        const subs = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 10 });
        return subs.data.some((sub) => sub.status === 'active' || sub.status === 'trialing' || sub.status === 'past_due');
    }
    catch (err) {
        console.warn('MIMI // Stripe entitlement verification failed:', err);
        return false;
    }
};
const resolveTrustedPaidBilling = async (uid, email, sources) => {
    for (const customerId of collectStripeCustomerIdCandidates(...sources)) {
        if (await verifyStripeCustomerEntitlement(customerId, uid, email))
            return true;
    }
    return false;
};
const writeMembershipEntitlements = async ({ uid, plan, interval = 'month', stripeCustomerId, status = 'active', }) => {
    const mimiPlan = normalizeMimiPlan(plan);
    const legacyPlan = toLegacyPlanStatus(mimiPlan);
    const credits = buildCreditGrant(mimiPlan, interval);
    const isActive = status === 'active';
    const currentPeriodEnd = credits.periodEndsAt;
    const now = Date.now();
    const userPatch = Object.assign({ plan: legacyPlan === 'free' ? 'free' : legacyPlan, planStatus: legacyPlan, membershipPlan: legacyPlan, mimiPlan, subscriptionStatus: isActive ? 'active' : 'inactive', subscriptionInterval: interval, membershipCredits: credits }, (stripeCustomerId ? { stripeCustomerId } : {}));
    await Promise.all([
        db.collection('users').doc(uid).set(userPatch, { merge: true }),
        db.collection('profiles_public').doc(uid).set(userPatch, { merge: true }),
        db.collection('memberships').doc(uid).set(Object.assign(Object.assign({ plan: legacyPlan, mimiPlan, status: isActive ? 'active' : 'inactive', interval,
            currentPeriodEnd,
            credits }, (stripeCustomerId ? { stripeCustomerId } : {})), { updatedAt: now }), { merge: true }),
        db.collection('users').doc(uid).collection('billing').doc('subscription').set(Object.assign(Object.assign({ plan: legacyPlan, mimiPlan, status: isActive ? 'active' : 'canceled', interval,
            currentPeriodEnd,
            credits }, (stripeCustomerId ? { stripeCustomerId } : {})), { updatedAt: now }), { merge: true }),
    ]);
};
let stripeClient = null;
const getStripe = () => {
    if (!stripeClient) {
        const key = process.env.STRIPE_SECRET_KEY;
        if (!key)
            throw new Error('STRIPE_SECRET_KEY environment variable is required');
        stripeClient = new stripe_1.default(key);
    }
    return stripeClient;
};
const resolvePlanFromPrice = async (stripe, priceId, metadataPlan) => {
    var _a, _b;
    let plan = metadataPlan ? normalizeMimiPlan(metadataPlan) : null;
    let interval = 'month';
    if (!plan && priceId && PRICE_ID_PLAN_MAP[priceId]) {
        plan = PRICE_ID_PLAN_MAP[priceId];
    }
    if (priceId) {
        try {
            const price = await stripe.prices.retrieve(priceId);
            interval = ((_a = price.recurring) === null || _a === void 0 ? void 0 : _a.interval) === 'year' ? 'year' : 'month';
            if (!plan && ((_b = price.metadata) === null || _b === void 0 ? void 0 : _b.plan)) {
                plan = normalizeMimiPlan(price.metadata.plan);
            }
            if (!plan && PRICE_ID_PLAN_MAP[price.id]) {
                plan = PRICE_ID_PLAN_MAP[price.id];
            }
        }
        catch (error) {
            console.warn('MIMI // Functions Stripe: failed to retrieve price', priceId, error);
        }
    }
    return { plan: plan || 'free', interval };
};
app.post('/api/stripe-webhook', express_1.default.raw({ type: 'application/json' }), async (req, res) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t;
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
        const event = stripe.webhooks.constructEvent(req.body, signature, secret);
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;
            const uid = session.client_reference_id || ((_a = session.metadata) === null || _a === void 0 ? void 0 : _a.userId) || '';
            const customerId = typeof session.customer === 'string' ? session.customer : (_b = session.customer) === null || _b === void 0 ? void 0 : _b.id;
            const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 1 });
            const priceId = (_d = (_c = lineItems.data[0]) === null || _c === void 0 ? void 0 : _c.price) === null || _d === void 0 ? void 0 : _d.id;
            const { plan, interval } = await resolvePlanFromPrice(stripe, priceId, ((_e = session.metadata) === null || _e === void 0 ? void 0 : _e.plan) || null);
            if (uid) {
                await writeMembershipEntitlements({ uid, plan, interval, stripeCustomerId: customerId || undefined });
            }
            else if (session.customer_email || ((_f = session.customer_details) === null || _f === void 0 ? void 0 : _f.email)) {
                const email = String(session.customer_email || ((_g = session.customer_details) === null || _g === void 0 ? void 0 : _g.email)).toLowerCase();
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
            const object = event.data.object;
            const customerId = typeof object.customer === 'string' ? object.customer : (_h = object.customer) === null || _h === void 0 ? void 0 : _h.id;
            if (customerId) {
                const snap = await db.collection('users').where('stripeCustomerId', '==', customerId).limit(1).get();
                if (!snap.empty) {
                    const uid = snap.docs[0].id;
                    const priceId = ((_m = (_l = (_k = (_j = object.items) === null || _j === void 0 ? void 0 : _j.data) === null || _k === void 0 ? void 0 : _k[0]) === null || _l === void 0 ? void 0 : _l.price) === null || _m === void 0 ? void 0 : _m.id) || ((_r = (_q = (_p = (_o = object.lines) === null || _o === void 0 ? void 0 : _o.data) === null || _p === void 0 ? void 0 : _p[0]) === null || _q === void 0 ? void 0 : _q.price) === null || _r === void 0 ? void 0 : _r.id);
                    const { plan, interval } = await resolvePlanFromPrice(stripe, priceId, ((_s = object.metadata) === null || _s === void 0 ? void 0 : _s.plan) || null);
                    await writeMembershipEntitlements({ uid, plan, interval, stripeCustomerId: customerId });
                }
            }
        }
        if (event.type === 'customer.subscription.deleted') {
            const subscription = event.data.object;
            const customerId = typeof subscription.customer === 'string' ? subscription.customer : (_t = subscription.customer) === null || _t === void 0 ? void 0 : _t.id;
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
    }
    catch (error) {
        console.error('MIMI // Functions stripe webhook error:', error);
        res.status(400).send(`Webhook Error: ${(error === null || error === void 0 ? void 0 : error.message) || 'Invalid payload'}`);
    }
});
app.use(express_1.default.json({ limit: '50mb' }));
// Session login endpoint
app.post('/api/sessionLogin', async (req, res) => {
    const idToken = req.body.idToken;
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
    try {
        const sessionCookie = await (0, auth_1.getAuth)().createSessionCookie(idToken, { expiresIn });
        res.cookie('__session', sessionCookie, {
            maxAge: expiresIn,
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
        });
        res.status(200).send({ status: 'success' });
    }
    catch (error) {
        res.status(401).send({ error: 'Unauthorized' });
    }
});
// Session logout endpoint
app.post('/api/sessionLogout', (req, res) => {
    res.clearCookie('__session');
    res.status(200).send({ status: 'success' });
});
const extractBearerToken = (req) => {
    const header = String(req.headers.authorization || '').trim();
    return header.replace(/^Bearer\s+/i, '');
};
app.post('/api/funded-gateway/access', async (req, res) => {
    var _a, _b, _c, _d, _e, _f;
    try {
        const token = extractBearerToken(req);
        if (!token) {
            res.status(401).send({ allowed: false, billable: false, error: 'Mimi sign-in is required.' });
            return;
        }
        const decoded = await (0, auth_1.getAuth)().verifyIdToken(token);
        const cost = Number(((_a = req.body) === null || _a === void 0 ? void 0 : _a.cost) || 1);
        const userRef = db.collection('users').doc(decoded.uid);
        const profileRef = db.collection('profiles_public').doc(decoded.uid);
        const [userDoc, profileDoc] = await Promise.all([userRef.get(), profileRef.get()]);
        const data = Object.assign(Object.assign({}, (profileDoc.data() || {})), (userDoc.data() || {}));
        const plan = normalizeMimiPlan(data.plan || data.planStatus || data.mimiPlan || data.membershipPlan);
        const paid = isPaidMimiPlan(plan);
        let remaining = 0;
        if (paid) {
            const status = String(data.subscriptionStatus || 'active').trim().toLowerCase();
            const active = status !== 'inactive' && status !== 'canceled' && status !== 'cancelled';
            if (!active) {
                res.status(200).send({ allowed: false, billable: false, uid: decoded.uid, cost });
                return;
            }
            let billingData = {};
            try {
                const billingSnap = await userRef.collection('billing').doc('subscription').get();
                billingData = (billingSnap.data() || {});
            }
            catch (_g) {
                billingData = {};
            }
            let grant = data.membershipCredits || ((_b = data.subscription) === null || _b === void 0 ? void 0 : _b.credits) || billingData.credits;
            const allowanceNum = Number(grant === null || grant === void 0 ? void 0 : grant.allowance);
            const hasAllowance = Number.isFinite(allowanceNum) && allowanceNum > 0;
            const periodEndsAt = Number((_c = grant === null || grant === void 0 ? void 0 : grant.periodEndsAt) !== null && _c !== void 0 ? _c : 0);
            const now = Date.now();
            const needsPeriodReload = hasAllowance && Number.isFinite(periodEndsAt) && periodEndsAt > 0 && periodEndsAt < now;
            const needsMint = !hasAllowance;
            const trustedBilling = needsPeriodReload || needsMint
                ? await resolveTrustedPaidBilling(decoded.uid, decoded.email, [billingData, data])
                : false;
            const needsTrustedMint = needsMint && trustedBilling;
            if ((needsPeriodReload && trustedBilling) || needsTrustedMint) {
                const interval = (data.subscriptionInterval === 'year' ? 'year' : 'month');
                const credits = needsPeriodReload
                    ? buildCreditGrant(plan, interval)
                    : periodEndsAt > now
                        ? Object.assign(Object.assign({}, buildCreditGrant(plan, interval)), { periodEndsAt }) : buildCreditGrant(plan, interval);
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
            else if (needsPeriodReload && !trustedBilling) {
                // Expired period without Stripe-verified entitlement — never rollForward
                // a client-controlled allowance.
                res.status(200).send({ allowed: false, billable: false, uid: decoded.uid, cost });
                return;
            }
            remaining = Number((_d = grant === null || grant === void 0 ? void 0 : grant.remaining) !== null && _d !== void 0 ? _d : 0);
        }
        else {
            remaining = Number((_f = (_e = data.trial) === null || _e === void 0 ? void 0 : _e.remainingCredits) !== null && _f !== void 0 ? _f : 0);
        }
        res.status(200).send({
            allowed: remaining >= cost,
            billable: remaining >= cost,
            uid: decoded.uid,
            cost,
        });
    }
    catch (error) {
        res.status((error === null || error === void 0 ? void 0 : error.status) || 500).send({ allowed: false, billable: false, error: (error === null || error === void 0 ? void 0 : error.message) || String(error) });
    }
});
app.post('/api/funded-gateway/charge', async (req, res) => {
    var _a, _b;
    try {
        const access = ((_a = req.body) === null || _a === void 0 ? void 0 : _a.access) || {};
        const meta = ((_b = req.body) === null || _b === void 0 ? void 0 : _b.meta) || {};
        if (!access.billable || !access.uid) {
            res.status(200).send({ charged: false });
            return;
        }
        const userRef = db.collection('users').doc(access.uid);
        const profileRef = db.collection('profiles_public').doc(access.uid);
        const userDoc = await userRef.get();
        const userData = userDoc.data() || {};
        const paid = isPaidMimiPlan(userData.plan || userData.planStatus || userData.mimiPlan || userData.membershipPlan);
        const field = paid ? 'membershipCredits' : 'trial';
        const cost = Number(access.cost || 1);
        const patch = {
            [`${field}.remaining${paid ? '' : 'Credits'}`]: firestore_1.FieldValue.increment(-cost),
            [`${field}.used${paid ? '' : 'Credits'}`]: firestore_1.FieldValue.increment(cost),
            generationCount: firestore_1.FieldValue.increment(1),
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
    }
    catch (error) {
        res.status(500).send({ error: (error === null || error === void 0 ? void 0 : error.message) || String(error) });
    }
});
app.post('/api/sync-subscription', async (req, res) => {
    try {
        const token = extractBearerToken(req);
        if (!token) {
            res.status(401).send({ error: 'Mimi sign-in is required.' });
            return;
        }
        const decoded = await (0, auth_1.getAuth)().verifyIdToken(token);
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
    }
    catch (error) {
        res.status(500).send({ error: (error === null || error === void 0 ? void 0 : error.message) || String(error) });
    }
});
const escapeHtml = (value) => value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
app.get('/api/og/zine', async (req, res) => {
    var _a;
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
        const imageUrl = String(zine.coverImageUrl || ((_a = zine.contentImages) === null || _a === void 0 ? void 0 : _a[0]) || 'https://raw.githubusercontent.com/Aris-A-C/mimi-assets/main/mimi_logo_new.png');
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
    }
    catch (error) {
        res.status(500).send({ error: (error === null || error === void 0 ? void 0 : error.message) || String(error) });
    }
});
const pressGenerator_1 = require("./pressGenerator"); // I'll need to create this
// ... existing code ...
// Trigger endpoint for press issue generation
app.post('/api/triggerPressGeneration', async (req, res) => {
    try {
        await (0, pressGenerator_1.generateDailyPressIssue)();
        res.status(200).send({ status: 'success' });
    }
    catch (error) {
        res.status(500).send({ error: 'Failed to generate press issues' });
    }
});
exports.api = functions.https.onRequest(app);
// Scheduled pubsub jobs require Blaze + Cloud Scheduler on mimistudios.
// Use POST /api/triggerPressGeneration (above) until billing is enabled, then restore:
// export const dailyPressIssueJob = functions.pubsub.schedule('every 24 hours').onRun(async () => {
//   await generateDailyPressIssue();
// });
//# sourceMappingURL=index.js.map