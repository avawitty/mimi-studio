import { doc, updateDoc, arrayUnion, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from './firebaseInit';
import { UserProfile } from '../types';

export const recordSession = async (userId: string) => {
  if (!auth.currentUser) return;
  try {
    const userRef = doc(db, 'profiles_private', userId);
    const now = Date.now();
    
    const userSnap = await getDoc(userRef);
    const userData = userSnap.exists() ? userSnap.data() : {};
    
    await setDoc(userRef, {
      lastVisitAt: now,
      visitCount: (userData.visitCount || 0) + 1,
      sessionDates: arrayUnion(now)
    }, { merge: true });

    const sessionRef = doc(collection(db, `retention_events/${userId}/sessions`), now.toString());
    await setDoc(sessionRef, { timestamp: now });
  } catch (e) {
    console.warn("MIMI // Failed to record session:", e);
  }
};

export const computeRetentionMetrics = async (userId: string) => {
  if (!auth.currentUser) return null;
  try {
    const userRef = doc(db, 'profiles_private', userId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return null;
    
    const userData = userSnap.data() as UserProfile;
    const firstVisit = userData.firstVisitAt || userData.createdAt;
    const sessionDates = userData.sessionDates || [];
    
    const d7 = sessionDates.filter(date => (date - firstVisit) >= 7 * 24 * 60 * 60 * 1000).length > 0;
    const d30 = sessionDates.filter(date => (date - firstVisit) >= 30 * 24 * 60 * 60 * 1000).length > 0;
    
    return { d7, d30 };
  } catch (e) {
    console.warn("MIMI // Failed to compute retention metrics:", e);
    return null;
  }
};
