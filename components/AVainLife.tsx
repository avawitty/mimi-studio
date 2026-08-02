import React from 'react';
import { motion } from 'motion/react';
import { ArrowUpRight } from 'lucide-react';

export const AVainLife: React.FC = () => {
 return (
 <div className="min-h-full bg text font-sans selection:bg-white selection:text-black flex flex-col">
 {/* Header */}
 <header className="p-6 md:p-12 flex justify-between items-start text-[10px] uppercase tracking-[0.3em] font-mono text">
 <div>A Vain Life</div>
 <div>Vol. 001</div>
 </header>

 {/* Main Content */}
 <main className="flex-grow flex flex-col justify-center px-6 md:px-12 lg:px-24 w-full max-w-[1400px] mx-auto py-12">
 <motion.div
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
 >
 <h1 className="text-6xl md:text-8xl lg:text-[9rem] font-medium tracking-tighter mb-16 leading-[0.85] text-white">
 Desire is futile.<br />
 <span className="text">Taste is necessary.</span>
 </h1>

 <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-8 text-sm md:text-base leading-relaxed font-light text">
 <div className="md:col-span-4 lg:col-span-3">
 <p className="text-[10px] uppercase tracking-[0.3em] font-mono mb-6 text">The Position</p>
 <p className="mb-6">
 A Vain Life is a critical position. A lens through which to evaluate what is worth wanting. We reject the mindless accumulation of objects in favor of the precise calibration of aesthetics.
 </p>
 </div>
 
 <div className="md:col-span-4 lg:col-span-3 lg:col-start-5">
 <p className="text-[10px] uppercase tracking-[0.3em] font-mono mb-6 text">The Form</p>
 <p className="mb-6">
 This is not a magazine. This is not a brand. This is an architectural framework for aesthetic intelligence. Most consumption is an accident; we are interested only in the intentional.
 </p>
 </div>

 <div className="md:col-span-4 lg:col-span-4 lg:col-start-9">
 <div className="h-full flex flex-col justify-end border-t border pt-8 mt-8 md:mt-0 md:border-t-0 md:pt-0">
 <p className="text-[10px] uppercase tracking-[0.3em] font-mono mb-6 text">The Instrument</p>
 <p className="mb-8">
 A Vain Life provides the philosophy. Mimi provides the practice. To begin calibrating your own aesthetic intelligence, access the instrument.
 </p>
 <button 
 onClick={() => window.dispatchEvent(new CustomEvent('mimi:change_view', { detail: 'studio' }))}
 className="inline-flex items-center justify-between w-full p-4 border border hover:bg-white hover:text-black transition-all duration-300 group text-left mb-4"
 >
 <span className="text-xs tracking-[0.2em] font-mono font-bold">Access Mimi</span>
 <ArrowUpRight size={16} className="group-hover:rotate-45 transition-transform duration-300"/>
 </button>

 <button 
 onClick={() => window.dispatchEvent(new CustomEvent('mimi:open_port'))}
 className="inline-flex items-center justify-between w-full p-4 border border-green-900/50 hover:bg-green-500 hover:text-black transition-all duration-300 group text-left text-green-500"
 >
 <span className="text-xs uppercase tracking-[0.2em] font-mono font-bold">The Port (Editorial Ledger)</span>
 <ArrowUpRight size={16} className="group-hover:rotate-45 transition-transform duration-300"/>
 </button>
 </div>
 </div>
 </div>
 </motion.div>
 </main>

 {/* Footer */}
 <footer className="p-6 md:p-12 text-[10px] uppercase tracking-[0.3em] font-mono text flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mt-auto">
 <div>A philosophy of taste</div>
 <div className="flex gap-8">
 <span className="hover:text-nous-text cursor-pointer transition-colors">Manifesto</span>
 <span className="hover:text-nous-text cursor-pointer transition-colors">Index</span>
 <span className="hover:text-nous-text cursor-pointer transition-colors">Contact</span>
 </div>
 </footer>
 </div>
 );
};
