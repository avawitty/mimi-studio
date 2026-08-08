import { describe, expect, it, beforeEach } from 'vitest';
import {
  extractConversationThemes,
  listOracleSessions,
  saveOracleSession,
  deleteOracleSession,
  type OracleChamberSession,
} from '../services/oracleChamberService';

const TEST_USER = 'test_oracle_user';

describe('oracleChamberService', () => {
  beforeEach(() => {
    localStorage.removeItem(`mimi_oracle_sessions_${TEST_USER}`);
  });

  it('saves and lists sessions', () => {
    const session = saveOracleSession(TEST_USER, {
      entity: 'cyrus',
      entityLabel: 'Cyrus',
      role: 'Oracle',
      transcript: 'Consider latent space aesthetics and brutalist typography.',
      notes: ['departure from safe repetition'],
    });
    expect(session).not.toBeNull();
    const list = listOracleSessions(TEST_USER);
    expect(list).toHaveLength(1);
    expect(list[0].entity).toBe('cyrus');
    expect(list[0].wordCount).toBeGreaterThan(5);
  });

  it('extracts recurring themes from sessions', () => {
    const inputs: Array<Pick<OracleChamberSession, 'entity' | 'entityLabel' | 'role' | 'transcript' | 'notes'>> = [
      {
        entity: 'mimi',
        entityLabel: 'Mimi',
        role: 'Archivist',
        transcript: 'Your archive shows recurring brutalist typography and concrete motifs.',
        notes: [],
      },
      {
        entity: 'cyrus',
        entityLabel: 'Cyrus',
        role: 'Oracle',
        transcript: 'Brutalist typography will fracture into softer editorial serif pairings.',
        notes: ['concrete motifs aging'],
      },
    ];
    for (const input of inputs) {
      saveOracleSession(TEST_USER, input);
    }
    const themes = extractConversationThemes(listOracleSessions(TEST_USER));
    expect(themes.length).toBeGreaterThan(0);
    const themeLabels = themes.map((t) => t.theme);
    expect(themeLabels.some((t) => t.includes('brutalist') || t.includes('typography'))).toBe(true);
  });

  it('deletes a session', () => {
    const session = saveOracleSession(TEST_USER, {
      entity: 'synthesis',
      entityLabel: 'Synthesis',
      role: 'Argument',
      transcript: 'Test transmission for deletion.',
      notes: [],
    });
    expect(session).not.toBeNull();
    deleteOracleSession(TEST_USER, session!.id);
    expect(listOracleSessions(TEST_USER)).toHaveLength(0);
  });
});
