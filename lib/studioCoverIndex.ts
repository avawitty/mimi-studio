/** Monotonic cover issue counter (per browser profile). */
export const COVER_ISSUE_COUNTER_KEY = "mimi_cover_issue_counter";

/** Active issue index for the current Studio compose session (per tab). */
export const COVER_ISSUE_SESSION_KEY = "mimi_studio_active_cover_index";

const LEGACY_DEFAULT_CODE = "SYS // COV-INT.1";

export function formatCoverIndex(index: number, width = 3): string {
  if (!Number.isFinite(index) || index < 1) return "001";
  return String(Math.floor(index)).padStart(width, "0");
}

export function coverSystemCodeFromIndex(index: number): string {
  return `SYS // COV-${formatCoverIndex(index)}`;
}

export function readCoverIssueCounter(storage: Storage = localStorage): number {
  const raw = storage.getItem(COVER_ISSUE_COUNTER_KEY);
  const parsed = raw ? Number.parseInt(raw, 10) : 0;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export function writeCoverIssueCounter(
  value: number,
  storage: Storage = localStorage,
): void {
  try {
    storage.setItem(COVER_ISSUE_COUNTER_KEY, String(Math.max(0, Math.floor(value))));
  } catch {
    /* quota / private mode */
  }
}

/** Increment and return the next cover issue index. */
export function allocateCoverIssueIndex(storage: Storage = localStorage): number {
  const next = readCoverIssueCounter(storage) + 1;
  writeCoverIssueCounter(next, storage);
  return next;
}

export function readSessionCoverIssueIndex(
  storage: Storage = sessionStorage,
): number | null {
  const raw = storage.getItem(COVER_ISSUE_SESSION_KEY);
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : null;
}

export function writeSessionCoverIssueIndex(
  index: number,
  storage: Storage = sessionStorage,
): void {
  try {
    storage.setItem(COVER_ISSUE_SESSION_KEY, String(Math.floor(index)));
  } catch {
    /* quota / private mode */
  }
}

export function clearSessionCoverIssueIndex(storage: Storage = sessionStorage): void {
  try {
    storage.removeItem(COVER_ISSUE_SESSION_KEY);
  } catch {
    /* quota / private mode */
  }
}

/**
 * Reuse the active tab session index when present; otherwise allocate the next
 * monotonic issue number for this browser profile.
 */
export function getOrAllocateCoverIssueIndex(
  local: Storage = localStorage,
  session: Storage = sessionStorage,
): number {
  const existing = readSessionCoverIssueIndex(session);
  if (existing != null) return existing;
  const next = allocateCoverIssueIndex(local);
  writeSessionCoverIssueIndex(next, session);
  return next;
}

/** Start a fresh cover issue in this tab (e.g. “new zine” from Studio). */
export function startNewCoverIssue(
  local: Storage = localStorage,
  session: Storage = sessionStorage,
): number {
  clearSessionCoverIssueIndex(session);
  const next = allocateCoverIssueIndex(local);
  writeSessionCoverIssueIndex(next, session);
  return next;
}

export function isLegacyDefaultCoverCode(code: string | null | undefined): boolean {
  if (!code) return true;
  const trimmed = code.trim();
  return trimmed === LEGACY_DEFAULT_CODE || trimmed === "SYS // COV-INT.1";
}

export function parseCoverIndexFromCode(code: string): number | null {
  const match = code.match(/COV-(\d+)/i);
  if (!match) return null;
  const parsed = Number.parseInt(match[1]!, 10);
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : null;
}
