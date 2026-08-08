import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Mic, MicOff, Loader2, Info } from 'lucide-react';
import { useLiveSession } from '../hooks/useLiveSession';

interface LiveMentorProps {
  name: string;
  role: string;
  voiceName: string;
  systemInstruction: string;
  theme?: 'mimi' | 'cyrus' | 'cyberdeck';
  onTranscriptUpdate?: (text: string) => void;
  onToolCall?: (name: string, args: any) => Promise<any>;
  children?: React.ReactNode;
}

export const LiveMentor: React.FC<LiveMentorProps> = ({ name, role, voiceName, systemInstruction, theme = 'mimi', onTranscriptUpdate, onToolCall, children }) => {
  const { connect, disconnect, isConnected, isConnecting, isSpeaking, error, analyser, transcript } = useLiveSession(systemInstruction, voiceName, onToolCall);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  const isCyberdeck = theme === 'cyberdeck';
  const isMimi = theme === 'mimi';
  const bgColor = isCyberdeck ? 'bg-[#0c0c0b]' : isMimi ? 'bg-white' : 'bg-black';
  const fgColor = isCyberdeck ? 'text-[#f5f4f0]' : isMimi ? 'text-black' : 'text-white';
  const strokeColor = isCyberdeck ? '#f59e0b' : isMimi ? '#000000' : '#ffffff';
  const mutedFg = isCyberdeck ? 'text-white/55' : isMimi ? 'text-black/40' : 'text-white/40';
  const subtleFg = isCyberdeck ? 'text-white/70' : isMimi ? 'text-black/60' : 'text-white/60';

  useEffect(() => {
    if (onTranscriptUpdate && transcript) {
      onTranscriptUpdate(transcript);
    }
  }, [transcript, onTranscriptUpdate]);

  // Visualizer loop — canvas only mounts while connected; depend on both.
  useEffect(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = 0;
    }

    if (!analyser || !isConnected) return;

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
      ctx.lineWidth = isCyberdeck ? 2.5 : isMimi ? 2 : 3;
      ctx.strokeStyle = strokeColor;
      
      if (isCyberdeck) {
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#f59e0b';
      } else if (!isMimi) {
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
  }, [analyser, isConnected, isMimi, isCyberdeck, strokeColor]);

  // Disconnect on unmount only — do not auto-connect.
  // iOS Safari requires a user gesture for mic + AudioContext; the UI copy
  // ("Tap to initiate vocal sync") is the intentional entry point for all entities.
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  const toggleConnection = () => {
    if (isConnected || isConnecting) {
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
      {/* Paper Grain Overlay for Mimi (not cyberdeck) */}
      {isMimi && !isCyberdeck && (
        <div 
          className="absolute inset-0 pointer-events-none opacity-40 mix-blend-multiply"
          style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/paper-fibers.png")' }}
        />
      )}

      {/* Cyberdeck grid atmosphere */}
      {isCyberdeck && (
        <div
          className="absolute inset-0 pointer-events-none opacity-50"
          style={{
            backgroundImage:
              'radial-gradient(circle at 50% 42%, rgba(245,158,11,0.08) 0%, transparent 55%), linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px)',
            backgroundSize: '100% 100%, 48px 100%',
          }}
        />
      )}

      {/* Tooltip / Context */}
      <div className="absolute top-8 left-8 max-w-xs z-10">
        <div className="flex items-center gap-2 mb-2">
          <Info size={14} className={isCyberdeck ? 'text-amber-500/70' : isMimi ? 'text-black/40' : 'text-white/40'} />
          <span className={`font-sans text-[9px] uppercase tracking-widest font-black ${mutedFg}`}>
            Entity Context
          </span>
        </div>
        <h3 className={`font-serif italic text-2xl mb-1 ${fgColor}`}>{name}</h3>
        <p className={`font-sans text-[10px] uppercase tracking-wider leading-relaxed ${subtleFg}`}>
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
            <text className={`font-mono text-[10px] uppercase tracking-widest ${isCyberdeck ? 'fill-amber-500/50' : isMimi ? 'fill-black/40' : 'fill-white/40'}`}>
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
            <div className={`w-32 h-px ${isCyberdeck ? 'bg-amber-500/30' : isMimi ? 'bg-black/20' : 'bg-white/20'}`} />
          )}
        </div>

        {/* Interaction Button — stays clickable while connecting so users can cancel */}
        <button 
          type="button"
          onClick={toggleConnection}
          aria-label={isConnecting ? 'Cancel vocal sync' : isConnected ? 'End vocal sync' : 'Initiate vocal sync'}
          className={`absolute z-20 w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500 border ${
            isConnected 
              ? isCyberdeck
                ? 'bg-amber-500/15 text-amber-400 border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.25)]'
                : isMimi ? 'bg-black/5 text-black border-transparent' : 'bg-white/10 text-white border-transparent shadow-[0_0_30px_rgba(255,255,255,0.2)]'
              : isConnecting
              ? isCyberdeck
                ? 'text-amber-400/60 hover:text-amber-400 hover:bg-amber-500/10 border-amber-500/30'
                : isMimi ? 'text-black/50 hover:text-black hover:bg-black/5 border-transparent' : 'text-white/50 hover:text-white hover:bg-white/10 border-transparent'
              : isCyberdeck
              ? 'text-white/60 hover:text-amber-400 hover:bg-amber-500/10 border-white/20 hover:border-amber-500/40'
              : isMimi ? 'text-black/50 hover:text-black hover:bg-black/5 border-transparent' : 'text-white/50 hover:text-white hover:bg-white/10 border-transparent'
          }`}
        >
          {isConnecting ? <Loader2 size={24} strokeWidth={1} className="animate-spin"/> : isConnected ? <MicOff size={24} strokeWidth={1} /> : <Mic size={24} strokeWidth={1} />}
        </button>
      </div>

      {/* Status Text */}
      <div className="absolute bottom-12 flex flex-col items-center gap-2">
        {error ? (
          <p className="font-mono text-[9px] text-red-400 uppercase tracking-[0.2em] max-w-xs text-center">{error}</p>
        ) : isConnecting ? (
          <p className={`font-mono text-[9px] uppercase tracking-[0.3em] animate-pulse ${mutedFg}`}>
            Establishing Link... Tap to cancel.
          </p>
        ) : isConnected ? (
          <p className={`font-mono text-[9px] uppercase tracking-[0.3em] ${subtleFg}`}>
            {isSpeaking ? 'Transmitting...' : 'Listening...'}
          </p>
        ) : (
          <p className={`font-serif italic text-sm ${isCyberdeck ? 'text-white/70' : 'opacity-60'} ${subtleFg}`}>
            Tap to initiate vocal sync.
          </p>
        )}
      </div>

      {children}
    </motion.div>
  );
};
