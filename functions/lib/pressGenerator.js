"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateDailyPressIssue = void 0;
const commerceService_1 = require("./commerceService");
const firestore_1 = require("./firestore");
const generateDailyPressIssue = async () => {
    const db = (0, firestore_1.getMimiFirestore)();
    const usersSnapshot = await db.collection('users').get();
    for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        const userData = userDoc.data();
        if (!userData.tasteVector)
            continue;
        const pressIssue = await (0, commerceService_1.getPersonalizedEdit)(userId, userData.tasteVector);
        await db.collection('pressIssues').add(pressIssue);
        console.log(`Generated press issue for user ${userId}`);
    }
};
exports.generateDailyPressIssue = generateDailyPressIssue;
//# sourceMappingURL=pressGenerator.js.map