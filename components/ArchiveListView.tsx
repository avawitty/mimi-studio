import React, { useState, useMemo } from 'react';
import { PocketItem, ZineMetadata } from '../types';
import { Trash2 } from 'lucide-react';
import { deleteLocalPocketItem, deleteLocalZine } from '../services/localArchive';

interface ArchiveListViewProps {
 items: PocketItem[];
 zines: ZineMetadata[];
 onDelete: () => void;
}

export const ArchiveListView: React.FC<ArchiveListViewProps> = ({ items, zines, onDelete }) => {
 const [sortConfig, setSortConfig] = useState<{ key: 'newest' | 'most_used' | 'recently_generated', direction: 'asc' | 'desc' }>({ key: 'newest', direction: 'desc' });

 const processedItems = useMemo(() => {
 let sorted = [...items];
 if (sortConfig.key === 'newest') {
 sorted.sort((a, b) => (sortConfig.direction === 'desc' ? b.timestamp - a.timestamp : a.timestamp - b.timestamp));
 }
 return sorted;
 }, [items, sortConfig]);

 const isUsedInZine = (itemId: string) => {
 return zines.some(zine => zine.fragmentsUsed?.includes(itemId));
 };

 const handleDelete = async (id: string, type: 'pocket' | 'zine') => {
 if (type === 'pocket') {
 await deleteLocalPocketItem(id);
 } else {
 await deleteLocalZine(id);
 }
 onDelete();
 };

 return (
 <div className="w-full p-8">
 <div className="flex gap-4 mb-8">
 <button onClick={() => setSortConfig({ key: 'newest', direction: 'desc' })} className="font-sans text-[10px] uppercase tracking-widest font-black text-nous-subtle">Newest</button>
 </div>
 <table className="w-full text-left font-sans text-[10px] uppercase tracking-widest">
 <thead>
 <tr className="border-b border-nous-border text-nous-subtle">
 <th className="p-4">Fragment</th>
 <th className="p-4">Source</th>
 <th className="p-4">Date</th>
 <th className="p-4">Used in Zine?</th>
 <th className="p-4">Action</th>
 </tr>
 </thead>
 <tbody>
 {processedItems.map(item => (
 <tr key={item.id} className="border-b border-nous-border hover:bg-nous-base">
 <td className="p-4">{(item as any).prompt || item.title || 'Untitled'}</td>
 <td className="p-4">{(item as any).origin || item.source || 'Unknown'}</td>
 <td className="p-4">{item.timestamp ? new Date(item.timestamp).toLocaleDateString() : 'N/A'}</td>
 <td className="p-4">{isUsedInZine(item.id) ? 'Yes' : 'No'}</td>
 <td className="p-4">
 <button onClick={() => handleDelete(item.id, 'pocket')} className="text-nous-subtle hover:text-red-500">
 <Trash2 size={14} />
 </button>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 );
};
