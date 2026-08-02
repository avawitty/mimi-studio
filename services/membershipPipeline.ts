import { db } from './firebaseInit';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { logFirestoreError, OperationType } from './firebaseUtils';
import { SubscriptionData, MembershipPlan } from '../types';

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
    const { auth } = await import('./firebaseInit');
    const token = await auth.currentUser?.getIdToken();
    if (!token) {
      throw new Error("Sign in required to redeem a promo.");
    }

    const response = await fetch('/api/apply-promo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'x-user-token': `Bearer ${token}`,
      },
      body: JSON.stringify({ userId: uid, code }),
    });

    const data = await response.json();
    if (!response.ok || data.applied === false) {
      // Entitlement fields are Admin-only in Firestore rules — do not forge
      // stripeCustomerId / membershipCredits from the client.
      throw new Error(data.error || "Server promo redemption failed");
    }
    return data;
  }
  throw new Error("Invalid cipher.");
};
