import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ZineOwnerPlateSlide } from "../../../types";
import {
  GrammarPageFrame,
  GrammarPageNumber,
  type ZineGrammarPageProps,
} from "./GrammarPageFrame";

function OwnerSlideView({ slide }: { slide: ZineOwnerPlateSlide }) {
  if (slide.kind === "image" && slide.imageUrl) {
    return (
      <div className="flex h-full flex-col gap-4">
        {slide.title ? (
          <p className="font-mono text-[8px] uppercase tracking-[0.24em] text-[var(--mimi-stone,#78716c)]">
            {slide.title}
          </p>
        ) : null}
        <div className="min-h-0 flex-1 overflow-hidden border border-[var(--mimi-hairline,#d4d4d4)]">
          <img
            src={slide.imageUrl}
            alt={slide.altText || slide.title || "Owner plate image"}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="h-full w-full object-contain"
          />
        </div>
        {slide.body ? (
          <p className="font-serif text-sm italic leading-relaxed text-[var(--mimi-stone,#78716c)]">
            {slide.body}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col justify-center gap-4">
      {slide.title ? (
        <p className="font-mono text-[8px] uppercase tracking-[0.24em] text-[var(--mimi-stone,#78716c)]">
          {slide.title}
        </p>
      ) : null}
      <p className="font-serif text-xl italic leading-relaxed text-[var(--mimi-ink,#0a0a0a)] whitespace-pre-wrap">
        {slide.body}
      </p>
    </div>
  );
}

export function OwnerCarouselPage({
  artifact,
  page,
  className,
}: ZineGrammarPageProps) {
  const slides = page.plateData?.ownerSlides || [];
  const [index, setIndex] = useState(0);
  const active = slides[index];

  const prev = () => setIndex((current) => Math.max(0, current - 1));
  const next = () =>
    setIndex((current) => Math.min(slides.length - 1, current + 1));

  return (
    <GrammarPageFrame
      artifact={artifact}
      page={page}
      className={className}
      label={`Owner carousel page ${page.pageNumber}: ${page.headline}`}
    >
      <div className="absolute inset-[7%] flex flex-col">
        <header className="flex items-end justify-between border-b-2 border-[var(--mimi-ink,#0a0a0a)] pb-3">
          <div>
            <p className="font-mono text-[7px] uppercase tracking-[0.3em] text-[var(--mimi-stone,#78716c)]">
              Add your own
            </p>
            <h2 className="mt-1 font-serif text-2xl italic leading-none">
              {page.headline}
            </h2>
          </div>
          <GrammarPageNumber page={page} />
        </header>

        <div className="min-h-0 flex-1 py-6">
          {active ? (
            <OwnerSlideView slide={active} />
          ) : (
            <p className="font-serif text-lg italic text-[var(--mimi-stone,#78716c)]">
              No owner slides yet.
            </p>
          )}
        </div>

        {slides.length > 1 ? (
          <footer className="flex items-center justify-between border-t border-[var(--mimi-hairline,#d4d4d4)] pt-3">
            <button
              type="button"
              onClick={prev}
              disabled={index === 0}
              className="inline-flex items-center gap-1 font-mono text-[8px] uppercase tracking-widest text-[var(--mimi-ink,#0a0a0a)] disabled:opacity-30"
            >
              <ChevronLeft size={12} /> Prev
            </button>
            <div className="flex items-center gap-1.5">
              {slides.map((slide, slideIndex) => (
                <span
                  key={slide.id}
                  className={`h-1.5 w-1.5 rounded-full ${
                    slideIndex === index
                      ? "bg-[var(--mimi-ink,#0a0a0a)]"
                      : "bg-[var(--mimi-hairline,#d4d4d4)]"
                  }`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={next}
              disabled={index >= slides.length - 1}
              className="inline-flex items-center gap-1 font-mono text-[8px] uppercase tracking-widest text-[var(--mimi-ink,#0a0a0a)] disabled:opacity-30"
            >
              Next <ChevronRight size={12} />
            </button>
          </footer>
        ) : (
          <footer className="border-t border-[var(--mimi-hairline,#d4d4d4)] pt-3 font-mono text-[7px] uppercase tracking-[0.2em] text-[var(--mimi-stone,#78716c)]">
            Owner-authored · not generated
          </footer>
        )}
      </div>
    </GrammarPageFrame>
  );
}
