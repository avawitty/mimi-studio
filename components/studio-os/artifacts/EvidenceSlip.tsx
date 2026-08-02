import React from "react";
import { MimiGlyph } from "../MimiGlyph";
import type { StudioMaterial } from "../DossierContext";

export interface EvidenceSlipProps {
  material: StudioMaterial;
  clipped?: boolean;
  className?: string;
}

export const EvidenceSlip: React.FC<EvidenceSlipProps> = ({
  material,
  clipped = false,
  className = "",
}) => (
  <article
    className={`relative border-t border-[var(--mimi-rule,#d8d4c9)] py-3 pr-3 ${
      clipped ? "pl-7" : "pl-1"
    } ${className}`}
  >
    {clipped ? (
      <MimiGlyph
        name="clip"
        decorative
        size={14}
        className="absolute left-1 top-3 rotate-[-12deg] text-[var(--mimi-pencil,#8a877f)]"
      />
    ) : null}
    <div className="flex items-start justify-between gap-3">
      <p className="font-serif text-lg leading-tight text-[var(--mimi-ink,#111110)]">
        {material.label}
      </p>
      <span className="shrink-0 font-mono text-[7px] uppercase tracking-[0.18em] text-[var(--mimi-pencil,#8a877f)]">
        {material.type}
      </span>
    </div>
    <p className="mt-1 font-mono text-[8px] tracking-[0.08em] text-[var(--mimi-pencil,#8a877f)]">
      Source: {material.provenance.source}
    </p>
  </article>
);
