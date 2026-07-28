import type { EvidenceSourceType } from '../types';

// Normalized provenance vocabulary (mirrors the "Bring in your taste" spec).
export type TasteProvider =
  | 'letterboxd'
  | 'pinterest'
  | 'instagram'
  | 'generic_url'
  | 'manual';

export type TasteIngestionMethod =
  | 'rss'
  | 'link'
  | 'screenshot'
  | 'file_upload';

export type TasteAuthority =
  | 'user_declared'
  | 'user_behavior'
  | 'platform_inferred'
  | 'model_observed';

export type TasteConfidence = 'low' | 'medium' | 'high';

export type TasteProvenance = {
  provider: TasteProvider;
  ingestionMethod: TasteIngestionMethod;
  authority: TasteAuthority;
  confidence: TasteConfidence;
  sourceLabel: string;
  kind?: string;
  detail?: string;
};

// Evidence-node-ready item. Feeds directly into TailorProjectFlow.handleUpload.
export interface TasteImportItem {
  title: string;
  sourceType: EvidenceSourceType;
  dataUrl?: string;
  thumbnailUrl?: string;
  sourceUrl?: string;
  description?: string;
  extractedMetadata: Record<string, unknown>;
}

export interface TasteImportResult {
  provider: TasteProvider;
  sourceLabel: string;
  items: TasteImportItem[];
  warning?: string;
}

export function detectProvider(rawUrl: string): TasteProvider {
  const value = (rawUrl || '').trim().toLowerCase();
  if (!value) return 'generic_url';
  if (/letterboxd\.com/.test(value)) return 'letterboxd';
  if (/pinterest\.[a-z.]+|pin\.it/.test(value)) return 'pinterest';
  if (/instagram\.com/.test(value)) return 'instagram';
  return 'generic_url';
}

async function readJson(res: Response): Promise<any> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      (typeof data?.error === 'string' && data.error) ||
      data?.error?.message ||
      `Import failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

function letterboxdAuthority(entry: any): { authority: TasteAuthority; confidence: TasteConfidence; kind: string } {
  const rating = typeof entry.rating === 'number' ? entry.rating : undefined;
  if (entry.kind === 'review') return { authority: 'user_declared', confidence: 'high', kind: 'review_language' };
  if (rating != null && rating >= 4.5) return { authority: 'user_declared', confidence: 'high', kind: 'explicit_favorite' };
  if (rating != null) return { authority: 'user_behavior', confidence: 'medium', kind: 'rating' };
  return { authority: 'user_behavior', confidence: 'low', kind: 'watchlist_interest' };
}

async function importLetterboxd(url: string): Promise<TasteImportResult> {
  const data = await readJson(await fetch(`/api/letterboxd?url=${encodeURIComponent(url)}`));
  const label = data.displayName || `Letterboxd — ${data.username}`;
  const items: TasteImportItem[] = (data.entries || []).map((entry: any) => {
    const { authority, confidence, kind } = letterboxdAuthority(entry);
    const yearLabel = entry.filmYear ? ` (${entry.filmYear})` : '';
    const starLabel = entry.stars ? ` ${entry.stars}` : '';
    return {
      title: `${entry.filmTitle}${yearLabel}${starLabel}`.trim(),
      sourceType: 'film' as EvidenceSourceType,
      thumbnailUrl: entry.posterUrl,
      sourceUrl: entry.link,
      description: entry.reviewExcerpt,
      extractedMetadata: {
        provider: 'letterboxd',
        ingestionMethod: 'rss',
        authority,
        confidence,
        kind,
        sourceLabel: label,
        rating: entry.rating,
        year: entry.filmYear,
        watchedDate: entry.watchedDate,
      },
    };
  });
  return { provider: 'letterboxd', sourceLabel: label, items, warning: data.warning };
}

async function importPinterest(url: string): Promise<TasteImportResult> {
  const data = await readJson(await fetch(`/api/pinterest?url=${encodeURIComponent(url)}`));
  const label = data.title || 'Pinterest board';
  const items: TasteImportItem[] = (data.pins || []).map((pin: any, index: number) => ({
    title: pin.alt || `${label} — pin ${index + 1}`,
    sourceType: 'moodboard' as EvidenceSourceType,
    thumbnailUrl: pin.src,
    sourceUrl: pin.url || pin.sourceUrl || url,
    description: pin.alt,
    extractedMetadata: {
      provider: 'pinterest',
      ingestionMethod: 'link',
      authority: 'user_behavior',
      confidence: 'medium',
      kind: 'saved_reference',
      sourceLabel: label,
      boardTitle: label,
    },
  }));
  return { provider: 'pinterest', sourceLabel: label, items, warning: data.warning };
}

async function importGeneric(url: string): Promise<TasteImportResult> {
  const data = await readJson(await fetch(`/api/metadata?url=${encodeURIComponent(url)}`));
  const label = data.title || new URL(url).hostname;
  const item: TasteImportItem = {
    title: label,
    sourceType: 'website',
    thumbnailUrl: data.image || undefined,
    sourceUrl: data.url || url,
    description: data.description || undefined,
    extractedMetadata: {
      provider: 'generic_url',
      ingestionMethod: 'link',
      authority: 'user_declared',
      confidence: 'medium',
      kind: 'saved_reference',
      sourceLabel: label,
    },
  };
  return { provider: 'generic_url', sourceLabel: label, items: [item] };
}

export async function importFromLink(rawUrl: string): Promise<TasteImportResult> {
  const url = (rawUrl || '').trim();
  if (!url) throw new Error('Paste a link first.');
  const provider = detectProvider(url);
  if (provider === 'instagram') {
    throw new Error(
      'Instagram links can\u2019t be read directly. Upload an algorithm screenshot instead — Mimi reads only what is visible.',
    );
  }
  if (provider === 'letterboxd') return importLetterboxd(url);
  if (provider === 'pinterest') return importPinterest(url);
  return importGeneric(url);
}

// Screenshot / file uploads carry provenance too.
export function screenshotProvenance(isInstagram: boolean, label: string): TasteProvenance {
  if (isInstagram) {
    return {
      provider: 'instagram',
      ingestionMethod: 'screenshot',
      authority: 'platform_inferred',
      confidence: 'medium',
      kind: 'platform_inference',
      sourceLabel: label || 'Instagram Algorithm Mirror',
    };
  }
  return {
    provider: 'manual',
    ingestionMethod: 'file_upload',
    authority: 'user_declared',
    confidence: 'high',
    kind: 'saved_reference',
    sourceLabel: label || 'Uploaded reference',
  };
}
