"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMimiFirestore = exports.FIRESTORE_DATABASE_ID = void 0;
const firestore_1 = require("firebase-admin/firestore");
/**
 * Client + Vercel Admin target this named DB. `(default)` does not exist on
 * project mimistudios — using getFirestore() with no id breaks profile/billing writes.
 */
exports.FIRESTORE_DATABASE_ID = process.env.FIREBASE_FIRESTORE_DATABASE_ID ||
    "ai-studio-mimi-4c383b50-c596-4b43-8a2e-61d0645e590a";
let cached = null;
const getMimiFirestore = () => {
    if (!cached) {
        cached = (0, firestore_1.getFirestore)(exports.FIRESTORE_DATABASE_ID);
    }
    return cached;
};
exports.getMimiFirestore = getMimiFirestore;
//# sourceMappingURL=firestore.js.map