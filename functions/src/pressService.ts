import { PressIssue } from './types';
import { getFirestore } from 'firebase-admin/firestore';

const PRESS_ISSUES_COLLECTION = 'pressIssues';

export const createPressIssue = async (issue: Omit<PressIssue, 'id'>): Promise<string> => {
  const db = getFirestore();
  const docRef = await db.collection(PRESS_ISSUES_COLLECTION).add(issue);
  return docRef.id;
};
