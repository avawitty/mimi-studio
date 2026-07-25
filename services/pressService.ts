/**
 * PRESS SERVICE: The Aesthetic Intelligence Infrastructure
 * * CONCEPTUAL FRAMEWORK:
 * This service is the core of "The Edit"—shifting from traditional demographic 
 * targeting to "Aesthetic Vector Matching." It functions as a Taste-First 
 * search engine designed for resonance over scale.
 * * IMPLEMENTATION ROADMAP:
 * Phase 1: Data Density - Every archival item is automatically embedded via Gemini
 * to create a robust user 'tasteVector'.
 * Phase 2: Product Embedding Engine - Product feeds are ingested and classified
 * into the same Aesthetic Vector Space.
 * Phase 3: Editorial Synthesis - Dynamic generation of narratives matching 
 * user Taste DNA with matched products.
 * Phase 4: Taste Market - Brands bid to enter specific aesthetic clusters 
 * rather than demographics.
 * * FUTURE: Taste Prediction - Utilizing the "Drift" algorithm to forecast 
 * aesthetic shifts by analyzing vector velocity over time.
 */

import { PressIssue } from '../types';
import { db } from './firebaseInit';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  limit, 
  getDocs, 
  where 
} from 'firebase/firestore';
import { handleFirestoreError, OperationType } from './firestoreErrorHandling';

const PRESS_ISSUES_COLLECTION = 'pressIssues';

/**
 * Creates a new pressIssue document in Firestore.
 * This is used by the daily automated press generation job to store 
 * personalized editorial content, signal strength, and trajectory IDs.
 * * @param issue - The press issue data excluding the auto-generated ID.
 * @returns The ID of the created document.
 */
export const createPressIssue = async (issue: Omit<PressIssue, 'id'>): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, PRESS_ISSUES_COLLECTION), issue);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, PRESS_ISSUES_COLLECTION);
  }
};

/**
 * Retrieves the latest generated press issue for a specific user.
 * This powers the "The Edit" view, providing the most recent aesthetic 
 * synthesis and product matches.
 * * @param userId - The ID of the user whose edit to fetch.
 * @returns The latest PressIssue or null if none exist.
 */
export const getLatestPressIssue = async (userId?: string): Promise<PressIssue | null> => {
  let q;
  
  if (userId) {
    q = query(
      collection(db, PRESS_ISSUES_COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(1)
    );
  } else {
    // Fallback to global latest if no user ID provided
    q = query(
      collection(db, PRESS_ISSUES_COLLECTION),
      orderBy('createdAt', 'desc'),
      limit(1)
    );
  }

  let querySnapshot;
  try {
    querySnapshot = await getDocs(q);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, PRESS_ISSUES_COLLECTION);
  }

  if (querySnapshot.empty) {
    return null;
  }

  const doc = querySnapshot.docs[0];
  const data = doc.data() as any;
  return { id: doc.id, ...data } as PressIssue;
};

/**
 * Internal utility to log "Drift" signals for Taste Prediction.
 * (Placeholder for Phase 4 implementation)
 */
export const logTasteDrift = async (userId: string, vectorShift: number) => {
  // Logic to track how a user's taste is evolving over time
  console.log(`Tracking aesthetic drift for ${userId}: ${vectorShift}`);
};