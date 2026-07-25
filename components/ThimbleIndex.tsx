import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Link, ExternalLink, Activity, ArrowRight, Loader2, Image as ImageIcon } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { fetchPocketItems } from '../services/firebase';
import { PocketItem, AestheticVector } from '../types';
import { ThimbleAnalysis } from './ThimbleAnalysis';

export function ThimbleIndex() {
 const { user } = useUser();
 const [signals, setSignals] = useState<PocketItem[]>([]);
 const [isLoading, setIsLoading] = useState(true);
 const [selectedSignal, setSelectedSignal] = useState<PocketItem | null>(null);

 useEffect(() => {
 const fetchSignals = async () => {
 if (!user) return;
 try {
 const fetchedSignals = await fetchPocketItems(user.uid);
 setSignals(fetchedSignals);
 } catch (error) {
 console.error("Error fetching signals:", error);
 } finally {
 setIsLoading(false);
 }
 };
 fetchSignals();
 }, [user]);

 // Mock vectors for demonstration
 const mockUserVector: AestheticVector = { entropy: 0.5, density: 0.5, silhouette: 0.5, texture: 0.5, contrast: 0.5, temporalSignal: 0.5, expressiveness: 0.5, novelty: 0.5, tension: 0.5 };
 const mockArtifactVector: AestheticVector = { entropy: 0.7, density: 0.4, silhouette: 0.8, texture: 0.3, contrast: 0.6, temporalSignal: 0.2, expressiveness: 0.4, novelty: 0.9, tension: 0.6 };

 return (
 <div className="min-h-screen bg text p-8 font-sans">
 <header className="max-w-7xl mx-auto mb-12 flex justify-between items-end border-b border pb-6">
 <div className="flex items-center gap-6">
 <div className="w-8 h-10 border border rounded-none flex items-end justify-center pb-1 relative overflow-hidden">
 <div className="w-full h-px bg absolute bottom-2 opacity-30"></div>
 <div className="w-1 h-1 bg rounded-none mb-1"></div>
 </div>
 <h1 className="font-serif italic text-4xl">The Thimble</h1>
 </div>
 <span className="archival-stamp">Log // 2024.08.12.v2</span>
 </header>

 <main className="max-w-7xl mx-auto grid grid-cols-12 gap-8">
 <div className="col-span-8 space-y-12">
 <section>
 <h2 className="font-serif italic text-3xl mb-8">Pending Acquisitions</h2>
 <div className="grid grid-cols-2 gap-8">
 {signals.map((signal) => (
 <article 
 key={signal.id} 
 className="border border p-4 cursor-pointer hover:bg-white/50 transition-colors"
 onClick={() => setSelectedSignal(signal)}
 >
 <div className="aspect-[3/4] bg-white border border mb-4 flex items-center justify-center overflow-hidden">
 {signal.type === 'image' && signal.content.startsWith('http') ? (
 <img src={signal.content} alt="Artifact"className="w-full h-full object-cover"/>
 ) : (
 <span className="archival-stamp">Artifact</span>
 )}
 </div>
 <h3 className="font-serif text-lg italic">{signal.title || 'Untitled Artifact'}</h3>
 </article>
 ))}
 </div>
 </section>
 </div>

 <aside className="col-span-4">
 {selectedSignal ? (
 <ThimbleAnalysis 
 artifactVector={mockArtifactVector}
 userVector={mockUserVector}
 trajectoryLabel="adjacent"
 similarityScore={0.72}
 interpretation="This artifact introduces a subtle dissonance, a deviation that whispers of a different architecture. It pulls the narrative thread toward a sharper, more intentional geometry, challenging the current equilibrium of the capsule."
 onSave={() => console.log('Saved')}
 thumbnailUrl={selectedSignal.type === 'image' ? selectedSignal.content : undefined}
 />
 ) : (
 <div className="border border p-8 text-center text font-serif italic">
 Select an artifact to analyze its trajectory.
 </div>
 )}
 </aside>
 </main>
 </div>
 );
}
