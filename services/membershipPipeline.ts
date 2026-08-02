import { db } from './firebaseInit';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { logFirestoreError, OperationType } from './firebaseUtils';
import { SubscriptionData, MembershipPlan } from '../types';
import { buildCreditGrant } from '../lib/mimiEntitlements';

export const fetchUserSubscription = async (uid: string): Promise<SubscriptionData | null> => {
  let retries = 3; // Reduced retries
  while (retries > 0) {
    try {
      const { doc, getDoc } = await import('firebase/firestore');
      
      const subRef = doc(db, 'users', uid, 'billing', 'subscription');
      const snap = await getDoc(subRef);
      if (snap.exists()) return snap.data() as SubscriptionData;
      return null; // Fallback to free tier
    } catch (e: any) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      const code = typeof e?.code === 'string' ? e.code : '';
      // Don't retry or reset network when quota is exhausted — that multiplies reads.
      if (
        code === 'resource-exhausted' ||
        errorMessage.includes('RESOURCE_EXHAUSTED') ||
        errorMessage.includes('Quota exceeded')
      ) {
        console.warn('MIMI // fetchUserSubscription: Firestore quota exhausted');
        return null;
      }
      if (errorMessage.includes('offline') && retries > 1) {
        console.warn(`MIMI // fetchUserSubscription: Offline error, retrying... (${retries - 1} left)`);
        const { resetFirestoreNetwork } = await import('./firebaseUtils');
        await resetFirestoreNetwork();
        // Exponential backoff
        const delay = (4 - retries) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        retries--;
        continue;
      }
      logFirestoreError(e, OperationType.GET, `users/${uid}/billing/subscription`);
      return null;
    }
  }
  return null;
};

export const syncMembershipStatus = async (uid: string, plan: MembershipPlan, subData: SubscriptionData) => {
  try {
    const subRef = doc(db, 'users', uid, 'billing', 'subscription');
    await setDoc(subRef, subData, { merge: true });
    
    const profileRef = doc(db, 'profiles_public', uid);
    await setDoc(profileRef, { membershipPlan: plan, plan: plan }, { merge: true });
  } catch (e) {
    logFirestoreError(e, OperationType.WRITE, `users/${uid}/billing/subscription`);
  }
};

export const applyPromoCode = async (uid: string, code: string) => {
  const normalizedCode = code.trim().toUpperCase().replace(/\s+/g, '');
  if (normalizedCode === 'MIMIMUSE' || code === 'AQ.Ab8RN6Lb2tRMQaHqr8ew4UEKcGRZCTOfrhXjJ6FyiJNtSdIokA' || code === 'AQ.Ab8RN6IyzxKcsBHawVk9iETDEseYnhnPb7yjfXuvYGiUbZLTqw') {
    const oneYearFromNow = Date.now() + (365 * 24 * 60 * 60 * 1000);
    
    try {
      // Try to update via server first
      const response = await fetch('/api/apply-promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid, code })
      });
      
      const data = await response.json();
      if (!response.ok) {
        // If server fails (e.g., no admin DB), fallback to client-side update
        throw new Error(data.error || "Server update failed");
      }
      return data;
    } catch (err) {
      console.warn("Server promo update failed, falling back to client update:", err);
      // Fallback to client-side update — include membershipCredits so funded
      // AI Gateway does not treat the lab seat as credits_exhausted / BYOK-only.
      const { credits: membershipCredits } = buildCreditGrant({
        plan: 'lab',
        interval: 'year',
        currentPeriodEnd: oneYearFromNow,
      });
      const subRef = doc(db, 'users', uid, 'billing', 'subscription');
      await setDoc(subRef, {
        plan: 'lab',
        status: 'active',
        currentPeriodEnd: oneYearFromNow,
        interval: 'year',
        credits: membershipCredits,
      }, { merge: true });

      const userRef = doc(db, 'users', uid);
      await setDoc(userRef, {
        planStatus: 'lab',
        plan: 'lab',
        membershipPlan: 'lab',
        mimiPlan: 'lab',
        subscriptionStatus: 'active',
        subscriptionInterval: 'year',
        membershipCredits,
      }, { merge: true });
      
      const profileRef = doc(db, 'profiles_public', uid);
      await setDoc(profileRef, {
        planStatus: 'lab',
        plan: 'lab',
        membershipPlan: 'lab',
        mimiPlan: 'lab',
        subscriptionStatus: 'active',
        membershipCredits,
      }, { merge: true });
      
      const membershipRef = doc(db, 'memberships', uid);
      await setDoc(membershipRef, {
        plan: 'lab',
        mimiPlan: 'lab',
        status: 'active',
        currentPeriodEnd: oneYearFromNow,
        stripeCustomerId: 'promo_code',
        interval: 'year',
        credits: membershipCredits,
      }, { merge: true });
      
      return { success: true, message: "1-Year Lab Access Granted (Client Fallback)." };
    }
  } else {
    throw new Error("Invalid cipher.");
  }
};
