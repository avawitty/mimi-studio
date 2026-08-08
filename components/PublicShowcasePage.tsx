import React, { useEffect, useState } from "react";
import type { PublicProfileShowcase } from "../services/publicShowcaseService";
import { loadPublicProfileShowcase } from "../services/publicShowcaseService";
import { buildPublicProfileSeoData } from "../lib/publicProfileSeo";
import { setPublicProfileMetaTags } from "../utils/seoHelper";
import { CookieConsentBanner } from "./CookieConsentBanner";
import { PublicField, PublicProfileCard } from "./public-face";

interface PublicShowcasePageProps {
  handle: string;
  navigate: (path: string) => void;
  isOwner?: boolean;
}

export const PublicShowcasePage: React.FC<PublicShowcasePageProps> = ({
  handle,
  navigate,
  isOwner,
}) => {
  const [data, setData] = useState<PublicProfileShowcase | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    void loadPublicProfileShowcase(handle).then((result) => {
      if (!cancelled) setData(result);
    });
    return () => {
      cancelled = true;
    };
  }, [handle]);

  useEffect(() => {
    if (!data?.profile) return;
    const seo = buildPublicProfileSeoData(data.profile);
    setPublicProfileMetaTags({
      title: seo.title,
      description: seo.description,
      imageUrl: seo.imageUrl,
      url: seo.pageUrl,
    });
  }, [data]);

  if (data === undefined) {
    return (
      <PublicField className="min-h-screen flex items-center justify-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-[var(--mimi-stone,#78716c)]">
          Loading showcase…
        </p>
      </PublicField>
    );
  }

  if (!data) {
    return (
      <PublicField className="min-h-screen flex flex-col items-center justify-center px-6">
        <p className="text-[10px] uppercase tracking-[0.4em] text-[var(--mimi-stone,#78716c)] mb-4">
          mimi.you
        </p>
        <h1 className="font-serif text-3xl text-[var(--mimi-ink,#0a0a0a)] mb-4">@{handle}</h1>
        <p className="text-sm text-[var(--mimi-stone,#78716c)] mb-8 text-center max-w-md">
          This handle is not registered yet, or the creator has not published a public showcase.
        </p>
        <button
          type="button"
          onClick={() => navigate("/studio")}
          className="text-xs uppercase tracking-widest px-6 py-3 border border-[var(--mimi-hairline,rgba(0,0,0,0.12))]"
        >
          Enter Mimi Studio
        </button>
        <CookieConsentBanner />
      </PublicField>
    );
  }

  return (
    <>
      <PublicProfileCard data={data} isOwner={isOwner} onNavigate={navigate} />
      <CookieConsentBanner />
    </>
  );
};
