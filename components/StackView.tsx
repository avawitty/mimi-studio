import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { PocketItem, Stack } from '../types';
import { fetchStackById, fetchFragmentsByStackId } from '../services/firebase';
import { Share2, Edit2, Trash2, Plus, Zap } from 'lucide-react';

export const StackView: React.FC<{ stackId: string }> = ({ stackId }) => {
 const [stack, setStack] = useState<Stack | null>(null);
 const [fragments, setFragments] = useState<PocketItem[]>([]);

 useEffect(() => {
 const loadStack = async () => {
 const s = await fetchStackById(stackId);
 setStack(s);
 if (s) {
 const f = await fetchFragmentsByStackId(stackId);
 setFragments(f);
 }
 };
 loadStack();
 }, [stackId]);

 if (!stack) return <div className="p-8">Loading Stack...</div>;

 return (
 <div className="p-8">
 <h1 className="text-4xl font-serif italic">{stack.title}</h1>
 <p className="text-nous-subtle">{stack.description}</p>
 <div className="flex gap-4 mt-4">
 <button 
 onClick={() => {
 navigator.clipboard.writeText(window.location.href).catch(e => console.error("MIMI // Clipboard error", e));
 alert('Stack URL copied to clipboard!');
 }}
 className="flex items-center gap-2 px-4 py-2 bg-nous-base rounded-none"
 >
 <Share2 size={16}/> Share
 </button>
 <button className="flex items-center gap-2 px-4 py-2 bg-nous-base rounded-none"><Edit2 size={16}/> Edit</button>
 <button 
 onClick={() => {
 if (confirm('Are you sure you want to delete this stack?')) {
 // Implement delete logic
 }
 }}
 className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-600 rounded-none"
 >
 <Trash2 size={16}/> Delete
 </button>
 </div>
 <div className="grid grid-cols-3 gap-4 mt-8">
 {fragments.map(f => (
 <div key={f.id} className="border p-4">{f.title}</div>
 ))}
 </div>
 </div>
 );
};
