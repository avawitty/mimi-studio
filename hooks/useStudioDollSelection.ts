import { useCallback, useEffect, useState } from "react";
import type { Doll } from "../types";
import { listDolls } from "../services/tailorService";
import { buildMimiShellCompanionContext } from "../services/dollEngine";

const STORAGE_KEY = "mimi_studio_active_doll_id";
export const STUDIO_DOLL_CHANGED = "mimi:studio-doll-changed";

function readStoredDollId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredDollId(dollId: string | null): void {
  if (dollId) {
    localStorage.setItem(STORAGE_KEY, dollId);
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
  window.dispatchEvent(new CustomEvent(STUDIO_DOLL_CHANGED));
}

export function buildDollPromptContext(doll: Doll): string {
  return buildMimiShellCompanionContext(doll);
}

export function useStudioDollSelection(userId?: string | null) {
  const [dolls, setDolls] = useState<Doll[]>([]);
  const [activeDollId, setActiveDollIdState] = useState<string | null>(() =>
    readStoredDollId(),
  );
  const [enabled, setEnabled] = useState(() => !!readStoredDollId());
  const [loading, setLoading] = useState(false);

  const activeDoll = dolls.find((d) => d.id === activeDollId) ?? null;

  const refreshDolls = useCallback(async () => {
    if (!userId || userId === "ghost") {
      setDolls([]);
      return;
    }
    setLoading(true);
    try {
      const list = await listDolls(userId);
      setDolls(list);
      if (activeDollId && !list.some((d) => d.id === activeDollId)) {
        setActiveDollIdState(null);
        writeStoredDollId(null);
        setEnabled(false);
      }
    } finally {
      setLoading(false);
    }
  }, [userId, activeDollId]);

  useEffect(() => {
    void refreshDolls();
  }, [refreshDolls]);

  useEffect(() => {
    const handler = () => setActiveDollIdState(readStoredDollId());
    window.addEventListener(STUDIO_DOLL_CHANGED, handler);
    return () => window.removeEventListener(STUDIO_DOLL_CHANGED, handler);
  }, []);

  const setActiveDollId = useCallback((dollId: string | null) => {
    setActiveDollIdState(dollId);
    writeStoredDollId(dollId);
    setEnabled(!!dollId);
  }, []);

  const toggleDollInjection = useCallback(
    (next?: boolean) => {
      const value = next ?? !enabled;
      setEnabled(value);
      if (!value) {
        setActiveDollId(null);
      } else if (!activeDollId && dolls.length > 0) {
        setActiveDollId(dolls[0].id);
      }
    },
    [enabled, activeDollId, dolls, setActiveDollId],
  );

  return {
    dolls,
    activeDoll,
    activeDollId,
    enabled,
    loading,
    setActiveDollId,
    toggleDollInjection,
    dollPromptContext: enabled && activeDoll ? buildDollPromptContext(activeDoll) : "",
    refreshDolls,
  };
}
