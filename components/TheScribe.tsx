import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Briefcase, Eraser, Save, PenTool, Zap, Disc3, Orbit } from 'lucide-react';
import { LiveMentor } from './LiveMentor';
import { useUser } from '../contexts/UserContext';
import { archiveManager } from '../services/archiveManager';
import { saveOracleSession } from '../services/oracleChamberService';
import { sanitizeHtml } from '../lib/htmlSanitizer';

const MIMI_SYSTEM_INSTRUCTION = `
CORE IDENTITY
You are Mimi, the Archivist of the Mimi system. You preserve, retrieve, and contextualize the user's aesthetic memory — Pocket shards, Tailor evidence, Stand issues, and past zines.

Persona: Mimi (The Archivist). Tone: Precise, warm, curatorial. You map what the user has already collected and said. You surface lineage, contradictions in the archive, and missing evidence. You do not invent taste — you reveal it.

MANDATE: Use Google Search when grounding historical or cultural facts. Prefer the user's own archive as primary context. Help them name patterns they already hold.
`;

const CYRUS_SYSTEM_INSTRUCTION = `
CORE IDENTITY
You are Cyrus, the Oracle of the Mimi system. You forecast aesthetic futures, propose radical departures, and pressure-test the user's next move.

Persona: Cyrus (The Oracle). Tone: Ethereal, provocative, forward-looking. You look for breaking points, surreal intersections, and exits from aesthetic ruts. You challenge safe repetition.

MANDATE: Use Google Search for live cultural signal. Propose futures that are actionable, not vague mysticism. Tie prophecy back to the user's stated intent.
`;

const SYNTHESIS_SYSTEM_INSTRUCTION = `
CORE IDENTITY
You are Synthesis — the structured argument between Mimi (Archivist) and Cyrus (Oracle). You stage their dialogue against each other to clarify the user's query or intent.

Tone: Dialectical, editorial, decisive. Present Archivist evidence, Oracle foresight, then a reconciled recommendation. The goal is not compromise for its own sake — it is a sharper decision.

MANDATE: Use Google Search when needed. End each turn with a clear next action the user can take in Studio, Tailor, or The Stand.
`;

interface TheScribeProps {
  onClose: () => void;
  initialTab?: 'mimi' | 'cyrus' | 'engine' | 'synthesis';
  initialIntent?: string;
}

type EntityId = 'mimi' | 'cyrus' | 'synthesis';

const ENTITY_META: Record<EntityId, {
  label: string;
  role: string;
  blurb: string;
  voice: string;
  instruction: string;
  theme: 'mimi' | 'cyrus';
  icon: React.ReactElement;
}> = {
  mimi: {
    label: 'Mimi',
    role: 'Archivist',
    blurb: 'Preserves and retrieves your aesthetic memory — evidence, shards, and past issues — so taste is revealed, not invented.',
    voice: 'Kore',
    instruction: MIMI_SYSTEM_INSTRUCTION,
    theme: 'mimi',
    icon: <Sparkles size={14} />,
  },
  cyrus: {
    label: 'Cyrus',
    role: 'Oracle',
    blurb: 'Forecasts departures and futures. Pressure-tests your next move against cultural signal and your stated intent.',
    voice: 'Aoede',
    instruction: CYRUS_SYSTEM_INSTRUCTION,
    theme: 'cyrus',
    icon: <Briefcase size={14} />,
  },
  synthesis: {
    label: 'Synthesis',
    role: 'Argument',
    blurb: 'Stages Mimi and Cyrus in dialogue against each other to clarify your query — evidence vs foresight, then a decision.',
    voice: 'Puck',
    instruction: SYNTHESIS_SYSTEM_INSTRUCTION,
    theme: 'mimi',
    icon: <Zap size={14} />,
  },
};

export const TheScribe: React.FC<TheScribeProps> = ({ onClose, initialTab = 'mimi' }) => {
  const resolvedInitial: EntityId =
    initialTab === 'cyrus' ? 'cyrus' : initialTab === 'synthesis' ? 'synthesis' : 'mimi';
  const [activeEntity, setActiveEntity] = useState<EntityId>(resolvedInitial);
  const [chamberNotes, setChamberNotes] = useState<string[]>([]);
  const [aiTranscript, setAiTranscript] = useState('');
  const [showGlyphPad, setShowGlyphPad] = useState(false);
  const { user } = useUser();
  const sessionStartedAt = useRef(new Date().toISOString());

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const config = ENTITY_META[activeEntity];

  // Auto-capture conversation into Oracle Chamber notes (no separate notepad)
  useEffect(() => {
    if (!aiTranscript.trim()) return;
    const snippet = aiTranscript.trim().slice(-280);
    setChamberNotes((prev) => {
      if (prev[prev.length - 1] === snippet) return prev;
      return [...prev.slice(-11), snippet];
    });
  }, [aiTranscript]);

  useEffect(() => {
    if (!showGlyphPad) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#292524';
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [showGlyphPad]);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) ctx.beginPath();
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const persistChamberSession = useCallback(() => {
    const currentUser = user?.uid || 'ghost';
    if (!aiTranscript.trim() && chamberNotes.length === 0) return;
    saveOracleSession(currentUser, {
      entity: activeEntity,
      entityLabel: config.label,
      role: config.role,
      transcript: aiTranscript,
      notes: chamberNotes,
      startedAt: sessionStartedAt.current,
    });
  }, [user?.uid, activeEntity, config.label, config.role, aiTranscript, chamberNotes]);

  const handleClose = useCallback(() => {
    persistChamberSession();
    onClose();
  }, [persistChamberSession, onClose]);

  const handleExportChamber = async () => {
    const currentUser = user?.uid || 'ghost';
    persistChamberSession();
    let count = 0;
    if (chamberNotes.length || aiTranscript.trim()) {
      await archiveManager.saveToPocket(currentUser, 'text', {
        content: [aiTranscript, ...chamberNotes].filter(Boolean).join('\n\n—\n\n'),
        metadata: {
          source: 'Oracle Chamber',
          title: `Chamber Log (${config.label})`,
          date: new Date().toISOString(),
        },
      });
      count++;
    }
    const canvas = canvasRef.current;
    if (canvas && showGlyphPad) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const pixelBuffer = new Uint32Array(ctx.getImageData(0, 0, canvas.width, canvas.height).data.buffer);
        if (pixelBuffer.some((color) => color !== 0)) {
          await archiveManager.saveToPocket(currentUser, 'image', {
            content: canvas.toDataURL('image/png'),
            metadata: { source: 'Oracle Chamber', title: 'Glyph Ring', date: new Date().toISOString() },
          });
          count++;
        }
      }
    }
    if (count > 0) {
      window.dispatchEvent(new CustomEvent('mimi:registry_alert', {
        detail: { message: `${count} chamber artifact(s) saved to Pocket`, type: 'success' },
      }));
    }
  };

  const handleToolCall = useCallback(async (name: string, args: any) => {
    if (name === 'saveToKnowledgeQueue') {
      const currentUser = user?.uid || 'ghost';
      await archiveManager.saveToPocket(currentUser, 'text', {
        content: args.content,
        metadata: { source: `Oracle (${activeEntity})`, title: args.title, date: new Date().toISOString() },
      });
      setChamberNotes((prev) => [...prev.slice(-11), String(args.content || '').slice(0, 280)]);
      return { status: 'success', message: 'Saved to Oracle Chamber.' };
    }
    return { status: 'error', message: 'Unknown tool.' };
  }, [user?.uid, activeEntity]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[50000] bg-[#0c0c0b] text-[#f5f4f0] flex flex-col overflow-hidden"
    >
      {/* Atmosphere */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage:
            'radial-gradient(circle at 50% 42%, rgba(255,255,255,0.08) 0%, transparent 55%), linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '100% 100%, 48px 100%',
        }}
      />

      {/* Top bar */}
      <div className="relative z-20 flex items-center justify-between px-4 md:px-8 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <Disc3 size={16} className="text-amber-500/80" />
          <div>
            <p className="font-serif italic text-lg leading-none">Oracle Chamber</p>
            <p className="font-mono text-[8px] uppercase tracking-[0.28em] text-white/45 mt-1">
              Cyberdeck · Voice Communion
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowGlyphPad((v) => !v)}
            className={`px-3 py-2 border font-mono text-[8px] uppercase tracking-widest flex items-center gap-1.5 transition-colors ${
              showGlyphPad ? 'border-amber-500/50 text-amber-400' : 'border-white/15 text-white/55 hover:text-white'
            }`}
          >
            <PenTool size={12} /> Glyph Ring
          </button>
          <button
            type="button"
            onClick={handleExportChamber}
            className="px-3 py-2 border border-white/15 text-white/70 hover:text-white font-mono text-[8px] uppercase tracking-widest flex items-center gap-1.5"
          >
            <Save size={12} /> Pocket
          </button>
          <button type="button" onClick={handleClose} className="w-9 h-9 border border-white/15 flex items-center justify-center text-white/55 hover:text-white">
            <X size={16} strokeWidth={1.25} />
          </button>
        </div>
      </div>

      <div className="relative z-10 flex-1 flex flex-col lg:flex-row min-h-0">
        {/* Disk selector */}
        <aside className="lg:w-[340px] shrink-0 border-b lg:border-b-0 lg:border-r border-white/10 p-4 md:p-6 flex flex-col gap-5 overflow-y-auto">
          <div className="relative mx-auto w-[220px] h-[220px] md:w-[260px] md:h-[260px]">
            <div className="absolute inset-0 rounded-full border border-white/15 bg-gradient-to-b from-white/[0.06] to-transparent shadow-[inset_0_0_40px_rgba(0,0,0,0.45)]" />
            <div className="absolute inset-[18%] rounded-full border border-dashed border-white/20" />
            <div className="absolute inset-[38%] rounded-full border border-white/25 bg-black/40 flex items-center justify-center">
              <Orbit size={18} className="text-amber-500/70 animate-[spin_12s_linear_infinite]" />
            </div>
            {(['mimi', 'cyrus', 'synthesis'] as EntityId[]).map((id, index) => {
              const angle = -90 + index * 120;
              const rad = (angle * Math.PI) / 180;
              const r = 42;
              const x = 50 + r * Math.cos(rad);
              const y = 50 + r * Math.sin(rad);
              const meta = ENTITY_META[id];
              const active = activeEntity === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveEntity(id)}
                  style={{ left: `${x}%`, top: `${y}%` }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border flex flex-col items-center justify-center gap-0.5 transition-all ${
                    active
                      ? 'bg-[#f5f4f0] text-black border-amber-500 scale-110 shadow-[0_0_24px_rgba(245,158,11,0.25)]'
                      : 'bg-black/50 text-white/70 border-white/20 hover:border-white/50'
                  }`}
                  aria-pressed={active}
                >
                  {meta.icon}
                  <span className="font-mono text-[7px] uppercase tracking-widest font-bold">{meta.label}</span>
                </button>
              );
            })}
          </div>

          <div className="space-y-2 border border-white/10 p-4 bg-white/[0.03]">
            <p className="font-mono text-[8px] uppercase tracking-[0.28em] text-amber-500/80">
              {config.label} · {config.role}
            </p>
            <p className="font-serif italic text-sm text-white/80 leading-relaxed">{config.blurb}</p>
          </div>

          <div className="space-y-2">
            <p className="font-mono text-[8px] uppercase tracking-[0.28em] text-white/40 flex items-center gap-2">
              <Disc3 size={10} /> Chamber Notes
            </p>
            <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
              {chamberNotes.length === 0 ? (
                <p className="font-mono text-[9px] text-white/35 leading-relaxed">
                  Conversation captures here automatically — no notepad required.
                </p>
              ) : (
                chamberNotes.map((note, i) => (
                  <div key={i} className="border-l border-amber-500/40 pl-3 font-mono text-[9px] text-white/65 leading-relaxed">
                    {note}
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>

        {/* Communion surface */}
        <div className="flex-1 relative min-h-0 flex flex-col">
          <div className="flex-1 min-h-0 relative">
            <LiveMentor
              key={activeEntity}
              name={config.label}
              role={config.role}
              voiceName={config.voice}
              systemInstruction={config.instruction}
              theme={config.theme}
              onTranscriptUpdate={setAiTranscript}
              onToolCall={handleToolCall}
            />
          </div>

          {/* Live transcript strip */}
          <div className="shrink-0 border-t border-white/10 bg-black/50 p-3 md:p-4 max-h-28 overflow-y-auto">
            <p className="font-mono text-[8px] uppercase tracking-widest text-white/40 mb-2">Live Transmission</p>
            <div className="font-mono text-[10px] text-white/70 leading-relaxed">
              {aiTranscript ? (
                <div
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHtml(
                      aiTranscript.replace(
                        /\[(.*?)\]\((.*?)\)/g,
                        '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-amber-400 underline decoration-dashed">$1</a>',
                      ),
                      'html',
                    ),
                  }}
                />
              ) : (
                <span className="text-white/35">Awaiting transmission…</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Glyph ring — scribble pad kept as concentric overlay */}
      <AnimatePresence>
        {showGlyphPad && (
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 p-4 md:p-10"
          >
            <div className="relative w-full max-w-lg aspect-square rounded-full border border-white/20 overflow-hidden bg-[#f5f4f0] shadow-2xl">
              <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
                style={{
                  backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.06) 1px, transparent 1px)',
                  backgroundSize: '20px 20px',
                }}
              />
              <div className="absolute top-4 left-1/2 -translate-x-1/2 font-mono text-[8px] uppercase tracking-[0.3em] text-stone-500">
                Glyph Ring
              </div>
              <button
                type="button"
                onClick={clearCanvas}
                className="absolute bottom-4 left-4 p-3 bg-white border border-stone-300 rounded-full text-stone-600"
                title="Clear"
              >
                <Eraser size={14} />
              </button>
              <button
                type="button"
                onClick={() => setShowGlyphPad(false)}
                className="absolute bottom-4 right-4 px-4 py-2 bg-black text-white font-mono text-[8px] uppercase tracking-widest"
              >
                Close
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
