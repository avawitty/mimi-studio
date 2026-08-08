import React, { useEffect, useState } from "react";
import { ArrowUpRight, Fingerprint } from "lucide-react";
import { loadPublicProfileShowcase } from "../services/publicShowcaseService";
import type { AestheticSignature } from "../types";
import {
  extractApprovedPublicSignature,
  publicSignatureDescription,
  publicSignaturePlateTitle,
} from "../lib/signature/publicSignature";
import { SignaturePlate } from "./signature/SignaturePlate";
import { PublicField, PublicCTA } from "./public-face";
import { CookieConsentBanner } from "./CookieConsentBanner";
import { useUser } from "../contexts/UserContext";

interface PublicSignaturePageProps {
  handle: string;
  navigate: (path: string) => void;
}

export const PublicSignaturePage: React.FC<PublicSignaturePageProps> = ({
  handle,
  navigate,
}) => {
  const { user, profile } = useUser();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [publicHandle, setPublicHandle] = useState(handle);
  const [signature, setSignature] = useState<AestheticSignature | null>(null);

  const normalizedHandle = handle.trim().toLowerCase();
  const isOwner =
    Boolean(user?.uid) &&
    (profile?.handle?.toLowerCase() === normalizedHandle ||
      (!profile?.handle && profile?.uid === user?.uid));

  useEffect(() => {
    let cancelled = false;
    void loadPublicProfileShowcase(normalizedHandle).then((data) => {
      if (cancelled) return;
      if (!data) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setPublicHandle(data.profile.handle || normalizedHandle);
      setSignature(extractApprovedPublicSignature(data.profile));
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [normalizedHandle]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--mimi-field,#ffffff)]">
        <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-[var(--mimi-stone)]">
          Loading signature…
        </p>
      </div>
    );
  }

  if (notFound) {
    return (
      <PublicField bleed className="min-h-screen flex flex-col items-center justify-center p-12 text-center">
        <Fingerprint size={48} className="text-[var(--mimi-stone)] mb-6" />
        <h1 className="font-serif italic text-3xl text-[var(--mimi-ink)] mb-2">
          @{normalizedHandle}
        </h1>
        <p className="text-[var(--mimi-stone)] max-w-md mb-8">
          This handle is not registered, or no public signature has been published yet.
        </p>
        <PublicCTA onClick={() => navigate("/studio")}>Enter Mimi Studio</PublicCTA>
        <CookieConsentBanner />
      </PublicField>
    );
  }

  if (!signature) {
    return (
      <PublicField bleed className="min-h-screen flex flex-col items-center justify-center p-12 text-center">
        <Fingerprint size={48} className="text-[var(--mimi-stone)] mb-6" />
        <h1 className="font-serif italic text-3xl text-[var(--mimi-ink)] mb-2">
          @{publicHandle}
        </h1>
        <p className="text-[var(--mimi-stone)] max-w-md mb-8">
          {isOwner
            ? "Approve your reading for memory, then publish when you want this plate visible at /u/:handle/signature."
            : "This creator has not published a taste signature plate yet."}
        </p>
        {isOwner ? (
          <PublicCTA onClick={() => navigate("/signature")}>Open Signature</PublicCTA>
        ) : (
          <button
            type="button"
            onClick={() => navigate(`/u/${publicHandle}`)}
            className="font-sans text-[10px] uppercase tracking-[0.22em] text-[var(--mimi-stone)] hover:text-[var(--mimi-ink)] inline-flex items-center gap-1"
          >
            View showcase <ArrowUpRight size={12} />
          </button>
        )}
        <CookieConsentBanner />
      </PublicField>
    );
  }

  const plateTitle = publicSignaturePlateTitle(signature);
  const thesis = publicSignatureDescription(signature, publicHandle);

  return (
    <PublicField bleed className="min-h-full font-serif pb-16">
      <div className="max-w-3xl mx-auto p-6 md:p-12 space-y-10">
        <header className="space-y-3 border-b border-[var(--mimi-hairline)] pb-8">
          <p className="font-sans text-[10px] uppercase tracking-[0.3em] text-[var(--mimi-stone)]">
            mimi.you · taste signature
          </p>
          <h1 className="font-serif italic text-4xl md:text-5xl text-[var(--mimi-ink)]">
            {plateTitle}
          </h1>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--mimi-stone)]">
            @{publicHandle}
            {signature.approvedAt
              ? ` · approved ${new Date(signature.approvedAt).toLocaleDateString()}`
              : ""}
          </p>
        </header>

        <div className="flex justify-center">
          <SignaturePlate
            signature={signature}
            handle={publicHandle}
            approvedAtomCount={signature.evidenceRefs?.length ?? 0}
          />
        </div>

        {signature.reading?.thesis ? (
          <section className="space-y-4">
            <p className="font-sans text-[9px] uppercase tracking-[0.28em] text-[var(--mimi-stone)]">
              The reading
            </p>
            <p className="font-serif text-lg leading-relaxed text-[var(--mimi-ink)]">
              {signature.reading.thesis}
            </p>
            {signature.semioticTouchpoints?.length ? (
              <ul className="space-y-2 pt-4">
                {signature.semioticTouchpoints.slice(0, 4).map((tp) => (
                  <li
                    key={`${tp.motif}-${tp.context.slice(0, 24)}`}
                    className="font-serif text-sm text-[var(--mimi-stone)]"
                  >
                    <span className="text-[var(--mimi-ink)]">{tp.motif}</span>
                    {" — "}
                    {tp.context}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ) : (
          <p className="font-serif text-base text-[var(--mimi-stone)] text-center">{thesis}</p>
        )}

        <div className="flex flex-wrap gap-4 pt-4">
          <button
            type="button"
            onClick={() => navigate(`/u/${publicHandle}`)}
            className="font-sans text-[10px] uppercase tracking-[0.22em] text-[var(--mimi-stone)] hover:text-[var(--mimi-ink)] inline-flex items-center gap-1"
          >
            Showcase <ArrowUpRight size={12} />
          </button>
          {isOwner ? (
            <button
              type="button"
              onClick={() => navigate("/signature")}
              className="font-sans text-[10px] uppercase tracking-[0.22em] text-[var(--mimi-stone)] hover:text-[var(--mimi-ink)]"
            >
              Edit in Studio
            </button>
          ) : null}
        </div>
      </div>
      <CookieConsentBanner />
    </PublicField>
  );
};
