import React, { useEffect, useRef, useState } from 'react';
import { synthesizeAestheticDiscovery } from '../services/geminiService'; // Re-using discovery engine or similar
import { motion, AnimatePresence } from 'motion/react';

interface AestheticVisualizerProps {
  analyser?: AnalyserNode | null;
  className?: string;
}

export const AestheticVisualizer: React.FC<AestheticVisualizerProps> = ({ analyser, className = '' }) => {
  const prismRef = useRef<SVGGElement>(null);
  const requestRef = useRef<number | undefined>(undefined);

  const [transcript, setTranscript] = useState('');
  const [insight, setInsight] = useState('');
  const [isTransmuting, setIsTransmuting] = useState(false);
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef('');

  useEffect(() => {
    if (!analyser) return;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const animateVisualizer = () => {
      requestRef.current = requestAnimationFrame(animateVisualizer);
      
      analyser.getByteFrequencyData(dataArray);
      
      let sum = dataArray.reduce((a, b) => a + b, 0);
      let volume = sum / dataArray.length; 

      if (prismRef.current) {
        const scale = 1 + (volume * 0.01);
        const rotation = (Date.now() / 50) % 360;
        prismRef.current.style.transform = `scale(${scale}) rotate(${rotation}deg)`;
        
        // Morph shapes based on frequencies
        const paths = prismRef.current.querySelectorAll('path');
        paths.forEach((path, i) => {
           const freq = dataArray[i * 10] || 0;
           const opacity = 0.2 + (freq / 255) * 0.8;
           path.setAttribute('opacity', opacity.toString());
        });
      }
    };

    animateVisualizer();

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [analyser]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let currentTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        currentTranscript += event.results[i][0].transcript;
      }
      setTranscript(currentTranscript);
      transcriptRef.current = currentTranscript;
    };

    recognition.onend = () => {
      const finalTranscript = transcriptRef.current.trim();
      if (finalTranscript.length > 5 && !isTransmuting) {
        handleAnalyze(finalTranscript);
      } else {
        try {
          if (!isTransmuting) recognition.start();
        } catch (e) {}
      }
    };

    recognition.start();
    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, [isTransmuting]);

  const handleAnalyze = async (thought: string) => {
    if (isTransmuting) return;
    setIsTransmuting(true);
    
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    setInsight('');
    
    // For now using placeholder logic as the user prefers less "cryptic dolls"
    // and more direct style intelligence.
    setTimeout(() => {
        setInsight("Aesthetic alignment confirmed. Your current vocal frequency suggests a preference for structural stability.");
        setTranscript('');
        transcriptRef.current = '';
        setIsTransmuting(false);
    }, 2000);
  };

  return (
    <div className={`flex flex-col items-center w-full max-w-[300px] ${className}`}>
      {/* Prism Visual */}
      <svg viewBox="0 0 100 100" className="w-48 h-48 mb-8 overflow-visible">
        <defs>
          <filter id="prismGlow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <g ref={prismRef} style={{ transformOrigin: 'center' }}>
          <path d="M 50 10 L 90 50 L 50 90 L 10 50 Z" fill="none" stroke="black" strokeWidth="0.5" opacity="0.2" />
          <path d="M 50 20 L 80 50 L 50 80 L 20 50 Z" fill="none" stroke="black" strokeWidth="0.5" opacity="0.4" />
          <path d="M 50 30 L 70 50 L 50 70 L 30 50 Z" fill="none" stroke="black" strokeWidth="1" opacity="0.6" />
          <circle cx="50" cy="50" r="2" fill="black" />
          
          {/* Refraction Lines */}
          <line x1="50" y1="10" x2="50" y2="90" stroke="black" strokeWidth="0.2" opacity="0.1" />
          <line x1="10" y1="50" x2="90" y2="50" stroke="black" strokeWidth="0.2" opacity="0.1" />
        </g>
      </svg>

      {/* Thought / Insight Display */}
      <div className="w-full min-h-[100px] flex flex-col items-center justify-center text-center">
        <AnimatePresence mode="wait">
          {isTransmuting ? (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="font-mono text-[10px] uppercase tracking-widest text-[#666] animate-pulse"
            >
              Calibrating Aesthetic DNA...
            </motion.div>
          ) : insight ? (
            <motion.div
              key="insight"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="font-serif text-sm italic text-stone-900 leading-relaxed max-w-[200px]"
            >
              {insight}
            </motion.div>
          ) : transcript ? (
            <motion.div
              key="transcript"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="font-sans text-xs text-[#666] max-w-[240px] truncate"
            >
              {transcript}
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="font-mono text-[9px] uppercase tracking-widest text-[#999]"
            >
              Listening for aesthetic signals...
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
