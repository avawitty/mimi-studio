import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Send, User, Clock, Loader2, X, Flag, Trash2 } from 'lucide-react';
import { t } from '../lib/i18n';
import { LoadingSkeleton } from './LoadingSkeleton';
import { useUser } from '../contexts/UserContext';
import { db } from '../services/firebaseInit';
import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, logFirestoreError, OperationType } from '../services/firebaseUtils';

interface Comment {
 id: string;
 zineId: string;
 userId: string;
 userHandle: string;
 text: string;
 timestamp: number;
}

export const ZineComments: React.FC<{ zineId: string; onClose?: () => void }> = ({ zineId, onClose }) => {
 const { user, profile } = useUser();
 const [comments, setComments] = useState<Comment[]>([]);
 const [newComment, setNewComment] = useState('');
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [isLoading, setIsLoading] = useState(true);
 const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
 const [confirmReportId, setConfirmReportId] = useState<string | null>(null);

 useEffect(() => {
 if (!zineId) return;
 
 const q = query(
 collection(db, 'zine_comments'),
 where('zineId', '==', zineId)
 );

 console.log("MIMI // Fetching comments for zineId:", zineId);

 const unsubscribe = onSnapshot(q, (snapshot) => {
 console.log("MIMI // Snapshot received, docs:", snapshot.docs.length);
 const fetchedComments = snapshot.docs.map(doc => ({
 id: doc.id,
 ...doc.data()
 })) as Comment[];
 setComments(fetchedComments.sort((a, b) => a.timestamp - b.timestamp));
 setIsLoading(false);
 }, (error) => {
 logFirestoreError(error, OperationType.LIST, 'zine_comments');
 setIsLoading(false);
 });

 return () => unsubscribe();
 }, [zineId]);

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!newComment.trim() || !user) return;

 setIsSubmitting(true);
 try {
 await addDoc(collection(db, 'zine_comments'), {
 zineId,
 userId: user.uid,
 userHandle: profile?.handle || 'Anonymous',
 text: newComment.trim(),
 timestamp: Date.now()
 });
 setNewComment('');
 } catch (error) {
 handleFirestoreError(error, OperationType.CREATE, 'zine_comments');
 } finally {
 setIsSubmitting(false);
 }
 };

 const handleDelete = async (commentId: string) => {
 try {
 const { deleteDoc, doc } = await import('firebase/firestore');
 await deleteDoc(doc(db, 'zine_comments', commentId));
 setConfirmDeleteId(null);
 } catch (error) {
 console.error("Failed to delete comment", error);
 }
 };

 const handleReport = async (commentId: string) => {
 try {
 await addDoc(collection(db, 'reports'), {
 type: 'comment',
 targetId: commentId,
 reportedBy: user?.uid || 'anonymous',
 timestamp: Date.now()
 });
 window.dispatchEvent(new CustomEvent('mimi:registry_alert', { detail: { message:"Refraction reported to moderation.", icon: <Flag size={14} /> } }));
 setConfirmReportId(null);
 } catch (error) {
 console.error("Failed to report comment", error);
 }
 };

 return (
 <div className="w-full max-w-2xl mx-auto bg-nous-base border border-nous-border rounded-none overflow-hidden flex flex-col h-[600px] max-h-[80vh]">
 {/* Header */}
 <div className="p-4 border-b border-nous-border flex justify-between items-center bg-nous-base dark:bg">
 <div className="flex items-center gap-2 text-nous-subtle">
 <MessageSquare size={16} />
 <span className="font-sans text-[10px] uppercase tracking-[0.2em] font-bold">Collaborative Discourse</span>
 </div>
 {onClose && (
 <button onClick={onClose} className="text-nous-subtle hover:text-nous-text hover:text-nous-text transition-colors">
 <X size={16} />
 </button>
 )}
 </div>

 {/* Comment List */}
 <div className="flex-1 overflow-y-auto p-6 space-y-6 bg dark:bg">
 {isLoading ? (
 <div className="flex justify-center items-center h-full opacity-50">
 <LoadingSkeleton lines={4} className="w-full max-w-md"/>
 </div>
 ) : comments.length === 0 ? (
 <div className="flex flex-col items-center justify-center h-full opacity-40 text-center space-y-4">
 <MessageSquare size={32} className="text-nous-subtle"/>
 <p className="font-serif italic text-lg text-nous-subtle">{t('empty.comments')}</p>
 </div>
 ) : (
 <AnimatePresence initial={false}>
 {comments.map((comment) => (
 <motion.div
 key={comment.id}
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 className="flex gap-4 group"
 >
 <div className="w-8 h-8 rounded-none bg-stone-200 flex items-center justify-center flex-shrink-0">
 <User size={14} className="text-nous-subtle"/>
 </div>
 <div className="flex-1 space-y-1">
 <div className="flex items-baseline gap-2">
 <span className="font-sans text-[10px] uppercase tracking-widest font-bold text-nous-text">
 @{comment.userHandle}
 </span>
 <span className="font-mono text-[8px] text-nous-subtle flex items-center gap-1">
 <Clock size={8} />
 {new Date(comment.timestamp).toLocaleDateString()}
 </span>
 </div>
 <p className="font-serif text-sm md:text-base text-nous-subtle leading-relaxed">
 {comment.text}
 </p>
 <div className="flex items-center gap-4 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
 {user && user.uid === comment.userId ? (
 confirmDeleteId === comment.id ? (
 <div className="flex items-center gap-2">
 <span className="text-[9px] font-mono uppercase tracking-widest text-nous-subtle">Confirm delete?</span>
 <button onClick={() => handleDelete(comment.id)} className="text-[9px] font-mono uppercase tracking-widest text-red-500 hover:text-red-600 transition-colors">Yes</button>
 <button onClick={() => setConfirmDeleteId(null)} className="text-[9px] font-mono uppercase tracking-widest text-nous-subtle hover:text-nous-subtle transition-colors">No</button>
 </div>
 ) : (
 <button onClick={() => setConfirmDeleteId(comment.id)} className="flex items-center gap-1 text-[9px] font-mono uppercase tracking-widest text-red-500 hover:text-red-600 transition-colors">
 <Trash2 size={10} /> Delete
 </button>
 )
 ) : (
 confirmReportId === comment.id ? (
 <div className="flex items-center gap-2">
 <span className="text-[9px] font-mono uppercase tracking-widest text-nous-subtle">Confirm report?</span>
 <button onClick={() => handleReport(comment.id)} className="text-[9px] font-mono uppercase tracking-widest text-red-500 hover:text-red-600 transition-colors">Yes</button>
 <button onClick={() => setConfirmReportId(null)} className="text-[9px] font-mono uppercase tracking-widest text-nous-subtle hover:text-nous-subtle transition-colors">No</button>
 </div>
 ) : (
 <button onClick={() => setConfirmReportId(comment.id)} className="flex items-center gap-1 text-[9px] font-mono uppercase tracking-widest text-nous-subtle hover:text-nous-subtle transition-colors">
 <Flag size={10} /> Report
 </button>
 )
 )}
 </div>
 </div>
 </motion.div>
 ))}
 </AnimatePresence>
 )}
 </div>

 {/* Input Area */}
 <div className="p-4 border-t border-nous-border bg-nous-base">
 {user ? (
 <form onSubmit={handleSubmit} className="relative">
 <textarea
 value={newComment}
 onChange={(e) => setNewComment(e.target.value)}
 placeholder="Add a refraction to the discourse..."
 className="w-full bg-nous-base dark:bg border border-nous-border rounded-none py-3 pl-4 pr-12 font-serif text-sm md:text-base focus:outline-none focus:border-nous-border dark:focus:border-nous-border dark:focus:border-nous-border transition-colors resize-none h-24"
 onKeyDown={(e) => {
 if (e.key === 'Enter' && !e.shiftKey) {
 e.preventDefault();
 handleSubmit(e);
 }
 }}
 />
 <button
 type="submit"
 disabled={!newComment.trim() || isSubmitting}
 className="absolute bottom-3 right-3 p-2 bg-nous-base  text-nous-base rounded-none hover:bg-nous-base0 0 hover:text-nous-text transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
 >
 {isSubmitting ? <Loader2 size={14} className="animate-spin"/> : <Send size={14} />}
 </button>
 </form>
 ) : (
 <div className="text-center py-4 bg-nous-base dark:bg border border-nous-border rounded-none">
 <p className="font-sans text-[10px] uppercase tracking-widest text-nous-subtle">
 Authentication required to participate in discourse.
 </p>
 </div>
 )}
 </div>
 </div>
 );
};
