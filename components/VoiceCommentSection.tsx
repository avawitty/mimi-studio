import React, { useRef, useState, useEffect } from 'react';
import { Mic, Square, Play, Pause, RotateCcw, Send, Loader2 } from 'lucide-react';
import { useRecorder } from '../hooks/useRecorder';
import { useAudioPlayer } from '../hooks/useAudioPlayer';

interface VoiceCommentSectionProps {
  /** `duration` is provided in seconds. */
  onSubmit: (blob: Blob, duration: number) => Promise<void>;
  isSubmitting?: boolean;
  disabled?: boolean;
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
type SubmissionState = 'idle' | 'ready' | 'uploading' | 'error' | 'submitted';

export const VoiceCommentSection: React.FC<VoiceCommentSectionProps> = ({
  onSubmit,
  isSubmitting = false,
  disabled = false,
}) => {
  const { isRecording, audioBlob, duration, permissionError, startRecording, stopRecording, resetRecording } = useRecorder();
  const audioUrlRef = useRef<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [submissionState, setSubmissionState] = useState<SubmissionState>('idle');
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const { isPlaying, progress, toggle, reset: resetPlayer } = useAudioPlayer(audioUrl);
  const isUploadInFlight = isSubmitting || submissionState === 'uploading';

  // Build object URL when blob arrives and revoke the previous one
  useEffect(() => {
    if (audioBlob) {
      setSubmissionState('ready');
      setSubmissionError(null);
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
      const url = URL.createObjectURL(audioBlob);
      audioUrlRef.current = url;
      setAudioUrl(url);
    } else {
      setSubmissionState('idle');
      setSubmissionError(null);
      setAudioUrl(null);
    }
    return () => {
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
    };
  }, [audioBlob]);

  const handleReset = () => {
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    resetPlayer();
    setAudioUrl(null);
    setSubmissionState('idle');
    setSubmissionError(null);
    resetRecording();
  };

  const handleSubmit = async () => {
    if (!audioBlob || isUploadInFlight || submissionState === 'submitted') return;
    setSubmissionError(null);
    setSubmissionState('uploading');
    try {
      await onSubmit(audioBlob, duration);
      setSubmissionState('submitted');
    } catch (error) {
      console.warn('MIMI // Voice memo submission failed:', error);
      setSubmissionError('Upload failed. Retry without re-recording.');
      setSubmissionState('error');
    }
  };

  const statusLabel = submissionState === 'uploading'
    ? 'Uploading'
    : submissionState === 'error'
      ? 'Upload failed'
      : submissionState === 'submitted'
        ? 'Submitted'
        : audioBlob
          ? 'Ready'
          : 'Idle';

  return (
    <div className="flex flex-col gap-3">
      {permissionError && (
        <p className="font-mono text-[9px] uppercase tracking-widest text-red-500">{permissionError}</p>
      )}
      <p
        data-testid="voice-memo-status"
        className={`font-mono text-[9px] uppercase tracking-widest ${
          submissionState === 'uploading'
            ? 'text-amber-500'
            : submissionState === 'error'
              ? 'text-red-500'
              : submissionState === 'submitted'
                ? 'text-emerald-500'
                : 'text-nous-subtle'
        }`}
      >
        {statusLabel}
      </p>
      {submissionError && (
        <p className="font-mono text-[9px] uppercase tracking-widest text-red-500">{submissionError}</p>
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
                data-testid="voice-memo-stop"
                className="p-2 border border-nous-border text-nous-subtle hover:text-nous-text hover:border-nous-text transition-colors"
                title="Stop recording"
              >
                <Square size={14} />
              </button>
            </>
          ) : (
            <button
              onClick={startRecording}
              data-testid="voice-memo-record"
              disabled={disabled || isUploadInFlight}
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
            data-testid="voice-memo-play-toggle"
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
          <span data-testid="voice-memo-duration" className="font-mono text-[9px] text-nous-subtle tabular-nums">{fmt(duration)}</span>

          <button
            onClick={handleReset}
            data-testid="voice-memo-reset"
            className="p-2 text-nous-subtle hover:text-nous-text transition-colors"
            title="Discard and re-record"
          >
            <RotateCcw size={12} />
          </button>

          <button
            onClick={handleSubmit}
            data-testid="voice-memo-submit"
            disabled={isUploadInFlight || submissionState === 'submitted'}
            className="p-2 border border-nous-border text-nous-subtle hover:text-nous-text hover:border-nous-text transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title={submissionState === 'error' ? 'Retry voice memo upload' : 'Send voice memo'}
          >
            {isUploadInFlight ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </div>
      )}
    </div>
  );
};
