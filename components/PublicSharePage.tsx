import React, { useEffect, useState } from 'react';
import { getUserByHandle } from '../services/firebaseUtils';
import { UserProfile } from '../types';
import { Share2 } from 'lucide-react';
import { injectZineSEO } from '../utils/seoHelper';

const SEOInjector: React.FC<{ profile: UserProfile }> = ({ profile }) => {
  injectZineSEO({
    title: `@${profile.handle}`,
    description: profile.tasteProfile?.semantic_signature || "Aesthetic Profile",
    imageUrl: profile.photoURL || "https://raw.githubusercontent.com/Aris-A-C/mimi-assets/main/mimi_logo_new.png",
    authorName: profile.handle,
    publishDate: new Date().toISOString(),
  });
  return null;
};

export const PublicSharePage: React.FC = () => {
 const [profile, setProfile] = useState<UserProfile | null>(null);
 const [loading, setLoading] = useState(true);
 const handle = window.location.pathname.split('/@')[1];

 useEffect(() => {
 const fetchProfile = async () => {
 if (handle) {
 const p = await getUserByHandle(handle);
 setProfile(p);
 }
 setLoading(false);
 };
 fetchProfile();
 }, [handle]);

 if (loading) return <div className="h-screen flex items-center justify-center font-serif italic text-nous-subtle">Manifesting...</div>;
 if (!profile) return <div className="h-screen flex items-center justify-center font-serif italic text-nous-subtle">Registry not found.</div>;

 return (
 <div className="min-h-screen bg p-8 md:p-16 flex flex-col items-center">
 <SEOInjector profile={profile} />
 <div className="max-w-2xl w-full space-y-8">
 <div className="text-center space-y-2">
 <h1 className="font-header italic text-5xl text-nous-text ">@{profile.handle}</h1>
 <p className="font-sans text-[10px] uppercase tracking-[0.4em] text-nous-subtle font-black">Sovereign Identity</p>
 </div>
 
 <div className="w-full bg-white rounded-none border border-nous-border p-8">
 <h2 className="font-serif italic text-2xl text-nous-text text-nous-text mb-2">Aesthetic Identity</h2>
 <p className="font-sans text-[10px] uppercase tracking-widest text-nous-subtle mb-6">Semantic Baseline</p>

 {profile?.tasteProfile ? (
 <div className="space-y-6">
 <div>
 <h3 className="text-[10px] uppercase tracking-widest font-mono text-nous-subtle mb-3">Dominant Archetypes</h3>
 <div className="flex flex-wrap gap-2">
 {profile.tasteProfile.dominant_archetypes.map((archetype, i) => (
 <span key={i} className="px-4 py-2 bg-nous-base text-nous-text text-xs font-mono rounded-none border border-nous-border">
 {archetype}
 </span>
 ))}
 </div>
 </div>
 {profile.tasteProfile.constraints && profile.tasteProfile.constraints.length > 0 && (
 <div>
 <h3 className="text-[10px] uppercase tracking-widest font-mono text-nous-subtle mb-3">Constraints</h3>
 <div className="flex flex-wrap gap-2">
 {profile.tasteProfile.constraints.map((constraint, i) => (
 <span key={i} className="px-4 py-2 bg-nous-base /50 text-nous-subtle text-xs font-mono rounded-none border border-nous-border">
 {constraint}
 </span>
 ))}
 </div>
 </div>
 )}
 </div>
 ) : (
 <div className="text-center p-8 border border-dashed border-nous-border rounded-none">
 <p className="font-mono text-xs text-nous-subtle uppercase tracking-widest">No Graph Data Detected</p>
 </div>
 )}
 </div>

 <div className="p-6 border border-nous-border rounded-none bg-nous-base /50">
 <h3 className="font-sans text-[10px] uppercase tracking-widest font-black text-nous-subtle mb-4">Aesthetic Profile</h3>
 <p className="font-serif italic text-nous-subtle leading-relaxed">
 {profile.tasteProfile?.semantic_signature ||"This registry has not yet manifested a descriptive signature."}
 </p>
 </div>

 <button 
 onClick={() => navigator.clipboard.writeText(window.location.href).catch(e => console.error("MIMI // Clipboard error", e))}
 className="w-full py-4 bg-nous-base  text-white rounded-none font-sans text-[10px] uppercase tracking-[0.4em] font-black flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
 >
 <Share2 size={14} /> Share Taste Graph
 </button>
 </div>
 </div>
 );
};
