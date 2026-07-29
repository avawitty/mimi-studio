import React, { useRef, useState, useEffect } from 'react';
import { Mic, Square, Play, Pause, RotateCcw, Send, Loader2 } from 'lucide-react';
import { useRecorder } from '../hooks/useRecorder';

interface VoiceCommentSectionProps {
  onSubmit: (blob: Blob, duration: number) => Promise<void>;
  isSubmitting?: boolean;
  disabled?: boolean;
}

export const VoiceCommentSection: React.FC<VoiceCommentSectionProps> = ({
  onSubmit,
  isSubmitting = false,
  disabled = false,
}) => {
  const { isRecording, audioBlob, duration, permissionError, startRecording, stopRecording, resetRecording } = useRecorder();
  const [isPlaying, setIsPlaying] = useState(false);
  const [playProgress, setPlayProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  // Build object URL when blob arrives
  useEffect(() => {
    if (audioBlob) {
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = URL.createObjectURL(audioBlob);
      setIsPlaying(false);
      setPlayProgress(0);
    }
    return () => {
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    };
  }, [audioBlob]);

  const togglePlay = () => {
    if (!audioUrlRef.current) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrlRef.current);
      audioRef.current.ontimeupdate = () => {
        if (audioRef.current && audioRef.current.duration) {
          setPlayProgress(audioRef.current.currentTime / audioRef.current.duration);
        }
      };
      audioRef.current.onended = () => {
        setIsPlaying(false);
        setPlayProgress(0);
      };
    }
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleReset = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(false);
    setPlayProgress(0);
    resetRecording();
  };

  const handleSubmit = async () => {
    if (!audioBlob) return;
    await onSubmit(audioBlob, duration);
    handleReset();
  };

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
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
            onClick={togglePlay}
            className="p-2 border border-nous-border text-nous-subtle hover:text-nous-text transition-colors"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
          </button>

          {/* Progress bar */}
          <div className="flex-1 h-px bg-nous-border relative">
            <div
              className="absolute inset-y-0 left-0 bg-nous-text transition-all"
              style={{ width: `${playProgress * 100}%` }}
            />
          </div>

          <span className="font-mono text-[9px] text-nous-subtle tabular-nums">{formatDuration(duration)}</span>

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
