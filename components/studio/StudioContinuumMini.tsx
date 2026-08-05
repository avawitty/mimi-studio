import React from "react";
import { BookOpen, Check, Loader2 } from "lucide-react";
import type { ZineMetadata } from "../../types";

type StudioContinuumMiniProps = {
  recentZines: ZineMetadata[];
  linkedZineIds: string[];
  loading: boolean;
  onToggleLink: (zineId: string) => void;
};

export const StudioContinuumMini: React.FC<StudioContinuumMiniProps> = ({
  recentZines,
  linkedZineIds,
  loading,
  onToggleLink,
}) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 studio-text-muted">
        <Loader2 size={14} className="animate-spin" />
        <span className="font-mono text-[8px] uppercase tracking-widest">Loading recent zines</span>
      </div>
    );
  }

  if (recentZines.length === 0) {
    return (
      <div className="border border-dashed studio-border p-5 text-center">
        <BookOpen size={18} className="mx-auto mb-2 studio-text-muted" />
        <p className="font-serif italic text-sm studio-text-ink">No earlier zines yet.</p>
        <p className="font-sans text-[9px] studio-text-muted mt-1">
          Publish a piece, then link it here to continue the thread.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="font-sans text-[10px] leading-relaxed studio-text-muted">
        Link prior zines as chapters — Mimi carries tone and lineage without repeating them.
      </p>
      <div className="space-y-2 max-h-[42vh] overflow-y-auto no-scrollbar pr-1">
        {recentZines.map((zine) => {
          const isLinked = linkedZineIds.includes(zine.id);
          return (
            <button
              key={zine.id}
              type="button"
              aria-pressed={isLinked}
              onClick={() => onToggleLink(zine.id)}
              className={`w-full flex items-center gap-3 border p-2.5 text-left transition-colors ${
                isLinked
                  ? "border-[var(--mimi-cobalt)] bg-[var(--mimi-cobalt)]/10"
                  : "studio-border"
              }`}
            >
              <div className="w-10 h-12 shrink-0 border studio-border overflow-hidden bg-[var(--mimi-field)]">
                {zine.coverImageUrl ? (
                  <img src={zine.coverImageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <BookOpen size={14} className="m-auto mt-4 studio-text-muted" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-serif italic text-sm studio-text-ink truncate">
                  {zine.title || "Untitled zine"}
                </p>
                <p className="font-mono text-[7px] uppercase tracking-widest studio-text-muted mt-0.5">
                  {new Date(zine.timestamp || zine.createdAt).toLocaleDateString()}
                </p>
              </div>
              <span
                className={`w-6 h-6 shrink-0 border flex items-center justify-center ${
                  isLinked ? "bg-[var(--mimi-ink)] text-[var(--mimi-field)]" : "studio-border studio-text-muted"
                }`}
              >
                {isLinked ? <Check size={12} /> : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
