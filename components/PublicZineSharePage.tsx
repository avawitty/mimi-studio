import React, { useEffect, useState, Suspense } from 'react';
import { ZineMetadata } from '../types';
import { fetchZineById } from '../services/firebaseUtils';
import { AnalysisDisplay } from './AnalysisDisplay';
import { Loader2 } from 'lucide-react';
import { useZineSEO } from '../utils/seoHelper';

interface Props {
  zineId: string;
}

export const PublicZineSharePage: React.FC<Props> = ({ zineId }) => {
  const [zine, setZine] = useState<ZineMetadata | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchZineById(zineId).then(z => {
      setZine(z);
      setLoading(false);
    }).catch(err => {
      console.error("MIMI // Failed to fetch shared zine", err);
      setLoading(false);
    });
  }, [zineId]);

  useZineSEO(
    zine
      ? {
          title: zine.title || "Untitled Manifestation",
          description: (zine as any).concept || "Aesthetic Zine created via Mimi",
          imageUrl:
            (zine as any).contentImages?.[0] ||
            zine.coverImageUrl ||
            "https://raw.githubusercontent.com/Aris-A-C/mimi-assets/main/mimi_logo_new.png",
          authorName: zine.userHandle || "Curator",
          publishDate: zine.createdAt
            ? new Date(zine.createdAt).toISOString()
            : new Date().toISOString(),
          url: typeof window !== "undefined" ? window.location.href : undefined,
        }
      : null,
  );

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-nous-base">
        <Loader2 className="w-8 h-8 animate-spin text-nous-subtle" />
      </div>
    );
  }

  if (!zine) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-nous-base font-serif italic text-nous-subtle">
        Manifestation not found or access denied.
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-nous-base overflow-hidden">
      <Suspense fallback={
        <div className="h-full w-full flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-nous-subtle" />
        </div>
      }>
        <AnalysisDisplay
          metadata={zine}
          onReset={() => window.location.assign('/')}
          onUpdateMetadata={() => {}}
        />
      </Suspense>
    </div>
  );
};
