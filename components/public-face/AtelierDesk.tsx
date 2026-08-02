import React from "react";
import { motion } from "motion/react";
import { MimiWordmark } from "./MimiWordmark";

type DeskLink = {
  label: string;
  onClick: () => void;
};

type AtelierDeskProps = {
  polaroidSrc: string;
  polaroidAlt?: string;
  caseTitle?: string;
  caseStatus?: string;
  deskStamp?: string;
  manifesto?: string;
  links: DeskLink[];
  onBrandAction: () => void;
  actionLabel: string;
};

/**
 * Desk collage entry — archival ephemera on the white public field.
 * Motifs (tape, clip, receipt, doily) are objects; field stays white (PRD-01).
 */
export const AtelierDesk: React.FC<AtelierDeskProps> = ({
  polaroidSrc,
  polaroidAlt = "",
  caseTitle = "Case file № 04 — Mimi studio",
  caseStatus = "Status: open",
  deskStamp,
  manifesto = "Mimi studio keeps an archive of quiet things — evidence before we did.",
  links,
  onBrandAction,
  actionLabel,
}) => {
  const stamp =
    deskStamp ||
    `Desk of M. — ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} — do not disturb`;

  return (
    <section className="relative min-h-[min(100dvh,920px)] px-6 md:px-10 pt-8 md:pt-12 pb-10 overflow-hidden">
      <p className="atelier-mono-label text-[var(--mimi-pencil,#8a877f)] max-w-[14rem] md:absolute md:left-6 md:top-8">
        {stamp}
      </p>

      <div className="relative mx-auto mt-10 md:mt-6 max-w-5xl">
        <div className="relative grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-4 md:min-h-[420px] items-start">
          {/* Polaroid + flower */}
          <motion.div
            className="md:col-span-4 relative z-[2] w-[min(240px,70vw)] mx-auto md:mx-0"
            initial={{ opacity: 0, y: 16, rotate: -2 }}
            animate={{ opacity: 1, y: 0, rotate: -2.5 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="atelier-polaroid atelier-shadow-paper-deep relative">
              <img
                src="/atelier/tape-strip.webp"
                alt=""
                aria-hidden
                className="pointer-events-none absolute -top-3 left-6 w-16 rotate-[-8deg] opacity-90"
                draggable={false}
              />
              <img
                src="/atelier/tape-strip.webp"
                alt=""
                aria-hidden
                className="pointer-events-none absolute -top-2 right-5 w-14 rotate-[12deg] opacity-90"
                draggable={false}
              />
              <div className="aspect-[4/5] overflow-hidden bg-[var(--mimi-worktable,#fafafa)]">
                <img
                  src={polaroidSrc}
                  alt={polaroidAlt}
                  className="h-full w-full object-cover grayscale"
                  draggable={false}
                />
              </div>
            </div>
            <img
              src="/atelier/pressed-flower.webp"
              alt=""
              aria-hidden
              className="pointer-events-none absolute -bottom-8 -left-4 w-28 md:w-32 opacity-90 rotate-[-8deg]"
              draggable={false}
            />
          </motion.div>

          {/* Brand + thesis */}
          <motion.div
            className="md:col-span-4 relative z-[3] flex flex-col items-center text-center pt-2 md:pt-16"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08 }}
          >
            <MimiWordmark size="lg" as="h1" />
            <p className="mt-1 font-serif text-3xl md:text-4xl leading-none text-[var(--mimi-ink,#0a0a0a)]">
              <span className="relative inline-block">
                studio
                <span className="atelier-red-stroke" aria-hidden />
              </span>
            </p>
            <p className="mt-6 max-w-xs font-serif italic text-[17px] leading-snug text-[var(--mimi-stone,#78716c)]">
              {manifesto}
            </p>
            <button
              type="button"
              onClick={onBrandAction}
              className="mt-7 atelier-mono-label px-5 py-2.5 bg-[var(--mimi-ink,#0a0a0a)] text-[var(--mimi-field,#ffffff)] hover:bg-black transition-colors"
            >
              {actionLabel}
            </button>
          </motion.div>

          {/* Receipt + case file */}
          <motion.div
            className="md:col-span-4 relative z-[2] flex flex-col items-center md:items-end gap-4 pt-2 md:pt-8"
            initial={{ opacity: 0, y: 16, rotate: 1 }}
            animate={{ opacity: 1, y: 0, rotate: 1.5 }}
            transition={{ duration: 0.55, delay: 0.12 }}
          >
            <p className="atelier-cursive self-start md:self-auto md:mr-8">everything is a clue</p>
            <div className="relative w-[min(220px,75vw)]">
              <img
                src="/atelier/paper-clip.svg"
                alt=""
                aria-hidden
                className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 w-8 z-10 drop-shadow-sm"
                draggable={false}
              />
              <img
                src="/atelier/receipt-fragment.webp"
                alt=""
                className="w-full atelier-shadow-paper rotate-[2deg]"
                draggable={false}
              />
            </div>
            <div className="atelier-case-card atelier-shadow-paper w-[min(260px,85vw)] px-4 py-3 text-left">
              <p className="atelier-mono-meta text-[var(--mimi-ink,#0a0a0a)]/80">{caseTitle}</p>
              <p className="atelier-mono-meta mt-1 text-[var(--mimi-ink,#0a0a0a)]/60">
                An atelier of quiet things
              </p>
              <p className="atelier-mono-meta mt-2 atelier-type-cursor text-[var(--mimi-ink,#0a0a0a)]/80">
                {caseStatus}
              </p>
            </div>
          </motion.div>
        </div>

        <div className="mt-16 md:mt-20 flex flex-col items-center gap-6">
          <img
            src="/atelier/doily-divider.svg"
            alt=""
            aria-hidden
            className="w-full max-w-xl opacity-80"
            draggable={false}
          />
          <nav aria-label="Archive destinations" className="flex flex-col gap-3 items-start">
            {links.map((link) => (
              <button
                key={link.label}
                type="button"
                onClick={link.onClick}
                className="atelier-mono-label text-[var(--mimi-ink,#0a0a0a)]/80 hover:text-[var(--mimi-periwinkle,#b9c4e0)] transition-colors text-left"
              >
                {link.label}
              </button>
            ))}
          </nav>
        </div>
      </div>
    </section>
  );
};
