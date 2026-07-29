import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Mic, MicOff, Loader2, Info } from 'lucide-react';
import { useLiveSession } from '../hooks/useLiveSession';

interface LiveMentorProps {
  name: string;
  role: string;
  voiceName: string;
  systemInstruction: string;
  theme?: 'mimi' | 'cyrus';
  onTranscriptUpdate?: (text: string) => void;
  onToolCall?: (name: string, args: any) => Promise<any>;
  children?: React.ReactNode;
}

export const LiveMentor: React.FC<LiveMentorProps> = ({ name, role, voiceName, systemInstruction, theme = 'mimi', onTranscriptUpdate, onToolCall, children }) => {
  const { connect, disconnect, isConnected, isConnecting, isSpeaking, error, analyser, transcript } = useLiveSession(systemInstruction, voiceName, onToolCall);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  const isMimi = theme === 'mimi';
  const bgColor = isMimi ? 'bg-white' : 'bg-black';
  const fgColor = isMimi ? 'text-black' : 'text-white';
  const strokeColor = isMimi ? '#000000' : '#ffffff';

  useEffect(() => {
    if (onTranscriptUpdate && transcript) {
      onTranscriptUpdate(transcript);
    }
  }, [transcript, onTranscriptUpdate]);

  // Visualizer loop — re-runs whenever `analyser` changes (it's now reactive state)
  // or when `isConnected` flips (the canvas is only mounted once connected, so the
  // effect must re-run at that point to attach to the freshly-mounted canvas).
  useEffect(() => {
    if (!analyser) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = 0;
      }
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = isMimi ? 2 : 3;
      ctx.strokeStyle = strokeColor;
      
      if (!isMimi) {
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ffffff';
      } else {
        ctx.shadowBlur = 0;
      }

      ctx.beginPath();

      const sliceWidth = canvas.width * 1.0 / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = v * canvas.height / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = 0;
      }
    };
  }, [analyser, isConnected, isMimi, strokeColor]);

  // Auto-connect on mount; disconnect cleanly on unmount
  useEffect(() => {
    let mounted = true;
    connect().catch(e => {
      if (mounted) console.error("MIMI // Auto-connect failed:", e);
    });
    return () => {
      mounted = false;
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally run only on mount/unmount — connect/disconnect are stable callbacks

  const toggleConnection = () => {
    if (isConnected) {
      disconnect();
    } else {
      connect().catch(e => console.error("MIMI // Connection failed:", e));
    }
  };

  // Circular text logic
  const displayTranscript = transcript ? transcript.slice(-60).padEnd(60, ' ') : "AWAITING TRANSMISSION... ".repeat(3);

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      className={`relative w-full h-full flex flex-col items-center justify-center ${bgColor} ${fgColor} overflow-hidden`}
    >
      {/* Paper Grain Overlay for Mimi */}
      {isMimi && (
        <div 
          className="absolute inset-0 pointer-events-none opacity-40 mix-blend-multiply"
          style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/paper-fibers.png")' }}
        />
      )}

      {/* Tooltip / Context */}
      <div className="absolute top-8 left-8 max-w-xs z-10">
        <div className="flex items-center gap-2 mb-2">
          <Info size={14} className={isMimi ? 'text-black/40' : 'text-white/40'} />
          <span className={`font-sans text-[9px] uppercase tracking-widest font-black ${isMimi ? 'text-black/40' : 'text-white/40'}`}>
            Entity Context
          </span>
        </div>
        <h3 className={`font-serif italic text-2xl mb-1 ${fgColor}`}>{name}</h3>
        <p className={`font-sans text-[10px] uppercase tracking-wider leading-relaxed ${isMimi ? 'text-black/60' : 'text-white/60'}`}>
          {role}
        </p>
      </div>

      {/* Central Circular UI */}
      <div className="relative w-[400px] h-[400px] flex items-center justify-center">
        
        {/* Circular Text SVG */}
        <div className="absolute inset-0 animate-[spin_20s_linear_infinite]">
          <svg viewBox="0 0 400 400" className="w-full h-full overflow-visible">
            <path
              id="textPath"
              d="M 200, 200 m -160, 0 a 160,160 0 1,1 320,0 a 160,160 0 1,1 -320,0"
              fill="none"
            />
            <text className={`font-mono text-[10px] uppercase tracking-widest ${isMimi ? 'fill-black/40' : 'fill-white/40'}`}>
              <textPath href="#textPath" startOffset="0%">
                {displayTranscript}
              </textPath>
            </text>
          </svg>
        </div>

        {/* Waveform Canvas */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {isConnected ? (
            <canvas ref={canvasRef} width={300} height={100} className="w-[300px] h-[100px]" />
          ) : (
            <div className={`w-32 h-px ${isMimi ? 'bg-black/20' : 'bg-white/20'}`} />
          )}
        </div>

        {/* Interaction Button */}
        <button 
          onClick={toggleConnection}
          disabled={isConnecting}
          className={`absolute z-20 w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500 ${
            isConnected 
              ? isMimi ? 'bg-black/5 text-black' : 'bg-white/10 text-white shadow-[0_0_30px_rgba(255,255,255,0.2)]'
              : isConnecting
              ? isMimi ? 'text-black/30 cursor-not-allowed' : 'text-white/30 cursor-not-allowed'
              : isMimi ? 'text-black/50 hover:text-black hover:bg-black/5' : 'text-white/50 hover:text-white hover:bg-white/10'
          }`}
        >
          {isConnecting ? <Loader2 size={24} strokeWidth={1} className="animate-spin"/> : isConnected ? <MicOff size={24} strokeWidth={1} /> : <Mic size={24} strokeWidth={1} />}
        </button>
      </div>

      {/* Status Text */}
      <div className="absolute bottom-12 flex flex-col items-center gap-2">
        {error ? (
          <p className="font-mono text-[9px] text-red-500 uppercase tracking-[0.2em]">{error}</p>
        ) : isConnecting ? (
          <p className={`font-mono text-[9px] uppercase tracking-[0.3em] animate-pulse ${isMimi ? 'text-black/40' : 'text-white/40'}`}>
            Establishing Link...
          </p>
        ) : isConnected ? (
          <p className={`font-mono text-[9px] uppercase tracking-[0.3em] ${isMimi ? 'text-black/60' : 'text-white/60'}`}>
            {isSpeaking ? 'Transmitting...' : 'Listening...'}
          </p>
        ) : (
          <p className={`font-serif italic text-sm opacity-60 ${isMimi ? 'text-black/60' : 'text-white/60'}`}>
            Tap to initiate vocal sync.
          </p>
        )}
      </div>

      {children}
    </motion.div>
  );
};
