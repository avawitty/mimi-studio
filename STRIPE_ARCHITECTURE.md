# Stripe Integration Architecture

Maison Mimi Patronage uses **Stripe Billing + Checkout Sessions + Customer Portal**, with
canonical memberships and recurring credit grants reconciled into Neon Postgres by
server webhook handlers. Firestore writes are a compatibility fallback only when the
canonical operational database is not configured.

## Product catalog (best practice)

Model **one Stripe Product per patronage tier**, with monthly and annual Prices on each:

| Tier | Role | Monthly | Annual (~2 mo free) | Credits / cycle |
| --- | --- | --- | --- | --- |
| The Initiation | Interpreter | $12 | $120 | 500 |
| Optioning | Tailor | $25 | $250 | 1,500 |
| The Atelier | Couturier | $40 | $400 | 3,000 |
| The Lab | Maison | $99 | $990 | 10,000 |

Do **not** put different tiers on a single Product — Checkout/invoice line items show the
Product name, so shared products make tiers indistinguishable.

Canonical **live** price IDs live in `constants.ts` (`STRIPE_PRICES` / `STRIPE_PRICES_ANNUAL`)
for account `acct_1T0fAo9AUz0q2nVC` and can be overridden with `STRIPE_PRICE_*` /
`STRIPE_PRICE_*_ANNUAL` env vars.

| Tier | Product | Monthly Price | Annual Price |
| --- | --- | --- | --- |
| The Initiation | `prod_UfElsz9OHHpgEd` | `price_1TfuI49AUz0q2nVCHuy4k4Sq` | `price_1Tzntj9AUz0q2nVCO66J6Wps` |
| Optioning | `prod_UfqKthj95UDo7m` | `price_1TgUdR9AUz0q2nVC1EoBOgBi` | `price_1Tznti9AUz0q2nVC83IIz3KG` |
| The Atelier | `prod_UfGndT7RktzUlE` | `price_1TgVQC9AUz0q2nVC5POSYpI7` | `price_1Tznti9AUz0q2nVCo7L96nzL` |
| The Lab | `prod_UfGsM5PmAimbKy` | `price_1TfwLC9AUz0q2nVCxNzPtunX` | `price_1Tzntj9AUz0q2nVCsBYJKVze` |

**Customer Portal:** run once with a live secret key:

```bash
STRIPE_SECRET_KEY=sk_live_... node scripts/configure-stripe-portal.mjs
```

That pins the four products (monthly + annual), sets upgrade proration to
`create_prorations`, schedules downgrades at period end, and points return/privacy/terms
at mimizine.app. Cancel at period end is already enabled.

## Checkout (new subscribers)

1. Client calls `POST /api/create-checkout-session` with `{ plan, interval }` and a Firebase ID token (`services/stripe.ts`).
2. Server verifies the session, creates or reuses a Stripe Customer (`stripeCustomerId` on the user doc), then creates a Checkout Session:
   - `mode: 'subscription'`
   - `integration_identifier` for Dashboard funnel tracking
   - `allow_promotion_codes: true`
   - `billing_address_collection: 'auto'`
   - **no** `payment_method_types` (dynamic payment methods from Dashboard)
3. Webhooks (`/api/stripe-webhook`) verify the Stripe signature, claim the event in
   Neon, map the Stripe price to a canonical Mimi plan, update membership, and issue
   the period grant exactly once.

Neon reconciliation is a controlled cutover:
`MIMI_NEON_STRIPE_RECONCILIATION=1` is enabled only after migrations and
reconciliation checks pass. Subscription checkout establishes identity and
membership; `invoice.payment_succeeded` issues the exact SKU/cadence allowance,
so checkout and invoice events cannot double-mint.

## Plan changes (existing subscribers)

If the user already has an active paid subscription, `create-checkout-session` returns a
**Customer Portal** session instead of a second Checkout Session. That avoids double
subscriptions and lets Stripe handle proration, payment method updates, and cancellation.
Before opening Checkout, the server also expires prior open subscription sessions,
rechecks Stripe for non-terminal subscriptions, and uses a customer-scoped Stripe
idempotency key so concurrent plan clicks cannot leave two billable sessions.

Portal entry points:
- Memberships page “Manage billing”
- Checkout success “Manage Subscription”
- Profile billing controls
- `POST /api/create-billing-portal-session`

Configure allowed products/prices and proration behavior in the Stripe Dashboard →
Customer Portal settings.

## Webhooks & entitlements

Handled events:
- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`

Idempotency: events are claimed by Stripe event ID in
`mimi.stripe_webhook_events` before membership or grant writes.

Transactional writes:
- `mimi.memberships`
- `mimi.credit_accounts`
- `mimi.credit_grant_buckets`
- append-only `mimi.credit_ledger_entries`
- `mimi.stripe_webhook_events`

Generation credits are an **in-app allowance** refreshed on successful invoice/period
boundaries. Credit reservation/commit/release is server-authoritative in Neon. If Mimi
later sells true usage-based overage billing, evaluate Stripe Metronome separately;
do not make Stripe subscription state the real-time in-app balance.

### Entitlement helper contract

New server feature gates use the canonical plan and entitlement service. Existing
catalog helpers remain boundary adapters while legacy labels are migrated:

| Export | Role |
| --- | --- |
| `MIMI_PRICE_ID_PLAN_MAP` | Stripe Price ID → plan (live + legacy/sandbox IDs) |
| `canonicalPlanFromLegacy(...)` | Map legacy checkout labels to `free | trial | creator | studio | team` |
| `CreditService` | Effective entitlement, account, and period grant |

Keep price IDs in sync with `constants.ts` and Stripe Price metadata. Do not persist
legacy plan labels into new Neon membership records.

## Tax

Do **not** enable `automatic_tax` until an active Stripe Tax registration exists for the
relevant jurisdictions. Enabling the flag without a registration silently collects $0 tax.

## Environment

| Var | Purpose |
| --- | --- |
| `STRIPE_SECRET_KEY` | Server secret (prefer restricted key `rk_` in production) |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature verification |
| `MIMI_NEON_STRIPE_RECONCILIATION` | Explicit `1` after Neon cutover readiness |
| `STRIPE_PRICE_*` / `*_ANNUAL` | Optional price ID overrides |
| `MIMI_PUBLIC_BASE_URL` | Success / cancel / portal return URLs |

## UI surfaces

- Full page: `SubscriptionMatrix` in `components/SovereignCommerceEngine.tsx` (`view=memberships`)
- Modal: `ImperialPatronageModal`
- Shared copy/pricing: `lib/patronageTiers.ts`
- Entitlement helpers: `lib/mimiEntitlements.ts`
