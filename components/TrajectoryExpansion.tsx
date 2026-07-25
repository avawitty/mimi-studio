import React from 'react';
import { motion } from 'motion/react';
import { X, Activity, Fingerprint, Database } from 'lucide-react';

export const TrajectoryExpansion: React.FC<{ article: any, onClose: () => void }> = ({ article, onClose }) => {
 return (
 <motion.div 
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: 20 }}
 className="fixed inset-0 z-[6000] bg dark:bg overflow-y-auto flex flex-col md:flex-row"
 >
 <button onClick={onClose} className="fixed top-6 right-6 z-50 p-4 bg-nous-text text-nous-base   rounded-none hover:scale-105 transition-transform">
 <X size={20} />
 </button>

 {/* Left Column: Large Editorial Image */}
 <div className="w-full md:w-1/2 h-[50vh] md:h-screen sticky top-0 border-b md:border-b-0 md:border-r border-nous-border p-4 md:p-8">
 <div className="w-full h-full relative overflow-hidden bg-stone-200 rounded-none">
 {article.image ? (
 <img src={article.image} alt={article.headline} className="w-full h-full object-cover mix-blend-luminosity opacity-90"/>
 ) : (
 <div className="w-full h-full flex items-center justify-center"style={{ backgroundColor: article.hex }}>
 <span className="font-serif italic text-9xl text-white/20">{article.ref}</span>
 </div>
 )}
 <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none"/>
 <div className="absolute bottom-8 left-8 right-8 flex justify-between items-end text-white">
 <h2 className="font-serif text-5xl md:text-7xl leading-none tracking-tighter">{article.brand}</h2>
 <span className="font-mono text-xs tracking-widest uppercase opacity-80">{article.ref}</span>
 </div>
 </div>
 </div>

 {/* Right Column: Technical Dossier */}
 <div className="w-full md:w-1/2 min-h-screen p-8 md:p-16 lg:p-24 flex flex-col bg dark:bg">
 <div className="mb-16">
 <div className="flex items-center gap-4 mb-8">
 <span className="font-mono text-[10px] uppercase tracking-widest px-3 py-1 border border-nous-border rounded-none text-nous-subtle">
 {article.tag}
 </span>
 <span className="font-mono text-[10px] uppercase tracking-widest text-nous-subtle 0 flex items-center gap-2">
 <Activity size={12} /> Signal: {article.signalStrength || '84.2%'}
 </span>
 </div>
 <h1 className="font-serif text-5xl md:text-7xl leading-[0.9] mb-6 text-nous-text">{article.headline}</h1>
 <p className="font-serif italic text-2xl text-nous-subtle leading-tight">{article.subtitle}</p>
 </div>

 <div className="w-full h-px bg-stone-200 mb-16"/>

 {/* Design Logic & Field Notes */}
 <div className="grid grid-cols-1 xl:grid-cols-3 gap-12">
 <div className="xl:col-span-2 space-y-8">
 <div>
 <h3 className="font-mono text-xs uppercase tracking-widest mb-6 flex items-center gap-2 text-nous-subtle 0">
 <Database size={14} /> Design Logic
 </h3>
 <p className="font-sans text-lg leading-relaxed text-nous-text">
 {article.content.intro}
 </p>
 </div>
 {article.content.bodyText && (
 <div>
 <p className="font-sans text-lg leading-relaxed text-nous-text">
 {article.content.bodyText}
 </p>
 </div>
 )}
 {article.content.outro && (
 <div className="p-6 bg-nous-base rounded-none border border-nous-border">
 <p className="font-serif italic text-lg text-nous-subtle">
"{article.content.outro}"
 </p>
 </div>
 )}
 </div>

 <div className="xl:col-span-1 xl:border-l border-t xl:border-t-0 border-nous-border pt-8 xl:pt-0 xl:pl-8">
 <h3 className="font-mono text-xs uppercase tracking-widest mb-6 flex items-center gap-2 text-nous-subtle 0">
 <Fingerprint size={14} /> Field Notes
 </h3>
 <div className="space-y-8 font-mono text-[10px] uppercase tracking-wider text-nous-subtle">
 <div>
 <span className="block text-nous-subtle mb-2">Author</span>
 <span className="text-nous-text">{article.content.author}</span>
 </div>
 <div>
 <span className="block text-nous-subtle mb-2">Timestamp</span>
 <span className="text-nous-text">{article.timestamp}</span>
 </div>
 <div>
 <span className="block text-nous-subtle mb-2">Material Analysis</span>
 <span className="text-nous-text leading-relaxed">High-contrast, structural, archival. The aesthetic drift indicates a strong preference for brutalist typography mixed with organic textures.</span>
 </div>
 <div>
 <span className="block text-nous-subtle mb-2">Trajectory ID</span>
 <span className="text-nous-text">{article.ref}</span>
 </div>
 </div>
 </div>
 </div>
 </div>
 </motion.div>
 );
};
