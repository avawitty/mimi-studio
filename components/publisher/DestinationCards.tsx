import React from "react";
import { ExternalLink, Eye } from "lucide-react";
import type { ReleaseDestination } from "../../lib/publisher/types";
import { ReadinessBadge } from "./ReadinessUI";

export const DestinationCards: React.FC<{
  destinations: ReleaseDestination[];
  artifactId: string;
  onPreviewWeb?: () => void;
  onExport?: (destinationId: string) => void;
}> = ({ destinations, artifactId, onPreviewWeb, onExport }) => {
  return (
    <section className="space-y-4" aria-labelledby="destinations-heading">
      <div>
        <h3 id="destinations-heading" className="font-serif text-lg font-bold text-white">
          Destinations
        </h3>
        <p className="font-mono text-[8px] uppercase tracking-wider text-stone-500 mt-1">
          What will leave Mimi when you approve each channel
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {destinations.map((dest) => (
          <article
            key={dest.id}
            className="border border-stone-850 bg-[#121112] p-4 space-y-3"
            aria-label={`${dest.label} destination`}
          >
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-sans text-sm font-semibold text-stone-100">{dest.label}</h4>
              <ReadinessBadge status={dest.status} compact />
            </div>
            <p className="font-sans text-[11px] text-stone-500 leading-relaxed">{dest.description}</p>
            {dest.detailLines && dest.detailLines.length > 0 && (
              <ul className="font-mono text-[8px] text-stone-600 space-y-0.5 list-none">
                {dest.detailLines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              {dest.id === "web-issue" && dest.previewAvailable && onPreviewWeb && (
                <button
                  type="button"
                  onClick={onPreviewWeb}
                  className="min-h-9 px-3 py-1.5 border border-stone-700 font-mono text-[8px] uppercase tracking-widest text-stone-300 hover:border-stone-500 flex items-center gap-1"
                >
                  <Eye size={10} /> Preview
                </button>
              )}
              {dest.id === "web-issue" && (
                <button
                  type="button"
                  onClick={() => {
                    const url = `https://mimi.fish/s/${artifactId}`;
                    void navigator.clipboard?.writeText(url);
                  }}
                  className="min-h-9 px-3 py-1.5 border border-stone-700 font-mono text-[8px] uppercase tracking-widest text-stone-300 hover:border-stone-500"
                >
                  Copy link
                </button>
              )}
              {dest.id === "shopify-draft" && dest.status !== "not-configured" && (
                <a
                  href="https://admin.shopify.com/store/products"
                  target="_blank"
                  rel="noreferrer"
                  className="min-h-9 px-3 py-1.5 border border-stone-700 font-mono text-[8px] uppercase tracking-widest text-stone-300 hover:border-stone-500 flex items-center gap-1"
                >
                  Shopify Admin <ExternalLink size={10} />
                </a>
              )}
              {dest.publishAvailable && onExport && dest.id !== "web-issue" && (
                <button
                  type="button"
                  onClick={() => onExport(dest.id)}
                  className="min-h-9 px-3 py-1.5 border border-emerald-500/30 font-mono text-[8px] uppercase tracking-widest text-emerald-400 hover:bg-emerald-500/10"
                >
                  Export
                </button>
              )}
              {dest.id === "web-issue" && dest.publishAvailable && (
                <button
                  type="button"
                  onClick={() => onExport?.("web-issue")}
                  className="min-h-9 px-3 py-1.5 border border-emerald-500/30 font-mono text-[8px] uppercase tracking-widest text-emerald-400 hover:bg-emerald-500/10"
                  title="Open artifact export — publish requires explicit approval in Export"
                >
                  Publish via Export
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};
