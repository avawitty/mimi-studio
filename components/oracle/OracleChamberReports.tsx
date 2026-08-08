import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Activity,
  Briefcase,
  ChevronRight,
  Disc3,
  FileText,
  Sparkles,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import {
  deleteOracleSession,
  extractConversationThemes,
  formatSessionDate,
  listOracleSessions,
  type OracleChamberSession,
  type OracleEntityId,
  type OracleThemeFrequency,
} from '../../services/oracleChamberService';

const ENTITY_ICONS: Record<OracleEntityId, React.ReactElement> = {
  mimi: <Sparkles size={12} />,
  cyrus: <Briefcase size={12} />,
  synthesis: <Zap size={12} />,
};

const ENTITY_COLORS: Record<OracleEntityId, string> = {
  mimi: 'text-white/80 border-white/25',
  cyrus: 'text-amber-400/90 border-amber-500/40',
  synthesis: 'text-[var(--mimi-periwinkle,#b9c4e0)] border-[var(--mimi-periwinkle,#b9c4e0)]/40',
};

interface OracleChamberReportsProps {
  userId: string;
  onOpenChamber?: (entity: OracleEntityId) => void;
  className?: string;
}

export const OracleChamberReports: React.FC<OracleChamberReportsProps> = ({
  userId,
  onOpenChamber,
  className = '',
}) => {
  const [sessions, setSessions] = useState<OracleChamberSession[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [themes, setThemes] = useState<OracleThemeFrequency[]>([]);

  const refresh = useCallback(() => {
    const list = listOracleSessions(userId);
    setSessions(list);
    setThemes(extractConversationThemes(list));
  }, [userId]);

  useEffect(() => {
    refresh();
    const onChange = () => refresh();
    window.addEventListener('mimi:oracle_session_saved', onChange);
    window.addEventListener('mimi:oracle_sessions_changed', onChange);
    return () => {
      window.removeEventListener('mimi:oracle_session_saved', onChange);
      window.removeEventListener('mimi:oracle_sessions_changed', onChange);
    };
  }, [refresh]);

  const selected = useMemo(
    () => sessions.find((s) => s.id === selectedId) ?? null,
    [sessions, selectedId],
  );

  const maxThemeCount = themes[0]?.count ?? 1;

  const handleDelete = (id: string) => {
    deleteOracleSession(userId, id);
    if (selectedId === id) setSelectedId(null);
    refresh();
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Theme frequency strip */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="border border-white/10 bg-white/[0.03] p-5 md:p-6 relative overflow-hidden"
      >
        <div
          className="absolute inset-0 pointer-events-none opacity-30"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px)',
            backgroundSize: '32px 100%',
          }}
        />
        <div className="relative flex items-center gap-2 mb-4">
          <Activity size={12} className="text-amber-500/80" />
          <h2 className="font-mono text-[8px] uppercase tracking-[0.28em] text-white/50">
            Recurring Themes — Signal Analysis
          </h2>
        </div>

        {themes.length === 0 ? (
          <p className="relative font-mono text-[10px] text-white/35 leading-relaxed max-w-lg">
            No themes yet. Commune in the Cyberdeck chamber — patterns emerge after your first
            transmissions are logged.
          </p>
        ) : (
          <div className="relative space-y-3">
            {themes.map((t, i) => (
              <div key={t.theme} className="flex items-center gap-3">
                <span className="font-mono text-[8px] text-white/30 w-4 shrink-0">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline gap-2 mb-1">
                    <span className="font-serif italic text-sm text-white/85 truncate capitalize">
                      {t.theme}
                    </span>
                    <span className="font-mono text-[7px] text-white/35 uppercase tracking-widest shrink-0">
                      {t.sessions} sess · {t.count}
                    </span>
                  </div>
                  <div className="h-0.5 bg-white/10 relative">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(8, (t.count / maxThemeCount) * 100)}%` }}
                      transition={{ duration: 0.6, delay: i * 0.04 }}
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-500/60 to-amber-500/20"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.section>

      {/* Session reports grid */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="border border-white/10 bg-black/30"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <FileText size={12} className="text-amber-500/80" />
            <h2 className="font-mono text-[8px] uppercase tracking-[0.28em] text-white/50">
              Chamber Reports — Past Transmissions
            </h2>
          </div>
          <span className="font-mono text-[8px] text-white/30 uppercase tracking-widest">
            {sessions.length} logged
          </span>
        </div>

        {sessions.length === 0 ? (
          <div className="p-8 md:p-12 text-center space-y-4">
            <Disc3 size={28} className="mx-auto text-white/20 animate-[spin_16s_linear_infinite]" />
            <p className="font-serif italic text-lg text-white/50">
              No chamber reports on record.
            </p>
            <p className="font-mono text-[9px] text-white/30 uppercase tracking-widest max-w-sm mx-auto leading-relaxed">
              Open the Cyberdeck, commune with Mimi, Cyrus, or Synthesis — sessions archive
              automatically when you close the chamber.
            </p>
            {onOpenChamber && (
              <button
                type="button"
                onClick={() => onOpenChamber('cyrus')}
                className="mt-2 px-5 py-2.5 border border-amber-500/40 text-amber-400/90 font-mono text-[8px] uppercase tracking-[0.24em] hover:bg-amber-500/10 transition-colors"
              >
                Enter Cyberdeck
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-white/8 max-h-[420px] overflow-y-auto">
            {sessions.map((session) => (
              <button
                key={session.id}
                type="button"
                onClick={() => setSelectedId(session.id)}
                className="w-full text-left px-5 py-4 hover:bg-white/[0.04] transition-colors group flex items-start gap-4"
              >
                <div
                  className={`shrink-0 w-9 h-9 rounded-full border flex items-center justify-center ${ENTITY_COLORS[session.entity]}`}
                >
                  {ENTITY_ICONS[session.entity]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-[8px] uppercase tracking-widest text-white/70">
                      {session.entityLabel} · {session.role}
                    </span>
                    <span className="font-mono text-[7px] text-white/30">
                      {formatSessionDate(session.endedAt)}
                    </span>
                  </div>
                  <p className="font-serif italic text-sm text-white/75 leading-relaxed line-clamp-2">
                    {session.excerpt}
                  </p>
                  <span className="font-mono text-[7px] text-white/25 mt-1.5 inline-block uppercase tracking-widest">
                    {session.wordCount} words
                  </span>
                </div>
                <ChevronRight
                  size={14}
                  className="shrink-0 text-white/20 group-hover:text-amber-500/60 transition-colors mt-1"
                />
              </button>
            ))}
          </div>
        )}
      </motion.section>

      {/* Session detail overlay */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[40000] flex items-end md:items-center justify-center bg-black/75 p-0 md:p-6"
            onClick={() => setSelectedId(null)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full md:max-w-2xl max-h-[85dvh] overflow-hidden bg-[#0c0c0b] border border-white/15 flex flex-col"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                <div>
                  <p className="font-mono text-[8px] uppercase tracking-[0.28em] text-amber-500/80">
                    Chamber Report
                  </p>
                  <p className="font-serif italic text-lg text-white/90 mt-0.5">
                    {selected.entityLabel} · {selected.role}
                  </p>
                  <p className="font-mono text-[8px] text-white/35 mt-1">
                    {formatSessionDate(selected.endedAt)} · {selected.wordCount} words
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDelete(selected.id)}
                    className="p-2 border border-white/15 text-white/40 hover:text-red-400/80 hover:border-red-400/30 transition-colors"
                    title="Delete report"
                  >
                    <Trash2 size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedId(null)}
                    className="p-2 border border-white/15 text-white/55 hover:text-white"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {selected.transcript && (
                  <div>
                    <p className="font-mono text-[8px] uppercase tracking-widest text-white/40 mb-2">
                      Live Transmission
                    </p>
                    <p className="font-mono text-[11px] text-white/70 leading-relaxed whitespace-pre-wrap">
                      {selected.transcript}
                    </p>
                  </div>
                )}
                {selected.notes.length > 0 && (
                  <div>
                    <p className="font-mono text-[8px] uppercase tracking-widest text-white/40 mb-2">
                      Chamber Notes
                    </p>
                    <div className="space-y-2">
                      {selected.notes.map((note: string, i: number) => (
                        <div
                          key={i}
                          className="border-l border-amber-500/40 pl-3 font-mono text-[10px] text-white/60 leading-relaxed"
                        >
                          {note}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {onOpenChamber && (
                <div className="shrink-0 px-5 py-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(null);
                      onOpenChamber(selected.entity);
                    }}
                    className="w-full py-3 border border-amber-500/40 text-amber-400/90 font-mono text-[8px] uppercase tracking-[0.24em] hover:bg-amber-500/10 transition-colors"
                  >
                    Resume with {selected.entityLabel}
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
