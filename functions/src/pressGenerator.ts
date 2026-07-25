import { getFirestore } from 'firebase-admin/firestore';
import { getPersonalizedEdit } from './commerceService';
import { createPressIssue } from './pressService';

export const generateDailyPressIssue = async () => {
    const db = getFirestore();
    const usersSnapshot = await db.collection('users').get();
    
    for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        const userData = userDoc.data();
        
        if (!userData.tasteVector) continue;

        const pressIssue = await getPersonalizedEdit(userId, userData.tasteVector);
        
        await db.collection('pressIssues').add(pressIssue);
        
        console.log(`Generated press issue for user ${userId}`);
    }
};
