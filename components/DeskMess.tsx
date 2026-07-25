import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Thimble } from './Thimble';

export const DeskMess: React.FC<{ onMuseEngaged?: () => void }> = ({ onMuseEngaged }) => {
 const [showMuse, setShowMuse] = useState(false);

 const handleThimbleClick = () => {
 setShowMuse(true);
 };

 const handleCloseMuse = () => {
 setShowMuse(false);
 if (onMuseEngaged) {
 onMuseEngaged();
 }
 };

 return (
 <>
 <motion.div 
 initial={{ opacity: 0, scale: 0.9 }}
 animate={{ opacity: 1, scale: 1 }}
 transition={{ duration: 0.5 }}
 className="relative w-48 h-48 mx-auto pointer-events-auto z-40"
 >
 {/* The Target: Thimble */}
 <div 
 className="absolute bottom-4 right-4 z-0 cursor-pointer"
 title="Engage Editor Mode"
 >
 <Thimble 
 isActive={false} 
 onClick={handleThimbleClick} 
 className="w-12 h-12 text-nous-subtle hover:text-nous-subtle transition-colors"
 />
 </div>

 {/* The Clutter */}
 <motion.div 
 drag 
 dragMomentum={false}
 whileDrag={{ scale: 1.05, zIndex: 100, boxShadow:"5px 8px 15px rgba(0,0,0,0.2)"}}
 className="absolute bottom-2 right-10 w-16 h-16 bg rounded-none cursor-grab active:cursor-grabbing z-10"
 style={{ rotate: -15 }}
 />
 <motion.div 
 drag 
 dragMomentum={false}
 whileDrag={{ scale: 1.05, zIndex: 100, boxShadow:"5px 8px 15px rgba(0,0,0,0.2)"}}
 className="absolute bottom-8 right-2 w-24 h-16 bg border border rounded-none cursor-grab active:cursor-grabbing z-20"
 style={{ rotate: 8 }}
 />
 <motion.div 
 drag 
 dragMomentum={false}
 whileDrag={{ scale: 1.05, zIndex: 100, boxShadow:"5px 8px 15px rgba(0,0,0,0.2)"}}
 className="absolute bottom-4 right-6 w-20 h-20 bg rounded-none cursor-grab active:cursor-grabbing z-30"
 style={{ 
 rotate: 45,
 backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,255,255,0.2) 5px, rgba(255,255,255,0.2) 10px)'
 }}
 />
 <motion.div 
 drag 
 dragMomentum={false}
 whileDrag={{ scale: 1.05, zIndex: 100, boxShadow:"5px 8px 15px rgba(0,0,0,0.2)"}}
 className="absolute bottom-0 right-0 w-28 h-20 bg border border rounded-none cursor-grab active:cursor-grabbing z-40"
 style={{ rotate: -5 }}
 />
 </motion.div>

 {/* Muse Overlay */}
 <AnimatePresence>
 {showMuse && (
 <motion.div 
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 transition={{ duration: 0.8, ease:"easeInOut"}}
 className="fixed inset-0 bg-nous-text/95 dark:bg-nous-base/95 flex flex-col items-center justify-center z-[999] cursor-pointer"
 onClick={handleCloseMuse}
 >
 <div className="text-6xl mb-6">🎭</div>
 <div className="font-mono text-sm text max-w-md text-center leading-relaxed">
 <p className="mb-4">"You dig through the noise to find the needle."</p>
 <p className="mb-4 font-bold tracking-widest text-xs">[ SYSTEM NOTE: EDITOR MODE ENGAGED ]</p>
 <p className="mb-4">I am the Muse. I do not watch you; I reflect you.</p>
 <p>The threads you weave here are drafts, not destinies. What narrative are we constructing today?</p>
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 </>
 );
};
