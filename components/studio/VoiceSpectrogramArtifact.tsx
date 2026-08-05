import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { renderVoiceSpectrogramDataUrl } from "../../lib/voiceSpectrogram";

type VoiceSpectrogramArtifactProps = {
  audioUrl: string;
  blob?: Blob | null;
  transcription?: string;
  name?: string;
  className?: string;
  onTranscribeRequest?: () => void;
  isTranscribing?: boolean;
};

export const VoiceSpectrogramArtifact: React.FC<VoiceSpectrogramArtifactProps> = ({
  audioUrl,
  blob,
  transcription,
  name,
  className = "",
  onTranscribeRequest,
  isTranscribing = false,
}) => {
  const [spectrogramUrl, setSpectrogramUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const source = blob ?? null;

    const run = async () => {
      try {
        let workingBlob = source;
        if (!workingBlob && audioUrl) {
          const response = await fetch(audioUrl);
          workingBlob = await response.blob();
        }
        if (!workingBlob) return;
        const dataUrl = await renderVoiceSpectrogramDataUrl(workingBlob);
        if (!cancelled) setSpectrogramUrl(dataUrl);
      } catch {
        if (!cancelled) setError(true);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [audioUrl, blob]);

  return (
    <div
      className={`studio-polaroid p-2 w-[88px] shrink-0 flex flex-col gap-1.5 ${className}`.trim()}
      title={name || "Voice memo"}
    >
      <div className="studio-polaroid-slot aspect-[4/3] w-full overflow-hidden bg-[var(--mimi-field)] flex items-center justify-center">
        {spectrogramUrl ? (
          <img
            src={spectrogramUrl}
            alt={name ? `Spectrogram for ${name}` : "Voice memo spectrogram"}
            className="w-full h-full object-cover"
          />
        ) : error ? (
          <span className="font-mono text-[6px] uppercase tracking-widest studio-text-muted px-1 text-center">
            Audio
          </span>
        ) : (
          <Loader2 size={12} className="animate-spin studio-text-muted" />
        )}
      </div>
      <div className="px-0.5">
        <p className="font-mono text-[6px] uppercase tracking-[0.18em] studio-text-muted truncate">
          {name || "Voice memo"}
        </p>
        {transcription ? (
          <p className="font-serif italic text-[8px] studio-text-ink line-clamp-2 leading-tight mt-0.5">
            {transcription}
          </p>
        ) : onTranscribeRequest ? (
          <button
            type="button"
            onClick={onTranscribeRequest}
            disabled={isTranscribing}
            className="mt-1 font-mono text-[6px] uppercase tracking-widest studio-text-muted hover:studio-text-ink disabled:opacity-50"
          >
            {isTranscribing ? "Transcribing…" : "Transcribe"}
          </button>
        ) : null}
      </div>
    </div>
  );
};
