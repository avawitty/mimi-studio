import React, { forwardRef } from "react";
import { AestheticSignature } from "../../types";
import { MimiWordmark } from "../public-face/MimiWordmark";
import { ColumnRule } from "../public-face/ColumnRule";
import { PressMark } from "../public-face/PressMark";
import { RegistryCorners } from "../public-face/RegistryCorners";

type SignaturePlateProps = {
  signature: AestheticSignature;
  handle?: string;
  approvedAtomCount?: number;
  className?: string;
};

/**
 * Collectible exportable Signature plate — white field, serif name, colophon.
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
      <div
        ref={ref}
        data-surface="public"
        className={`relative bg-[var(--mimi-field,#ffffff)] text-[var(--mimi-ink,#0a0a0a)] border border-[var(--mimi-ink,#0a0a0a)] p-8 md:p-10 overflow-hidden ${className}`}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 mimi-public-grain opacity-[0.08] mix-blend-multiply"
        />
        {/* Signal Underarchive whisper — closed-circuit corners */}
        <RegistryCorners tone="cobalt" />

        <div className="relative z-[1] space-y-8">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="font-sans text-[9px] uppercase tracking-[0.3em] text-[var(--mimi-stone,#78716c)] font-semibold">
                Aesthetic Signature
              </p>
              <MimiWordmark size="sm" />
            </div>
            <PressMark label="Registry" tone="cobalt" />
          </div>

          <div className="mimi-deco-fan" aria-hidden />

          <div className="space-y-3 py-4">
            <h2 className="font-serif italic text-4xl md:text-5xl leading-[0.95] tracking-tight">
              {title}
            </h2>
            {signature.secondaryAxis && (
              <p className="font-serif text-lg text-[var(--mimi-stone,#78716c)]">
                {signature.secondaryAxis}
              </p>
            )}
          </div>

          {/* Art-deco feminine mark family — arcs, diamond, gilt whisper */}
          <div className="flex items-center gap-5 py-2" aria-hidden>
            <span className="w-10 h-10 rounded-full border border-[var(--mimi-cobalt,#9BB8CE)]" />
            <span className="w-7 h-7 rotate-45 border border-[var(--mimi-gilt,#C4B08A)]" />
            <span className="w-10 h-5 rounded-full border border-[var(--mimi-ink,#0a0a0a)]/70" />
            <span className="mimi-gilt-rule" />
          </div>

          {motifs.length > 0 && (
            <div className="space-y-2">
              <p className="font-sans text-[9px] uppercase tracking-[0.28em] text-[var(--mimi-stone,#78716c)]">
                Motifs
              </p>
              <p className="font-serif italic text-base leading-relaxed">
                {motifs.join(" · ")}
              </p>
            </div>
          )}

          <ColumnRule />

          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--mimi-stone,#78716c)]">
            Approved atoms {approvedAtomCount} · Plate {plateDate} · Mimi
            {handle ? ` · @${handle}` : ""}
          </p>
        </div>
      </div>
    );
  },
);
