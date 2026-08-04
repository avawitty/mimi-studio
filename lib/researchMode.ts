/**
 * Lightweight UX research mode — enabled via `?research=1`.
 * Sticky for the browser session so redirects do not drop the flag.
 */

const STORAGE_KEY = "mimi_research_mode";
const TASK_STORAGE_KEY = "mimi_research_task";

function readQueryFlag(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return new URLSearchParams(window.location.search).get("research") === "1";
  } catch {
    return false;
  }
}

function readQueryTask(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const task = new URLSearchParams(window.location.search).get("task");
    return task?.trim() ? task.trim() : null;
  } catch {
    return null;
  }
}

/** Call once on boot to persist the flag before route redirects. */
export function bootstrapResearchMode(): void {
  if (typeof window === "undefined") return;
  if (!readQueryFlag()) return;
  try {
    sessionStorage.setItem(STORAGE_KEY, "1");
    const task = readQueryTask();
    if (task) sessionStorage.setItem(TASK_STORAGE_KEY, task);
  } catch {
    /* ignore */
  }
}

export function isResearchMode(): boolean {
  if (typeof window === "undefined") return false;
  if (readQueryFlag()) {
    bootstrapResearchMode();
    return true;
  }
  try {
    return sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function getResearchTaskName(fallback = "unspecified"): string {
  if (typeof window === "undefined") return fallback;
  const fromQuery = readQueryTask();
  if (fromQuery) return fromQuery;
  try {
    const stored = sessionStorage.getItem(TASK_STORAGE_KEY);
    if (stored?.trim()) return stored.trim();
  } catch {
    /* ignore */
  }
  return fallback;
}

export function setResearchTaskName(taskName: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(TASK_STORAGE_KEY, taskName.trim());
  } catch {
    /* ignore */
  }
}
