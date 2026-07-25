import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Mic, Pause, Play, Square, Trash2 } from 'lucide-react';
import { useRecorder } from '../hooks/useRecorder';
import { transcribeAudio } from '../services/geminiService';
import type { PlateVoiceMemo as PlateVoiceMemoData } from '../types';

interface PlateVoiceMemoProps {
  memo?: PlateVoiceMemoData;
  plateIndex: number;
  canEdit: boolean;
  userId?: string;
  zineId: string;
  onChange: (memo: PlateVoiceMemoData | undefined) => void;
}

const formatDuration = (seconds?: number): string => {
  if (!seconds || !Number.isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const PlateVoiceMemo: React.FC<PlateVoiceMemoProps> = ({
  memo,
  plateIndex,
  canEdit,
  userId,
  zineId,
  onChange,
}) => {
  const { isRecording, audioBlob, duration, startRecording, stopRecording, resetRecording } =
    useRecorder();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [liveSeconds, setLiveSeconds] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const skipNextBlobRef = useRef(false);
  const onChangeRef = useRef(onChange);
  const liveSecondsRef = useRef(0);
  onChangeRef.current = onChange;
  liveSecondsRef.current = liveSeconds;

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!isRecording) {
      setLiveSeconds(0);
      return;
    }
    const started = Date.now();
    const tick = window.setInterval(() => {
      setLiveSeconds((Date.now() - started) / 1000);
    }, 250);
    return () => window.clearInterval(tick);
  }, [isRecording]);

  useEffect(() => {
    if (!audioBlob) return;
    if (skipNextBlobRef.current) {
      skipNextBlobRef.current = false;
      resetRecording();
      return;
    }

    let cancelled = false;
    const capturedLiveSeconds = liveSecondsRef.current;

    const processMemo = async () => {
      setIsProcessing(true);
      try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(audioBlob);
        });

        const base64 = dataUrl.split(',')[1] || dataUrl;
        let transcript = '';
        try {
          transcript = (
            await transcribeAudio(base64, audioBlob.type || 'audio/webm')
          ).trim();
        } catch (err) {
          console.warn('Plate voice memo transcription failed', err);
        }

        let audioUrl = dataUrl;
        if (userId) {
          try {
            const { archiveManager } = await import('../services/archiveManager');
            audioUrl = await archiveManager.uploadMedia(
              userId,
              dataUrl,
              `zines/${zineId}/plates/${plateIndex}/voice`,
            );
          } catch (err) {
            console.warn('Plate voice memo upload failed; keeping local data URI', err);
          }
        }

        if (cancelled) return;

        onChangeRef.current({
          audioUrl,
          transcript: transcript || undefined,
          durationSec: duration || capturedLiveSeconds || undefined,
          recordedAt: Date.now(),
        });

        window.dispatchEvent(
          new CustomEvent('mimi:registry_alert', {
            detail: {
              message: transcript
                ? `Plate ${plateIndex + 1} voice memo saved.`
                : `Plate ${plateIndex + 1} voice memo saved (no transcript).`,
              type: 'success',
            },
          }),
        );
      } catch (err) {
        console.error('Plate voice memo failed', err);
        window.dispatchEvent(
          new CustomEvent('mimi:registry_alert', {
            detail: {
              message: 'Voice memo could not be saved.',
              type: 'error',
            },
          }),
        );
      } finally {
        if (!cancelled) {
          setIsProcessing(false);
          resetRecording();
        }
      }
    };

    void processMemo();
    return () => {
      cancelled = true;
    };
  }, [audioBlob, duration, plateIndex, resetRecording, userId, zineId]);

  const togglePlayback = async () => {
    if (!memo?.audioUrl) return;

    if (!audioRef.current || audioRef.current.src !== memo.audioUrl) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(memo.audioUrl);
      audioRef.current.onended = () => setIsPlaying(false);
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    try {
      await audioRef.current.play();
      setIsPlaying(true);
    } catch (err) {
      console.warn('Plate voice memo playback blocked', err);
      setIsPlaying(false);
    }
  };

  const handleDelete = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(false);
    if (isRecording) {
      skipNextBlobRef.current = true;
      stopRecording();
    }
    onChange(undefined);
  };

  const handleMicClick = async () => {
    if (!canEdit || isProcessing) return;
    if (isRecording) {
      stopRecording();
      return;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
    await startRecording();
  };

  if (!canEdit && !memo) return null;

  return (
    <div className="pt-6 print:hidden space-y-3 border-t border-nous-border/60">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Mic size={11} className="text-nous-subtle shrink-0" />
          <span className="font-mono text-[8px] uppercase tracking-[0.22em] text-nous-subtle truncate">
            {isProcessing
              ? 'Processing memo…'
              : isRecording
                ? `Recording · ${formatDuration(liveSeconds)}`
                : memo
                  ? `Voice memo · ${formatDuration(memo.durationSec)}`
                  : 'Voice memo'}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {memo?.audioUrl && !isRecording && !isProcessing && (
            <button
              type="button"
              onClick={togglePlayback}
              className="p-2 text-nous-subtle hover:text-nous-text transition-colors"
              title={isPlaying ? 'Pause voice memo' : 'Play voice memo'}
            >
              {isPlaying ? <Pause size={13} /> : <Play size={13} />}
            </button>
          )}

          {canEdit && (
            <button
              type="button"
              onClick={handleMicClick}
              disabled={isProcessing}
              className={`p-2 transition-all ${
                isRecording
                  ? 'text-red-500 animate-pulse'
                  : 'text-nous-subtle hover:text-nous-text opacity-60 hover:opacity-100'
              } disabled:opacity-40`}
              title={isRecording ? 'Stop recording' : 'Record voice memo for this plate'}
            >
              {isProcessing ? (
                <Loader2 size={13} className="animate-spin" />
              ) : isRecording ? (
                <Square size={13} fill="currentColor" />
              ) : (
                <Mic size={13} />
              )}
            </button>
          )}

          {canEdit && memo && !isRecording && !isProcessing && (
            <button
              type="button"
              onClick={handleDelete}
              className="p-2 text-nous-subtle hover:text-red-500 transition-colors opacity-50 hover:opacity-100"
              title="Delete voice memo"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {memo?.transcript && (
        <p className="font-serif text-sm italic leading-relaxed text-nous-subtle pl-5 border-l border-nous-border">
          {memo.transcript}
        </p>
      )}

      {!memo && canEdit && !isRecording && !isProcessing && (
        <p className="font-mono text-[7px] uppercase tracking-[0.18em] text-nous-subtle/70">
          Tap mic to annotate this plate
        </p>
      )}
    </div>
  );
};
