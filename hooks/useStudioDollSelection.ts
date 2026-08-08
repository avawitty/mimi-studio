import { useCallback, useEffect, useMemo, useState } from "react";
import type { Doll, DollMask } from "../types";
import {
  ensureDefaultDollMasks,
  listDollMasks,
  listDolls,
} from "../services/tailorService";
import {
  STUDIO_DOLL_CHANGED,
  buildDollCompanionBundle,
  buildDollPromptContext,
  readStoredActiveDollId,
  readStoredActiveMaskId,
  writeStoredActiveDollId,
  writeStoredActiveMaskId,
  type DollCompanionBundle,
  type DollImageReference,
} from "../services/dollEngine";

export { STUDIO_DOLL_CHANGED, buildDollPromptContext };

export function useStudioDollSelection(userId?: string | null) {
  const [dolls, setDolls] = useState<Doll[]>([]);
  const [masks, setMasks] = useState<DollMask[]>([]);
  const [activeDollId, setActiveDollIdState] = useState<string | null>(() =>
    readStoredActiveDollId(),
  );
  const [activeMaskId, setActiveMaskIdState] = useState<string | null>(() =>
    readStoredActiveMaskId(),
  );
  const [enabled, setEnabled] = useState(() => !!readStoredActiveDollId());
  const [loading, setLoading] = useState(false);

  const activeDoll = dolls.find((d) => d.id === activeDollId) ?? null;

  const refreshDolls = useCallback(async () => {
    if (!userId || userId === "ghost") {
      setDolls([]);
      setMasks([]);
      return;
    }
    setLoading(true);
    try {
      const list = await listDolls(userId);
      setDolls(list);
      const storedId = readStoredActiveDollId();
      if (storedId && list.some((d) => d.id === storedId)) {
        setActiveDollIdState(storedId);
        setEnabled(true);
      } else if (activeDollId && !list.some((d) => d.id === activeDollId)) {
        setActiveDollIdState(null);
        writeStoredActiveDollId(null);
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
    if (!userId || userId === "ghost" || loading) return;
    const storedId = readStoredActiveDollId();
    if (!storedId || !dolls.some((doll) => doll.id === storedId)) return;
    setActiveDollIdState((prev) => prev ?? storedId);
    setEnabled(true);
  }, [userId, dolls, loading]);

  useEffect(() => {
    const handler = () => {
      setActiveDollIdState(readStoredActiveDollId());
      setActiveMaskIdState(readStoredActiveMaskId());
    };
    window.addEventListener(STUDIO_DOLL_CHANGED, handler);
    return () => window.removeEventListener(STUDIO_DOLL_CHANGED, handler);
  }, []);

  // Load / seed masks for the active doll
  useEffect(() => {
    let cancelled = false;
    async function loadMasks() {
      if (!userId || userId === "ghost" || !activeDoll) {
        setMasks([]);
        return;
      }
      let next = await listDollMasks(userId, activeDoll.id);
      if (next.length === 0) {
        next = await ensureDefaultDollMasks(userId, activeDoll);
      }
      if (cancelled) return;
      setMasks(next);
      setActiveMaskIdState((prev) => {
        if (prev && next.some((m) => m.id === prev)) return prev;
        const preferred = activeDoll.activeMaskId || next[0]?.id || null;
        if (preferred) writeStoredActiveMaskId(preferred);
        return preferred;
      });
    }
    void loadMasks();
    return () => {
      cancelled = true;
    };
  }, [userId, activeDoll]);

  const companion: DollCompanionBundle | null = useMemo(() => {
    if (!enabled || !activeDoll) return null;
    return buildDollCompanionBundle(activeDoll, masks, activeMaskId);
  }, [enabled, activeDoll, masks, activeMaskId]);

  const setActiveDollId = useCallback((dollId: string | null) => {
    setActiveDollIdState(dollId);
    writeStoredActiveDollId(dollId);
    setEnabled(!!dollId);
    if (!dollId) {
      setActiveMaskIdState(null);
      writeStoredActiveMaskId(null);
    }
  }, []);

  const setActiveMaskId = useCallback((maskId: string | null) => {
    setActiveMaskIdState(maskId);
    writeStoredActiveMaskId(maskId);
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

  const imageReferences: DollImageReference[] = companion?.imageReferences ?? [];

  return {
    dolls,
    masks,
    activeDoll,
    activeDollId,
    activeMaskId,
    enabled,
    loading,
    setActiveDollId,
    setActiveMaskId,
    toggleDollInjection,
    dollPromptContext: companion?.promptContext ?? "",
    companion,
    imageReferences,
    refreshDolls,
  };
}
