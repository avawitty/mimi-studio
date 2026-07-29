import React, { useRef, useState, useEffect } from 'react';
import { Mic, Square, Play, Pause, RotateCcw, Send, Loader2 } from 'lucide-react';
import { useRecorder } from '../hooks/useRecorder';
import { useAudioPlayer } from '../hooks/useAudioPlayer';

interface VoiceCommentSectionProps {
  onSubmit: (blob: Blob, duration: number) => Promise<void>;
  isSubmitting?: boolean;
  disabled?: boolean;
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;

export const VoiceCommentSection: React.FC<VoiceCommentSectionProps> = ({
  onSubmit,
  isSubmitting = false,
  disabled = false,
}) => {
  const { isRecording, audioBlob, duration, permissionError, startRecording, stopRecording, resetRecording } = useRecorder();
  const audioUrlRef = useRef<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const { isPlaying, progress, toggle, reset: resetPlayer } = useAudioPlayer(audioUrl);

  // Build object URL when blob arrives and revoke the previous one
  useEffect(() => {
    if (audioBlob) {
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      const url = URL.createObjectURL(audioBlob);
      audioUrlRef.current = url;
      setAudioUrl(url);
    }
    return () => {
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    };
  }, [audioBlob]);

  const handleReset = () => {
    resetPlayer();
    setAudioUrl(null);
    resetRecording();
  };

  const handleSubmit = async () => {
    if (!audioBlob) return;
    await onSubmit(audioBlob, duration);
    handleReset();
  };

  return (
    <div className="flex flex-col gap-3">
      {permissionError && (
        <p className="font-mono text-[9px] uppercase tracking-widest text-red-500">{permissionError}</p>
      )}

      {!audioBlob ? (
        /* Recording controls */
        <div className="flex items-center gap-4">
          {isRecording ? (
            <>
              <div className="flex items-center gap-2 flex-1">
                <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="font-mono text-[9px] uppercase tracking-widest text-nous-subtle">Recording…</span>
              </div>
              <button
                onClick={stopRecording}
                className="p-2 border border-nous-border text-nous-subtle hover:text-nous-text hover:border-nous-text transition-colors"
                title="Stop recording"
              >
                <Square size={14} />
              </button>
            </>
          ) : (
            <button
              onClick={startRecording}
              disabled={disabled}
              className="flex items-center gap-2 p-2 border border-nous-border text-nous-subtle hover:text-nous-text hover:border-nous-text transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Mic size={14} />
              <span className="font-mono text-[9px] uppercase tracking-widest">Record memo</span>
            </button>
          )}
        </div>
      ) : (
        /* Playback + submit controls */
        <div className="flex items-center gap-3">
          <button
            onClick={toggle}
            className="p-2 border border-nous-border text-nous-subtle hover:text-nous-text transition-colors"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
          </button>

          {/* Progress bar */}
          <div className="flex-1 h-px bg-nous-border relative">
            <div
              className="absolute inset-y-0 left-0 bg-nous-text transition-all"
              style={{ width: `${progress * 100}%` }}
            />
          </div>

          {/* duration in seconds */}
          <span className="font-mono text-[9px] text-nous-subtle tabular-nums">{fmt(duration)}</span>

          <button
            onClick={handleReset}
            className="p-2 text-nous-subtle hover:text-nous-text transition-colors"
            title="Discard and re-record"
          >
            <RotateCcw size={12} />
          </button>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="p-2 border border-nous-border text-nous-subtle hover:text-nous-text hover:border-nous-text transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Send voice memo"
          >
            {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </div>
      )}
    </div>
  );
};
