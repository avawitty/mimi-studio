import type { ReactNode } from "react";
import "./cardStates.css";

export type ArtifactDossierProps = {
  title: string;
  type: string;
  status: string;
  preview?: ReactNode;
  provenance?: string;
  onOpen: () => void;
  className?: string;
};

export function ArtifactDossier({
  title,
  type,
  status,
  preview,
  provenance,
  onOpen,
  className = "",
}: ArtifactDossierProps) {
  return (
    <article
      className={`artifact-dossier ${className}`.trim()}
      data-status={status}
    >
      <button
        type="button"
        className="artifact-dossier__open"
        onClick={onOpen}
        aria-label={`Open ${title}`}
      >
        <div className="artifact-dossier__preview">{preview}</div>
        <div className="artifact-dossier__copy">
          <span className="artifact-dossier__type">{type}</span>
          <h3>{title}</h3>
          <span className="artifact-dossier__status">{status}</span>
          {provenance ? (
            <span className="artifact-dossier__provenance">{provenance}</span>
          ) : null}
        </div>
      </button>
    </article>
  );
}
