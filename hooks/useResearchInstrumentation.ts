import { useCallback, useSyncExternalStore } from "react";
import {
  downloadResearchExport,
  exportResearchSession,
  getResearchEvents,
  logResearchEvent,
  logResearchNote,
  subscribeResearchEvents,
} from "../services/researchInstrumentation";
import { isResearchMode } from "../lib/researchMode";
import type { ResearchEventName } from "../types/researchInstrumentation";

export function useResearchInstrumentation() {
  const enabled = isResearchMode();

  const logEvent = useCallback(
    (event: ResearchEventName, elementId: string) => {
      logResearchEvent(event, elementId);
    },
    [],
  );

  const addNote = useCallback((note: string) => {
    logResearchNote(note);
  }, []);

  const exportSession = useCallback(() => exportResearchSession(), []);

  const downloadExport = useCallback(() => {
    downloadResearchExport();
  }, []);

  const events = useSyncExternalStore(
    subscribeResearchEvents,
    getResearchEvents,
    getResearchEvents,
  );

  return {
    enabled,
    events,
    logEvent,
    addNote,
    exportSession,
    downloadExport,
  };
}
