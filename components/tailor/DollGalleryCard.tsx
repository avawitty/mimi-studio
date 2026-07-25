import React from "react";
import { ExternalLink } from "lucide-react";
import type { Doll } from "../../types";
import { DollPortraitStage } from "./DollPortraitStage";

interface DollGalleryCardProps {
  doll: Doll;
  onOpen: () => void;
  onPublicCard?: () => void;
}

export const DollGalleryCard: React.FC<DollGalleryCardProps> = ({
  doll,
  onOpen,
  onPublicCard,
}) => (
  <article className="group border border-nous-border/40 bg-nous-base overflow-hidden hover:border-nous-text/25 transition-colors">
    <button type="button" onClick={onOpen} className="w-full text-left">
      <DollPortraitStage doll={doll} className="aspect-[4/3] w-full" />
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-serif text-xl text-nous-text leading-tight">{doll.name}</h2>
          <div className="flex gap-1 shrink-0 pt-1">
            {doll.palette.slice(0, 4).map((hex) => (
              <span
                key={hex}
                className="w-3 h-3 border border-nous-border/30"
                style={{ backgroundColor: hex }}
                title={hex}
              />
            ))}
          </div>
        </div>
        <p className="font-sans text-[11px] text-nous-subtle line-clamp-2 leading-relaxed">
          {doll.creativePhilosophy || doll.description}
        </p>
        <div className="flex flex-wrap gap-1">
          {(doll.signatureMotifs.length ? doll.signatureMotifs : doll.motifs)
            .slice(0, 4)
            .map((motif) => (
              <span
                key={motif}
                className="font-mono text-[6px] uppercase tracking-wider border border-nous-border/30 px-1.5 py-0.5 text-nous-subtle"
              >
                {motif}
              </span>
            ))}
        </div>
        <p className="font-mono text-[7px] uppercase tracking-[0.25em] text-nous-subtle group-hover:text-nous-text transition-colors">
          Open doll profile →
        </p>
      </div>
    </button>
    {onPublicCard ? (
      <div className="px-4 pb-4">
        <button
          type="button"
          onClick={onPublicCard}
          className="w-full py-2 border border-dashed border-nous-border/40 font-mono text-[7px] uppercase tracking-widest text-nous-subtle hover:text-nous-text flex items-center justify-center gap-1"
        >
          Public card <ExternalLink size={10} />
        </button>
      </div>
    ) : null}
  </article>
);
