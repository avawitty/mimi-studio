// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Square, 
  Volume2, 
  RotateCcw, 
  Info, 
  Bookmark, 
  Check, 
  Loader2, 
  Music, 
  FileText, 
  Activity, 
  Sparkles, 
  HelpCircle, 
  CornerDownRight, 
  Feather, 
  Sun,
  Eye,
  Disc,
  Disc3,
  Waves
} from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { generateLyriaSong } from '../services/geminiService';
import { archiveManager } from '../services/archiveManager';

// Microtonal and standard frequencies helper for pristine synthesis
const NOTE_FREQS: Record<string, number> = {
  "C2": 65.41, "C#2": 69.30, "D2": 73.42, "D#2": 77.78, "E2": 82.41, "F2": 87.31, "F#2": 92.50, "G2": 98.00, "G#2": 103.83, "A2": 110.00, "A#2": 116.54, "B2": 123.47,
  "C3": 130.81, "C#3": 138.59, "D3": 146.83, "D#3": 155.56, "E3": 164.81, "F3": 174.61, "F#3": 185.00, "G3": 196.00, "G#3": 207.65, "A3": 220.00, "A#3": 233.08, "B3": 246.94,
  "C4": 261.63, "C#4": 277.18, "D4": 293.66, "D#4": 311.13, "E4": 329.63, "F4": 349.23, "F#4": 369.99, "G4": 392.00, "G#4": 415.30, "A4": 440.00, "A#4": 466.16, "B4": 493.88,
  "C5": 523.25, "C#5": 554.37, "D5": 587.33, "D#5": 622.25, "E5": 659.25, "F5": 698.46, "F#5": 739.99, "G5": 783.99, "G#5": 830.61, "A5": 880.00, "A#5": 932.33, "B5": 987.77
};

function getFreq(note: string): number {
  const c = note.trim();
  return NOTE_FREQS[c] || NOTE_FREQS[c.toUpperCase()] || 440;
}

export const ObsidianMirror: React.FC = () => {
  const { user, profile } = useUser();
  const [story, setStory] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [song, setSong] = useState<any | null>(null);
  
  // Player & Synthesis States
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [volume, setVolume] = useState(0.5);
  const [tempo, setTempo] = useState(85);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isArchived, setIsArchived] = useState(false);
  const [errorString, setErrorString] = useState<string | null>(null);

  // Audio Context Ref
  const audioCtxRef = useRef<AudioContext | null>(null);
  const schedulerTimerRef = useRef<number | null>(null);
  const activeNodesRef = useRef<AudioNode[]>([]);
  const visualizerCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const STYLED_PROMPTS = [
    "He watched the fog roll over the cold concrete harbor, holding a letter with no return address.",
    "The glowing analog dials flickered, throwing soft orange light onto her velvet coat.",
    "A single neon sign humming in the steady rain, casting indigo shadows down the wet alley.",
    "In the quiet of the mesopic dusk, the synthesizer hummed a chord that felt like homecoming."
  ];

  const LOADING_STEPS = [
    "Gazing into obsidian depths...",
    "Calibrating microtonal scale thresholds...",
    "Synthesizing verbal narrative parameters...",
    "Interweaving frequency vectors via Lyria...",
    "Reconciling harmonic drift ratios...",
    "Manifesting audio spectrum elements..."
  ];

  useEffect(() => {
    // Step loader cycle
    let interval: number;
    if (loading) {
      interval = setInterval(() => {
        setLoadingStep(prev => (prev + 1) % LOADING_STEPS.length);
      }, 1800);
    }
    return () => clearInterval(interval);
  }, [loading]);

  // Visualizer Animation
  useEffect(() => {
    const canvas = visualizerCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;
    const render = () => {
      time += 0.04;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const w = canvas.width;
      const h = canvas.height;

      // Draw elegant neon violet waves based on play state
      const lines = 4;
      const speedMultiplier = isPlaying ? 1.5 : 0.3;
      const amplitude = isPlaying ? 25 : 4;

      for (let j = 0; j < lines; j++) {
        ctx.beginPath();
        ctx.strokeStyle = j === 0 
          ? 'rgba(139, 92, 246, 0.45)' 
          : j === 1 
          ? 'rgba(168, 85, 247, 0.25)' 
          : 'rgba(107, 114, 128, 0.15)';
        ctx.lineWidth = j === 0 ? 1.5 : 1;

        for (let x = 0; x < w; x++) {
          const angle = (x * 0.01) + (time * speedMultiplier) + (j * Math.PI / 4);
          const y = h / 2 + Math.sin(angle) * amplitude * Math.cos(angle * 0.5);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // Rotating subtle particle orbit in play state
      if (isPlaying) {
        ctx.strokeStyle = 'rgba(139, 92, 246, 0.15)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        const centerX = w / 2;
        const centerY = h / 2;
        const radius = 40 + Math.sin(time * 0.5) * 10;
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();

        // Orbiter
        ctx.fillStyle = 'rgba(168, 85, 247, 0.8)';
        ctx.beginPath();
        const orbX = centerX + Math.cos(time) * radius;
        const orbY = centerY + Math.sin(time) * radius;
        ctx.arc(orbX, orbY, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying]);

  const handleWeaveMelody = async () => {
    if (!story.trim()) return;
    setLoading(true);
    setSong(null);
    setIsArchived(false);
    setErrorString(null);
    handleStopPlayback();

    try {
      const response = await generateLyriaSong(story.trim(), profile);
      setSong(response);
      if (response.bpm) {
        setTempo(response.bpm);
      }
    } catch (e: any) {
      console.error("MIMI // Lyria synthesis failed:", e);
      setErrorString("An oscillation error occurred in the threshold. Realigning.");
    } finally {
      setLoading(false);
    }
  };

  const handlePlaySong = async () => {
    if (!song) return;
    
    // Stop any existing loop first
    handleStopPlayback();

    // Create or resume AudioContext
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    const ac = audioCtxRef.current;
    if (ac.state === 'suspended') {
      await ac.resume();
    }

    setIsPlaying(true);
    let step = 0;
    setCurrentStep(0);

    const stepDuration = 60 / tempo; // length of beat in seconds
    const loopIntervalMs = stepDuration * 1000 * 0.5; // sixteenth or eighth notes sequence split

    // Setup sequence playing
    const tick = () => {
      if (!isPlaying) return;

      const timeNow = ac.currentTime;

      // Play Chord pad on steps 0, 8, 16, 24 (slower drone)
      const isChordStep = step % 8 === 0;
      if (isChordStep && song.chords && song.chords.length > 0) {
        const chordIndex = Math.floor(step / 8) % song.chords.length;
        const chordNotes = song.chords[chordIndex];
        
        // Lush polyphonic synth pad with delay
        chordNotes.forEach((note: string) => {
          const freq = getFreq(note);
          if (!freq) return;

          // Oscillator
          const osc = ac.createOscillator();
          const gain = ac.createGain();
          const panner = ac.createStereoPanner ? ac.createStereoPanner() : null;
          
          osc.type = song.vibe === 'sawtooth' ? 'triangle' : (song.vibe || 'sine');
          osc.frequency.setValueAtTime(freq, timeNow);

          // Low pass filter to make it lush & dark
          const filter = ac.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(320 + Math.sin(timeNow * 0.2) * 100, timeNow);

          // Panning movement
          if (panner) {
            panner.pan.setValueAtTime(Math.sin(chordIndex * Math.PI / 2) * 0.4, timeNow);
          }

          // Slow attack envelope & long tail release (Lush ambient pads)
          gain.gain.setValueAtTime(0, timeNow);
          // Rise over 1.6s
          gain.gain.linearRampToValueAtTime(0.18 * volume, timeNow + 1.2);
          // Tail fade
          gain.gain.setValueAtTime(0.18 * volume, timeNow + stepDuration * 3.5);
          gain.gain.exponentialRampToValueAtTime(0.001, timeNow + stepDuration * 5.0);

          if (panner) {
            osc.connect(filter).connect(panner).connect(gain).connect(ac.destination);
          } else {
            osc.connect(filter).connect(gain).connect(ac.destination);
          }

          osc.start(timeNow);
          osc.stop(timeNow + stepDuration * 5.2);

          activeNodesRef.current.push(osc);
        });
      }

      // Play crystalline leading melody
      if (song.melody && song.melody.length > 0) {
        const melodyIndex = step % song.melody.length;
        const note = song.melody[melodyIndex];
        const freq = getFreq(note);

        if (freq && Math.random() > 0.15) { // some random rhythmic gates for interest
          const osc = ac.createOscillator();
          const gain = ac.createGain();
          
          osc.type = 'sine'; // pure crystal
          osc.frequency.setValueAtTime(freq, timeNow);

          // Delay echo trail
          const delay = ac.createDelay();
          const feedback = ac.createGain();

          delay.delayTime.value = 0.28;
          feedback.gain.value = 0.35;

          // Quick attack, nice chime-like decay curve
          gain.gain.setValueAtTime(0, timeNow);
          gain.gain.linearRampToValueAtTime(0.24 * volume, timeNow + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, timeNow + stepDuration * 0.9);

          osc.connect(gain);
          gain.connect(ac.destination);

          // Route feedback echo line
          gain.connect(delay);
          delay.connect(feedback);
          feedback.connect(delay);
          delay.connect(ac.destination);

          osc.start(timeNow);
          osc.stop(timeNow + stepDuration * 1.2);

          activeNodesRef.current.push(osc);
        }
      }

      setCurrentStep(step % 32);
      step++;
    };

    // Fast precise scheduler
    const intervalId = window.setInterval(tick, loopIntervalMs);
    schedulerTimerRef.current = intervalId;
  };

  const handleStopPlayback = () => {
    setIsPlaying(false);
    if (schedulerTimerRef.current) {
      clearInterval(schedulerTimerRef.current);
      schedulerTimerRef.current = null;
    }
    // Fade out or kill all active oscillators cleanly
    try {
      activeNodesRef.current.forEach(node => {
        try {
          (node as any).stop();
        } catch(e){}
      });
      activeNodesRef.current = [];
    } catch(e){}
  };

  useEffect(() => {
    // Return cleanup
    return () => {
      handleStopPlayback();
    };
  }, []);

  const handleArchiveSong = async () => {
    if (!song || isArchiving || isArchived) return;
    setIsArchiving(true);
    try {
      const targetUid = user?.uid || 'ghost_temporary';
      await archiveManager.saveToPocket(targetUid, 'text', {
        title: song.title,
        content: `[Lyria Composition]\nMood: ${song.mood}\nBMP: ${song.bpm}\n\nLyrics:\n${song.lyrics}\n\nStory Base: ${story}`,
        source: 'Lyria Story & Song Engine',
        songDetails: {
          bpm: song.bpm,
          mood: song.mood,
          melody: song.melody,
          chords: song.chords,
          vibe: song.vibe
        }
      });
      setIsArchived(true);
    } catch (e) {
      console.error("MIMI // Lyria commit failed:", e);
    } finally {
      setIsArchiving(false);
    }
  };

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-start pt-24 md:pt-32 p-4 md:p-8 bg-[#040405] text-stone-100 pb-32">
      <div className="relative z-10 w-full max-w-4xl space-y-10">
        
        {/* Cinematic Header Block */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="text-center space-y-3"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 border border-purple-500/20 bg-purple-500/5 text-purple-400 font-mono text-[8px] uppercase tracking-widest font-bold">
            <Waves size={10} className="animate-pulse" />
            Vocal & Harmonic Alchemist
          </div>
          <h2 className="font-serif text-4xl md:text-6xl italic tracking-tighter text-white">
            The Obsidian Mirror
          </h2>
          <p className="font-mono text-[8.5px] uppercase tracking-[0.25em] text-stone-500 max-w-md mx-auto leading-relaxed">
            Feed a micro-story to the dark looking glass. Lyria will translate your sentences into a poetic song landscape and weave a retro synthesized melody loop.
          </p>
        </motion.div>

        {/* Content Layout */}
        <div className="grid md:grid-cols-2 gap-8 items-stretch">
          
          {/* LEFT COLUMN: Input incantation / Story base */}
          <div className="flex flex-col p-6 bg-stone-950 border border-stone-800 rounded-none shadow-2xl space-y-5 justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-stone-900 pb-2">
                <span className="font-mono text-[8.5px] uppercase tracking-widest text-purple-400 font-black flex items-center gap-1.5">
                  <Feather size={10} /> Leave a few sentences
                </span>
                <span className="font-mono text-[7px] text-stone-500 uppercase tracking-widest bg-stone-900 px-1.5 py-0.5">
                  {story.length} chars
                </span>
              </div>

              <textarea 
                value={story}
                onChange={(e) => setStory(e.target.value)}
                placeholder="Give a few sentences or describe a fleeting mood, a nostalgic room, or a rain-slicked city story..."
                className="w-full h-44 bg-[#0a0a0c] border border-stone-850 p-4 font-serif italic text-xs leading-relaxed text-stone-300 placeholder-stone-600 focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
              />

              <div className="space-y-1.5">
                <span className="font-mono text-[7px] uppercase tracking-widest text-stone-500 font-bold block text-left">SUGGESTED NARRATIVE THREADS</span>
                <div className="flex flex-wrap gap-1.5">
                  {STYLED_PROMPTS.map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => setStory(p)}
                      className="text-[8.5px] font-serif text-left italic border border-stone-900 hover:border-purple-600/40 bg-stone-900/10 hover:bg-purple-900/5 px-2 py-1 text-stone-400 transition-all truncate max-w-full"
                    >
                      "{p}"
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={handleWeaveMelody}
              disabled={loading || !story.trim()}
              className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-stone-900 text-white font-mono text-[9.5px] uppercase tracking-[0.2em] font-black transition-all shadow-lg shadow-purple-900/20 active:scale-98 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={12} className="animate-spin" /> : <Eye size={12} />}
              WEAVE REALITY INTO SOUND
            </button>
          </div>

          {/* RIGHT COLUMN: Output Lyric sheet & Cassette Visual Synthesizer */}
          <div className="flex flex-col justify-center items-center p-6 bg-stone-950 border border-stone-800 rounded-none relative overflow-hidden min-h-[400px]">
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div 
                  key="loading"
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }}
                  className="space-y-4 text-center py-20"
                >
                  <Disc3 className="animate-spin text-purple-500 mx-auto" size={32} strokeWidth={1} />
                  <p className="font-serif text-sm italic text-[#a8b79f]">{LOADING_STEPS[loadingStep]}</p>
                  <p className="font-mono text-[7px] uppercase tracking-[0.3em] text-stone-500 animate-pulse">algorithmic voice calibration</p>
                </motion.div>
              ) : errorString ? (
                <motion.div key="error" className="text-center py-20 space-y-3">
                  <div className="w-12 h-12 bg-red-950/20 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto">
                    !
                  </div>
                  <p className="font-serif italic text-xs text-stone-400">{errorString}</p>
                  <button onClick={handleWeaveMelody} className="p-3 bg-stone-900 rounded-none text-xs font-mono uppercase tracking-widest text-stone-200">Retry Transfection</button>
                </motion.div>
              ) : song ? (
                <motion.div 
                  key="song"
                  initial={{ opacity: 0, scale: 0.98 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  className="w-full flex flex-col h-full justify-between space-y-6"
                >
                  {/* Cassette/Audio Spectrum Section */}
                  <div className="relative p-4 border border-stone-850 bg-[#09090c] space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-[8px] font-mono tracking-widest text-[#a8b79f]">
                        <Music size={11} className="text-purple-500" />
                        LYRIA CORE v0.9 (STANDALONE SYNTH)
                      </div>
                      <span className="font-mono text-[7px] text-stone-500 bg-stone-900 px-1 py-0.5">
                        MODULATION: {song.vibe?.toUpperCase() || 'SINE'}
                      </span>
                    </div>

                    {/* Canvas Waveform */}
                    <div className="relative h-16 border border-stone-900 overflow-hidden bg-black/60 flex items-center justify-center">
                      <canvas ref={visualizerCanvasRef} width={300} height={64} className="absolute inset-0 w-full h-full" />
                      <div className="relative z-10 text-center space-y-1">
                        <h3 className="font-serif italic text-base font-black text-white leading-tight">
                          {song.title}
                        </h3>
                        <p className="font-mono text-[8px] uppercase tracking-widest text-purple-400">
                          {song.mood} — {tempo} BPM
                        </p>
                      </div>
                    </div>

                    {/* Synth Controls Bar */}
                    <div className="grid grid-cols-2 gap-4 items-center border-t border-stone-900 pt-3">
                      <div className="flex items-center gap-2">
                        <Volume2 size={12} className="text-stone-500" />
                        <input 
                          type="range" 
                          min={0} 
                          max={1} 
                          step={0.1} 
                          value={volume}
                          onChange={(e) => setVolume(Number(e.target.value))}
                          className="w-full accent-purple-500 bg-stone-900 h-1 rounded-full cursor-pointer"
                        />
                      </div>
                      
                      <div className="flex justify-end gap-2">
                        {isPlaying ? (
                          <button 
                            onClick={handleStopPlayback}
                            className="px-3 py-1 bg-purple-905 border border-purple-500/20 text-purple-400 hover:text-white hover:border-purple-500 text-[8.5px] font-mono uppercase tracking-widest flex items-center gap-1.5 transition-colors"
                          >
                            <Square size={8} /> STOP
                          </button>
                        ) : (
                          <button 
                            onClick={handlePlaySong}
                            className="px-3 py-1 bg-purple-500 text-white text-[8.5px] font-mono uppercase tracking-widest flex items-center gap-1.5 hover:bg-purple-600 transition-colors"
                          >
                            <Play size={8} /> PLAY
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Lyrics Board */}
                  <div className="flex-1 bg-[#09090b] border border-stone-850 p-4 space-y-2 relative">
                    <div className="absolute top-2 right-2 flex gap-1 items-center font-mono text-[6.5px] text-stone-600 uppercase">
                      <FileText size={8} /> Spectral Lyrics Output
                    </div>
                    <span className="font-mono text-[7.5px] text-slate-500 tracking-wider font-bold block text-left">CHORUS & VERSE</span>
                    <pre className="font-serif italic text-xs md:text-sm text-stone-300 leading-relaxed overflow-x-auto whitespace-pre-wrap text-center py-4">
                      {song.lyrics}
                    </pre>
                  </div>

                  {/* Footer Core Interaction */}
                  <div className="flex gap-3 justify-end items-center border-t border-stone-905 pt-3">
                    <button 
                      onClick={handleWeaveMelody}
                      className="p-2 border border-stone-850 hover:bg-stone-900 duration-150 text-stone-400 hover:text-white"
                      title="Clear & Re-Incubate"
                    >
                      <RotateCcw size={12} />
                    </button>
                    <button 
                      onClick={handleArchiveSong} 
                      disabled={isArchived || isArchiving} 
                      className={`px-6 py-2 font-mono text-[8.5px] uppercase tracking-widest transition-all flex items-center gap-2 ${
                        isArchived 
                        ? 'bg-stone-900 border border-stone-800 text-[#a8b79f]' 
                        : 'bg-stone-100 text-stone-950 hover:bg-white active:scale-95'
                      }`}
                    >
                      {isArchiving ? <Loader2 size={10} className="animate-spin" /> : isArchived ? <Check size={10} /> : <Bookmark size={10} />}
                      {isArchived ? 'COVEN ARCHIVED' : 'COMMIT TO POCKET'}
                    </button>
                  </div>
                </motion.div>
              ) : (
                <div className="text-center opacity-60 max-w-[240px] space-y-4">
                  <Disc className="mx-auto text-purple-600 animate-spin-slow opacity-30" size={44} strokeWidth={1} />
                  <h3 className="font-serif italic text-base text-stone-300">Resonator Void</h3>
                  <p className="font-mono text-[8px] uppercase tracking-widest text-stone-500 leading-normal">
                    The Obsidian Mirror is quiet. Express your story on the left panel, then weave reality to activate Lyria.
                  </p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Informative Help Sheet */}
        <div className="p-5 border border-stone-900 bg-stone-950/45 text-left space-y-2">
          <div className="flex items-center gap-2 text-stone-400">
            <Info size={11} className="text-purple-400" />
            <span className="font-mono text-[8.5px] uppercase tracking-widest font-black">Synthesizer Architecture</span>
          </div>
          <p className="font-serif italic text-[11px] leading-relaxed text-stone-400 max-w-2xl">
            This module generates custom harmonic and melodic structures inside your web browser. When you press PLAY, the interface initiates an active AudioContext oscillator patch to synthesize lush, low-pass filtered chord pads layered on top of a chiming crystal lead pattern.
          </p>
        </div>

      </div>
    </div>
  );
};
