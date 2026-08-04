// @ts-nocheck
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { subscribeToUserZines, fetchCommunityZines, subscribeToCommunityZines } from '../services/firebaseUtils';
import {
  fetchSovereignCommunityZines,
  fetchSovereignStatus,
  type SovereignArchiveStatus,
} from '../services/sovereignClient';
import { getLocalZines } from '../services/localArchive';
import { ZineMetadata } from '../types';
import { useUser } from '../contexts/UserContext';
import { Search, Loader2, Ghost, User, Globe, ArrowUpRight } from 'lucide-react';
import { ZineCoverCard } from './ZineCoverCard';
import { ZineComments } from './ZineComments';
import {
  PublicField,
  ColumnRule,
  PublicCTA,
  PressMark,
} from './public-face';
import { PressReveal } from './motion/PressReveal';

/**
 * The Stand — published-issues shelf / open profile showcase.
 * Column-ruled grid, quiet typography — not a profile dashboard (PRD-03 / PRD-07).
 * Floor reads from the sovereign archive when available.
 */
export const TheStand: React.FC<{ onSelectZine: (zine: ZineMetadata) => void }> = ({ onSelectZine }) => {
  const { user, profile } = useUser();
  const [localZines, setLocalZines] = useState<ZineMetadata[]>([]);
  const [cloudZines, setCloudZines] = useState<ZineMetadata[]>([]);
  /** Last known unfiltered Floor shelf (live SSE / empty-query). */
  const [floorBrowseZines, setFloorBrowseZines] = useState<ZineMetadata[]>([]);
  /** Active Floor search hit list (may be hybrid/semantic). */
  const [communityZines, setCommunityZines] = useState<ZineMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [floorLoading, setFloorLoading] = useState(false);
  const [floorLoaded, setFloorLoaded] = useState(false);
  const [archive, setArchive] = useState<SovereignArchiveStatus | null>(null);
  const [mode, setMode] = useState<'mine' | 'floor'>('mine');
  const [searchQuery, setSearchQuery] = useState('');
  /** Query string last applied by sovereign Floor search; null while pending or on failure. */
  const [floorSearchApplied, setFloorSearchApplied] = useState<string | null>(null);
  const [commentZineId, setCommentZineId] = useState<string | null>(null);
  const searchQueryRef = useRef(searchQuery);
  searchQueryRef.current = searchQuery;
  const floorBrowseRef = useRef(floorBrowseZines);
  floorBrowseRef.current = floorBrowseZines;

  // Identity key — Floor fetch must cancel/restart when this changes (uid alone
  // is not enough when floorLoaded stays false mid-flight).
  const floorIdentityKey = `${user?.uid ?? ''}:${user?.isAnonymous ? 'anon' : 'reg'}`;

  // Identity change must resettle Floor — don't keep another account's shelf / empty quota state.
  useEffect(() => {
    setFloorLoaded(false);
    setFloorBrowseZines([]);
    setCommunityZines([]);
    setFloorSearchApplied(null);
    setCloudZines([]);
  }, [floorIdentityKey]);


  useEffect(() => {
    let unsubUser = () => {};
    const load = async () => {
      setLoading(true);
      try {
        void fetchSovereignStatus().then((status) => {
          if (status) setArchive(status);
        });

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

  // Lazy-load Floor once, then keep live via SSE / poll — including while searching
  // so unpublished/deleted issues leave the shelf (and active search) promptly.
  // floorIdentityKey cancels in-flight prior-identity fetches even when floorLoaded
  // was still false (deps otherwise wouldn't change).
  useEffect(() => {
    if (mode !== 'floor') return;
    let cancelled = false;
    let unsubLive = () => {};

    (async () => {
      // Lazy-load once; settle floorLoaded even on empty/error so quota failures
      // cannot re-trigger fetchCommunityZines in a loop (#141).
      if (!floorLoaded) {
        setFloorLoading(true);
        try {
          const community = await fetchCommunityZines(40);
          if (!cancelled) {
            const list = community || [];
            setFloorBrowseZines(list);
            if (!searchQueryRef.current.trim()) {
              setCommunityZines(list);
              setFloorSearchApplied('');
            }
            const status = await fetchSovereignStatus(true);
            if (status) setArchive(status);
          }
        } catch (e) {
          console.warn('Mimi // Stand community feed unavailable', e);
        } finally {
          if (!cancelled) {
            setFloorLoaded(true);
            setFloorLoading(false);
          }
        }
      }

      if (cancelled) return;
      // Match initial Floor page size (40) so live hydrate cannot shrink the shelf.
      unsubLive = subscribeToCommunityZines((docs) => {
        if (cancelled) return;
        const list = docs || [];
        setFloorBrowseZines(list);
        const q = searchQueryRef.current.trim();
        if (!q) {
          setCommunityZines(list);
          setFloorSearchApplied('');
          return;
        }
        // Search is active — re-run hybrid search so deletes/unpublishes drop out.
        // On miss/503 keep current hits: pruning against the recency browse shelf
        // would drop valid semantic-only matches that never appear there.
        void fetchSovereignCommunityZines(40, q)
          .then((results) => {
            if (cancelled || !results) return;
            setCommunityZines(results);
            setFloorSearchApplied(q);
          })
          .catch(() => {
            // keep current search hits
          });
      }, { limit: 40 });
    })();

    return () => {
      cancelled = true;
      unsubLive();
    };
  }, [mode, floorLoaded, floorIdentityKey]);

  // Server-side Floor search when sovereign is ready; restore browse shelf when cleared.
  useEffect(() => {
    if (mode !== 'floor' || !floorLoaded || !archive?.ready) return;
    const q = searchQuery.trim();
    let cancelled = false;

    // Clearing search: sync communityZines to browse (display already uses floorBrowseZines).
    if (!q) {
      setCommunityZines(floorBrowseRef.current);
      setFloorSearchApplied('');
      return;
    }

    setFloorSearchApplied(null);
    const handle = setTimeout(async () => {
      try {
        const results = await fetchSovereignCommunityZines(40, q);
        if (!cancelled && results) {
          setCommunityZines(results);
          setFloorSearchApplied(q);
          return;
        }
      } catch {
        // fall through to client filter via filteredZines
      }
      if (!cancelled) setFloorSearchApplied(null);
    }, 220);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [searchQuery, mode, floorLoaded, archive?.ready]);

  const myZines = useMemo(() => {
    const merged = [...localZines, ...cloudZines];
    return Array.from(new Map(merged.map((z) => [z.id, z])).values()).sort(
      (a, b) => (b.timestamp || 0) - (a.timestamp || 0),
    );
  }, [localZines, cloudZines]);

  const filteredZines = useMemo(() => {
    const qTrim = searchQuery.trim();
    if (mode === 'mine') {
      if (!qTrim) return myZines;
      const q = qTrim.toLowerCase();
      return myZines.filter(
        (z) =>
          z.title?.toLowerCase().includes(q) ||
          z.tone?.toLowerCase().includes(q) ||
          z.userHandle?.toLowerCase().includes(q) ||
          z.content?.headlines?.[0]?.toLowerCase().includes(q),
      );
    }
    // Floor: empty query always uses browse shelf (not a lingering search snapshot).
    if (!qTrim) return floorBrowseZines;
    // Trust sovereign hybrid search results (including semantic-only matches).
    if (archive?.ready && floorSearchApplied === qTrim) return communityZines;
    const q = qTrim.toLowerCase();
    const source = floorBrowseZines.length ? floorBrowseZines : communityZines;
    return source.filter(
      (z) =>
        z.title?.toLowerCase().includes(q) ||
        z.tone?.toLowerCase().includes(q) ||
        z.userHandle?.toLowerCase().includes(q) ||
        z.content?.headlines?.[0]?.toLowerCase().includes(q),
    );
  }, [
    mode,
    myZines,
    floorBrowseZines,
    communityZines,
    searchQuery,
    archive?.ready,
    floorSearchApplied,
  ]);

  const handle = profile?.handle ? `@${profile.handle}` : null;
  const displayName = profile?.displayName || profile?.handle || 'The Stand';
  const showFullLoader = loading && mode === 'mine' && myZines.length === 0;
  const floorCount = searchQuery.trim() ? filteredZines.length : floorBrowseZines.length;
  const floorMark = archive?.ready
    ? `House archive · ${floorCount}`
    : `Floor · ${floorCount}`;

  return (
    <>
      <PublicField className="w-full min-h-full flex flex-col">
        <div className="flex flex-col flex-1">
          <PressReveal>
            <header className="px-6 md:px-16 pt-6 md:pt-14 pb-6 md:pb-8 space-y-6 md:space-y-8">
              <div className="flex justify-between items-start gap-6">
                <div className="space-y-4 md:space-y-5 max-w-2xl">
                  <h1 className="font-serif italic text-4xl md:text-7xl tracking-tight text-[var(--mimi-ink)] leading-[0.9]">
                    {displayName}
                  </h1>
                  {handle && (
                    <p className="font-sans text-[11px] uppercase tracking-[0.28em] text-[var(--mimi-stone)]">
                      {handle}
                    </p>
                  )}
                  <p className="font-serif italic text-lg text-[var(--mimi-stone)] max-w-xl leading-relaxed">
                    Issues on the stand — covers as plates, quiet as an open shelf.
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <PressMark
                      label={
                        mode === 'mine'
                          ? `${myZines.length} issues`
                          : floorMark
                      }
                    />
                    {archive?.ready && (
                      <span className="font-sans text-[9px] uppercase tracking-[0.22em] text-[var(--mimi-stone)]">
                        Sovereign
                      </span>
                    )}
                  </div>
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

              <div className="flex flex-col md:flex-row justify-between items-stretch md:items-end gap-4 md:gap-6">
                {/* Scrollable on narrow viewports so Floor is never clipped */}
                <div className="-mx-1 overflow-x-auto no-scrollbar">
                  <div
                    role="tablist"
                    aria-label="Stand shelves"
                    className="flex gap-3 md:gap-8 min-w-min px-1"
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={mode === 'mine'}
                      onClick={() => setMode('mine')}
                      className={`shrink-0 min-h-[44px] font-sans text-[10px] uppercase tracking-[0.14em] md:tracking-[0.2em] font-semibold px-1 pb-1 transition-colors inline-flex items-center gap-2 border-b ${
                        mode === 'mine'
                          ? 'text-[var(--mimi-ink)] border-[var(--mimi-ink)]'
                          : 'text-[var(--mimi-stone)] border-transparent hover:text-[var(--mimi-ink)]'
                      }`}
                    >
                      <User size={12} aria-hidden="true" />
                      <span className="md:hidden">Mine</span>
                      <span className="hidden md:inline">My Issues</span>
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={mode === 'floor'}
                      onClick={() => setMode('floor')}
                      className={`shrink-0 min-h-[44px] font-sans text-[10px] uppercase tracking-[0.14em] md:tracking-[0.2em] font-semibold px-1 pb-1 pr-3 transition-colors inline-flex items-center gap-2 border-b ${
                        mode === 'floor'
                          ? 'text-[var(--mimi-ink)] border-[var(--mimi-ink)]'
                          : 'text-[var(--mimi-stone)] border-transparent hover:text-[var(--mimi-ink)]'
                      }`}
                    >
                      <Globe size={12} aria-hidden="true" /> Floor
                    </button>
                  </div>
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
            {showFullLoader || (mode === 'floor' && floorLoading && communityZines.length === 0) ? (
              <div className="py-48 flex flex-col items-center justify-center gap-6 opacity-50">
                <Loader2 size={32} className="animate-spin text-[var(--mimi-stone)]" />
                <span className="font-sans text-[9px] uppercase tracking-[0.3em]">
                  {mode === 'floor' ? 'Opening floor…' : 'Loading stand…'}
                </span>
              </div>
            ) : filteredZines.length === 0 ? (
              <div className="py-16 md:py-24 flex flex-col items-center justify-center gap-5 text-center px-6">
                <Ghost size={36} className="text-[var(--mimi-stone)]" />
                <p className="font-serif italic text-xl md:text-2xl text-[var(--mimi-ink)]">
                  {mode === 'mine'
                    ? 'No issues on your stand yet.'
                    : archive?.ready
                      ? 'The house shelf is waiting for a first public issue.'
                      : 'No public issues on the Floor yet.'}
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
                {mode === 'floor' && archive?.ready && (
                  <p className="font-sans text-[10px] uppercase tracking-[0.2em] text-[var(--mimi-stone)] max-w-sm">
                    Publish an issue — it lands in your archive, not a rented free tier.
                  </p>
                )}
              </div>
            ) : (
              /* Column-ruled issue grid — not a card deck with shadows */
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

          <footer className="mt-12 md:mt-24 border-t border-[var(--mimi-hairline)] py-8 md:py-12 text-center space-y-2">
            <p className="font-serif italic text-sm text-[var(--mimi-stone)]">
              Your stand is your open profile in waiting.
            </p>
            {archive?.ready && (
              <p className="font-sans text-[9px] uppercase tracking-[0.22em] text-[var(--mimi-stone)]/80">
                Sovereign archive · {archive.publicCount || 0} public
              </p>
            )}
          </footer>
        </div>
      </PublicField>

      <AnimatePresence>
        {commentZineId && (
          <motion.div
            key="stand-comments"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/40 flex items-end md:items-center justify-center p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]"
            onClick={() => setCommentZineId(null)}
          >
            <div
              className="bg-[var(--mimi-field)] w-full max-w-lg max-h-[80vh] overflow-y-auto border border-[var(--mimi-ink)] rounded-t-xl md:rounded-none"
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
