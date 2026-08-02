import React, { forwardRef } from "react";
import { AestheticSignature } from "../../types";
import { MimiWordmark } from "../public-face/MimiWordmark";
import { ColumnRule } from "../public-face/ColumnRule";
import { DossierTab } from "../public-face/DossierTab";

type SignaturePlateProps = {
  signature: AestheticSignature;
  handle?: string;
  approvedAtomCount?: number;
  className?: string;
};

/**
 * Collectible exportable Signature plate — white field, serif name, colophon.
 * House style first (black / white / olive); light blue + dossier tab as accents.
 * Charts and DNA dashboards stay off this face (PRD-03).
 */
export const SignaturePlate = forwardRef<HTMLDivElement, SignaturePlateProps>(
  function SignaturePlate(
    { signature, handle, approvedAtomCount = 0, className = "" },
    ref,
  ) {
    const title =
      signature.primaryAxis ||
      signature.motifs?.[0] ||
      "Untitled signature";
    const motifs = (signature.motifs || []).slice(0, 4);
    const plateDate = new Date().toISOString().slice(0, 7).replace("-", ".");

    return (
      <div className={`relative ${className}`.trim()}>
        {/* Spy × Manila folder tab — quiet surveillance nod */}
        <DossierTab label="Mimi // Signature" classify="Filed" className="pl-5" />

        <div
          ref={ref}
          data-surface="public"
          className="mimi-ticket-plate relative bg-[var(--mimi-field,#ffffff)] text-[var(--mimi-ink,#0a0a0a)] border border-[var(--mimi-ink,#0a0a0a)] px-8 py-10 md:px-10 md:py-12 overflow-hidden"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 mimi-public-grain opacity-[0.08] mix-blend-multiply"
          />

          <div className="relative z-[1] flex flex-col items-center text-center space-y-6">
            <MimiWordmark size="sm" />

            <span
              aria-hidden
              className="w-2 h-2 rotate-45 bg-[var(--mimi-olive,#5A5A40)]"
            />

            <p className="font-sans text-[9px] uppercase tracking-[0.32em] text-[var(--mimi-stone,#78716c)] font-semibold">
              Aesthetic Signature
            </p>

            <h2 className="font-serif italic text-5xl md:text-6xl leading-[0.92] tracking-tight max-w-[14ch]">
              {title}
            </h2>

            {signature.secondaryAxis && (
              <p className="font-serif text-base text-[var(--mimi-stone,#78716c)]">
                {signature.secondaryAxis}
              </p>
            )}

            {/* Geometric mark family — olive primary, light blue accent */}
            <div
              className="relative w-full max-w-[220px] h-[140px] my-2"
              aria-hidden
            >
              <span className="absolute left-[18%] top-[38%] w-3.5 h-3.5 bg-[var(--mimi-ink,#0a0a0a)]" />
              <span className="absolute left-1/2 top-[32%] -translate-x-1/2 w-14 h-14 rounded-full bg-[var(--mimi-olive,#5A5A40)]" />
              <span className="absolute left-1/2 top-[18%] -translate-x-1/2 w-px h-[72%] bg-[var(--mimi-ink,#0a0a0a)]" />
              <span className="absolute left-[22%] top-1/2 w-[56%] h-px bg-[var(--mimi-ink,#0a0a0a)]" />
              <span className="absolute left-1/2 top-[18%] -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[var(--mimi-ink,#0a0a0a)]" />
              <span className="absolute left-1/2 bottom-[10%] -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[var(--mimi-ink,#0a0a0a)]" />
              <span className="absolute right-[16%] top-[42%] flex flex-col gap-[3px]">
                <span className="w-5 h-px bg-[var(--mimi-ink,#0a0a0a)]" />
                <span className="w-5 h-px bg-[var(--mimi-ink,#0a0a0a)]" />
                <span className="w-5 h-px bg-[var(--mimi-ink,#0a0a0a)]" />
              </span>
              <span className="absolute right-[12%] top-[58%] w-1.5 h-1.5 rounded-full bg-[var(--mimi-cobalt,#9BB8CE)]" />
              <span className="absolute left-1/2 bottom-[4%] -translate-x-1/2 w-20 h-10 rounded-t-full border border-[var(--mimi-ink,#0a0a0a)] border-b-0" />
              <span className="absolute left-1/2 bottom-[10%] -translate-x-1/2 w-12 h-6 rounded-t-full border border-[var(--mimi-cobalt,#9BB8CE)] border-b-0" />
            </div>

            {motifs.length > 0 && (
              <p className="font-serif italic text-sm leading-relaxed text-[var(--mimi-stone,#78716c)] max-w-sm">
                {motifs.join(" · ")}
              </p>
            )}

            <ColumnRule className="w-16 mx-auto" />

            <div className="space-y-1.5">
              <p className="font-sans text-[9px] uppercase tracking-[0.28em] text-[var(--mimi-stone,#78716c)] font-semibold">
                A collectible signature plate
              </p>
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--mimi-stone,#78716c)]">
                Approved · {approvedAtomCount.toLocaleString()}
                {handle ? ` · @${handle}` : ""} · {plateDate}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  },
);
