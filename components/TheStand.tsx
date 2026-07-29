// @ts-nocheck
import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { subscribeToUserZines, fetchCommunityZines } from '../services/firebaseUtils';
import { getLocalZines } from '../services/localArchive';
import { ZineMetadata } from '../types';
import { useUser } from '../contexts/UserContext';
import { Search, Radio, Loader2, Ghost, LayoutGrid, User, Globe, ArrowUpRight } from 'lucide-react';
import { ZineCoverCard } from './ZineCoverCard';
import { ZineComments } from './ZineComments';

/**
 * The Stand — personal (and eventually public) showcase of published works.
 * Defaults to the signed-in user's issues with covers; community feed is a secondary tab.
 * This is the seed of the open profile / creator stand page.
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
        // Show merged local issues immediately; cloud sync is progressive.
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
          console.warn('MIMI // Stand community feed unavailable', e);
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

  const handle = profile?.handle ? `@${profile.handle}` : 'Your Stand';
  // Only block the grid while we have nothing local/cloud yet and are still booting.
  const showFullLoader = loading && mode === 'mine' && myZines.length === 0;

  return (
    <>
      <div className="flex-1 w-full h-full flex flex-col bg-nous-base transition-colors duration-1000 relative overflow-hidden">
        <div className="w-full h-8 bg-nous-text text-nous-base flex items-center overflow-hidden border-b border-black/5 shrink-0 z-20">
          <div className="flex items-center px-4 h-full bg-nous-base0 text-white shrink-0 font-sans text-[9px] uppercase tracking-widest font-black gap-2">
            <Radio size={10} className="animate-pulse" /> Stand
          </div>
          <div className="flex-1 px-4 font-mono text-[9px] uppercase tracking-widest opacity-80 truncate">
            {mode === 'mine' ? `${handle} · ${myZines.length} issues` : `Floor · ${communityZines.length} signals`}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
          <header className="px-6 md:px-16 pt-10 md:pt-16 pb-10">
            <div className="flex flex-col gap-8">
              <div className="flex justify-between items-start gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-nous-subtle">
                    <LayoutGrid size={16} />
                    <span className="font-sans text-[10px] uppercase tracking-[0.4em] font-black italic">
                      Published Works Showcase
                    </span>
                  </div>
                  <h1 className="font-serif text-5xl md:text-8xl italic tracking-tighter text-nous-text leading-[0.85]">
                    The Stand.
                  </h1>
                  <p className="font-sans text-[11px] text-nous-subtle max-w-xl leading-relaxed">
                    Your open shelf of zines — covers, issues, and eventually the public face of your profile.
                    Publish from Studio; they land here.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    window.dispatchEvent(new CustomEvent('mimi:change_view', { detail: 'profile' }))
                  }
                  className="hidden md:flex items-center gap-2 px-4 py-2 border border-nous-border font-mono text-[9px] uppercase tracking-widest text-nous-subtle hover:text-nous-text"
                >
                  <User size={12} /> Profile seed
                  <ArrowUpRight size={12} />
                </button>
              </div>

              <div className="flex flex-col md:flex-row justify-between items-end gap-6 pt-6 border-b border-nous-border pb-4">
                <div className="flex gap-8">
                  <button
                    type="button"
                    onClick={() => setMode('mine')}
                    className={`font-sans text-[10px] uppercase tracking-[0.2em] font-black pb-2 transition-all flex items-center gap-2 ${
                      mode === 'mine'
                        ? 'text-nous-text border-b-2 border-nous-text'
                        : 'text-nous-subtle border-b-2 border-transparent hover:text-nous-text'
                    }`}
                  >
                    <User size={12} /> My Issues
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('floor')}
                    className={`font-sans text-[10px] uppercase tracking-[0.2em] font-black pb-2 transition-all flex items-center gap-2 ${
                      mode === 'floor'
                        ? 'text-nous-text border-b-2 border-nous-text'
                        : 'text-nous-subtle border-b-2 border-transparent hover:text-nous-text'
                    }`}
                  >
                    <Globe size={12} /> Floor
                  </button>
                </div>

                <div className="relative group w-full md:w-auto">
                  <Search
                    size={14}
                    className="absolute left-0 top-1/2 -translate-y-1/2 text-nous-subtle group-focus-within:text-nous-text transition-colors"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="FILTER ISSUES..."
                    className="w-full md:w-64 bg-transparent border-b border-nous-border py-2 pl-6 font-mono text-xs focus:outline-none focus:border-nous-text transition-colors uppercase placeholder:text-nous-subtle"
                  />
                </div>
              </div>
            </div>
          </header>

          <div className="px-4 md:px-12">
            {showFullLoader ? (
              <div className="py-48 flex flex-col items-center justify-center gap-6 opacity-50">
                <Loader2 size={32} className="animate-spin text-nous-subtle" />
                <span className="font-sans text-[8px] uppercase tracking-[0.4em] font-black">
                  Loading stand…
                </span>
              </div>
            ) : filteredZines.length === 0 ? (
              <div className="py-32 flex flex-col items-center justify-center gap-6 opacity-60 text-center px-6">
                <Ghost size={48} />
                <p className="font-serif italic text-2xl text-nous-text">
                  {mode === 'mine' ? 'No issues on your stand yet.' : 'No signal on this frequency.'}
                </p>
                {mode === 'mine' && (
                  <button
                    type="button"
                    onClick={() =>
                      window.dispatchEvent(new CustomEvent('mimi:change_view', { detail: 'studio' }))
                    }
                    className="px-6 py-3 bg-nous-text text-nous-base font-mono text-[9px] uppercase tracking-widest"
                  >
                    Make one in Studio
                  </button>
                )}
              </div>
            ) : (
              <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
                {filteredZines.map((zine) => (
                  <div key={zine.id} className="break-inside-avoid">
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

          <footer className="mt-24 border-t border-nous-border py-12 text-center opacity-40">
            <p className="font-serif italic text-xs">Your stand is your open profile in waiting.</p>
          </footer>
        </div>
      </div>

      <AnimatePresence>
        {commentZineId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[11000] flex items-center justify-center p-6 bg-nous-base/80 backdrop-blur-xl"
            onClick={() => setCommentZineId(null)}
          >
            <div onClick={(e) => e.stopPropagation()}>
              <ZineComments zineId={commentZineId} onClose={() => setCommentZineId(null)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default TheStand;
