import React from 'react';
import { motion } from 'motion/react';

export const ViewSkeleton = () => (
 <motion.div 
 initial={{ opacity: 0 }} 
 animate={{ opacity: 1 }} 
 exit={{ opacity: 0 }}
 className="flex-1 w-full h-full p-8 flex flex-col gap-6"
 >
 <div className="w-1/3 h-10 bg-stone-200 dark:bg-stone-800 rounded-none animate-pulse"/>
 <div className="w-1/4 h-4 bg-stone-100 dark:bg-stone-900 rounded-none animate-pulse"/>
 <div className="flex-1 mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
 {[1, 2, 3, 4, 5, 6].map(i => (
 <div key={i} className="w-full h-64 bg-stone-200 dark:bg-stone-800 rounded-none animate-pulse"/>
 ))}
 </div>
 </motion.div>
);
