import React from 'react';
import { useUser } from '../contexts/UserContext';
import { Sparkles } from 'lucide-react';

export const ManifestIdentityGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
 const { user, loading, login } = useUser();

 // 1. Still loading the Firebase handshake
 if (loading) return null; 

 // 2. User is a Ghost (Anonymous) - They must anchor before subscribing
 if (!user || user.isAnonymous) {
 return (
 <div className="flex flex-col items-center justify-center p-8 border border-nous-border/20 bg-nous-base/40 rounded-none backdrop-blur-md">
 <Sparkles className="w-8 h-8 text-nous-subtle mb-4 animate-pulse"/>
 <h3 className="font-serif italic text-xl text-nous-text mb-2">Identity Required</h3>
 <p className="text-nous-subtle text-sm text-center mb-6 max-w-xs">
 To bridge into a subscription, your memory must be anchored to a Sovereign Identity.
 </p>
 <button 
 onClick={() => {
   window.dispatchEvent(new CustomEvent('mimi:open_gateway'));
 }}
 className="px-6 py-3 bg-nous-base0 hover:bg-stone-400 text-black font-sans text-[10px] uppercase tracking-widest font-black transition-colors"
 >
 Anchor Identity
 </button>
 </div>
 );
 }

 // 3. User is Anchored (Google Auth) - Show the checkout/subscription content
 return <>{children}</>;
};
