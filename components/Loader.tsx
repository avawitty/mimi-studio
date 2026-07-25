import React from 'react';

export const Loader: React.FC = () => {
 return (
 <div className="fixed inset-0 flex items-center justify-center bg-nous-base z-50">
 <div className="text-center">
 <div className="mb-6 relative">
 <div className="w-12 h-12 border border-nous-border rounded-none animate-[spin_4s_linear_infinite]"/>
 <div className="absolute top-0 left-0 w-12 h-12 border-t border-nous-text rounded-none animate-[spin_3s_ease-in-out_infinite]"/>
 </div>
 <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-nous-subtle animate-pulse">
 Mimi is reviewing your draft...
 </p>
 </div>
 </div>
 );
};