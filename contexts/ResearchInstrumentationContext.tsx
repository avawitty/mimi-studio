import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { isResearchMode } from "../lib/researchMode";
import {
  handleResearchClick,
  logAbandonment,
  logTaskStart,
} from "../services/researchInstrumentation";

interface ResearchInstrumentationContextValue {
  enabled: boolean;
}

const ResearchInstrumentationContext =
  createContext<ResearchInstrumentationContextValue>({ enabled: false });

export function useResearchInstrumentationEnabled(): boolean {
  return useContext(ResearchInstrumentationContext).enabled;
}

const ABANDONMENT_IDLE_MS = 5 * 60 * 1000;

export function ResearchInstrumentationProvider({
  children,
}: {
  children: ReactNode;
}) {
  const enabled = isResearchMode();

  useEffect(() => {
    if (!enabled) return;

    logTaskStart();

    const onClick = (event: MouseEvent) => {
      handleResearchClick(event.target);
    };

    const onPageHide = () => {
      logAbandonment("page_hide");
    };

    let idleTimer: ReturnType<typeof setTimeout> | undefined;
    const resetIdleTimer = () => {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        logAbandonment("idle_timeout");
      }, ABANDONMENT_IDLE_MS);
    };

    const onActivity = () => resetIdleTimer();

    document.addEventListener("click", onClick, true);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("pointerdown", onActivity);
    window.addEventListener("keydown", onActivity);
    window.addEventListener("scroll", onActivity, { passive: true });
    resetIdleTimer();

    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("pointerdown", onActivity);
      window.removeEventListener("keydown", onActivity);
      window.removeEventListener("scroll", onActivity);
      if (idleTimer) clearTimeout(idleTimer);
    };
  }, [enabled]);

  const value = useMemo(() => ({ enabled }), [enabled]);

  return (
    <ResearchInstrumentationContext.Provider value={value}>
      {children}
    </ResearchInstrumentationContext.Provider>
  );
}
