// Server-side Letterboxd RSS reader.
// Letterboxd exposes a public RSS feed at https://letterboxd.com/<username>/rss/
// This does a read-only fetch + parse. No auth, no scraping of private data.

export type LetterboxdEntryKind =
  | 'rated_watch'
  | 'watch'
  | 'review'
  | 'list';

export interface LetterboxdEntry {
  id: string;
  kind: LetterboxdEntryKind;
  filmTitle: string;
  filmYear?: string;
  rating?: number; // 0.5 - 5
  stars?: string; // ★ rendering
  reviewExcerpt?: string;
  posterUrl?: string;
  link?: string;
  watchedDate?: string;
}

export interface LetterboxdFeedResult {
  username: string;
  feedUrl: string;
  displayName: string;
  entries: LetterboxdEntry[];
  source: 'rss';
  warning?: string;
}

function isLetterboxdHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  return host === 'letterboxd.com' || host.endsWith('.letterboxd.com');
}

export function resolveLetterboxdFeedUrl(rawUrl: string): URL {
  const candidate = (rawUrl || '').trim();
  if (!candidate) throw new Error('Paste your Letterboxd profile or RSS link first.');

  let parsed: URL;
  try {
    parsed = new URL(
      /^[a-z][a-z0-9+.-]*:\/\//i.test(candidate) ? candidate : `https://${candidate}`,
    );
  } catch {
    throw new Error('That does not look like a valid Letterboxd URL.');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Letterboxd imports require an HTTP or HTTPS URL.');
  }
  if (!isLetterboxdHost(parsed.hostname)) {
    throw new Error('Only letterboxd.com profile or RSS links are supported.');
  }

  parsed.protocol = 'https:';
  parsed.hash = '';
  parsed.search = '';

  const segments = parsed.pathname.split('/').filter(Boolean);
  if (!segments.length) {
    throw new Error('Include your username, e.g. letterboxd.com/yourname');
  }
  // Already an rss feed path
  if (segments[segments.length - 1].toLowerCase() === 'rss') {
    parsed.pathname = `/${segments.join('/')}/`;
    return parsed;
  }
  // Profile URL -> username/rss/
  const username = segments[0];
  parsed.pathname = `/${username}/rss/`;
  return parsed;
}

function readTag(block: string, name: string): string {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = block.match(new RegExp(`<${escaped}[^>]*>([\\s\\S]*?)</${escaped}>`, 'i'));
  if (!match) return '';
  return match[1].replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '').trim();
}

function decodeEntities(value = ''): string {
  return value
    .replace(/<!\[CDATA\[/g, '')
    .replace(/\]\]>/g, '')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/&#0*38;/gi, '&');
}

function ratingToStars(rating?: number): string | undefined {
  if (rating == null || Number.isNaN(rating)) return undefined;
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return '★'.repeat(full) + (half ? '½' : '');
}

function parseItem(block: string): LetterboxdEntry | null {
  const title = decodeEntities(readTag(block, 'title'));
  const link = readTag(block, 'link');
  const guid = readTag(block, 'guid') || link || title;
  const filmTitle = decodeEntities(readTag(block, 'letterboxd:filmTitle')) || title;
  const filmYear = readTag(block, 'letterboxd:filmYear') || undefined;
  const ratingRaw = readTag(block, 'letterboxd:memberRating');
  const rating = ratingRaw ? Number(ratingRaw) : undefined;
  const watchedDate = readTag(block, 'letterboxd:watchedDate') || undefined;
  const isList = /letterboxd:listId/i.test(block) || /\/list\//i.test(link);

  const descriptionHtml = decodeEntities(readTag(block, 'description'));
  const posterUrl = descriptionHtml.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1];
  // Strip the poster paragraph, keep any written review text.
  const reviewText = descriptionHtml
    .replace(/<img[^>]*>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const reviewExcerpt = reviewText ? reviewText.slice(0, 400) : undefined;

  if (!filmTitle && !isList) return null;

  let kind: LetterboxdEntryKind = 'watch';
  if (isList) kind = 'list';
  else if (reviewExcerpt && reviewExcerpt.length > 12) kind = 'review';
  else if (rating != null) kind = 'rated_watch';

  return {
    id: guid,
    kind,
    filmTitle: isList ? title : filmTitle,
    filmYear,
    rating,
    stars: ratingToStars(rating),
    reviewExcerpt,
    posterUrl,
    link: link || undefined,
    watchedDate,
  };
}

export function parseLetterboxdFeed(xml: string, feedUrl: string): LetterboxdEntry[] {
  const items = xml.match(/<item[\s\S]*?<\/item>/gi) || [];
  const entries: LetterboxdEntry[] = [];
  for (const block of items) {
    const entry = parseItem(block);
    if (entry) entries.push(entry);
  }
  return entries.slice(0, 40).map((entry, index) => ({
    ...entry,
    id: entry.id || `${feedUrl}#${index}`,
  }));
}

export async function fetchLetterboxdFeed(rawUrl: string): Promise<LetterboxdFeedResult> {
  const feed = resolveLetterboxdFeedUrl(rawUrl);
  const username = feed.pathname.split('/').filter(Boolean)[0] || 'letterboxd';

  const response = await fetch(feed.toString(), {
    redirect: 'follow',
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36',
      Accept: 'application/rss+xml, application/xml, text/xml',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (response.status === 404) {
    throw new Error(`No public Letterboxd feed for “${username}”. Check the username or make the profile public.`);
  }
  if (!response.ok) {
    throw new Error(`Letterboxd returned ${response.status} while loading that feed.`);
  }

  const xml = await response.text();
  const channelTitle = decodeEntities(
    (xml.match(/<channel[\s\S]*?<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').trim(),
  );
  const entries = parseLetterboxdFeed(xml, feed.toString());

  if (!entries.length) {
    throw new Error(
      'That feed had no readable diary entries yet. Watch or rate a few films on Letterboxd, then import again.',
    );
  }

  return {
    username,
    feedUrl: feed.toString(),
    displayName: channelTitle || `${username} on Letterboxd`,
    entries,
    source: 'rss',
    warning: entries.length < 3 ? 'Only a few entries were exposed. More activity yields a stronger read.' : undefined,
  };
}
