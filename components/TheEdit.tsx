import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Activity, Search, Settings, LayoutGrid, BookOpen, ExternalLink, Link as LinkIcon, DollarSign, Database, Tag, Code2, Lock, Unlock } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { getPersonalizedEdit, MOCK_PRODUCTS } from '../services/commerceService';
import { Product, EditIssue, ProductTasteEvent, TasteProfile } from '../types';
import { handleFirestoreError, OperationType } from '../services/firebaseUtils';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebaseInit';
import { CodexSignal } from './CodexSignal';
import { deriveCodexState, CodexState } from '../services/codexService';
import { useDwellTracking } from '../hooks/useDwellTracking';
import { logProductTasteEvent } from '../services/tasteLogger';
import { isAnalyticsAllowed } from '../lib/cookieConsent';

const AffiliateCard = ({ product, onInteraction }: { product: Product; onInteraction: (id: string, signal: any) => void }) => {
  const { trackRef } = useDwellTracking((id, signal) => onInteraction(product.id, signal));
  const [showLink, setShowLink] = useState(false);
  const [exportMode, setExportMode] = useState<'link' | 'html' | 'markdown'>('link');
  
  const handleAcquire = () => {
    if (isAnalyticsAllowed() && typeof (window as any).gtag === 'function') {
      (window as any).gtag('event', 'click_affiliate', {
        product_id: product.id,
        product_name: product.name
      });
    }
    const affiliateUrl = product.affiliateLink?.includes('?') ? `${product.affiliateLink}&ref=mimi_zine` : `${product.affiliateLink}?ref=mimi_zine`;
    window.open(affiliateUrl, '_blank');
  };

  const mockAffiliateId = `mimi.af/curator_${Math.random().toString(36).substring(7)}`;

  const getExportString = () => {
    if (exportMode === 'html') return `<a href="https://${mockAffiliateId}" target="_blank" rel="sponsored">${product.name}</a>`;
    if (exportMode === 'markdown') return `[${product.name}](https://${mockAffiliateId})`;
    return mockAffiliateId;
  };

  return (
    <div ref={trackRef} data-item-id={product.id} className={`group relative border bg-nous-base p-4 transition-all flex flex-col h-full ${showLink ? 'border-nous-text shadow-[2px_2px_0px_#141414]' : 'border-nous-border hover:border-nous-text/50 cursor-pointer'}`} onClick={() => !showLink && setShowLink(true)}>
      <div className="aspect-[4/5] bg-nous-surface mb-4 flex items-center justify-center overflow-hidden relative border border-nous-border">
        {product.image ? <img src={product.image} alt={product.name} className={`w-full h-full object-cover transition-transform duration-700 ${showLink ? 'scale-105' : 'group-hover:scale-105 saturate-50 opacity-80'}`}/> : <span className="font-serif italic text-nous-subtle">{product.name}</span>}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-500"/>
        
        {/* State Overlay */}
        {!showLink && (
           <div className="absolute inset-0 flex items-center justify-center backdrop-blur-[2px] bg-white/10 opacity-100 group-hover:opacity-0 transition-opacity duration-300">
             <div className="bg-nous-surface p-3 rounded-full border border-nous-border shadow-lg">
               <Lock size={16} className="text-nous-text" />
             </div>
           </div>
        )}
        
        {showLink && (
          <div className="absolute top-2 left-2 bg-nous-text text-nous-base px-2 py-1 font-mono text-[8px] uppercase tracking-widest flex items-center gap-1">
            <Unlock size={10} /> Unlocked via Thimble Data
          </div>
        )}

        <div className="absolute top-2 right-2 bg-nous-text text-nous-base px-2 py-1 font-mono text-[8px] uppercase tracking-widest flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <DollarSign size={10} /> 12% Comm.
        </div>
      </div>
      
      <div className="flex-1 flex flex-col justify-between">
        <div className="mb-4">
          <h5 className="font-serif text-lg italic text-nous-text leading-tight mb-1">{product.name}</h5>
          <p className="font-mono text-[9px] text-nous-subtle uppercase tracking-widest mb-2">{product.category || 'Curated Essential'}</p>
          {showLink && (
            <div className="bg-[#a8b79f]/10 border border-[#a8b79f]/30 p-2 mb-2">
               <p className="font-mono text-[8px] uppercase tracking-widest text-[#4a5c41]">Targeting Rationale:</p>
               <p className="font-sans text-[10px] text-[#4a5c41] mt-1">Matched your high-density minimalist aesthetic fingerprint. High predicted conversion via editorial placement.</p>
            </div>
          )}
        </div>
        
        {showLink ? (
          <div className="space-y-2 mt-auto pt-2 border-t border-nous-border" onClick={(e) => e.stopPropagation()}>
            <div className="flex gap-1 justify-between mb-2">
              <button onClick={() => setExportMode('link')} className={`flex-1 py-1 font-mono text-[8px] uppercase border ${exportMode === 'link' ? 'bg-nous-text text-nous-base border-nous-text' : 'bg-transparent text-nous-subtle border-nous-border hover:bg-nous-surface'}`}>Direct</button>
              <button onClick={() => setExportMode('html')} className={`flex-1 py-1 font-mono text-[8px] uppercase border ${exportMode === 'html' ? 'bg-nous-text text-nous-base border-nous-text' : 'bg-transparent text-nous-subtle border-nous-border hover:bg-nous-surface'}`}>HTML</button>
              <button onClick={() => setExportMode('markdown')} className={`flex-1 py-1 font-mono text-[8px] uppercase border ${exportMode === 'markdown' ? 'bg-nous-text text-nous-base border-nous-text' : 'bg-transparent text-nous-subtle border-nous-border hover:bg-nous-surface'}`}>MD</button>
            </div>
            <div className="bg-nous-surface border border-nous-border p-2 flex items-center justify-between">
              <span className="font-mono text-[8px] text-nous-text truncate mr-2 font-medium">{getExportString()}</span>
              <button className="text-[9px] font-mono uppercase underline hover:text-nous-subtle shrink-0" onClick={() => navigator.clipboard.writeText(getExportString())}>Copy</button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between mt-auto pt-2 border-t border-nous-border">
            <span className="font-mono text-[9px] text-[#a8b79f] uppercase tracking-widest">Aesthetic Match</span>
            <button onClick={(e) => { e.stopPropagation(); setShowLink(true); }} className="font-mono text-[9px] text-nous-text uppercase underline hover:text-nous-subtle">
               Unlock Link
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export const TheEdit: React.FC = () => {
  const { user, loading } = useUser();
  const [personalizedEdit, setPersonalizedEdit] = useState<EditIssue | null>(null);
  const [viewMode, setViewMode] = useState<'profiling' | 'shopmy' | 'bounties'>('profiling');
  const [products, setProducts] = useState<Product[]>([]);
  const [codexState, setCodexState] = useState<CodexState>({ entropy: 0.5, density: 0.5, velocity: 0, timestamp: Date.now() });
  const [showExplanation, setShowExplanation] = useState(false);
  
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isMinting, setIsMinting] = useState(false);

  // Mocked Semantic Clusters based on user interactions
  const semanticClusters = React.useMemo(() => [
    "Luxury Utilitarian", "Low-Fidelity Archival", "Brutalist Domestic", 
    "Tactile Nostalgia", "Synthesized Naturals", "Post-Irony Streetwear"
  ].sort(() => Math.random() - 0.5).slice(0, 4), []);

  const connectWallet = async () => {
    // Only simulate the connection to avoid triggering browser extensions (which can seem concerning/scary)
    setWalletAddress("0x" + Array.from({length: 40}, () => Math.floor(Math.random() * 16).toString(16)).join(''));
  };

  useEffect(() => {
    if (loading) return;
    if (user && !user.uid.startsWith('local_ghost_') && user.uid !== 'ghost') {
      const fetchData = async () => {
        try {
          const profileDoc = await getDoc(doc(db, 'users', user.uid, 'taste', 'profile'));
          const profile = profileDoc.exists() ? profileDoc.data() as TasteProfile : { archetype_weights: {}, audit_history: [] } as any as TasteProfile;

          const q = query(collection(db, 'product_interactions'), where('userId', '==', user.uid));
          const snapshot = await getDocs(q);
          const events = snapshot.docs.map(doc => doc.data() as ProductTasteEvent);
          
          const codex = deriveCodexState(profile, events as any);
          setCodexState(codex);

          const tasteVector = (profile as any)?.tasteVector ? Object.values((profile as any).tasteVector) : [0.5, 0.5, 0.5];
          getPersonalizedEdit(user.uid, tasteVector as any, codex, profile as any).then(edit => {
            setPersonalizedEdit(edit);
          }).catch(e => console.error("MIMI // Failed to get personalized edit", e));
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}/taste/profile`);
        }
      };
      fetchData();
    }
  }, [user, loading]);

  const handleInteraction = (productId: string, signal: any) => {
    logProductTasteEvent({
      userId: user!.uid,
      itemId: productId,
      dwellTime: signal.dwellMs,
      interactionType: 'view',
      timestamp: Date.now()
    });
  };

  useEffect(() => {
    if (personalizedEdit?.sequence) {
      const fetchProducts = async () => {
        try {
          const productPromises = personalizedEdit.sequence.map(async (item) => {
            try {
              const docSnap = await getDoc(doc(db, 'products', item.productId));
              if (docSnap.exists()) {
                return { id: docSnap.id, ...docSnap.data() } as Product;
              }
            } catch (e) {}
            return MOCK_PRODUCTS.find(p => p.id === item.productId) || null;
          });
          const productDocs = await Promise.all(productPromises);
          const fetchedProducts = productDocs.filter((p): p is Product => p !== null);
          setProducts(fetchedProducts);
        } catch (err) {
          console.error("Error fetching products:", err);
        }
      };
      fetchProducts();
    }
  }, [personalizedEdit]);

  if (loading) {
    return <div className="min-h-screen bg-[#f5f4f1] text-nous-text font-sans flex items-center justify-center">Compiling demographic intelligence...</div>;
  }

  return (
    <div className="h-full w-full bg-[#f5f4f1] text-nous-text font-sans flex flex-col md:flex-row overflow-hidden">
      <main className="flex-1 p-6 md:p-12 overflow-y-auto h-full">
        <header className="mb-12 border-b border-nous-border pb-8 flex flex-col md:flex-row md:justify-between items-start md:items-end gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-nous-subtle">
              <span>Affiliate & Ad Forecast</span>
              <span className="h-px w-12 bg-[#E4E3E0]"></span>
              <span className="text-[#6f7d67]">● PROTOTYPE DATA</span>
            </div>
            <h1 className="font-serif text-5xl md:text-6xl italic tracking-tighter leading-none mb-4">The Forecast Edit.</h1>
            <button 
              onClick={() => setShowExplanation(!showExplanation)} 
              className="text-nous-subtle hover:text-nous-text transition-colors font-mono text-[9px] uppercase tracking-widest border-b border-dashed border-nous-subtle/30 pb-0.5"
            >
              {showExplanation ? '- Hide Apparatus Logic' : '+ Explain Apparatus Logic'}
            </button>
          </div>
          <div className="flex flex-col items-end gap-4 w-full md:w-auto">
            <div className="flex bg-nous-surface border border-nous-border p-1 w-full md:w-auto overflow-x-auto">
              <button onClick={() => setViewMode('profiling')} className={`whitespace-nowrap flex-1 md:flex-none px-4 py-2 text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-colors ${viewMode === 'profiling' ? 'bg-nous-text text-nous-base' : 'hover:bg-nous-base'}`}><Database size={12} /> Target Profiling</button>
              <button onClick={() => setViewMode('shopmy')} className={`whitespace-nowrap flex-1 md:flex-none px-4 py-2 text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-colors ${viewMode === 'shopmy' ? 'bg-nous-text text-nous-base' : 'hover:bg-nous-base'}`}><LinkIcon size={12} /> Affiliate Grid</button>
              <button onClick={() => setViewMode('bounties')} className={`whitespace-nowrap flex-1 md:flex-none px-4 py-2 text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-colors ${viewMode === 'bounties' ? 'bg-nous-text text-nous-base' : 'hover:bg-nous-base'}`}><Code2 size={12} /> Live Bounties</button>
            </div>
          </div>
        </header>

        {showExplanation && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-12 overflow-hidden">
            <div className="border border-nous-text bg-nous-surface p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <h3 className="font-serif italic text-2xl">How the Forecast is Intended to Work</h3>
                <span className="px-2 py-1 border border-amber-500/40 bg-amber-50 text-amber-800 font-mono text-[8px] uppercase tracking-widest">
                  Product prototype
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 font-sans text-sm text-nous-text">
                <div>
                  <p className="mb-3"><strong>Available now — curation signals:</strong> Mimi can read saved artifacts and interaction history to form transparent tags and taste signals used in this forecast.</p>
                  <p><strong>Prototype — audience hypotheses:</strong> The cohort percentages and brand matches shown here are modeled examples. They are not yet verified campaign, retailer, or ad-platform data.</p>
                </div>
                <div>
                  <p className="mb-3"><strong>Requires integration — affiliate attribution:</strong> Production storefronts need approved merchant feeds, durable link issuance, click attribution, consent, payout terms, and reconciliation.</p>
                  <p><strong>Privacy boundary:</strong> The current app stores product interactions for signed-in users. Claims such as immutable ownership, complete portability, or zero outside exposure require a separate audited data-governance implementation.</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {viewMode === 'profiling' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-12 max-w-5xl">
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 border border-nous-border bg-nous-surface p-6">
                <h3 className="font-mono text-[10px] uppercase tracking-widest text-nous-subtle mb-6">Demographic Fingerprint</h3>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between font-serif mb-1">
                      <span>High-Key Minimalist Cohort</span>
                      <span>84%</span>
                    </div>
                    <div className="h-1 w-full bg-nous-base"><div className="h-full bg-nous-text w-[84%]"></div></div>
                    <p className="text-[10px] font-mono text-nous-subtle mt-2">Targeted by: SSENSE, The Row, Khaite</p>
                  </div>
                  <div>
                    <div className="flex justify-between font-serif mb-1">
                      <span>Sustainable Core</span>
                      <span>62%</span>
                    </div>
                    <div className="h-1 w-full bg-nous-base"><div className="h-full bg-[#a8b79f] w-[62%]"></div></div>
                    <p className="text-[10px] font-mono text-nous-subtle mt-2">Targeted by: Tekla, Aesop</p>
                  </div>
                  <div>
                    <div className="flex justify-between font-serif mb-1">
                      <span>Gorpcore Adjacent</span>
                      <span>31%</span>
                    </div>
                    <div className="h-1 w-full bg-nous-base"><div className="h-full bg-[#E85D04] w-[31%]"></div></div>
                    <p className="text-[10px] font-mono text-nous-subtle mt-2">Targeted by: Arc'teryx, Roa</p>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2 space-y-8">
                <div className="border border-nous-border bg-nous-surface p-8">
                  <div className="flex items-center justify-between mb-4">
                     <h3 className="font-mono text-[10px] uppercase tracking-widest text-nous-subtle">Advertising Inferences (Targeting Logic)</h3>
                     <span className="bg-[#a8b79f]/20 text-[#4a5c41] px-2 py-1 font-mono text-[8px] uppercase border border-[#a8b79f]/30 tracking-widest flex items-center gap-1">
                       <Database size={8} /> Aesthetic ID Generated
                     </span>
                  </div>
                  <h2 className="font-serif text-3xl italic mb-6">"You are perceived as an early-adopter investing in generational quality, heavily influenced by editorial-style product placement."</h2>
                  
                  <div className="mb-6">
                    <h4 className="font-mono text-[9px] uppercase tracking-widest text-nous-subtle mb-3">Dominant Semantic Clusters</h4>
                    <div className="flex flex-wrap gap-2">
                       {semanticClusters.map((cluster, i) => (
                         <span key={i} className="inline-flex items-center px-3 py-1 bg-nous-base border border-nous-border text-nous-text font-mono text-[10px] uppercase tracking-wider">
                           # {cluster}
                         </span>
                       ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                    <div className="p-4 bg-nous-base border border-nous-border">
                       <div className="flex items-center justify-between mb-2">
                         <div className="flex items-center gap-2 text-nous-text"><Activity size={12}/> <span className="font-mono text-[10px] uppercase tracking-widest">The "Post-IDFA" Ad Layer</span></div>
                       </div>
                       <p className="font-sans text-sm text-nous-subtle leading-relaxed">
                         Operating without invasive third-party cookies or IDFA. Your targeting vectors are constructed 100% from your intentional, zero-party curations in <strong className="text-nous-text">The Thimble</strong>.
                       </p>
                    </div>
                    <div className="p-4 bg-nous-base border border-nous-border">
                       <div className="flex items-center gap-2 mb-2 text-nous-text"><Tag size={12}/> <span className="font-mono text-[10px] uppercase tracking-widest">Brand Interaction Matrix</span></div>
                       <p className="font-sans text-sm text-nous-subtle leading-relaxed">
                         Brands use this fingerprint to issue you Direct Affiliate links rather than spray-and-pray gifting. You only unlock links for products that match your DNA perfectly.
                       </p>
                    </div>
                  </div>
                </div>

                {/* Market Valuation Metric */}
                <div className="border border-nous-border bg-nous-surface p-8">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-mono text-[10px] uppercase tracking-widest text-nous-subtle">Aesthetic Data Valuation</h3>
                    <span className="font-mono text-[9px] uppercase tracking-widest text-nous-text border border-nous-text px-2 py-1">Est. Asset Value</span>
                  </div>
                  <div className="flex items-baseline gap-4 mb-4">
                    <h2 className="font-serif text-5xl">$5,400</h2>
                    <span className="font-mono text-xs text-nous-subtle">USD per year / value</span>
                  </div>
                  <p className="font-sans text-sm text-nous-subtle leading-relaxed">
                    Based on your curation density and overlap with high-LTV (Life Time Value) consumer nodes. WGSN and trend forecasting agencies charge brands exorbitant premiums for this exact data stream. Since you own this semantic imprint, you can elect to license access to your demographic segment through the <strong className="text-nous-text cursor-pointer hover:underline" onClick={() => setViewMode('bounties')}>Live Bounties</strong> market.
                  </p>
                </div>
              </div>
            </section>
            
            {personalizedEdit && (
              <section className="border border-nous-border bg-nous-surface p-8">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-mono text-[10px] uppercase tracking-widest text-nous-subtle">Computed Edit Thesis</h3>
                  <span className="font-mono text-[9px] uppercase tracking-widest text-[#a8b79f] border border-[#a8b79f] px-2 py-1">Auto-Generated</span>
                </div>
                <h2 className="font-serif text-3xl italic mb-4">{personalizedEdit.thesis}</h2>
                <p className="text-nous-text font-sans text-sm max-w-2xl leading-relaxed">{personalizedEdit.codexReading}</p>
              </section>
            )}
          </motion.div>
        )}

        {viewMode === 'bounties' && (
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-8">
            <div className="flex flex-col md:flex-row md:justify-between md:items-end border-b border-nous-border pb-4 mb-8 gap-4">
              <div>
                <h2 className="font-serif text-3xl italic mb-1">Aesthetic Bounties</h2>
                <p className="font-mono text-[10px] uppercase tracking-widest text-nous-subtle">Mimi Boutique Agency • Intelligence Exchange</p>
              </div>
              <div className="flex gap-3 text-nous-text">
                <div className="flex items-center gap-2 border border-nous-border bg-nous-surface px-4 py-2">
                  <Activity size={12} className="text-nous-subtle" />
                  <span className="font-mono text-[10px] uppercase tracking-widest">Network Status: Connected</span>
                </div>
              </div>
            </div>

            <div className="mb-6 p-4 border border-nous-border bg-nous-surface text-sm font-sans text-nous-subtle max-w-3xl leading-relaxed">
              <strong>The Architecture of Attention:</strong> Brands pay upwards of $25,000 for static trend reports. We're bypassing the agency cartel. If you possess a highly structured aesthetic intelligence, your data has immense value. Engage with open bounties listed by Brand Mimi to monetize your curation directly. Own your semantic imprint.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { label: 'Gorpcore Saturation Map', compensation: '300 Credits', desc: 'Seeking curators with High-Density Arc\'teryx & ROA footprints. Task: Curate a unified 10-piece moodboard signaling the transition out of standard functional wear into luxury utility.' },
                { label: 'Post-Minimalist Palette Sourcing', compensation: '$150 USD Direct', desc: 'Our Brand Intake module requires fresh data on what replaces the \'Sad Beige\' aesthetic. Connect your Thimble history regarding non-primary bold hues.' },
                { label: 'Gen-Z Fragrance Taxonomy', compensation: '500 Credits + Early Access', desc: 'Provide 5 text-node descriptions mapping how you categorize scent profiles. We are looking for synesthetic associations (e.g., \'sounds like a 90s club\').' },
              ].map((bounty, i) => (
                <div key={i} className="border border-nous-border bg-nous-base p-6 hover:bg-nous-surface transition-colors flex flex-col justify-between">
                  <div>
                    <div className="font-mono text-[8px] uppercase tracking-widest text-[#a8b79f] mb-3 flex items-center gap-1">
                      <Tag size={8} /> Active Submission
                    </div>
                    <h4 className="font-serif text-xl italic mb-2 text-nous-text">{bounty.label}</h4>
                    <p className="text-xs font-sans text-nous-subtle leading-relaxed mb-6">{bounty.desc}</p>
                  </div>
                  <div className="border-t border-nous-border pt-4">
                    <div className="flex justify-between items-center mb-4">
                      <span className="font-mono text-[9px] uppercase tracking-widest text-nous-subtle">Bounty:</span>
                      <span className="font-mono text-[10px] uppercase tracking-widest text-nous-text font-bold">{bounty.compensation}</span>
                    </div>
                    <button className="w-full bg-nous-text text-nous-base py-2 font-mono text-[9px] uppercase tracking-widest hover:bg-opacity-90 transition-opacity">
                      Claim & Connect Profile
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
           </motion.div>
         )}

        {viewMode === 'shopmy' && (
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-8">
            <div className="flex justify-between items-end border-b border-nous-border pb-4 mb-8">
              <div>
                <h2 className="font-serif text-3xl italic mb-1">Direct Brand Storefront</h2>
                <p className="font-mono text-[10px] uppercase tracking-widest text-nous-subtle">Unlock tracking links based on your aesthetic footprint. Skip the landing page middleman.</p>
              </div>
              <div className="flex gap-3">
                <div className="hidden md:flex items-center gap-2 text-nous-subtle border-r border-nous-border pr-4 mr-1">
                  <span className="font-mono text-[9px] uppercase tracking-widest">Format:</span>
                  <Code2 size={12} />
                </div>
                <button className="bg-[#141414] text-[#F5F4F1] px-4 py-2 font-mono text-[10px] uppercase tracking-widest hover:opacity-80 transition-opacity">
                  Copy All Unlocked Links (CSV)
                </button>
              </div>
            </div>

            {products.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {products.map((product) => (
                  <AffiliateCard key={product.id} product={product} onInteraction={handleInteraction} />
                ))}
              </div>
            ) : (
              <div className="py-24 text-center text-nous-subtle font-mono text-sm border border-dashed border-nous-border">
                No affiliate products generated for this footprint yet.
              </div>
            )}
          </motion.div>
        )}

      </main>
    </div>
  );
};
