import React, { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { getUserByHandle } from "../services/firebaseUtils";
import type { PublicRipSnapshot, UserProfile } from "../types";
import { CookieConsentBanner } from "./CookieConsentBanner";
import { RipReadingView } from "./RipReadingView";
import { canonicalYouOrigin } from "../lib/siteHost";

interface RipPublicPageProps {
  handle: string;
  navigate: (path: string) => void;
  isOwner?: boolean;
}

export const RipPublicPage: React.FC<RipPublicPageProps> = ({
  handle,
  navigate,
  isOwner,
}) => {
  const [profile, setProfile] = useState<UserProfile | null | undefined>(undefined);
  const [rip, setRip] = useState<PublicRipSnapshot | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getUserByHandle(handle.trim().toLowerCase()).then((p) => {
      if (cancelled) return;
      if (!p?.uid) {
        setProfile(null);
        setRip(null);
        return;
      }
      setProfile(p);
      setRip(p.publicRip ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [handle]);

  if (profile === undefined) {
    return (
      <div
        className="min-h-screen flex items-center justify-center text-stone-400"
        style={{ background: "#0a0a0c" }}
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.35em]">Loading rip…</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6 text-stone-200"
        style={{ background: "#0a0a0c" }}
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-rose-300/70 mb-4">
          mimi.rip
        </p>
        <h1 className="font-serif text-3xl mb-4">@{handle}</h1>
        <p className="text-sm text-stone-500 mb-8 text-center max-w-md">
          No public rip for this handle. Inverse readings stay private until the creator publishes.
        </p>
        <a
          href={`${canonicalYouOrigin()}/u/${encodeURIComponent(handle)}`}
          className="text-xs uppercase tracking-widest px-6 py-3 border border-white/20 hover:bg-white/5"
        >
          Open mimi.you card
        </a>
        <CookieConsentBanner />
      </div>
    );
  }

  if (!rip) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6 text-stone-200"
        style={{ background: "#0a0a0c" }}
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-rose-300/70 mb-4">
          mimi.rip
        </p>
        <h1 className="font-serif text-3xl mb-2">@{profile.handle || handle}</h1>
        <p className="text-sm text-stone-500 mb-8 text-center max-w-md">
          {isOwner
            ? "You have not published a rip yet. Open the Rip chamber to derive and publish."
            : "This creator has not published their inverse taste reading."}
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          {isOwner ? (
            <button
              type="button"
              onClick={() => navigate("/rip")}
              className="text-xs uppercase tracking-widest px-6 py-3 border border-rose-400/40 text-rose-200"
            >
              Open Rip chamber
            </button>
          ) : null}
          <a
            href={`${canonicalYouOrigin()}/u/${encodeURIComponent(profile.handle || handle)}`}
            className="text-xs uppercase tracking-widest px-6 py-3 border border-white/20 hover:bg-white/5 inline-flex items-center gap-1"
          >
            mimi.you <ArrowUpRight size={12} />
          </a>
        </div>
        <CookieConsentBanner />
      </div>
    );
  }

  // Adapt public snapshot into RipReadingView shape
  const reading = {
    id: rip.sourceRipId,
    userId: profile.uid,
    title: rip.title,
    shadowThesis: rip.shadowThesis,
    antiMotifs: rip.antiMotifs,
    thingsToAvoid: rip.thingsToAvoid,
    blindSpots: rip.blindSpots,
    inversions: rip.inversions,
    oppositePalette: rip.oppositePalette,
    oppositeSilhouette: rip.oppositeSilhouette,
    oppositeRegister: rip.oppositeRegister,
    shadowExperiments: rip.shadowExperiments || [],
    semioticTouchpoints: rip.semioticTouchpoints,
    inverseRecommendations: rip.inverseRecommendations,
    inputCoverage: rip.inputCoverage,
    provenanceNotes: [
      "Published inverse projection from Taste Graph material.",
      rip.inputCoverage
        ? `Coverage ${Math.round(rip.inputCoverage.coverageScore * 100)}% at publish`
        : "",
      "Canonical identity remains on mimi.you.",
    ].filter(Boolean),
    visibility: "public" as const,
    createdAt: rip.updatedAt,
    updatedAt: rip.updatedAt,
  };

  return (
    <div className="min-h-screen">
      <div className="border-b border-white/10 px-6 py-3 flex items-center justify-between bg-black/40">
        <p className="font-mono text-[9px] uppercase tracking-[0.35em] text-rose-300/70">
          mimi.rip
        </p>
        <a
          href={`${canonicalYouOrigin()}/u/${encodeURIComponent(profile.handle || handle)}`}
          className="font-mono text-[9px] uppercase tracking-widest text-stone-400 hover:text-stone-200 inline-flex items-center gap-1"
        >
          Public card on mimi.you <ArrowUpRight size={11} />
        </a>
      </div>
      <RipReadingView reading={reading} handle={profile.handle || handle} />
      {isOwner ? (
        <div className="fixed bottom-4 right-4">
          <button
            type="button"
            onClick={() => navigate("/rip")}
            className="px-4 py-2 bg-rose-950/90 border border-rose-400/40 font-mono text-[9px] uppercase tracking-widest text-rose-100"
          >
            Manage rip
          </button>
        </div>
      ) : null}
      <CookieConsentBanner />
    </div>
  );
};
