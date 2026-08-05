import React from "react";
import { X } from "lucide-react";
import type { MediaFile } from "../../types";
import { VoiceSpectrogramArtifact } from "./VoiceSpectrogramArtifact";

type StudioMediaPolaroidBarProps = {
  mediaFiles: MediaFile[];
  onRemove: (index: number) => void;
  onSelect?: (index: number) => void;
  className?: string;
};

export const StudioMediaPolaroidBar: React.FC<StudioMediaPolaroidBarProps> = ({
  mediaFiles,
  onRemove,
  onSelect,
  className = "",
}) => {
  if (mediaFiles.length === 0) return null;

  return (
    <div
      role="list"
      aria-label="Attached media"
      className={`flex gap-2 overflow-x-auto no-scrollbar py-1 ${className}`.trim()}
    >
      {mediaFiles.map((media, index) => {
        if (media.type === "audio") {
          return (
            <div key={`polaroid-audio-${index}`} role="listitem" className="relative">
              <VoiceSpectrogramArtifact
                audioUrl={media.url}
                transcription={media.transcription}
                name={media.name}
              />
              <button
                type="button"
                aria-label={`Remove ${media.name || "voice memo"}`}
                onClick={() => onRemove(index)}
                className="absolute -top-1 -right-1 w-5 h-5 bg-[var(--mimi-ink)] text-[var(--mimi-field)] flex items-center justify-center"
              >
                <X size={10} />
              </button>
            </div>
          );
        }

        const thumbSrc = media.type === "image" ? media.url || media.data : undefined;
        return (
          <div key={`polaroid-${index}`} role="listitem" className="relative shrink-0">
            <button
              type="button"
              onClick={() => onSelect?.(index)}
              className="studio-polaroid p-2 w-[72px] flex flex-col gap-1 text-left"
            >
              <div className="studio-polaroid-slot aspect-[3/4] w-full overflow-hidden bg-[var(--mimi-field)]">
                {thumbSrc ? (
                  <img
                    src={thumbSrc}
                    alt={media.name || "Attached reference"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="font-mono text-[6px] uppercase tracking-widest studio-text-muted p-1">
                    {media.type}
                  </span>
                )}
              </div>
              <span className="font-mono text-[6px] uppercase tracking-[0.16em] studio-text-muted truncate px-0.5">
                {media.name || media.type}
              </span>
            </button>
            <button
              type="button"
              aria-label={`Remove ${media.name || "attachment"}`}
              onClick={() => onRemove(index)}
              className="absolute -top-1 -right-1 w-5 h-5 bg-[var(--mimi-ink)] text-[var(--mimi-field)] flex items-center justify-center"
            >
              <X size={10} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
