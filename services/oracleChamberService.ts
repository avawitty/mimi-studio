/**
 * Local persistence for Oracle Cyberdeck chamber sessions.
 * Scoped per user; survives page reloads. Pocket export remains separate.
 */

export type OracleEntityId = 'mimi' | 'cyrus' | 'synthesis';

export interface OracleChamberSession {
  id: string;
  entity: OracleEntityId;
  entityLabel: string;
  role: string;
  startedAt: string;
  endedAt: string;
  transcript: string;
  notes: string[];
  excerpt: string;
  wordCount: number;
}

export interface OracleThemeFrequency {
  theme: string;
  count: number;
  sessions: number;
}

const STORAGE_PREFIX = 'mimi_oracle_sessions_';
const MAX_SESSIONS = 48;

const STOP_WORDS = new Set([
  'about', 'after', 'also', 'been', 'before', 'being', 'between', 'could',
  'from', 'have', 'into', 'just', 'like', 'more', 'most', 'only', 'other',
  'over', 'some', 'such', 'than', 'that', 'their', 'them', 'then', 'there',
  'these', 'they', 'this', 'through', 'under', 'very', 'what', 'when',
  'where', 'which', 'while', 'with', 'would', 'your', 'yours', 'yourself',
  'will', 'were', 'here', 'those', 'each', 'make', 'made', 'many', 'much',
  'should', 'could', 'might', 'must', 'shall', 'does', 'done', 'doing',
  'said', 'says', 'tell', 'told', 'know', 'knows', 'think', 'thought',
  'want', 'need', 'help', 'look', 'looking', 'really', 'still', 'even',
  'back', 'well', 'good', 'great', 'right', 'thing', 'things', 'something',
  'anything', 'everything', 'nothing', 'someone', 'everyone', 'because',
  'oracle', 'chamber', 'mimi', 'cyrus', 'synthesis', 'archivist', 'transmission',
]);

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId || 'ghost'}`;
}

function readSessions(userId: string): OracleChamberSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeSessions(userId: string, sessions: OracleChamberSession[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(storageKey(userId), JSON.stringify(sessions.slice(0, MAX_SESSIONS)));
}

function makeExcerpt(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1)}…`;
}

export function listOracleSessions(userId: string): OracleChamberSession[] {
  return readSessions(userId).sort(
    (a, b) => new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime(),
  );
}

export function getOracleSession(userId: string, sessionId: string): OracleChamberSession | null {
  return readSessions(userId).find((s) => s.id === sessionId) ?? null;
}

export interface SaveOracleSessionInput {
  entity: OracleEntityId;
  entityLabel: string;
  role: string;
  transcript: string;
  notes: string[];
  startedAt?: string;
}

export function saveOracleSession(
  userId: string,
  input: SaveOracleSessionInput,
): OracleChamberSession | null {
  const combined = [input.transcript, ...input.notes].filter(Boolean).join('\n\n').trim();
  if (!combined) return null;

  const now = new Date().toISOString();
  const session: OracleChamberSession = {
    id: `ocs_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    entity: input.entity,
    entityLabel: input.entityLabel,
    role: input.role,
    startedAt: input.startedAt ?? now,
    endedAt: now,
    transcript: input.transcript.trim(),
    notes: input.notes.filter(Boolean),
    excerpt: makeExcerpt(combined),
    wordCount: combined.split(/\s+/).filter(Boolean).length,
  };

  const existing = readSessions(userId);
  writeSessions(userId, [session, ...existing]);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('mimi:oracle_session_saved', { detail: session }),
    );
  }

  return session;
}

export function deleteOracleSession(userId: string, sessionId: string): void {
  const filtered = readSessions(userId).filter((s) => s.id !== sessionId);
  writeSessions(userId, filtered);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mimi:oracle_sessions_changed'));
  }
}

export function extractConversationThemes(
  sessions: OracleChamberSession[],
  limit = 10,
): OracleThemeFrequency[] {
  const counts = new Map<string, { count: number; sessions: Set<string> }>();

  for (const session of sessions) {
    const text = [session.transcript, ...session.notes, session.excerpt].join(' ').toLowerCase();
    const words = text.match(/\b[a-z][a-z'-]{3,}\b/g) ?? [];
    const seenInSession = new Set<string>();

    for (const word of words) {
      if (STOP_WORDS.has(word)) continue;
      seenInSession.add(word);
      const entry = counts.get(word) ?? { count: 0, sessions: new Set<string>() };
      entry.count += 1;
      entry.sessions.add(session.id);
      counts.set(word, entry);
    }

    // Bigrams for richer themes (e.g. "latent space")
    const tokens = words.filter((w) => !STOP_WORDS.has(w));
    for (let i = 0; i < tokens.length - 1; i++) {
      const bigram = `${tokens[i]} ${tokens[i + 1]}`;
      if (bigram.length < 8) continue;
      const entry = counts.get(bigram) ?? { count: 0, sessions: new Set<string>() };
      entry.count += 2;
      entry.sessions.add(session.id);
      counts.set(bigram, entry);
    }
  }

  return [...counts.entries()]
    .filter(([, v]) => v.sessions.size >= 1)
    .sort((a, b) => b[1].count - a[1].count || b[1].sessions.size - a[1].sessions.size)
    .slice(0, limit)
    .map(([theme, v]) => ({
      theme,
      count: v.count,
      sessions: v.sessions.size,
    }));
}

export function formatSessionDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}
