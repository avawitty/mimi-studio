import React, { useEffect, useState } from 'react';
import type { ArtworkMatch } from '../../types';
import { listArtworkMatches } from '../../services/tailorService';
import { TAILOR_PREFERRED_FRAMING } from '../../constants/tailorSafetyRules';

interface ArtHistoryMirrorScreenProps {
  userId: string;
  projectId?: string;
  onBack: () => void;
}

export const ArtHistoryMirrorScreen: React.FC<ArtHistoryMirrorScreenProps> = ({
  userId,
  projectId,
  onBack,
}) => {
  const [matches, setMatches] = useState<ArtworkMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void listArtworkMatches(userId, projectId).then((m) => {
      setMatches(m);
      setLoading(false);
    });
  }, [userId, projectId]);

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <p className="text-[10px] uppercase tracking-[0.3em] text-nous-subtle mb-2">Art History Mirror</p>
      <h1 className="font-serif text-2xl text-nous-text mb-2">Thematic comparisons</h1>
      <p className="text-sm text-nous-subtle mb-8 italic">{TAILOR_PREFERRED_FRAMING.thematicComparison}</p>

      {loading && <p className="text-sm text-nous-subtle">Searching collections…</p>}

      <div className="space-y-6 mb-10">
        {matches.map((match) => (
          <article key={match.id} className="border border-nous-border/40 p-5 flex gap-5">
            {match.imageUrl && (
              <img
                src={match.imageUrl}
                alt={match.artworkTitle}
                className="w-24 h-24 object-cover border border-nous-border/30 shrink-0"
              />
            )}
            <div className="min-w-0">
              <h2 className="font-medium text-nous-text">{match.artworkTitle}</h2>
              <p className="text-xs text-nous-subtle mb-2">
                {match.artist}{match.date ? `, ${match.date}` : ''} · {match.museum}
              </p>
              <p className="text-sm text-nous-subtle mb-3">{match.educationalSummary}</p>
              {match.matchedThemes.length > 0 && (
                <p className="text-[10px] uppercase tracking-wider text-nous-subtle">
                  Themes: {match.matchedThemes.join(' · ')}
                </p>
              )}
              {match.suggestedUserExperiment && (
                <p className="text-xs mt-2 italic text-nous-text">{match.suggestedUserExperiment}</p>
              )}
              <a
                href={match.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] uppercase tracking-wider underline mt-2 inline-block"
              >
                View source
              </a>
            </div>
          </article>
        ))}
        {!loading && matches.length === 0 && (
          <p className="text-sm text-nous-subtle">No matches yet. Complete pattern analysis first.</p>
        )}
      </div>

      <button
        type="button"
        onClick={onBack}
        className="w-full py-3 border border-nous-border/40 text-xs uppercase tracking-widest"
      >
        Back to outputs
      </button>
    </div>
  );
};
