import React, { useState } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import localFirebaseConfig from '../firebase-applet-config.json';

const firebaseConfig = {
 apiKey: localFirebaseConfig.apiKey || "AIzaSyA5ugvWqsO63IKlXDDeADLBr_aNRDMG5O8",
 authDomain: localFirebaseConfig.authDomain || "gen-lang-client-02106746-1e8ee.firebaseapp.com",
 databaseURL: `https://${localFirebaseConfig.projectId || "gen-lang-client-0210674664"}-default-rtdb.firebaseio.com`,
 projectId: localFirebaseConfig.projectId || "gen-lang-client-0210674664",
 storageBucket: localFirebaseConfig.storageBucket || "gen-lang-client-0210674664.firebasestorage.app",
 messagingSenderId: localFirebaseConfig.messagingSenderId || "98167672430",
 appId: localFirebaseConfig.appId || "1:98167672430:web:2ab61bd54e3bbc298fe07f"
};

// Initialize the app
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Old database ID
const OLD_DB_ID ="ai-studio-6d7c4a54-8086-473c-9ba1-b64d035b37c5";
// New database ID (from config)
const NEW_DB_ID ="(default)";

const oldDb = getFirestore(app, OLD_DB_ID);
const newDb = getFirestore(app, NEW_DB_ID);

// Top-level collections
const COLLECTIONS = [
 'profiles', 'stacks', 'public_transmissions', 'pocket', 'zines',
 'dossier_folders', 'dossier_artifacts', 'proposals', 'context',
 'connections', 'friend_requests', 'friendships', 'zine_comments'
];

export const MigrationUtility: React.FC = () => {
 const [progress, setProgress] = useState<Record<string, string>>({});
 const [isMigrating, setIsMigrating] = useState(false);

 const migrateCollection = async (colName: string) => {
 setProgress(p => ({ ...p, [colName]: 'Migrating...' }));
 
 try {
 const oldCol = collection(oldDb, colName);
 const snap = await getDocs(oldCol);
 
 let count = 0;
 let batch = writeBatch(newDb);
 
 for (const d of snap.docs) {
 const newDocRef = doc(newDb, colName, d.id);
 batch.set(newDocRef, d.data());
 count++;
 
 if (count % 400 === 0) {
 await batch.commit();
 batch = writeBatch(newDb);
 }
 }
 await batch.commit();
 setProgress(p => ({ ...p, [colName]: `Done (${count} docs)` }));
 } catch (e) {
 console.error(`Error migrating ${colName}:`, e);
 setProgress(p => ({ ...p, [colName]: 'Failed' }));
 }
 };

 const startMigration = async () => {
 setIsMigrating(true);
 for (const col of COLLECTIONS) {
 await migrateCollection(col);
 }
 setIsMigrating(false);
 };

 return (
 <div className="p-6 bg-nous-base border border-nous-border rounded-none space-y-4">
 <h2 className="text-xl font-bold">Migration Utility</h2>
 <p className="text-sm text-nous-subtle">
 This will migrate top-level collections from the old database to the new one.
 </p>
 <button 
 onClick={startMigration} 
 disabled={isMigrating}
 className="px-4 py-2 bg-nous-text text-nous-base rounded-none text-xs uppercase tracking-widest font-black"
 >
 {isMigrating ? 'Migrating...' : 'Start Migration'}
 </button>
 <div className="grid grid-cols-2 gap-2 text-xs">
 {COLLECTIONS.map(c => (
 <div key={c} className="p-2 bg-white border border-nous-border rounded-none">
 <span className="font-bold">{c}:</span> {progress[c] || 'Pending'}
 </div>
 ))}
 </div>
 </div>
 );
};
