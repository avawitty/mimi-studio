import React from 'react';
import { motion } from 'motion/react';
import { X, Plus, Trash2, Loader2 } from 'lucide-react';
import { UserProfile } from '../types';

interface CollabModalProps {
 isOpen: boolean;
 onClose: () => void;
 collabSearchTerm: string;
 setCollabSearchTerm: (term: string) => void;
 handleSearchCollaborators: () => void;
 isSearchingCollab: boolean;
 collabSearchResults: UserProfile[];
 handleAddCollaborator: (uid: string) => void;
 collabProfiles: UserProfile[];
 handleRemoveCollaborator: (uid: string) => void;
}

export const CollabModal: React.FC<CollabModalProps> = ({
 isOpen, onClose, collabSearchTerm, setCollabSearchTerm, handleSearchCollaborators,
 isSearchingCollab, collabSearchResults, handleAddCollaborator, collabProfiles, handleRemoveCollaborator
}) => {
 if (!isOpen) return null;
 return (
 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[7000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
 <div className="bg-nous-base p-8 rounded-none max-w-lg w-full space-y-6 border border-nous-border">
 <div className="flex justify-between items-center border-b border-nous-border pb-4">
 <h3 className="font-serif italic text-2xl text-nous-text">Manage Collaborators.</h3>
 <button onClick={onClose}><X size={20} className="text-nous-subtle hover:text-nous-subtle"/></button>
 </div>
 <div className="space-y-4">
 <div className="flex gap-2">
 <input 
 value={collabSearchTerm} 
 onChange={e => setCollabSearchTerm(e.target.value)} 
 placeholder="Search by handle..."
 className="flex-1 bg-nous-base/50 border border-nous-border p-3 font-mono text-sm focus:outline-none focus:border-nous-border dark:focus:border-nous-border rounded-none text-nous-subtle placeholder:text-nous-subtle"
 />
 <button onClick={handleSearchCollaborators} className="px-4 py-2 bg-nous-base0 text-black rounded-none font-mono text-[9px] uppercase font-bold tracking-widest hover:bg-stone-600 transition-colors">Search</button>
 </div>
 {isSearchingCollab && <Loader2 size={20} className="animate-spin text-nous-subtle mx-auto"/>}
 <div className="space-y-2 max-h-60 overflow-y-auto">
 {collabSearchResults.map(profile => (
 <div key={profile.uid} className="flex justify-between items-center p-2 border border-nous-border rounded-none">
 <span className="font-mono text-sm text-nous-subtle">{profile.handle}</span>
 <button onClick={() => handleAddCollaborator(profile.uid)} className="text-nous-subtle hover:text-nous-subtle"><Plus size={16} /></button>
 </div>
 ))}
 </div>
 <div className="border-t border-nous-border pt-4 space-y-2">
 <h4 className="font-mono text-[9px] uppercase tracking-widest font-bold text-nous-subtle">Current Collaborators</h4>
 {collabProfiles.map(profile => (
 <div key={profile.uid} className="flex justify-between items-center p-2 border border-nous-border rounded-none">
 <span className="font-mono text-sm text-nous-subtle">{profile.handle}</span>
 <button onClick={() => handleRemoveCollaborator(profile.uid)} className="text-red-500 hover:text-red-400"><Trash2 size={16} /></button>
 </div>
 ))}
 </div>
 </div>
 </div>
 </motion.div>
 );
};
