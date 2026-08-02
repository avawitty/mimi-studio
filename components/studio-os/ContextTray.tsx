import React from "react";
import { useDossierContext } from "./DossierContext";
import { EvidenceSlip } from "./artifacts/EvidenceSlip";

export interface ContextTrayProps {
  limit?: number;
  className?: string;
}

export const ContextTray: React.FC<ContextTrayProps> = ({
  limit = 3,
  className = "",
}) => {
  const { recentMaterials } = useDossierContext();
  const materials = recentMaterials.slice(0, limit);

  return (
    <section className={className} aria-labelledby="loose-material-heading">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[8px] uppercase tracking-[0.28em] text-[var(--mimi-pencil,#8a877f)]">
            Recent evidence
          </p>
          <h2
            id="loose-material-heading"
            className="mt-1 font-serif text-2xl font-medium"
          >
            Loose on the desk
          </h2>
        </div>
        <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-[var(--mimi-pencil,#8a877f)]">
          {materials.length} / {limit}
        </span>
      </div>
      <div className="mt-3">
        {materials.length > 0 ? (
          materials.map((material, index) => (
            <EvidenceSlip
              key={material.id}
              material={material}
              clipped={index === 0}
            />
          ))
        ) : (
          <p className="border-t border-[var(--mimi-rule,#d8d4c9)] py-4 font-serif text-lg italic text-[var(--mimi-pencil,#8a877f)]">
            Nothing clipped here yet. Loose material can remain loose.
          </p>
        )}
      </div>
    </section>
  );
};
