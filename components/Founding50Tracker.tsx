import React, { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';

const Founding50Tracker: React.FC = () => {
 const [count, setCount] = useState<number | null>(null);

 useEffect(() => {
 const docRef = doc(db, 'stats', 'patron_count');
 const unsubscribe = onSnapshot(docRef, (doc) => {
 if (doc.exists()) {
 setCount(doc.data().count);
 }
 }, (error) => {
 // Suppress warning for permission errors which are expected in some environments
 if (error.code !== 'permission-denied') {
 console.warn("MIMI // Patron count unavailable:", error.message);
 }
 setCount(null);
 });

 return () => unsubscribe();
 }, []);

 if (count === null || count >= 50) return null;

 return (
 <div className="px-6 py-2">
 <span className="font-sans text-[8px] uppercase tracking-widest font-black text-amber-500 animate-pulse">
 {50 - count} / 50 slots remain
 </span>
 </div>
 );
};

export default Founding50Tracker;
