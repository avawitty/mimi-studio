import React from 'react';
import { motion } from 'motion/react';
import { Heart, Shield, BookOpen, Users, Sparkles } from 'lucide-react';

export const CommunityManifesto: React.FC = () => {
 return (
 <div className="flex-1 h-full overflow-y-auto no-scrollbar p-6 md:p-12 bg-nous-base">
 <div className="max-w-4xl mx-auto space-y-16 pb-32">
 
 {/* Header */}
 <header className="text-center space-y-6 pt-12">
 <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-none border border-nous-border/20 bg-nous-base0/5 text-nous-subtle">
 <Heart size={12} />
 <span className="font-sans text-[8px] uppercase tracking-[0.4em] font-black">Our Ethos</span>
 </div>
 <h1 className="font-serif text-5xl md:text-7xl italic tracking-tighter text-nous-text  leading-none">
 The Manifesto.
 </h1>
 <p className="font-serif italic text-xl text-nous-subtle max-w-2xl mx-auto leading-relaxed">
 Feminine power and softness. Playful curiosity. We prioritize clarity over cool, and intimacy over scale.
 </p>
 </header>

 {/* Brand Pillars */}
 <section className="space-y-8">
 <div className="flex items-center gap-4 border-b border-nous-border pb-4">
 <Sparkles size={20} className="text-nous-subtle"/>
 <h2 className="font-sans text-xs uppercase tracking-[0.3em] font-black text-nous-subtle">Brand Pillars</h2>
 </div>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div className="p-8 border border-nous-border bg-white space-y-4">
 <h3 className="font-serif italic text-2xl text-nous-text text-nous-text">Embodiment</h3>
 <p className="font-sans text-sm text-nous-subtle leading-relaxed">
 Real life, not just AI aesthetics. We ground our digital creations in physical reality, honoring the messy, beautiful truth of lived experience.
 </p>
 </div>
 <div className="p-8 border border-nous-border bg-white space-y-4">
 <h3 className="font-serif italic text-2xl text-nous-text text-nous-text">Intimacy</h3>
 <p className="font-sans text-sm text-nous-subtle leading-relaxed">
 Smallness is a feature. We reject the pressure to scale infinitely. True connection happens in quiet, curated spaces.
 </p>
 </div>
 <div className="p-8 border border-nous-border bg-white space-y-4">
 <h3 className="font-serif italic text-2xl text-nous-text text-nous-text">Craft</h3>
 <p className="font-sans text-sm text-nous-subtle leading-relaxed">
 Zine energy meets editorial standards. We care about the details—typography, pacing, and the tactile feel of our digital artifacts.
 </p>
 </div>
 <div className="p-8 border border-nous-border bg-white space-y-4">
 <h3 className="font-serif italic text-2xl text-nous-text text-nous-text">Consent</h3>
 <p className="font-sans text-sm text-nous-subtle leading-relaxed">
 Boundaries, moderation, and safety. We protect our peace and the peace of our community. No fake urgency. No harsh perfectionism.
 </p>
 </div>
 </div>
 </section>

 {/* Editorial Standards */}
 <section className="space-y-8">
 <div className="flex items-center gap-4 border-b border-nous-border pb-4">
 <BookOpen size={20} className="text-nous-subtle"/>
 <h2 className="font-sans text-xs uppercase tracking-[0.3em] font-black text-nous-subtle">Editorial Standards</h2>
 </div>
 <div className="bg-white border border-nous-border p-8 md:p-12 space-y-8">
 <div className="space-y-4">
 <h3 className="font-serif italic text-2xl text-nous-text text-nous-text">Two Tempos</h3>
 <p className="font-sans text-sm text-nous-subtle leading-relaxed">
 We design for two distinct reading experiences. The <strong>Short Read (2–4 min)</strong> is punchy, clear, and highly visual. The <strong>Slow Read (10–15 min)</strong> is deep, expansive, and invites lingering reflection. Choose your tempo.
 </p>
 </div>
 <div className="space-y-4">
 <h3 className="font-serif italic text-2xl text-nous-text text-nous-text">Taste Without Cruelty</h3>
 <p className="font-sans text-sm text-nous-subtle leading-relaxed">
 Our guidelines for feedback and critique. We believe in rigorous aesthetic standards, but we deliver them with warmth. Critique the work, not the worth. Offer pathways for evolution, not dead ends.
 </p>
 </div>
 <div className="pt-6 border-t border-nous-border">
 <button className="font-sans text-[10px] uppercase tracking-widest font-black text-nous-subtle hover:text-nous-text hover:text-nous-text transition-colors flex items-center gap-2">
 Download Contributor Style Sheet <span className="text-nous-subtle">→</span>
 </button>
 </div>
 </div>
 </section>

 {/* Community Strategy */}
 <section className="space-y-8">
 <div className="flex items-center gap-4 border-b border-nous-border pb-4">
 <Shield size={20} className="text-nous-subtle"/>
 <h2 className="font-sans text-xs uppercase tracking-[0.3em] font-black text-nous-subtle">The Circle (Beta)</h2>
 </div>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 <div className="p-6 border border-nous-border bg-white space-y-3">
 <Users size={16} className="text-nous-subtle mb-4"/>
 <h3 className="font-serif italic text-lg text-nous-text text-nous-text">Weekly Rituals</h3>
 <p className="font-sans text-xs text-nous-subtle leading-relaxed">
 Join our"1 prompt, 3 responses"exercise or drop into the"Open Studio"to co-create in silence.
 </p>
 </div>
 <div className="p-6 border border-nous-border bg-white space-y-3">
 <Shield size={16} className="text-nous-subtle mb-4"/>
 <h3 className="font-serif italic text-lg text-nous-text text-nous-text">Trusted Moderation</h3>
 <p className="font-sans text-xs text-nous-subtle leading-relaxed">
 A small team of trusted moderators ensures safety. We maintain a clear, transparent reporting flow.
 </p>
 </div>
 <div className="p-6 border border-nous-border bg-white space-y-3">
 <Heart size={16} className="text-nous-subtle mb-4"/>
 <h3 className="font-serif italic text-lg text-nous-text text-nous-text">Aligned Partnerships</h3>
 <p className="font-sans text-xs text-nous-subtle leading-relaxed">
 We collaborate with creators who share our micro-audience ethos for special co-issue releases.
 </p>
 </div>
 </div>
 </section>

 </div>
 </div>
 );
};
