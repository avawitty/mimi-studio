import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useUser } from '../contexts/UserContext';
import { 
  ArrowUpRight, 
  BookOpen, 
  Sparkles, 
  Mail, 
  Users, 
  BadgePercent, 
  Compass, 
  Lock, 
  Eye, 
  Check, 
  ChevronRight, 
  Bookmark, 
  Share2,
  BookmarkCheck,
  Award,
  Crown
} from 'lucide-react';

interface EditorialFrontPageProps {
  onSelectZine: (zineId: string) => void;
  onOpenGateway: () => void;
}

export const EditorialFrontPage: React.FC<EditorialFrontPageProps> = ({ onSelectZine, onOpenGateway }) => {
  const { user, profile } = useUser();
  const [emailInput, setEmailInput] = useState('');
  const [subscriptionLocked, setSubscriptionLocked] = useState(true);
  const [selectedEssay, setSelectedEssay] = useState<number | null>(null);
  const [isBookmarked, setIsBookmarked] = useState<Record<number, boolean>>({});

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput) return;
    
    // Trigger successful registration alerts simulated locally
    window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
      detail: { 
        message: "Canonical Membership Activated. Welcome.", 
        type: 'success' 
      } 
    }));
    setEmailInput('');
    setSubscriptionLocked(false);
    
    // Open standard Gateway
    onOpenGateway();
  };

  const toggleBookmark = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsBookmarked(prev => ({ ...prev, [id]: !prev[id] }));
    window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
      detail: { 
        message: isBookmarked[id] ? "Article Anchored to Memory Pool" : "Article Removed.", 
        type: 'success' 
      } 
    }));
  };

  const essays = [
    {
      id: 1,
      category: "Flagship Essay",
      title: "Soft Brutalism // Tactile Monoliths on the Latent Grid",
      tagline: "How physical weight and raw concrete digital geometry became the primary defense against over-optimized visual algorithm farms.",
      author: "Anastasia Moreau",
      date: "May 2026",
      readTime: "9 min read",
      tags: ["Soft Brutalism", "Aesthetic Theory", "Algorithmic Resistance"],
      image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
      content: "We live in an era of synthetic frictionlessness. Standard generative pipelines optimize for immediate tactile satisfaction, resulting in an endless, glossy soup of identical pixels. In this flagship study, we analyze the emergence of 'Soft Brutalism'—an artistic framework that couples deliberate physical weight (massive grids, heavy structures) with micro-textured surfaces and soft, human imperfections..."
    },
    {
      id: 2,
      category: "Editor's Briefing",
      title: "Mimi Brand Intelligence // The Rise of Off-Grid Curation",
      tagline: "B2B Analysis: Why independent creators and high-end brands are abandoning public platform algorithms for private catalog networks.",
      author: "Curation Engine",
      date: "May 24, 2026",
      readTime: "4 min read",
      tags: ["Curation Market", "Weekly Briefing", "Sovereign Web"],
      image: "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&w=800&q=80",
      content: "As direct platform discovery collapses under the burden of commercialization, the 'Pocket Curation model' becomes standard. High-conversion communities are built not on public feeds, but inside curated directories. Within this briefing, we model transaction indices and aesthetic drift indicators tracking this monumental shift..."
    },
    {
      id: 3,
      category: "Annotated Curation",
      title: "Internet Evidence File // The Materiality Checklist",
      tagline: "A live, structured mapping of style trends, sensory anchors, physical print drop details, and subculture signals.",
      author: "The Scribe Curator",
      date: "May 18, 2026",
      readTime: "6 min read",
      tags: ["Tactility", "Subculture", "Evidence Log"],
      image: "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=800&q=80",
      content: "Tactility is not a aesthetic preset, it is a protocol. In this evidence check, we catalog 18 creators using physical paper weights, coarse noise overlays, and low-frequency typography combinations to anchor high-value projects."
    }
  ];

  return (
    <div className="w-full h-full min-h-0 overflow-y-auto bg-[#FAF8F5] dark:bg-[#080808] text-stone-900 dark:text-stone-100 font-sans transition-colors duration-300 pb-32">
      
      {/* Editorial Header Block */}
      <section className="border-b border-stone-200 dark:border-stone-850 px-6 py-12 md:py-24 max-w-7xl mx-auto flex flex-col gap-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-stone-200 dark:border-stone-850 pb-8 gap-4">
          <div className="space-y-1">
            <p className="font-mono text-[9px] uppercase tracking-[0.25em] text-emerald-600 dark:text-emerald-400 font-bold">
              EST. 2026 // ESTABLISHED INDEPENDENT PUBLIC NODE
            </p>
            <h1 className="leading-none">
              <span className="sr-only">Mimi Zine</span>
              <img
                src="/brand/official/mimi-primary-wordmark-light.svg"
                alt=""
                className="w-full max-w-[34rem] h-auto object-contain object-left dark:hidden"
              />
              <img
                src="/brand/official/mimi-primary-wordmark-dark.svg"
                alt=""
                className="hidden w-full max-w-[34rem] h-auto object-contain object-left dark:block"
              />
            </h1>
          </div>
          <div className="text-left md:text-right font-mono text-[9px] uppercase tracking-wider text-stone-500 space-y-1">
            <p>ISSUE 01 // SOFT BRUTALISM</p>
            <p className="text-emerald-600 dark:text-emerald-400 font-bold">TASTE MATRIX ACTIVE CORE</p>
          </div>
        </div>

        {/* Brand Mission Statement */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-4">
          <div className="md:col-span-8">
            <p className="font-serif italic text-xl md:text-3xl text-stone-800 dark:text-stone-200 leading-snug">
              "We refuse the frictionless. In an era where algorithms flatten taste into empty averages, Mimi Zine serves as a structured, defensive archive for original creative expressions, tactile materiality, and machine-optimized discovery."
            </p>
          </div>
          <div className="md:col-span-4 flex flex-col justify-end gap-4">
            <div className="p-4 bg-stone-100 dark:bg-stone-900/50 border border-stone-200 dark:border-stone-800 rounded-none relative overflow-hidden">
              <div className="absolute top-0 right-0 p-2 opacity-5 pointer-events-none">
                <Crown size={72} />
              </div>
              <h4 className="font-mono text-[8px] uppercase tracking-widest font-black text-stone-500 mb-2">Canonical Gateway</h4>
              <p className="text-[11px] text-stone-600 dark:text-stone-400 leading-normal mb-3">
                Become part of our sovereign community. Lock down your own private archive vault node.
              </p>
              <button
                onClick={onOpenGateway}
                className="w-full flex items-center justify-between text-left font-mono text-[9px] uppercase tracking-wider font-extrabold border border-stone-800 dark:border-stone-200 px-3 py-1.5 hover:bg-stone-900 hover:text-white dark:hover:bg-white dark:hover:text-black transition-all"
              >
                <span>Initialize Identity Vault</span>
                <ArrowUpRight size={12} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Issue Presentation Grid */}
      <section className="px-6 py-12 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12">
        
        {/* Left Column: List of Essays / Table of Contents */}
        <div className="lg:col-span-8 flex flex-col gap-12">
          <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-850 pb-4">
            <h3 className="font-mono text-[10px] uppercase tracking-widest font-black text-stone-500">I. FLAGSHIP ESSAYS & BRIEFINGS</h3>
            <span className="font-sans text-[10px] uppercase text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 border border-emerald-500/10">3 items active</span>
          </div>

          <div className="flex flex-col gap-12 divide-y divide-stone-200 dark:divide-stone-850">
            {essays.map((essay, idx) => (
              <div key={essay.id} className={`pt-8 ${idx === 0 ? 'pt-0' : ''} group`}>
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Essay Header and Meta */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[8px] uppercase tracking-widest text-[#937C64] dark:text-[#C5B39A] font-extrabold px-2 py-0.5 bg-stone-100 dark:bg-stone-900 border border-current/20">
                        {essay.category}
                      </span>
                      <span className="text-stone-400 dark:text-stone-500 text-[10px] font-mono">{essay.date}</span>
                    </div>

                    <h2 
                      onClick={() => setSelectedEssay(selectedEssay === essay.id ? null : essay.id)}
                      className="font-serif text-2xl md:text-3xl text-stone-950 dark:text-stone-50 hover:underline cursor-pointer tracking-tight leading-tight"
                    >
                      {essay.title}
                    </h2>

                    <p className="text-[13px] text-stone-600 dark:text-stone-400 leading-relaxed font-serif">
                      {essay.tagline}
                    </p>

                    <div className="flex flex-wrap gap-1 pt-1">
                      {essay.tags.map(t => (
                        <span key={t} className="font-mono text-[8px] uppercase text-stone-500 border border-stone-200 dark:border-stone-800 px-1.5 py-0.5">
                          #{t}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-4 pt-2 font-mono text-[9px] uppercase tracking-wider text-stone-500">
                      <span>By {essay.author}</span>
                      <span>•</span>
                      <span>{essay.readTime}</span>
                      <span>•</span>
                      <button 
                        onClick={(e) => toggleBookmark(essay.id, e)}
                        className="hover:text-stone-900 dark:hover:text-white flex items-center gap-1 transition-colors"
                      >
                        {isBookmarked[essay.id] ? <BookmarkCheck size={11} className="text-emerald-500" /> : <Bookmark size={11} />}
                        {isBookmarked[essay.id] ? "Saved" : "Save"}
                      </button>
                    </div>
                  </div>

                  {/* Feature Image Frame */}
                  <div className="w-full md:w-48 h-32 md:h-40 overflow-hidden shrink-0 border border-stone-200 dark:border-stone-850 grayscale hover:grayscale-0 transition-all duration-700">
                    <img src={essay.image} alt={essay.title} className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-700" />
                  </div>
                </div>

                {/* Animated Reading Node and Membership Blur Constraint */}
                <AnimatePresence>
                  {selectedEssay === essay.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-6 border border-stone-300 dark:border-stone-800 p-6 bg-stone-100 dark:bg-stone-900/50 text-[13px] leading-relaxed relative overflow-hidden"
                    >
                      <p className="font-serif leading-relaxed text-stone-800 dark:text-stone-200">
                        {essay.content}
                      </p>

                      {/* Gating Glimpse Mock */}
                      <div className="relative mt-4">
                        <div className="absolute inset-0 bg-gradient-to-t from-stone-100 dark:from-[#111111] via-stone-100/80 dark:via-[#111111]/80 to-transparent h-40 flex items-end justify-center z-10">
                          <div className="text-center p-6 bg-white dark:bg-stone-950 border border-stone-300 dark:border-stone-800 max-w-sm mb-4 shadow-lg">
                            <Lock size={16} className="text-stone-500 animate-pulse mx-auto mb-2" />
                            <h4 className="font-serif text-base font-bold text-stone-900 dark:text-stone-100">Establish Secure Node to Continue Reading</h4>
                            <p className="text-[11px] text-stone-500 mt-1 leading-normal">
                              This article is gated using sovereign network security credentials. Input mail or unlock keys.
                            </p>
                            <button
                              onClick={onOpenGateway}
                              className="mt-4 inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest font-bold bg-stone-950 dark:bg-stone-50 text-stone-50 dark:text-stone-950 px-4 py-1.5 hover:opacity-85 transition-opacity"
                            >
                              <span>Activate Node Registration</span>
                              <ChevronRight size={10} />
                            </button>
                          </div>
                        </div>
                        <p className="font-serif blur-[2px] opacity-40 select-none">
                          Deliberately structured narratives offer resistant nodes. When metadata arrays map cleanly to verified taste context matrices, creators obtain defensible visibility across machine discovery protocols. Our research indexes show high correlation with offline print-ready curation hubs...
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>

          {/* Prompt 6 Highlight: Contributor Network Section */}
          <div className="mt-12 border-t border-stone-200 dark:border-stone-850 pt-10">
            <h3 className="font-mono text-[10px] uppercase tracking-widest font-black text-stone-500 mb-6">II. THE MIMI CONTRIBUTOR DIAL</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { name: "Anastasia Moreau", bio: "Parisier curator & visual theorist focusing on the intersection of Brutalism & Generative grids.", issue: "01", style: "Tactile Core" },
                { name: "Drer. Marcus Chen", bio: "Creative technologist mapping sovereign models, algorithmic defenses, and localized neural lattices.", issue: "01", style: "Technical" },
                { name: "Sybilla Van", bio: "Editorial scribe & typographer mapping Space Grotesk interfaces and physical archival mediums.", issue: "01", style: "Swiss/Modern" }
              ].map(contributor => (
                <div key={contributor.name} className="border border-stone-200 dark:border-stone-850 p-4 bg-white dark:bg-[#0A0A0A] hover:border-stone-400 dark:hover:border-stone-700 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-serif text-sm font-semibold text-stone-950 dark:text-stone-50">{contributor.name}</h4>
                    <span className="font-mono text-[8px] uppercase text-stone-400">{contributor.style}</span>
                  </div>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-snug font-serif mb-4">
                    {contributor.bio}
                  </p>
                  <div className="flex items-center justify-between border-t border-stone-100 dark:border-stone-900 pt-2 font-mono text-[8px] uppercase tracking-widest text-stone-400">
                    <span>Contributor Auth-I</span>
                    <span className="text-emerald-500 font-bold">● Active</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Subscriber Conversion & Audience Segment CTA Cards */}
        <div className="lg:col-span-4 flex flex-col gap-8">
          
          {/* Email Subscription Box with conversion features */}
          <div className="p-6 bg-[#161516] text-stone-50 border border-stone-800 rounded-none relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <Mail size={96} />
            </div>
            
            <span className="font-mono text-[8px] uppercase tracking-widest text-[#937C64] dark:text-[#C5B39A] font-extrabold block mb-1">
              CANONICAL CHROMA LOOP
            </span>
            <h3 className="font-serif text-2xl tracking-tight leading-tighter mb-2">
              The Weekly Brand Intelligence Briefing
            </h3>
            <p className="font-sans text-[11px] text-stone-400 leading-normal mb-6">
              Subscribe to obtain the curated weekly aesthetic briefing file, resource toolkit signals, and invite keys to live editorial design salons.
            </p>

            <form onSubmit={handleSubscribe} className="space-y-3">
              <div className="relative">
                <input 
                  type="email" 
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="Enter canonical secure mail..." 
                  className="w-full bg-stone-900 border border-stone-800 px-3 py-2 text-xs font-mono text-stone-50 rounded-none focus:outline-none focus:border-stone-600 transition-all placeholder:text-stone-600 outline-none"
                  required
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2 text-center font-mono text-[9px] uppercase tracking-widest font-extrabold [word-spacing:3px] transition-all flex items-center justify-center gap-1.5"
              >
                <span>Subscribe // Establish Node Link</span>
                <Check size={11} />
              </button>
            </form>

            <div className="flex items-center gap-2 mt-4 text-[10px] font-mono text-stone-500">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping shrink-0" />
              <span>Sovereignty secured. CAN-SPAM fully aligned.</span>
            </div>
          </div>

          {/* Prompt 1 & 3: Clear segmented audience CTAs */}
          <div className="flex flex-col gap-4">
            <div className="border border-stone-200 dark:border-stone-850 p-4">
              <h4 className="font-mono text-[9px] uppercase tracking-widest font-bold text-stone-500 mb-1">FOR EMERGING CREATORS</h4>
              <h3 className="font-serif text-base text-stone-900 dark:text-stone-100 font-semibold mb-2">Submit Work & Map Your Profile</h3>
              <p className="text-[11px] text-stone-600 dark:text-stone-400 leading-relaxed font-serif mb-4">
                Let Mimi's Tailor Layout Suite extract your custom visual DNA and highlight your creations inside our community showcase directory.
              </p>
              <button 
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('mimi:change_view', { detail: 'studio' }));
                  window.dispatchEvent(new CustomEvent('mimi:registry_alert', { detail: { message: "Launch Scribe module to draft.", type: 'success' } }));
                }}
                className="w-full text-center font-mono text-[8px] uppercase tracking-widest border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#0A0A0A] hover:bg-stone-550 py-1.5 font-extrabold transition-colors cursor-pointer"
              >
                Launch Drafting Suite
              </button>
            </div>

            <div className="border border-stone-200 dark:border-stone-850 p-4 bg-stone-100 dark:bg-[#111] relative overflow-hidden">
              <div className="absolute top-0 right-0 p-1 bg-emerald-600 text-white font-mono text-[6px] tracking-widest uppercase py-0.5 px-1.5">AEO / SEO</div>
              <h4 className="font-mono text-[9px] uppercase tracking-widest font-bold text-stone-500 mb-1">FOR WORKING OPERATORS</h4>
              <h3 className="font-serif text-base text-stone-900 dark:text-stone-100 font-semibold mb-2">Machine-Readability Optimizations</h3>
              <p className="text-[11px] text-stone-600 dark:text-stone-400 leading-relaxed font-serif mb-4">
                Make your digital footprint fully legible to modern AI engines (AEO validation parameters, auto-generated tags, clean JSON-LD metadata).
              </p>
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent('mimi:change_view', { detail: 'intel-hub' }))}
                className="w-full text-center font-mono text-[8px] uppercase tracking-widest border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#0A0A0A] hover:bg-stone-550 py-1.5 font-extrabold transition-colors cursor-pointer"
              >
                Aesthetic Intelligence Hub
              </button>
            </div>

            <div className="border border-stone-200 dark:border-stone-850 p-4 bg-[#141414] text-white">
              <h4 className="font-mono text-[8px] uppercase tracking-widest text-[#C5B39A] mb-1">PREMIUM MEMBERSHIP STATUS</h4>
              <h3 className="font-serif text-lg text-emerald-100 font-semibold mb-2">Join as Canonical Patron</h3>
              <p className="text-[11px] text-stone-400 leading-relaxed font-serif mb-4">
                Unlock daily trend projections, exclusive offline physical prints, PDF custom exports, and unlimited high-fidelity oracle tokens.
              </p>
              <button 
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('mimi:change_view', { detail: 'profile' }));
                  window.dispatchEvent(new CustomEvent('mimi:registry_alert', { detail: { message: "Patronage node configuration targeted.", type: 'success' } }));
                }}
                className="w-full bg-white text-stone-950 py-2 text-center font-mono text-[8px] tracking-widest font-black uppercase hover:bg-stone-200 transition-colors cursor-pointer"
              >
                Unlock Patron Tiers
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
