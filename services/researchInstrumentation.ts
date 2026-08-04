import { collection, addDoc } from "firebase/firestore";
import { ensureDb } from "./firebase";
import { sanitizeFirestoreData } from "./firebaseUtils";
import { isResearchMode, getResearchTaskName } from "../lib/researchMode";
import type {
  ResearchEvent,
  ResearchEventName,
  ResearchSessionExport,
} from "../types/researchInstrumentation";
import { devLog } from "../lib/devLog";

const COLLECTION_NAME = "research_sessions";
const SESSION_ID_KEY = "mimi_research_session_id";
const STARTED_AT_KEY = "mimi_research_started_at";
const TASK_START_KEY = "mimi_research_task_started";

const eventBuffer: ResearchEvent[] = [];
let startedAt: number | null = null;
let firstMeaningfulClickAt: number | null = null;
let abandonmentLogged = false;

function getSessionId(): string {
  if (typeof window === "undefined") return "server";
  try {
    const existing = sessionStorage.getItem(SESSION_ID_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_ID_KEY, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

function getStartedAt(): number {
  if (startedAt != null) return startedAt;
  if (typeof window !== "undefined") {
    try {
      const stored = sessionStorage.getItem(STARTED_AT_KEY);
      if (stored) {
        startedAt = Number(stored);
        if (!Number.isNaN(startedAt)) return startedAt;
      }
    } catch {
      /* ignore */
    }
  }
  startedAt = Date.now();
  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem(STARTED_AT_KEY, String(startedAt));
    } catch {
      /* ignore */
    }
  }
  return startedAt;
}

function currentPath(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return `${window.location.pathname}${window.location.search}`;
}

async function persistEvent(event: ResearchEvent): Promise<void> {
  eventBuffer.push(event);
  devLog.info("[research]", event);

  if (!isResearchMode()) return;

  try {
    const db = await ensureDb();
    await addDoc(
      collection(db, COLLECTION_NAME),
      sanitizeFirestoreData(event),
    );
  } catch (error) {
    console.warn("MIMI // Research event dropped:", error);
  }
}

export function logResearchEvent(
  event: ResearchEventName,
  elementId: string,
  extras?: Pick<ResearchEvent, "note">,
): void {
  if (!isResearchMode()) return;

  const payload: ResearchEvent = {
    sessionId: getSessionId(),
    taskName: getResearchTaskName(),
    event,
    elementId,
    ts: Date.now(),
    path: currentPath(),
    ...extras,
  };

  void persistEvent(payload);
}

export function logTaskStart(): void {
  if (!isResearchMode()) return;
  if (typeof window !== "undefined") {
    try {
      if (sessionStorage.getItem(TASK_START_KEY) === "1") return;
      sessionStorage.setItem(TASK_START_KEY, "1");
    } catch {
      /* ignore */
    }
  }
  getStartedAt();
  logResearchEvent("task_start", "session");
}

export function logResearchNote(note: string): void {
  const trimmed = note.trim();
  if (!trimmed || !isResearchMode()) return;
  logResearchEvent("note", "research-note-widget", { note: trimmed });
}

export function handleResearchClick(target: EventTarget | null): void {
  if (!isResearchMode() || !target || !(target instanceof Element)) return;

  const interactive = findInteractiveElement(target);
  const elementId = describeElement(interactive ?? target);

  if (interactive) {
    if (firstMeaningfulClickAt == null) {
      firstMeaningfulClickAt = Date.now();
      const elapsed = firstMeaningfulClickAt - getStartedAt();
      logResearchEvent("first_meaningful_click", elementId);
      logResearchEvent("time_to_first_action", String(elapsed));
    }
    return;
  }

  logResearchEvent("dead_click", elementId);
}

export function logAbandonment(reason: string): void {
  if (!isResearchMode() || abandonmentLogged) return;
  abandonmentLogged = true;
  logResearchEvent("abandonment", reason);
}

export function getResearchEvents(): readonly ResearchEvent[] {
  return [...eventBuffer];
}

export function exportResearchSession(): ResearchSessionExport {
  return {
    sessionId: getSessionId(),
    taskName: getResearchTaskName(),
    startedAt: getStartedAt(),
    exportedAt: Date.now(),
    events: [...getResearchEvents()],
  };
}

export function downloadResearchExport(): void {
  if (typeof window === "undefined") return;
  const payload = exportResearchSession();
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `research-${payload.sessionId}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function findInteractiveElement(target: Element): Element | null {
  let node: Element | null = target;
  while (node) {
    if (isInteractiveElement(node)) return node;
    node = node.parentElement;
  }
  return null;
}

function isInteractiveElement(el: Element): boolean {
  const tag = el.tagName.toLowerCase();
  if (
    tag === "button" ||
    tag === "a" ||
    tag === "input" ||
    tag === "textarea" ||
    tag === "select" ||
    tag === "summary" ||
    tag === "label"
  ) {
    return true;
  }

  const role = el.getAttribute("role");
  if (
    role === "button" ||
    role === "link" ||
    role === "menuitem" ||
    role === "tab" ||
    role === "switch" ||
    role === "checkbox" ||
    role === "radio"
  ) {
    return true;
  }

  if (el.hasAttribute("data-research-id")) return true;
  if (el.hasAttribute("data-testid")) return true;

  const tabIndex = el.getAttribute("tabindex");
  if (tabIndex != null && tabIndex !== "-1") return true;

  if (el instanceof HTMLElement && el.onclick != null) return true;

  return false;
}

function describeElement(el: Element): string {
  const researchId = el.getAttribute("data-research-id");
  if (researchId) return researchId;

  if (el.id) return `#${el.id}`;

  const testId = el.getAttribute("data-testid");
  if (testId) return `[data-testid=${testId}]`;

  const aria = el.getAttribute("aria-label");
  if (aria) return `${el.tagName.toLowerCase()}[aria-label=${aria.slice(0, 40)}]`;

  const text = el.textContent?.trim().replace(/\s+/g, " ").slice(0, 40);
  if (text) return `${el.tagName.toLowerCase()}:${text}`;

  return el.tagName.toLowerCase();
}
