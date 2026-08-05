import React, { useEffect, useMemo, useState } from "react";
import type { MediaFile } from "../../types";
import {
  fetchStockInspoSlides,
  referenceSlidesFromMedia,
} from "../../lib/fetchStudioInspos";
import type { StudioInspoSlide } from "../../lib/studioInspoTypes";

export type StudioInspoCarouselProps = {
  query: string;
  references: MediaFile[];
  selectedId: string | null;
  onSelect: (slide: StudioInspoSlide | null) => void;
  onPublishRendition: (slide: StudioInspoSlide | null) => void;
  isPublishing?: boolean;
};

export const StudioInspoCarousel: React.FC<StudioInspoCarouselProps> = ({
  query,
  references,
  selectedId,
  onSelect,
  onPublishRendition,
  isPublishing = false,
}) => {
  const [stockSlides, setStockSlides] = useState<StudioInspoSlide[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const referenceSlides = useMemo(
    () => referenceSlidesFromMedia(references),
    [references],
  );

  const slides = useMemo(
    () => [...referenceSlides, ...stockSlides],
    [referenceSlides, stockSlides],
  );

  useEffect(() => {
    let cancelled = false;
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setStockSlides([]);
      return;
    }

    setLoading(true);
    const timer = window.setTimeout(() => {
      void fetchStockInspoSlides(trimmed, 6)
        .then((next) => {
          if (!cancelled) setStockSlides(next);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    if (slides.length === 0) {
      setActiveIndex(0);
      return;
    }
    setActiveIndex((index) => Math.min(index, slides.length - 1));
  }, [slides.length]);

  useEffect(() => {
    if (!selectedId || slides.length === 0) return;
    const index = slides.findIndex((slide) => slide.id === selectedId);
    if (index >= 0) setActiveIndex(index);
  }, [selectedId, slides]);

  const selectIndex = (index: number) => {
    const bounded = Math.max(0, Math.min(index, slides.length - 1));
    setActiveIndex(bounded);
    onSelect(slides[bounded] ?? null);
  };

  if (slides.length === 0 && !loading && query.trim().length < 3) {
    return null;
  }

  const activeSlide = slides[activeIndex] ?? null;

  return (
    <section
      aria-label="Inspos"
      className="mt-6 border border-[var(--mimi-hairline,#d4d4d4)] bg-[var(--mimi-field,#ffffff)]/90 p-4"
    >
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="font-mono text-[8px] uppercase tracking-[0.24em] text-[var(--mimi-stone,#78716c)]">
            Inspos
          </p>
          <p className="mt-1 font-serif text-[14px] italic leading-snug text-[var(--mimi-ink,#0a0a0a)]">
            Browse references and stock — then publish your rendition.
          </p>
        </div>
        {loading ? (
          <span className="font-mono text-[8px] uppercase tracking-[0.16em] text-[var(--mimi-stone,#78716c)]">
            Loading…
          </span>
        ) : null}
      </div>

      {slides.length > 0 ? (
        <div className="mt-4">
          <div className="relative mx-auto aspect-[3/4] max-h-[18rem] w-full max-w-[12rem] overflow-hidden border border-[var(--mimi-hairline,#d4d4d4)] bg-[var(--mimi-worktable,#fafafa)]">
            {activeSlide ? (
              <img
                src={activeSlide.imageUrl}
                alt={activeSlide.label}
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : null}
          </div>

          <div className="mt-3 flex items-center justify-center gap-2">
            <button
              type="button"
              aria-label="Previous inspo"
              disabled={activeIndex === 0}
              onClick={() => selectIndex(activeIndex - 1)}
              className="min-h-10 min-w-10 border border-[var(--mimi-hairline,#d4d4d4)] font-mono text-[12px] disabled:opacity-30"
            >
              ‹
            </button>
            <div className="flex max-w-[14rem] gap-1.5 overflow-x-auto px-1">
              {slides.map((slide, index) => (
                <button
                  key={slide.id}
                  type="button"
                  aria-label={slide.label}
                  aria-current={index === activeIndex ? "true" : undefined}
                  onClick={() => selectIndex(index)}
                  className={`h-12 w-10 shrink-0 overflow-hidden border ${
                    index === activeIndex
                      ? "border-[var(--mimi-ink,#0a0a0a)]"
                      : "border-[var(--mimi-hairline,#d4d4d4)] opacity-70"
                  }`}
                >
                  <img
                    src={slide.imageUrl}
                    alt=""
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </button>
              ))}
            </div>
            <button
              type="button"
              aria-label="Next inspo"
              disabled={activeIndex >= slides.length - 1}
              onClick={() => selectIndex(activeIndex + 1)}
              className="min-h-10 min-w-10 border border-[var(--mimi-hairline,#d4d4d4)] font-mono text-[12px] disabled:opacity-30"
            >
              ›
            </button>
          </div>

          {activeSlide?.attribution ? (
            <p className="mt-3 text-center font-mono text-[9px] leading-relaxed tracking-[0.04em] text-[var(--mimi-stone,#78716c)]">
              {activeSlide.attribution}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="mt-4 font-serif text-[13px] italic text-[var(--mimi-stone,#78716c)]">
          {loading
            ? "Searching editorial stock…"
            : "Type a few words to surface inspo plates."}
        </p>
      )}

      <button
        type="button"
        disabled={isPublishing || (!activeSlide && !query.trim())}
        onClick={() => onPublishRendition(activeSlide)}
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center border border-[var(--mimi-ink,#0a0a0a)] bg-[var(--mimi-worktable,#fafafa)] px-4 font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--mimi-ink,#0a0a0a)] disabled:opacity-40 sm:w-auto"
      >
        {isPublishing ? "Publishing…" : "Publish my rendition →"}
      </button>
    </section>
  );
};

export default StudioInspoCarousel;
