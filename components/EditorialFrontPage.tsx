import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useUser } from '../contexts/UserContext';
import {
  ArrowUpRight,
  BookOpen,
  ChevronRight,
  Crown,
  Loader2,
  Mail,
} from 'lucide-react';
import { fetchFeaturedPublicZines } from '../services/publicShowcaseService';
import type { ZineMetadata } from '../types';

interface EditorialFrontPageProps {
  onSelectZine: (zineId: string) => void;
  onOpenGateway: () => void;
}

function formatIssueDate(ts?: number): string {
  if (!ts) return 'Undated';
  try {
    return new Date(ts).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return 'Undated';
  }
}

function excerptFor(zine: ZineMetadata): string {
  const raw =
    zine.summary ||
    zine.concept ||
    zine.content?.poetic_provocation ||
    zine.content?.vocal_summary_blurb ||
    zine.content?.originalThought ||
    '';
  const text = typeof raw === 'string' ? raw.trim() : '';
  if (!text) return 'A published issue from the Mimi public archive.';
  return text.length > 180 ? `${text.slice(0, 177)}…` : text;
}

export const EditorialFrontPage: React.FC<EditorialFrontPageProps> = ({
  onSelectZine,
  onOpenGateway,
}) => {
  const { user } = useUser();
  const [zines, setZines] = useState<ZineMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    fetchFeaturedPublicZines(18)
      .then((rows) => {
        if (!cancelled) setZines(rows);
      })
      .catch((err: unknown) => {
        console.warn('MIMI // Editorial front page load failed', err);
        if (!cancelled) {
          setLoadError('Could not load the public archive. Try again shortly.');
          setZines([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const contributors = useMemo(() => {
    const seen = new Map<string, { handle: string; avatar?: string | null; count: number }>();
    for (const z of zines) {
      const handle = (z.userHandle || '').replace(/^@/, '').trim();
      if (!handle) continue;
      const key = handle.toLowerCase();
      const prev = seen.get(key);
      if (prev) {
        prev.count += 1;
      } else {
        seen.set(key, { handle, avatar: z.userAvatar, count: 1 });
      }
    }
    return Array.from(seen.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [zines]);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    window.dispatchEvent(
      new CustomEvent('mimi:registry_alert', {
        detail: {
          message: emailInput.trim()
            ? 'Open the gateway to create your Mimi identity.'
            : 'Create an identity to join the archive.',
          type: 'announcement',
        },
      }),
    );
    setEmailInput('');
    onOpenGateway();
  };

  const goShowcase = () => {
    window.dispatchEvent(new CustomEvent('mimi:change_view', { detail: 'showcase' }));
  };

  return (
    <div className="w-full h-full min-h-0 overflow-y-auto bg-[#FAF8F5] dark:bg-[#080808] text-stone-900 dark:text-stone-100 font-sans transition-colors duration-300 pb-32">
      <section className="border-b border-stone-200 dark:border-stone-850 px-6 py-12 md:py-24 max-w-7xl mx-auto flex flex-col gap-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-stone-200 dark:border-stone-850 pb-8 gap-4">
          <div className="space-y-1">
            <p className="font-mono text-[9px] uppercase tracking-[0.25em] text-stone-500 font-bold">
              Public archive · published issues only
            </p>
            <h1 className="leading-none">
              <span className="sr-only">Mimi Zine</span>
              <img
                src="/brand/official/mimi-primary-wordmark-light.svg"
                alt=""
                className="w-full max-w-[34rem] h-auto object-contain object-left dark:hidden"
              />
              <img
                src="/brand/official/mimi-primary-wordmark-dark.svg"
                alt=""
                className="hidden w-full max-w-[34rem] h-auto object-contain object-left dark:block"
              />
            </h1>
          </div>
          <div className="text-left md:text-right font-mono text-[9px] uppercase tracking-wider text-stone-500 space-y-1">
            <p>{loading ? 'Loading…' : `${zines.length} public issue${zines.length === 1 ? '' : 's'}`}</p>
            <button
              type="button"
              onClick={goShowcase}
              className="text-stone-800 dark:text-stone-200 font-bold hover:underline"
            >
              Open full showcase →
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-4">
          <div className="md:col-span-8">
            <p className="font-serif italic text-xl md:text-3xl text-stone-800 dark:text-stone-200 leading-snug">
              Read what creators published with Approved Used Context — taste made inspectable, not averaged.
            </p>
          </div>
          <div className="md:col-span-4 flex flex-col justify-end gap-4">
            <div className="p-4 bg-stone-100 dark:bg-stone-900/50 border border-stone-200 dark:border-stone-800 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-2 opacity-5 pointer-events-none">
                <Crown size={72} />
              </div>
              <h4 className="font-mono text-[8px] uppercase tracking-widest font-black text-stone-500 mb-2">
                Identity gateway
              </h4>
              <p className="text-[11px] text-stone-600 dark:text-stone-400 leading-normal mb-3">
                Create a Mimi identity to capture evidence, approve memory, and publish your own issues.
              </p>
              <button
                type="button"
                onClick={onOpenGateway}
                className="w-full flex items-center justify-between text-left font-mono text-[9px] uppercase tracking-wider font-extrabold border border-stone-800 dark:border-stone-200 px-3 py-1.5 hover:bg-stone-900 hover:text-white dark:hover:bg-white dark:hover:text-black transition-all"
              >
                <span>{user && !user.isAnonymous ? 'Manage identity' : 'Initialize identity'}</span>
                <ArrowUpRight size={12} />
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-12 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8 flex flex-col gap-10">
          <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-850 pb-4">
            <h3 className="font-mono text-[10px] uppercase tracking-widest font-black text-stone-500">
              I. Published issues
            </h3>
            <span className="font-sans text-[10px] uppercase text-stone-600 dark:text-stone-400 font-bold border border-stone-200 dark:border-stone-800 px-2 py-0.5">
              Live archive
            </span>
          </div>

          {loading && (
            <div className="flex items-center gap-3 py-16 text-stone-500 font-mono text-[10px] uppercase tracking-widest">
              <Loader2 size={16} className="animate-spin" />
              Retrieving public issues…
            </div>
          )}

          {!loading && loadError && (
            <div className="border border-red-800/40 px-5 py-6 space-y-3" role="alert">
              <p className="font-serif text-lg text-stone-900 dark:text-stone-100">{loadError}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="font-mono text-[9px] uppercase tracking-widest border border-stone-400 px-3 py-1.5"
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !loadError && zines.length === 0 && (
            <div className="border border-dashed border-stone-300 dark:border-stone-700 px-6 py-14 text-center space-y-4">
              <BookOpen size={22} className="mx-auto text-stone-400" />
              <p className="font-serif italic text-xl text-stone-700 dark:text-stone-300">
                No public issues yet.
              </p>
              <p className="font-sans text-[13px] text-stone-500 max-w-md mx-auto leading-relaxed">
                When creators publish from The Press with `isPublic`, their work appears here. Until then, open the
                showcase directory or start composing in Studio.
              </p>
              <div className="flex flex-wrap justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={goShowcase}
                  className="font-mono text-[9px] uppercase tracking-widest px-4 py-2 border border-stone-400"
                >
                  Browse showcase
                </button>
                <button
                  type="button"
                  onClick={() =>
                    window.dispatchEvent(new CustomEvent('mimi:change_view', { detail: 'studio' }))
                  }
                  className="font-mono text-[9px] uppercase tracking-widest px-4 py-2 bg-stone-900 text-[#FAF8F5] dark:bg-[#FAF9F6] dark:text-stone-900"
                >
                  Open Studio
                </button>
              </div>
            </div>
          )}

          {!loading && zines.length > 0 && (
            <div className="flex flex-col divide-y divide-stone-200 dark:divide-stone-850">
              {zines.map((zine, idx) => (
                <motion.article
                  key={zine.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx * 0.04, 0.32) }}
                  className="py-8 first:pt-0 group"
                >
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-mono text-[8px] uppercase tracking-widest text-stone-500 px-2 py-0.5 border border-stone-200 dark:border-stone-800">
                          Public issue
                        </span>
                        <span className="text-stone-400 text-[10px] font-mono">
                          {formatIssueDate(zine.publishedAt || zine.timestamp || zine.createdAt)}
                        </span>
                      </div>

                      <h2>
                        <button
                          type="button"
                          onClick={() => onSelectZine(zine.id)}
                          className="font-serif text-2xl md:text-3xl text-left text-stone-950 dark:text-stone-50 hover:underline tracking-tight leading-tight"
                        >
                          {zine.title || 'Untitled issue'}
                        </button>
                      </h2>

                      <p className="text-[13px] text-stone-600 dark:text-stone-400 leading-relaxed font-serif">
                        {excerptFor(zine)}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 pt-1 font-mono text-[9px] uppercase tracking-wider text-stone-500">
                        {zine.userHandle && (
                          <button
                            type="button"
                            onClick={() =>
                              window.dispatchEvent(
                                new CustomEvent('mimi:change_view', {
                                  detail: `u/${zine.userHandle.replace(/^@/, '')}`,
                                }),
                              )
                            }
                            className="hover:text-stone-900 dark:hover:text-white"
                          >
                            @{zine.userHandle.replace(/^@/, '')}
                          </button>
                        )}
                        {(zine.usedContextSnapshots?.length || zine.fragmentsUsed?.length) ? (
                          <>
                            <span>·</span>
                            <span>
                              {(zine.usedContextSnapshots?.length || zine.fragmentsUsed?.length || 0)} used
                              context
                            </span>
                          </>
                        ) : null}
                        <span>·</span>
                        <button
                          type="button"
                          onClick={() => onSelectZine(zine.id)}
                          className="inline-flex items-center gap-1 hover:text-stone-900 dark:hover:text-white"
                        >
                          Read issue <ChevronRight size={10} />
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onSelectZine(zine.id)}
                      className="w-full md:w-48 h-32 md:h-40 overflow-hidden shrink-0 border border-stone-200 dark:border-stone-850 bg-stone-100 dark:bg-stone-900"
                    >
                      {zine.coverImageUrl ? (
                        <img
                          src={zine.coverImageUrl}
                          alt=""
                          className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-mono text-[8px] uppercase tracking-widest text-stone-400">
                          No cover
                        </div>
                      )}
                    </button>
                  </div>
                </motion.article>
              ))}
            </div>
          )}

          {contributors.length > 0 && (
            <div className="mt-4 border-t border-stone-200 dark:border-stone-850 pt-10">
              <h3 className="font-mono text-[10px] uppercase tracking-widest font-black text-stone-500 mb-6">
                II. Recent contributors
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {contributors.map((c) => (
                  <button
                    key={c.handle}
                    type="button"
                    onClick={() =>
                      window.dispatchEvent(
                        new CustomEvent('mimi:change_view', { detail: `u/${c.handle}` }),
                      )
                    }
                    className="border border-stone-200 dark:border-stone-850 p-4 bg-white dark:bg-[#0A0A0A] hover:border-stone-400 dark:hover:border-stone-600 transition-colors text-left"
                  >
                    <div className="flex justify-between items-start mb-2 gap-2">
                      <h4 className="font-serif text-sm font-semibold text-stone-950 dark:text-stone-50">
                        @{c.handle}
                      </h4>
                      <span className="font-mono text-[8px] uppercase text-stone-400 shrink-0">
                        {c.count} issue{c.count === 1 ? '' : 's'}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500 leading-snug font-serif">
                      Public profile · published work from the live archive
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-4 flex flex-col gap-8">
          <div className="p-6 bg-[#161516] text-stone-50 border border-stone-800 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <Mail size={96} />
            </div>

            <span className="font-mono text-[8px] uppercase tracking-widest text-[#C5B39A] font-extrabold block mb-1">
              Membership
            </span>
            <h3 className="font-serif text-2xl tracking-tight leading-tight mb-2">
              Join Mimi
            </h3>
            <p className="font-sans text-[11px] text-stone-400 leading-normal mb-6">
              Newsletter delivery is not live yet. Create an identity to save work, approve context, and publish when
              you are ready.
            </p>

            <form onSubmit={handleJoin} className="space-y-3">
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="Optional email for gateway…"
                className="w-full bg-stone-900 border border-stone-800 px-3 py-2 text-xs font-mono text-stone-50 focus:outline-none focus:border-stone-600 placeholder:text-stone-600"
              />
              <button
                type="submit"
                className="w-full bg-stone-50 hover:bg-white text-stone-950 py-2 text-center font-mono text-[9px] uppercase tracking-widest font-extrabold transition-all"
              >
                Open identity gateway
              </button>
            </form>

            <p className="mt-4 text-[10px] font-mono text-stone-500 leading-relaxed">
              No fake subscribe confirmation · no CAN-SPAM claim until a real list exists.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <div className="border border-stone-200 dark:border-stone-850 p-4">
              <h4 className="font-mono text-[9px] uppercase tracking-widest font-bold text-stone-500 mb-1">
                For creators
              </h4>
              <h3 className="font-serif text-base text-stone-900 dark:text-stone-100 font-semibold mb-2">
                Capture → Approve → Publish
              </h3>
              <p className="text-[11px] text-stone-600 dark:text-stone-400 leading-relaxed font-serif mb-4">
                Run the core loop: save evidence in Scribe, approve Used Context in Studio, export from The Press.
              </p>
              <button
                type="button"
                onClick={() =>
                  window.dispatchEvent(new CustomEvent('mimi:change_view', { detail: 'scribe' }))
                }
                className="w-full text-center font-mono text-[8px] uppercase tracking-widest border border-stone-300 dark:border-stone-700 py-1.5 font-extrabold"
              >
                Start in Scribe
              </button>
            </div>

            <div className="border border-stone-200 dark:border-stone-850 p-4 bg-stone-100 dark:bg-[#111]">
              <h4 className="font-mono text-[9px] uppercase tracking-widest font-bold text-stone-500 mb-1">
                Evidence intake
              </h4>
              <h3 className="font-serif text-base text-stone-900 dark:text-stone-100 font-semibold mb-2">
                Feed the Taste Graph
              </h3>
              <p className="text-[11px] text-stone-600 dark:text-stone-400 leading-relaxed font-serif mb-4">
                Import Letterboxd, Pinterest, or screenshots — then approve what becomes durable taste knowledge.
              </p>
              <button
                type="button"
                onClick={() =>
                  window.dispatchEvent(
                    new CustomEvent('mimi:change_view', { detail: 'tailor/evidence' }),
                  )
                }
                className="w-full text-center font-mono text-[8px] uppercase tracking-widest border border-stone-300 dark:border-stone-700 py-1.5 font-extrabold"
              >
                Open Tailor intake
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
