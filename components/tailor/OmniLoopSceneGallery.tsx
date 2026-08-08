import React, { useEffect, useState } from 'react';
import type { DollScene } from '../../types';
import { listDollScenes } from '../../services/tailorService';

interface OmniLoopSceneGalleryProps {
  userId: string;
}

export const OmniLoopSceneGallery: React.FC<OmniLoopSceneGalleryProps> = ({ userId }) => {
  const [scenes, setScenes] = useState<DollScene[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void listDollScenes(userId, { visibility: 'public' })
      .then(setScenes)
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return <p className="text-sm text-nous-subtle px-6 py-10">Loading community scenes…</p>;
  }

  if (scenes.length === 0) {
    return (
      <div className="max-w-lg mx-auto px-6 py-16 text-center space-y-3">
        <p className="font-serif text-xl text-nous-text">Gallery empty</p>
        <p className="text-sm text-nous-subtle italic">
          Generate time-travel scenes and share them — strong meme and marketing plates live here.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-8">
      <header className="mb-8">
        <p className="font-mono text-[9px] uppercase tracking-[0.35em] text-nous-subtle mb-2">
          Omni Loop · Community
        </p>
        <h2 className="font-serif text-2xl text-nous-text">Shared time-travel scenes</h2>
      </header>
      <div className="grid gap-6 md:grid-cols-2">
        {scenes.map((scene) => (
          <article key={scene.id} className="border border-nous-border/30 overflow-hidden group">
            {scene.sceneImageUrl && (
              <img
                src={scene.sceneImageUrl}
                alt={scene.artworkTitle}
                className="w-full aspect-video object-cover"
              />
            )}
            <div className="p-4 space-y-1">
              <p className="text-xs italic text-nous-subtle line-clamp-2">&ldquo;{scene.rawThought}&rdquo;</p>
              <p className="text-sm text-nous-text">
                {scene.eraLabel ? `${scene.eraLabel} · ` : ''}
                echo of {scene.artworkTitle}
              </p>
              {scene.friendUserIds.length > 0 && (
                <p className="text-[10px] uppercase tracking-wider text-nous-subtle">
                  +{scene.friendUserIds.length} friend doll(s)
                </p>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};
