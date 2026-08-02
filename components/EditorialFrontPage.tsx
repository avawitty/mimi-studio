import React, { useEffect, useMemo, useState } from "react";
import { BookOpen, Loader2 } from "lucide-react";
import { fetchFeaturedPublicZines } from "../services/publicShowcaseService";
import type { ZineMetadata } from "../types";
import {
  AtelierDesk,
  FilingFolder,
  PublicField,
} from "./public-face";
import "./public-face/atelier.css";

interface EditorialFrontPageProps {
  onSelectZine: (zineId: string) => void;
  onOpenGateway: () => void;
}

function formatIssueDate(ts?: number): string {
  if (!ts) return "Undated";
  try {
    return new Date(ts).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "Undated";
  }
}

function excerptFor(zine: ZineMetadata): string {
  const raw =
    zine.summary ||
    zine.concept ||
    zine.content?.poetic_provocation ||
    zine.content?.vocal_summary_blurb ||
    zine.content?.originalThought ||
    "";
  const text = typeof raw === "string" ? raw.trim() : "";
  if (!text) return "A published issue from the Mimi public archive.";
  return text.length > 140 ? `${text.slice(0, 137)}…` : text;
}

const FALLBACK_POLAROID = "/atelier/polaroid-portrait.webp";

export const EditorialFrontPage: React.FC<EditorialFrontPageProps> = ({
  onSelectZine,
  onOpenGateway,
}) => {
  const [zines, setZines] = useState<ZineMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    fetchFeaturedPublicZines(18)
      .then((rows) => {
        if (!cancelled) {
          setZines(rows);
          setLoadError(null);
        }
      })
      .catch((err: unknown) => {
        console.warn("MIMI // Editorial front page load failed", err);
        if (!cancelled) {
          setLoadError("Could not load the public archive. Try again shortly.");
          setZines([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const featured = zines[0];
  const polaroidSrc = featured?.coverImageUrl || FALLBACK_POLAROID;

  const deskLinks = useMemo(
    () => [
      {
        label: "→ Index — the filing cabinet",
        onClick: () => {
          document
            .getElementById("mimi-front-index")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        },
      },
      {
        label: "→ Oracle — ask",
        onClick: () =>
          window.dispatchEvent(new CustomEvent("mimi:change_view", { detail: "oracle" })),
      },
      {
        label: "→ Studio — start composing",
        onClick: () =>
          window.dispatchEvent(new CustomEvent("mimi:change_view", { detail: "studio" })),
      },
    ],
    [],
  );

  const goShowcase = () => {
    window.dispatchEvent(new CustomEvent("mimi:change_view", { detail: "showcase" }));
  };

  return (
    <PublicField className="w-full h-full min-h-0 overflow-y-auto transition-colors duration-300 pb-20 md:pb-28">
      <AtelierDesk
        polaroidSrc={polaroidSrc}
        polaroidAlt={featured?.title ? `Cover — ${featured.title}` : "Archive specimen"}
        caseTitle={
          featured
            ? `Case file — ${featured.title || "Untitled issue"}`
            : "Case file № 04 — Mimi studio"
        }
        caseStatus={
          featured
            ? `Filed ${formatIssueDate(featured.publishedAt || featured.timestamp || featured.createdAt)}`
            : "Status: open"
        }
        manifesto="Taste made inspectable — not averaged. A quiet public archive for original expression and evidence you can audit."
        links={deskLinks}
        actionLabel={featured ? "Read latest issue" : "Enter the archive"}
        onBrandAction={() => {
          if (featured) {
            onSelectZine(featured.id);
            return;
          }
          document
            .getElementById("mimi-front-index")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
      />

      <section
        id="mimi-front-index"
        className="relative mx-auto max-w-3xl px-6 pb-16 border-t border-[var(--mimi-hairline,#d4d4d4)] pt-14"
      >
        <header className="text-center space-y-3">
          <p className="atelier-mono-label text-[var(--mimi-pencil,#8a877f)]">
            The filing cabinet — drawer 01
          </p>
          <h2 className="font-serif text-[40px] md:text-[56px] leading-none text-[var(--mimi-ink,#0a0a0a)]">
            Studio Index
          </h2>
          <p className="atelier-cursive mx-auto !transform-none md:rotate-[-1deg]">
            every project, filed and tabbed.
          </p>
        </header>

        {loading && (
          <div className="flex items-center justify-center gap-3 py-16 atelier-mono-label text-[var(--mimi-pencil,#8a877f)]">
            <Loader2 size={16} className="animate-spin" />
            Retrieving filed issues…
          </div>
        )}

        {!loading && loadError && (
          <div className="mt-10 border border-red-800/40 px-5 py-6 space-y-3" role="alert">
            <p className="font-serif text-lg text-[var(--mimi-ink,#0a0a0a)]">{loadError}</p>
            <button
              type="button"
              onClick={() => setReloadToken((n) => n + 1)}
              className="atelier-mono-label border border-[var(--mimi-hairline,#d4d4d4)] px-3 py-1.5"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !loadError && zines.length === 0 && (
          <div className="mt-10 border border-dashed border-[var(--mimi-hairline,#d4d4d4)] px-6 py-14 text-center space-y-4">
            <BookOpen size={22} className="mx-auto text-[var(--mimi-stone,#78716c)]" />
            <p className="font-serif italic text-xl text-[var(--mimi-ink,#0a0a0a)]">
              No public issues yet.
            </p>
            <p className="font-serif text-[14px] text-[var(--mimi-stone,#78716c)] max-w-md mx-auto leading-relaxed">
              When creators publish from The Press with `isPublic`, their work appears here as
              filed specimens.
            </p>
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={goShowcase}
                className="atelier-mono-label px-4 py-2 border border-[var(--mimi-hairline,#d4d4d4)]"
              >
                Browse showcase
              </button>
              <button
                type="button"
                onClick={() =>
                  window.dispatchEvent(new CustomEvent("mimi:change_view", { detail: "studio" }))
                }
                className="atelier-mono-label px-4 py-2 bg-[var(--mimi-ink,#0a0a0a)] text-[var(--mimi-field,#ffffff)]"
              >
                Open Studio
              </button>
            </div>
          </div>
        )}

        {!loading && zines.length > 0 && (
          <div className="mt-4">
            {zines.map((zine, idx) => (
              <FilingFolder
                key={zine.id}
                tab={idx === 0 ? "Zines" : "Readings"}
                title={zine.title || "Untitled issue"}
                meta={
                  [
                    zine.userHandle ? `@${zine.userHandle.replace(/^@/, "")}` : null,
                    formatIssueDate(zine.publishedAt || zine.timestamp || zine.createdAt),
                    excerptFor(zine),
                  ]
                    .filter(Boolean)
                    .join(" · ")
                }
                photoSrc={zine.coverImageUrl}
                figLabel={`Fig. ${String(idx + 1).padStart(2, "0")} / ${String(zines.length).padStart(2, "0")}`}
                onOpen={() => onSelectZine(zine.id)}
              />
            ))}
          </div>
        )}

        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 border-t border-[var(--mimi-hairline,#d4d4d4)] pt-8">
          <div>
            <p className="atelier-mono-label text-[var(--mimi-pencil,#8a877f)]">Filed under</p>
            <p className="font-serif text-lg mt-1">Mimi studio</p>
          </div>
          <div>
            <p className="atelier-mono-label text-[var(--mimi-pencil,#8a877f)]">Est. MMXXIV</p>
            <p className="font-serif text-lg mt-1">All readings final</p>
          </div>
          <div className="sm:text-right">
            <button
              type="button"
              onClick={onOpenGateway}
              className="atelier-mono-label text-[var(--mimi-ink,#0a0a0a)] hover:text-[var(--mimi-periwinkle,#b9c4e0)] transition-colors"
            >
              Correspondence — open gateway
            </button>
            <p className="atelier-cursive mt-3 sm:ml-auto sm:w-fit">handle with care</p>
          </div>
        </div>
      </section>
    </PublicField>
  );
};
