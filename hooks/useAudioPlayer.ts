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

  const teardownAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.ontimeupdate = null;
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current = null;
    }
    sourceUrlRef.current = null;
    setIsPlaying(false);
    setProgress(0);
  }, []);

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
      audio.onended = () => { setIsPlaying(false); setProgress(0); };
      audio.onerror = () => {
        setIsPlaying(false);
        window.dispatchEvent(new CustomEvent('mimi:registry_alert', {
          detail: { message: "Audio failed to load. Try re-recording or replacing the memo.", type: 'error' }
        }));
      };
      audioRef.current = audio;
      sourceUrlRef.current = url;
    }

    return audioRef.current;
  }, [teardownAudio, url]);

  const toggle = useCallback(() => {
    const audio = ensureAudio();
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      const playResult = audio.play();
      if (playResult && typeof playResult.then === 'function') {
        playResult
          .then(() => setIsPlaying(true))
          .catch((err) => {
            console.warn("MIMI // Audio playback failed:", err);
            setIsPlaying(false);
            window.dispatchEvent(new CustomEvent('mimi:registry_alert', {
              detail: { message: "Audio playback blocked. Interact with the page first.", type: 'error' }
            }));
          });
      } else {
        setIsPlaying(true);
      }
    }
  }, [ensureAudio, isPlaying]);

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
