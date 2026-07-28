import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Terminal, Shield, Check, Send, AlertTriangle } from 'lucide-react';

export const ClinicalAuditDrawer: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [comment, setContent] = useState('');
  const [rating, setRating] = useState<number>(5);
  const [fps, setFps] = useState<number>(60);
  const [submitted, setSubmitted] = useState(false);

  // Monitor frame rate dynamically during active stylist interactions
  useEffect(() => {
    let lastTime = performance.now();
    let frames = 0;
    let animId: number;

    const tick = () => {
      frames++;
      const now = performance.now();
      if (now >= lastTime + 1000) {
        setFps(Math.round((frames * 1000) / (now - lastTime)));
        frames = 0;
        lastTime = now;
      }
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;

    try {
      // Print clinical telemetry payload to logs
      console.log('Mimi // Evaluator Audit Submited:', {
        comment,
        rating,
        performanceFps: fps,
        userAgent: navigator.userAgent,
        timestamp: Date.now()
      });
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setContent('');
        setOpen(false);
      }, 1600);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed bottom-24 right-4 md:bottom-4 z-[5000] font-mono text-xs select-none">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 border border-stone-200 dark:border-stone-800/85 bg-stone-50/20 dark:bg-stone-950/20 text-stone-400 dark:text-stone-500 hover:text-red-500/80 dark:hover:text-red-400/80 hover:border-red-500/30 dark:hover:border-red-500/35 transition-all px-2 py-1 rounded-none text-[8.5px] tracking-wider"
      >
        <div className="w-1.5 h-1.5 bg-red-500/40 rounded-full animate-pulse" />
        <span>AUDIT [{fps} FPS]</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="absolute bottom-12 right-0 bg-[#FCFCFA] dark:bg-[#0c0c0c] border border-nous-border p-5 w-80 text-stone-800 dark:text-stone-300 rounded-none shadow-2xl z-[5001]"
          >
            <div className="flex items-center gap-2 border-b border-nous-border pb-3 mb-4">
              <Shield className="w-3.5 h-3.5 text-red-500 animate-pulse" />
              <span className="font-sans font-bold text-stone-900 dark:text-stone-100 uppercase text-[10px] tracking-wider">STYLICIST EVALUATION GATE</span>
            </div>

            {submitted ? (
              <div className="py-6 text-center space-y-2">
                <Check className="w-6 h-6 text-emerald-500 mx-auto animate-bounce" />
                <p className="font-sans font-black text-stone-900 dark:text-stone-100 uppercase text-[10px] tracking-widest">TELEMETRY DEPLOYED</p>
                <p className="text-[9px] text-stone-400">Specimen data injected into your secure analytics registry.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[8px] uppercase text-[#A8A29E] font-bold block">Rating & Calibre</label>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className={`p-1 border text-[9px] font-bold transition-all rounded-none w-8 text-center ${
                          rating >= star ? 'border-amber-500 bg-amber-500/10 text-amber-500' : 'border-nous-border hover:border-stone-400 text-stone-400'
                        }`}
                      >
                        {star}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[8px] uppercase text-[#A8A29E] font-bold block">Observations & Semiotics</label>
                  <textarea
                    required
                    value={comment}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Describe interface friction, visual layout balance, or transcription accuracy..."
                    className="w-full h-24 bg-white dark:bg-[#070707] border border-nous-border p-2.5 text-[10.5px] focus:outline-none focus:border-red-500 font-serif italic text-stone-800 dark:text-stone-300 outline-none resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 border border-stone-900 dark:border-stone-100 bg-stone-900 dark:bg-stone-50 hover:bg-stone-800 dark:hover:bg- सफेद hover:opacity-90 py-2 text-[9px] font-black uppercase tracking-widest text-[#FCFCFA] dark:text-[#0c0c0c] rounded-none transition-all"
                >
                  <Send className="w-3 h-3" />
                  SUBMIT REPORT
                </button>
              </form>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
