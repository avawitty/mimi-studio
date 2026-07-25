import React from 'react';
import { motion } from 'motion/react';

interface LoadingSkeletonProps {
 className?: string;
 lines?: number;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ className = '', lines = 3 }) => {
 return (
 <div className={`space-y-4 ${className}`}>
 {Array.from({ length: lines }).map((_, i) => (
 <motion.div
 key={i}
 className="h-4 bg-stone-200 rounded-none w-full"
 animate={{ opacity: [0.5, 1, 0.5] }}
 transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.2 }}
 style={{ width: `${Math.max(40, 100 - i * 15)}%` }}
 />
 ))}
 </div>
 );
};
