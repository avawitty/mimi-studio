"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPressIssue = void 0;
const firestore_1 = require("firebase-admin/firestore");
const PRESS_ISSUES_COLLECTION = 'pressIssues';
const createPressIssue = async (issue) => {
    const db = (0, firestore_1.getFirestore)();
    const docRef = await db.collection(PRESS_ISSUES_COLLECTION).add(issue);
    return docRef.id;
};
exports.createPressIssue = createPressIssue;
//# sourceMappingURL=pressService.js.map