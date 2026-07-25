# Stripe Integration & Firebase Sync Gating Architecture

## Overview
Because this system operates predominantly as a sovereign, local-first application with Firebase providing the sync layer, we do not want to manage a traditional Node.js/Express server just for Stripe webhook processing. Instead, we can rely entirely on the official **Stripe Firebase Extension**.

This keeps our application perfectly "serverless" and reduces operational overhead.

## Step 1: The Stripe Firebase Extension
To implement a "Stripe Proxy" securely without writing a custom backend:
1. Go to the Firebase Console -> **Extensions** tab.
2. Search for and install the **"Run Payments with Stripe"** extension.
3. You will connect your Stripe account. The extension will automatically create webhooks to listen for subscription events.

### How it Works:
- When a user enters their payment details, Stripe charges them.
- Stripe fires a webhook to the Firebase Extension.
- The Firebase Extension automatically writes the subscription status to your user's Firestore document (e.g., `/customers/{userId}/subscriptions/{subscriptionId}`).

## Step 2: Firebase Sync Gating (Feature Tiers)
In the application, we will gate syncing and specific premium tools by observing the Firestore subscription collection that the extension manages.

### Data Flow
1. User logs in.
2. App queries the `/customers/{userId}/subscriptions` collection.
3. If an active subscription (`status === 'active'`) exists with the "Pro" or "Lab" tier price ID, the application flags `planStatus = 'pro'`.
4. Our `UserContext.tsx` consumes this status and enables feature flags (e.g., `cloudSync: true`, `premiumModels: true`).

## Step 3: Where Does the Code Go?

1. **Client-Side Trigger (`components/PatronMintView.tsx`)**:
   Instead of redirecting to a payment link manually, the Firebase extension provides a way to generate a Stripe Checkout session by writing a document to a specific collection (e.g., `/customers/{userId}/checkout_sessions`). We listen to that document until it populates a `url` field, then redirect the user there.
   
2. **Subscription Listener (`contexts/UserContext.tsx` or `services/stripeService.ts`)**:
   We create a `useSubscription` hook that attaches an `onSnapshot` listener to the user's subscription doc. As soon as the payment clears, the real-time listener updates the UI instantly, unlocking cloud sync and the "Lab" tier features.

3. **Firestore Security Rules**:
   We will update `firestore.rules` to ensure that only users with an active tier can read/write to the broader cloud sync collections (e.g., public streams or deep history). It looks like this:
   ```javascript
   function hasActiveSub() {
     // Check if the user document has an active subscription
     return get(/databases/$(database)/documents/customers/$(request.auth.uid)).data.stripeRole in ['pro', 'lab'];
   }
   ```

## Conclusion
You don't need to write a standalone Stripe backend. We let Firebase and Stripe communicate natively through the extension, and our frontend just "listens" to Firestore to know when to unlock features!
