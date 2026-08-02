import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { useUser } from '../contexts/UserContext';
import { useFeedback } from '../hooks/useFeedback';
import { resolveMotionVariant } from '../lib/motion';
import { createAtomFromScribeSignal, saveMemoryAtom, suggestTitleForAtom, mirrorAtomToPocket } from '../services/memoryService';
import { addToUsedContext } from '../services/usedContextService';
import { MemoryAtom } from '../types';
import { Brain, Loader2, Check, ArrowRight } from 'lucide-react';

export const SelectionMemoryCapture: React.FC = () => {
  const { user } = useUser();
  const feedback = useFeedback();
  const reduceMotion = Boolean(useReducedMotion());
  const gather = resolveMotionVariant('gatherIntoPocket', reduceMotion);
  const [text, setText] = useState('');
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [show, setShow] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [savedAtom, setSavedAtom] = useState<MemoryAtom | null>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleSelection = () => {
      if (status !== 'idle') return;
      
      const selection = window.getSelection();
      if (!selection) return;
      
      const selectedText = selection.toString().trim();
      
      if (selectedText.length > 10 && selectedText.length < 1500) {
        try {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          
          setCoords({
            x: rect.left + rect.width / 2 + window.scrollX,
            y: rect.top + window.scrollY - 36
          });
          setText(selectedText);
          setShow(true);
        } catch (e) {
          // Range error fallback
        }
      } else {
        setShow(false);
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (bubbleRef.current && bubbleRef.current.contains(e.target as Node)) {
        return;
      }
      setShow(false);
      setStatus('idle');
      setSavedAtom(null);
    };

    document.addEventListener('mouseup', handleSelection);
    document.addEventListener('mousedown', handleMouseDown);
    
    return () => {
      document.removeEventListener('mouseup', handleSelection);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [status]);

  const handleCapture = async () => {
    if (!user?.uid || !text) return;
    
    setStatus('saving');
    // Analysis/capture in progress — visual only, no haptic.
    feedback.trigger('analysis.started');
    try {
      const title = await suggestTitleForAtom(text);
      
      const newAtom = createAtomFromScribeSignal({
        content: text,
        signalType: 'selection_capture',
        title,
        source: 'Selection Capture',
      });
      
      await saveMemoryAtom(user.uid, newAtom);
      await mirrorAtomToPocket(user.uid, newAtom);
      setSavedAtom(newAtom);
      setStatus('saved');
      feedback.trigger('source.captured', {
        confirmed: true,
        sourceElement: bubbleRef.current,
      });
      
      window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
        detail: { message: `Atomized selection: "${title}"`, type: 'success' } 
      }));
    } catch (e) {
      console.error("MIMI // Inline capture failed:", e);
      feedback.trigger('action.failed');
      setStatus('idle');
    }
  };

  const handleQueueStudio = () => {
    if (!savedAtom) return;
    addToUsedContext(savedAtom, 'studio', user?.uid);
    window.dispatchEvent(
      new CustomEvent('mimi:route-request', { detail: { path: '/studio' } }),
    );
    setShow(false);
    setStatus('idle');
    setSavedAtom(null);
  };

  return (
    <AnimatePresence>
      {show && (
        <div 
          ref={bubbleRef}
          style={{ 
            position: 'absolute', 
            left: `${coords.x}px`, 
            top: `${coords.y}px`, 
            transform: 'translateX(-50%)',
            zIndex: 9999
          }}
          className="pointer-events-auto"
        >
          {status === 'saved' && savedAtom ? (
            <motion.div
              initial={gather.initial}
              animate={gather.animate}
              transition={gather.transition}
              className="flex flex-col gap-1 shadow-xl border border-white/20"
            >
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-900 text-white font-sans text-[9px] uppercase tracking-widest font-black">
                <Check size={11} /> Saved
              </div>
              <button
                type="button"
                onClick={handleQueueStudio}
                className="flex items-center gap-2 px-3 py-1.5 bg-nous-text text-nous-base hover:bg-nous-text/90 font-sans text-[9px] uppercase tracking-widest font-black"
              >
                <ArrowRight size={11} />
                Queue for Studio
              </button>
            </motion.div>
          ) : (
            <motion.button
              initial={gather.initial}
              animate={gather.animate}
              exit={gather.exit}
              transition={gather.transition}
              onClick={handleCapture}
              className="flex items-center gap-2 px-3 py-1.5 bg-nous-text text-nous-base hover:bg-nous-text/90 shadow-xl border border-white/20 select-none font-sans text-[9px] uppercase tracking-widest font-black"
            >
              {status === 'idle' && (
                <>
                  <Brain size={11} className="text-nous-base/80" />
                  <span>Save to Research Memory</span>
                </>
              )}
              {status === 'saving' && (
                <>
                  <Loader2 size={11} className="animate-spin" />
                  <span>Atomizing...</span>
                </>
              )}
            </motion.button>
          )}
        </div>
      )}
    </AnimatePresence>
  );
};
