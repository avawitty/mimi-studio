/**
 * Canonical private mimi.you (Mimi Dolls universe) tab routes.
 * URL is source of truth for tab selection, refresh, Back, and deep links.
 */

export const MIMI_YOU_TABS = ['overview', 'dolls', 'field-notes', 'art-history'] as const;

export type MimiYouTab = (typeof MIMI_YOU_TABS)[number];

export const MIMI_YOU_BASE = '/mimi-dolls';

const TAB_ALIASES: Record<string, MimiYouTab> = {
  overview: 'overview',
  universe: 'overview',
  dolls: 'dolls',
  'field-notes': 'field-notes',
  fieldnotes: 'field-notes',
  notes: 'field-notes',
  'art-history': 'art-history',
  arthistory: 'art-history',
  art: 'art-history',
};

export function isMimiYouTab(value: string | null | undefined): value is MimiYouTab {
  return Boolean(value && (MIMI_YOU_TABS as readonly string[]).includes(value));
}

/** Parse hub tab from pathname like /mimi-dolls/dolls or /mimi-you/field-notes. */
export function parseMimiYouTabFromPath(pathname: string): MimiYouTab | null {
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] !== 'mimi-dolls' && parts[0] !== 'mimi-you') return null;
  const segment = parts[1];
  if (!segment) return null;
  return TAB_ALIASES[segment] ?? null;
}

export function mimiYouTabPath(tab: MimiYouTab): string {
  if (tab === 'overview') return `${MIMI_YOU_BASE}/overview`;
  return `${MIMI_YOU_BASE}/${tab}`;
}

export function resolveMimiYouTab(
  pathname: string,
  fallback: MimiYouTab = 'overview',
): MimiYouTab {
  return parseMimiYouTabFromPath(pathname) ?? fallback;
}
