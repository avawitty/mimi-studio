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

  const ensureAudio = useCallback(() => {
    if (!url) return null;
    if (!audioRef.current) {
      const audio = new Audio(url);
      audio.ontimeupdate = () => {
        if (audio.duration) setProgress(audio.currentTime / audio.duration);
      };
      audio.onended = () => { setIsPlaying(false); setProgress(0); };
      audioRef.current = audio;
    }
    return audioRef.current;
  }, [url]);

  const toggle = useCallback(() => {
    const audio = ensureAudio();
    if (!audio) return;
    if (isPlaying) { audio.pause(); setIsPlaying(false); }
    else { audio.play(); setIsPlaying(true); }
  }, [ensureAudio, isPlaying]);

  const reset = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setIsPlaying(false);
    setProgress(0);
  }, []);

  // Tear down when url changes or component unmounts
  useEffect(() => {
    return () => { audioRef.current?.pause(); audioRef.current = null; };
  }, [url]);

  return { isPlaying, progress, toggle, reset };
};
