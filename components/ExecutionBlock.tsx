import { Target, XCircle, Zap } from 'lucide-react';
import { ExecutionLayer } from '../types';

export const ExecutionBlock = ({ layer }: { layer: ExecutionLayer }) => {
  return (
    <div className="mt-8 p-6 bg-nous-base border-t border-white/20 space-y-6 select-text">
       {/* Top: Punchy Takeaway */}
       <div className="text-center">
         <h3 className="font-sans text-[10px] uppercase tracking-widest text-nous-subtle mb-2">The Directive</h3>
         <p className="font-serif italic text-2xl text-nous-text">{layer.topTakeaway}</p>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
         {/* Actions */}
         <div className="space-y-4">
           <div className="flex items-center gap-2 text-nous-subtle border-b border-white/10 pb-2">
             <Zap size={14} />
             <span className="font-sans text-[8px] uppercase tracking-widest font-black">Execute</span>
           </div>
           <ul className="space-y-3">
             {layer.concreteActions.map((action, i) => (
               <li key={i} className="flex gap-3 items-start">
                 <span className="text-nous-subtle text-xs mt-0.5">•</span>
                 <span className="font-serif text-sm text-nous-text/90 leading-relaxed">{action}</span>
               </li>
             ))}
           </ul>
         </div>

         {/* Anti-pattern and Decision */}
         <div className="space-y-6">
           <div>
             <div className="flex items-center gap-2 text-red-400/70 border-b border-white/10 pb-2 mb-3">
               <XCircle size={14} />
               <span className="font-sans text-[8px] uppercase tracking-widest font-black">Cease</span>
             </div>
             <p className="font-serif text-sm text-nous-text/90">{layer.antiPattern}</p>
           </div>
           
           <div>
             <div className="flex items-center gap-2 text-amber-400/70 border-b border-white/10 pb-2 mb-3">
               <Target size={14} />
               <span className="font-sans text-[8px] uppercase tracking-widest font-black">Align</span>
             </div>
             <p className="font-serif text-sm text-nous-text/90">{layer.directionalDecision}</p>
           </div>
         </div>
       </div>
    </div>
  );
};
