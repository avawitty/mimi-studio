// @ts-nocheck
import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { subscribeToUserZines, fetchCommunityZines } from '../services/firebaseUtils';
import { getLocalZines } from '../services/localArchive';
import { ZineMetadata } from '../types';
import { useUser } from '../contexts/UserContext';
import { Search, Loader2, Ghost, User, Globe, ArrowUpRight } from 'lucide-react';
import { ZineCoverCard } from './ZineCoverCard';
import { ZineComments } from './ZineComments';
import {
  PublicField,
  MimiWordmark,
  ColumnRule,
  PublicCTA,
  PressMark,
} from './public-face';
import { PressReveal } from './motion/PressReveal';

/**
 * The Stand — zine rack / open profile showcase.
 * Column-ruled grid, quiet typography — not a profile dashboard (PRD-03 / PRD-07).
 */
export const TheStand: React.FC<{ onSelectZine: (zine: ZineMetadata) => void }> = ({ onSelectZine }) => {
  const { user, profile } = useUser();
  const [localZines, setLocalZines] = useState<ZineMetadata[]>([]);
  const [cloudZines, setCloudZines] = useState<ZineMetadata[]>([]);
  const [communityZines, setCommunityZines] = useState<ZineMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'mine' | 'floor'>('mine');
  const [searchQuery, setSearchQuery] = useState('');
  const [commentZineId, setCommentZineId] = useState<string | null>(null);

  useEffect(() => {
    let unsubUser = () => {};
    const load = async () => {
      setLoading(true);
      try {
        const local = (await getLocalZines()) || [];
        setLocalZines(local.filter((z) => z && z.id && z.content));
        setLoading(false);

        if (user && !user.isAnonymous) {
          unsubUser = subscribeToUserZines(
            user.uid,
            (data) => {
              setCloudZines((data || []).filter((z) => z && z.id && z.content));
              setLoading(false);
            },
            () => {
              setLoading(false);
            },
          );
        }

        try {
          const community = await fetchCommunityZines(40);
          setCommunityZines(community || []);
        } catch (e) {
          console.warn('Mimi // Stand community feed unavailable', e);
        }
      } catch (e) {
        console.error(e);
        setLoading(false);
      }
    };
    load();

    const onFinalize = async () => {
      const updated = (await getLocalZines()) || [];
      setLocalZines(updated.filter((z) => z && z.id && z.content));
    };
    window.addEventListener('mimi:artifact_finalized', onFinalize);

    return () => {
      unsubUser();
      window.removeEventListener('mimi:artifact_finalized', onFinalize);
    };
  }, [user]);

  const myZines = useMemo(() => {
    const merged = [...localZines, ...cloudZines];
    return Array.from(new Map(merged.map((z) => [z.id, z])).values()).sort(
      (a, b) => (b.timestamp || 0) - (a.timestamp || 0),
    );
  }, [localZines, cloudZines]);

  const filteredZines = useMemo(() => {
    const source = mode === 'mine' ? myZines : communityZines;
    if (!searchQuery.trim()) return source;
    const q = searchQuery.toLowerCase();
    return source.filter(
      (z) =>
        z.title?.toLowerCase().includes(q) ||
        z.tone?.toLowerCase().includes(q) ||
        z.userHandle?.toLowerCase().includes(q) ||
        z.content?.headlines?.[0]?.toLowerCase().includes(q),
    );
  }, [mode, myZines, communityZines, searchQuery]);

  const handle = profile?.handle ? `@${profile.handle}` : null;
  const displayName = profile?.displayName || profile?.handle || 'The Stand';
  const showFullLoader = loading && mode === 'mine' && myZines.length === 0;

  return (
    <>
      <PublicField className="flex-1 w-full h-full flex flex-col relative overflow-hidden">
        <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
          <PressReveal>
            <header className="px-6 md:px-16 pt-10 md:pt-16 pb-8 space-y-8">
              <div className="flex justify-between items-start gap-6">
                <div className="space-y-5 max-w-2xl">
                  <MimiWordmark size="sm" />
                  <h1 className="font-serif italic text-5xl md:text-7xl tracking-tight text-[var(--mimi-ink)] leading-[0.9]">
                    {displayName}
                  </h1>
                  {handle && (
                    <p className="font-sans text-[11px] uppercase tracking-[0.28em] text-[var(--mimi-stone)]">
                      {handle}
                    </p>
                  )}
                  <p className="font-serif italic text-lg text-[var(--mimi-stone)] max-w-xl leading-relaxed">
                    Issues on the stand — covers as plates, quiet as a print rack.
                  </p>
                  <PressMark
                    label={
                      mode === 'mine'
                        ? `${myZines.length} issues`
                        : `Floor · ${communityZines.length}`
                    }
                  />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    window.dispatchEvent(new CustomEvent('mimi:change_view', { detail: 'profile' }))
                  }
                  className="hidden md:inline-flex items-center gap-2 font-sans text-[10px] uppercase tracking-[0.22em] text-[var(--mimi-stone)] hover:text-[var(--mimi-ink)]"
                >
                  Profile <ArrowUpRight size={12} />
                </button>
              </div>

              <ColumnRule />

              <div className="flex flex-col md:flex-row justify-between items-end gap-6">
                <div className="flex gap-8">
                  <button
                    type="button"
                    onClick={() => setMode('mine')}
                    className={`font-sans text-[10px] uppercase tracking-[0.22em] font-semibold pb-2 transition-colors flex items-center gap-2 border-b ${
                      mode === 'mine'
                        ? 'text-[var(--mimi-ink)] border-[var(--mimi-ink)]'
                        : 'text-[var(--mimi-stone)] border-transparent hover:text-[var(--mimi-ink)]'
                    }`}
                  >
                    <User size={12} /> My Issues
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('floor')}
                    className={`font-sans text-[10px] uppercase tracking-[0.22em] font-semibold pb-2 transition-colors flex items-center gap-2 border-b ${
                      mode === 'floor'
                        ? 'text-[var(--mimi-ink)] border-[var(--mimi-ink)]'
                        : 'text-[var(--mimi-stone)] border-transparent hover:text-[var(--mimi-ink)]'
                    }`}
                  >
                    <Globe size={12} /> Floor
                  </button>
                </div>

                <div className="relative w-full md:w-auto">
                  <Search
                    size={14}
                    className="absolute left-0 top-1/2 -translate-y-1/2 text-[var(--mimi-stone)]"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter issues…"
                    className="w-full md:w-64 bg-transparent border-0 border-b border-[var(--mimi-hairline)] py-2 pl-6 font-sans text-xs focus:outline-none focus:border-[var(--mimi-ink)] transition-colors placeholder:text-[var(--mimi-stone)]"
                  />
                </div>
              </div>
            </header>
          </PressReveal>

          <div className="px-4 md:px-12">
            {showFullLoader ? (
              <div className="py-48 flex flex-col items-center justify-center gap-6 opacity-50">
                <Loader2 size={32} className="animate-spin text-[var(--mimi-stone)]" />
                <span className="font-sans text-[9px] uppercase tracking-[0.3em]">
                  Loading stand…
                </span>
              </div>
            ) : filteredZines.length === 0 ? (
              <div className="py-32 flex flex-col items-center justify-center gap-6 text-center px-6">
                <Ghost size={40} className="text-[var(--mimi-stone)]" />
                <p className="font-serif italic text-2xl text-[var(--mimi-ink)]">
                  {mode === 'mine' ? 'No issues on your stand yet.' : 'No signal on this frequency.'}
                </p>
                {mode === 'mine' && (
                  <PublicCTA
                    onClick={() =>
                      window.dispatchEvent(new CustomEvent('mimi:change_view', { detail: 'studio' }))
                    }
                  >
                    Compose first issue
                  </PublicCTA>
                )}
              </div>
            ) : (
              /* Column-ruled zine rack — not a card deck with shadows */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 border-t border-l border-[var(--mimi-hairline)]">
                {filteredZines.map((zine, index) => (
                  <div
                    key={zine.id}
                    className="border-r border-b border-[var(--mimi-hairline)] p-3 md:p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <PressMark label={`Issue ${String(index + 1).padStart(2, '0')}`} />
                    </div>
                    <ZineCoverCard
                      zine={zine}
                      onClick={() => onSelectZine(zine)}
                      onComment={(e) => {
                        e.stopPropagation();
                        setCommentZineId(zine.id);
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <footer className="mt-24 border-t border-[var(--mimi-hairline)] py-12 text-center">
            <p className="font-serif italic text-sm text-[var(--mimi-stone)]">
              Your stand is your open profile in waiting.
            </p>
          </footer>
        </div>
      </PublicField>

      <AnimatePresence>
        {commentZineId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center justify-center p-4"
            onClick={() => setCommentZineId(null)}
          >
            <div
              className="bg-[var(--mimi-field)] w-full max-w-lg max-h-[80vh] overflow-y-auto border border-[var(--mimi-ink)]"
              onClick={(e) => e.stopPropagation()}
            >
              <ZineComments zineId={commentZineId} onClose={() => setCommentZineId(null)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
