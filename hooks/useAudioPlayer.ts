import { useState, useRef, useCallback, useEffect } from 'react';

interface UseAudioPlayerReturn {
  isPlaying: boolean;
  progress: number; // 0–1
  toggle: () => void;
  reset: () => void;
}

/** Plays a remote or object-URL audio source with progress tracking. */
export const useAudioPlayer = (url: string | null): UseAudioPlayerReturn => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sourceUrlRef = useRef<string | null>(null);
  const playRequestRef = useRef(0);
  const isPlayingRef = useRef(false);

  const setPlaying = useCallback((next: boolean) => {
    isPlayingRef.current = next;
    setIsPlaying(next);
  }, []);

  const teardownAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.ontimeupdate = null;
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current = null;
    }
    sourceUrlRef.current = null;
    playRequestRef.current += 1;
    setPlaying(false);
    setProgress(0);
  }, [setPlaying]);

  const ensureAudio = useCallback(() => {
    if (!url) return null;

    if (audioRef.current && sourceUrlRef.current !== url) {
      teardownAudio();
    }

    if (!audioRef.current) {
      const audio = new Audio(url);
      audio.ontimeupdate = () => {
        if (audio.duration) setProgress(audio.currentTime / audio.duration);
      };
      audio.onended = () => { setPlaying(false); setProgress(0); };
      audio.onerror = () => {
        setPlaying(false);
        window.dispatchEvent(new CustomEvent('mimi:registry_alert', {
          detail: { message: "Audio failed to load. Try re-recording or replacing the memo.", type: 'error' }
        }));
      };
      audioRef.current = audio;
      sourceUrlRef.current = url;
    }

    return audioRef.current;
  }, [setPlaying, teardownAudio, url]);

  const toggle = useCallback(() => {
    const audio = ensureAudio();
    if (!audio) return;
    if (isPlayingRef.current) {
      playRequestRef.current += 1;
      audio.pause();
      setPlaying(false);
    } else {
      const requestId = playRequestRef.current + 1;
      playRequestRef.current = requestId;
      const playResult = audio.play();
      if (playResult && typeof playResult.then === 'function') {
        playResult
          .then(() => {
            if (playRequestRef.current === requestId) {
              setPlaying(true);
            }
          })
          .catch((err) => {
            console.warn("MIMI // Audio playback failed:", err);
            if (playRequestRef.current === requestId) {
              setPlaying(false);
            }
            window.dispatchEvent(new CustomEvent('mimi:registry_alert', {
              detail: { message: "Audio playback blocked. Interact with the page first.", type: 'error' }
            }));
          });
      } else {
        setPlaying(true);
      }
    }
  }, [ensureAudio, setPlaying]);

  const reset = useCallback(() => {
    teardownAudio();
  }, [teardownAudio]);

  // When url changes, tear down the old audio element so ensureAudio builds
  // a fresh one with the new URL rather than reusing a stale element.
  useEffect(() => {
    return () => {
      teardownAudio();
    };
  }, [teardownAudio, url]);

  return { isPlaying, progress, toggle, reset };
};
