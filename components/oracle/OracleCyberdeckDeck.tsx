import React from 'react';
import { Briefcase, Disc3, Orbit, Sparkles, Zap } from 'lucide-react';
import type { OracleEntityId } from '../../services/oracleChamberService';

const ENTITY_META: Record<
  OracleEntityId,
  { label: string; role: string; blurb: string; icon: React.ReactElement }
> = {
  mimi: {
    label: 'Mimi',
    role: 'Archivist',
    blurb: 'Evidence, shards, past issues — taste revealed, not invented.',
    icon: <Sparkles size={14} />,
  },
  cyrus: {
    label: 'Cyrus',
    role: 'Oracle',
    blurb: 'Forecasts departures. Pressure-tests your next move.',
    icon: <Briefcase size={14} />,
  },
  synthesis: {
    label: 'Synthesis',
    role: 'Argument',
    blurb: 'Mimi vs Cyrus — evidence vs foresight, then a decision.',
    icon: <Zap size={14} />,
  },
};

interface OracleCyberdeckDeckProps {
  onSelectEntity: (entity: OracleEntityId) => void;
  activeEntity?: OracleEntityId | null;
  compact?: boolean;
}

export const OracleCyberdeckDeck: React.FC<OracleCyberdeckDeckProps> = ({
  onSelectEntity,
  activeEntity = null,
  compact = false,
}) => {
  const size = compact ? 180 : 240;

  return (
    <div className="flex flex-col items-center gap-5">
      <div
        className="relative shrink-0"
        style={{ width: size, height: size }}
      >
        <div className="absolute inset-0 rounded-full border border-white/15 bg-gradient-to-b from-white/[0.06] to-transparent shadow-[inset_0_0_40px_rgba(0,0,0,0.45)]" />
        <div className="absolute inset-[18%] rounded-full border border-dashed border-white/20" />
        <div className="absolute inset-[38%] rounded-full border border-white/25 bg-black/40 flex items-center justify-center">
          <Orbit size={compact ? 14 : 18} className="text-amber-500/70 animate-[spin_12s_linear_infinite]" />
        </div>
        {(['mimi', 'cyrus', 'synthesis'] as OracleEntityId[]).map((id, index) => {
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
              onClick={() => onSelectEntity(id)}
              style={{ left: `${x}%`, top: `${y}%` }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border flex flex-col items-center justify-center gap-0.5 transition-all ${
                compact ? 'w-12 h-12' : 'w-16 h-16'
              } ${
                active
                  ? 'bg-[#f5f4f0] text-black border-amber-500 scale-110 shadow-[0_0_24px_rgba(245,158,11,0.25)]'
                  : 'bg-black/50 text-white/70 border-white/20 hover:border-white/50 hover:scale-105'
              }`}
              aria-pressed={active}
            >
              {meta.icon}
              <span className="font-mono text-[6px] md:text-[7px] uppercase tracking-widest font-bold">
                {meta.label}
              </span>
            </button>
          );
        })}
      </div>

      {!compact && (
        <div className="w-full max-w-xs space-y-2 border border-white/10 p-4 bg-white/[0.03] text-center">
          <p className="font-mono text-[8px] uppercase tracking-[0.28em] text-amber-500/80 flex items-center justify-center gap-2">
            <Disc3 size={10} /> Cyberdeck · Voice Communion
          </p>
          <p className="font-serif italic text-sm text-white/70 leading-relaxed">
            Select an entity, then enter the chamber for live transmission.
          </p>
        </div>
      )}
    </div>
  );
};

interface OracleCyberdeckAtmosphereProps {
  children: React.ReactNode;
  className?: string;
}

/** Dark instrument plate wrapper — matches TheScribe cyberdeck shell. */
export const OracleCyberdeckAtmosphere: React.FC<OracleCyberdeckAtmosphereProps> = ({
  children,
  className = '',
}) => (
  <div className={`relative bg-[#0c0c0b] text-[#f5f4f0] ${className}`}>
    <div
      className="absolute inset-0 pointer-events-none opacity-40"
      style={{
        backgroundImage:
          'radial-gradient(circle at 50% 20%, rgba(255,255,255,0.06) 0%, transparent 50%), linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px)',
        backgroundSize: '100% 100%, 48px 100%',
      }}
    />
    <div className="relative z-10">{children}</div>
  </div>
);

export { ENTITY_META as ORACLE_ENTITY_META };
