import React from "react";

type DossierTabProps = {
  label?: string;
  className?: string;
  /** Quiet light-blue classification mark */
  classify?: string;
};

/**
 * Spy × Manila folder tab — surveillance nod for dossier/colophon surfaces.
 * Keeps house style dominant; manila is a motif, not a public theme fill.
 */
export const DossierTab: React.FC<DossierTabProps> = ({
  label = "Mimi // Filed",
  className = "",
  classify,
}) => {
  return (
    <div
      data-accent="dossier-tab"
      className={`flex items-end gap-2 ${className}`.trim()}
    >
      <div
        className="relative -mb-px px-3 pt-1.5 pb-2 rounded-t-[2px] border border-b-0"
        style={{
          background: "var(--mimi-manila-tab, #E8DCB5)",
          borderColor: "var(--mimi-manila-edge, #C9BA86)",
        }}
      >
        <span
          className="font-mono text-[8px] uppercase tracking-[0.28em] font-semibold"
          style={{ color: "var(--mimi-manila-ink, #5C5334)" }}
        >
          {label}
        </span>
      </div>
      {classify && (
        <span className="mb-0.5 font-mono text-[7px] uppercase tracking-[0.22em] font-semibold px-1.5 py-0.5 border border-[var(--mimi-cobalt,#9BB8CE)] text-[var(--mimi-cobalt-deep,#6A8AA4)]">
          {classify}
        </span>
      )}
    </div>
  );
};
