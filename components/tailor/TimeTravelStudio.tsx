import React, { useEffect, useState } from 'react';
import { Clock, Sparkles, Users, Globe, Loader2 } from 'lucide-react';
import type { Doll, DollScene } from '../../types';
import {
  ART_HISTORY_ERAS,
  searchArtByEra,
  type ArtHistoryEraId,
  type MetObject,
} from '../../services/artHistoryService';
import {
  generateTimeTravelScene,
  listFriendDollsForScene,
  publishDollScene,
} from '../../services/dollSceneService';
import { listDollScenes } from '../../services/tailorService';
import { TAILOR_PREFERRED_FRAMING } from '../../constants/tailorSafetyRules';

interface TimeTravelStudioProps {
  userId: string;
  dolls: Doll[];
  activeDollId?: string | null;
  projectId?: string;
}

export const TimeTravelStudio: React.FC<TimeTravelStudioProps> = ({
  userId,
  dolls,
  activeDollId,
  projectId,
}) => {
  const [selectedEra, setSelectedEra] = useState<ArtHistoryEraId>('renaissance');
  const [eraArt, setEraArt] = useState<MetObject[]>([]);
  const [loadingArt, setLoadingArt] = useState(false);
  const [selectedArt, setSelectedArt] = useState<MetObject | null>(null);
  const [rawThought, setRawThought] = useState('');
  const [dollId, setDollId] = useState(activeDollId || dolls[0]?.id || '');
  const [friendOptions, setFriendOptions] = useState<
    Array<{ userId: string; handle: string; dollPortraitUrl?: string; dollLabel?: string }>
  >([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [scenes, setScenes] = useState<DollScene[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoadingArt(true);
    void searchArtByEra(selectedEra, 6)
      .then((art) => {
        setEraArt(art);
        setSelectedArt(art[0] ?? null);
      })
      .finally(() => setLoadingArt(false));
  }, [selectedEra]);

  useEffect(() => {
    void listFriendDollsForScene(userId).then(setFriendOptions);
    void listDollScenes(userId).then(setScenes);
  }, [userId]);

  const toggleFriend = (friendUserId: string) => {
    setSelectedFriends((prev) =>
      prev.includes(friendUserId)
        ? prev.filter((id) => id !== friendUserId)
        : prev.length < 3
          ? [...prev, friendUserId]
          : prev,
    );
  };

  const handleGenerate = async () => {
    if (!selectedArt || !dollId) return;
    if (!rawThought.trim()) {
      setError('Leave a raw thought to map onto this artwork.');
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      const era = ART_HISTORY_ERAS.find((e) => e.id === selectedEra);
      const scene = await generateTimeTravelScene({
        userId,
        dollId,
        projectId,
        rawThought: rawThought.trim(),
        eraLabel: era?.label,
        friendUserIds: selectedFriends,
        artwork: {
          artworkTitle: selectedArt.title,
          artist: selectedArt.artistDisplayName || 'Unknown',
          date: selectedArt.objectDate,
          imageUrl: selectedArt.primaryImage,
          sourceUrl:
            selectedArt.objectURL ||
            `https://www.metmuseum.org/art/collection/search/${selectedArt.objectID}`,
          publicDomainStatus: selectedArt.isPublicDomain ? 'public_domain' : 'unknown',
          matchedThemes: [era?.label || 'art history'],
        },
      });
      setScenes((prev) => [scene, ...prev]);
      setRawThought('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setGenerating(false);
    }
  };

  const handlePublish = async (sceneId: string) => {
    const updated = await publishDollScene(userId, sceneId);
    if (updated) {
      setScenes((prev) => prev.map((s) => (s.id === sceneId ? updated : s)));
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 space-y-10">
      <header className="space-y-2">
        <p className="font-mono text-[9px] uppercase tracking-[0.35em] text-nous-subtle flex items-center gap-2">
          <Clock size={12} /> Omni Loop · Time travel
        </p>
        <h1 className="font-serif text-3xl text-nous-text">Travel through art history</h1>
        <p className="text-sm text-nous-subtle italic max-w-xl">
          {TAILOR_PREFERRED_FRAMING.thematicComparison} Your doll enters famous public-domain scenes —
          transformative reinterpretation, not copies.
        </p>
      </header>

      {error && (
        <p className="text-sm text-red-700/80 border border-red-200/50 px-4 py-3">{error}</p>
      )}

      <section className="space-y-4">
        <p className="font-mono text-[8px] uppercase tracking-widest text-nous-subtle">Era</p>
        <div className="flex flex-wrap gap-2">
          {ART_HISTORY_ERAS.map((era) => (
            <button
              key={era.id}
              type="button"
              onClick={() => setSelectedEra(era.id)}
              className={`px-3 py-1.5 border font-mono text-[8px] uppercase tracking-wider ${
                selectedEra === era.id
                  ? 'border-nous-text bg-nous-text text-[var(--mimi-field,#fdfbf7)]'
                  : 'border-nous-border/40 text-nous-subtle'
              }`}
            >
              {era.label}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <p className="font-mono text-[8px] uppercase tracking-widest text-nous-subtle">
          Public-domain reference
        </p>
        {loadingArt ? (
          <p className="text-sm text-nous-subtle flex items-center gap-2">
            <Loader2 size={14} className="animate-spin" /> Searching Met collection…
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {eraArt.map((art) => (
              <button
                key={art.objectID}
                type="button"
                onClick={() => setSelectedArt(art)}
                className={`border p-2 text-left transition-colors ${
                  selectedArt?.objectID === art.objectID
                    ? 'border-nous-text ring-1 ring-nous-text/30'
                    : 'border-nous-border/30 hover:border-nous-border'
                }`}
              >
                {art.primaryImage && (
                  <img
                    src={art.primaryImageSmall || art.primaryImage}
                    alt={art.title}
                    className="w-full aspect-square object-cover mb-2"
                  />
                )}
                <p className="text-xs font-medium text-nous-text line-clamp-2">{art.title}</p>
                <p className="text-[10px] text-nous-subtle">{art.artistDisplayName}</p>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4 border border-nous-border/25 p-5">
        <p className="font-mono text-[8px] uppercase tracking-widest text-nous-subtle">Your projection</p>
        <select
          value={dollId}
          onChange={(e) => setDollId(e.target.value)}
          className="w-full border border-nous-border/40 bg-transparent px-3 py-2 text-sm"
        >
          {dolls.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <textarea
          value={rawThought}
          onChange={(e) => setRawThought(e.target.value)}
          placeholder="Raw thought — what you want mapped onto this scene…"
          rows={3}
          className="w-full border border-nous-border/40 bg-transparent px-4 py-3 text-sm resize-none"
        />

        {friendOptions.length > 0 && (
          <div className="space-y-2">
            <p className="font-mono text-[8px] uppercase tracking-widest text-nous-subtle flex items-center gap-1">
              <Users size={12} /> Add friends to scene (max 3)
            </p>
            <div className="flex flex-wrap gap-2">
              {friendOptions.map((f) => (
                <button
                  key={f.userId}
                  type="button"
                  onClick={() => toggleFriend(f.userId)}
                  className={`flex items-center gap-2 px-3 py-1.5 border text-[10px] uppercase tracking-wider ${
                    selectedFriends.includes(f.userId)
                      ? 'border-nous-text bg-nous-base0/30'
                      : 'border-nous-border/40'
                  }`}
                >
                  {f.dollPortraitUrl && (
                    <img src={f.dollPortraitUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
                  )}
                  @{f.handle}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          disabled={generating || !selectedArt}
          onClick={() => void handleGenerate()}
          className="w-full py-3 font-mono text-[9px] uppercase tracking-[0.2em] bg-nous-text text-[var(--mimi-field,#fdfbf7)] flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {generating ? (
            <><Loader2 size={14} className="animate-spin" /> Reinterpreting…</>
          ) : (
            <><Sparkles size={14} /> Generate time-travel scene</>
          )}
        </button>
      </section>

      {scenes.length > 0 && (
        <section className="space-y-4">
          <p className="font-mono text-[8px] uppercase tracking-widest text-nous-subtle">Your scenes</p>
          <div className="space-y-6">
            {scenes.map((scene) => (
              <article key={scene.id} className="border border-nous-border/30 overflow-hidden">
                {scene.sceneImageUrl && (
                  <img
                    src={scene.sceneImageUrl}
                    alt={scene.artworkTitle}
                    className="w-full aspect-video object-cover"
                  />
                )}
                <div className="p-5 space-y-2">
                  <p className="text-xs text-nous-subtle italic">&ldquo;{scene.rawThought}&rdquo;</p>
                  <p className="text-sm text-nous-text">
                    After <strong className="font-normal">{scene.artworkTitle}</strong> · {scene.artist}
                  </p>
                  {scene.transformationNotes && (
                    <p className="text-xs text-nous-subtle">{scene.transformationNotes}</p>
                  )}
                  <div className="flex gap-2 pt-2">
                    {scene.visibility !== 'public' && scene.sceneImageUrl && (
                      <button
                        type="button"
                        onClick={() => void handlePublish(scene.id)}
                        className="text-[10px] uppercase tracking-widest px-3 py-1 border border-nous-border/50 flex items-center gap-1"
                      >
                        <Globe size={10} /> Share to gallery
                      </button>
                    )}
                    <a
                      href={scene.artworkSourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] uppercase tracking-widest text-nous-subtle underline"
                    >
                      Source artwork
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
