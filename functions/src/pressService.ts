import { PressIssue } from './types';
import { getMimiFirestore } from './firestore';

const PRESS_ISSUES_COLLECTION = 'pressIssues';

export const createPressIssue = async (issue: Omit<PressIssue, 'id'>): Promise<string> => {
  const db = getMimiFirestore();
  const docRef = await db.collection(PRESS_ISSUES_COLLECTION).add(issue);
  return docRef.id;
};
