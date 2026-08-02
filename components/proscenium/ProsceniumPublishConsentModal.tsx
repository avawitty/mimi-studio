import React, { useState } from "react";
import {
  MMM_PUBLISH_DISCLOSURE_BODY,
  MMM_PUBLISH_DISCLOSURE_SECONDARY,
  MMM_PUBLISH_DISCLOSURE_TITLE,
} from "../../services/collective/consent";

export interface ProsceniumPublishConsentModalProps {
  open: boolean;
  artifactTitle?: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: (contributeToMeanMedianMode: boolean) => void;
}

export const ProsceniumPublishConsentModal: React.FC<ProsceniumPublishConsentModalProps> = ({
  open,
  artifactTitle,
  busy = false,
  onCancel,
  onConfirm,
}) => {
  const [contribute, setContribute] = useState(true);
  const [acknowledged, setAcknowledged] = useState(false);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="proscenium-publish-consent-title"
      onClick={(e) => {
        e.stopPropagation();
        if (!busy) onCancel();
      }}
    >
      <div
        className="w-full max-w-md border border-nous-border bg-nous-base shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-nous-border space-y-1">
          <p className="font-mono text-[8px] uppercase tracking-[0.28em] text-nous-subtle">
            The Proscenium
          </p>
          <h2
            id="proscenium-publish-consent-title"
            className="font-serif italic text-xl text-nous-text"
          >
            {MMM_PUBLISH_DISCLOSURE_TITLE}
          </h2>
          {artifactTitle ? (
            <p className="font-sans text-[11px] text-nous-subtle truncate">{artifactTitle}</p>
          ) : null}
        </div>

        <div className="px-5 py-4 space-y-4">
          <p className="font-sans text-[12px] text-nous-text leading-relaxed">
            {MMM_PUBLISH_DISCLOSURE_BODY}
          </p>
          <p className="font-sans text-[11px] text-nous-subtle leading-relaxed">
            {MMM_PUBLISH_DISCLOSURE_SECONDARY}
          </p>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1"
              checked={acknowledged}
              disabled={busy}
              onChange={(e) => setAcknowledged(e.target.checked)}
            />
            <span className="font-sans text-[12px] text-nous-text leading-relaxed">
              I understand this stages my work publicly and may contribute anonymized structure to{" "}
              <span className="font-serif italic">Mean Median Mode</span>.
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer pl-0 sm:pl-6">
            <input
              type="checkbox"
              className="mt-1"
              checked={contribute}
              disabled={busy || !acknowledged}
              onChange={(e) => setContribute(e.target.checked)}
            />
            <span className="font-sans text-[11px] text-nous-subtle leading-relaxed">
              Contribute anonymized themes, motifs, inquiry types, and form to Mean Median Mode
              (advanced: uncheck to stage without contributing).
            </span>
          </label>
        </div>

        <div className="px-5 py-4 border-t border-nous-border flex flex-wrap justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="px-4 py-2 border border-nous-border font-mono text-[9px] uppercase tracking-widest text-nous-subtle hover:text-nous-text"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || !acknowledged}
            onClick={() => onConfirm(contribute)}
            className="px-4 py-2 bg-nous-text text-nous-base font-mono text-[9px] uppercase tracking-widest disabled:opacity-40"
          >
            {busy ? "Staging…" : "Stage on The Proscenium"}
          </button>
        </div>
      </div>
    </div>
  );
};
