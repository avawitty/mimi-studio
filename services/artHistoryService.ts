import type { ArtworkMatch } from '../types';
import { sanitizeTailorText } from '../constants/tailorSafetyRules';

export interface MetObject {
  objectID: number;
  title: string;
  artistDisplayName?: string;
  objectDate?: string;
  primaryImage?: string;
  primaryImageSmall?: string;
  objectURL?: string;
  isPublicDomain?: boolean;
}

export interface WikimediaResult {
  title: string;
  pageid: number;
  imageUrl?: string;
  description?: string;
  artist?: string;
  sourceUrl: string;
}

const MET_API = 'https://collectionapi.metmuseum.org/public/collection/v1';
const WIKIMEDIA_API = 'https://commons.wikimedia.org/w/api.php';

export async function searchMetMuseum(query: string, limit = 5): Promise<MetObject[]> {
  try {
    const searchRes = await fetch(
      `${MET_API}/search?q=${encodeURIComponent(query)}&hasImages=true`,
    );
    const searchData = (await searchRes.json()) as { objectIDs?: number[] };
    const ids = (searchData.objectIDs ?? []).slice(0, limit);
    if (ids.length === 0) return [];

    const objects = await Promise.all(
      ids.map(async (id) => {
        const res = await fetch(`${MET_API}/objects/${id}`);
        return res.json() as Promise<MetObject>;
      }),
    );
    return objects.filter((o) => o.primaryImage);
  } catch (e) {
    console.error('Met API search failed:', e);
    return [];
  }
}

export async function searchWikimedia(query: string, limit = 5): Promise<WikimediaResult[]> {
  try {
    const params = new URLSearchParams({
      action: 'query',
      format: 'json',
      generator: 'search',
      gsrsearch: query,
      gsrnamespace: '6',
      gsrlimit: String(limit),
      prop: 'imageinfo|categories',
      iiprop: 'url|extmetadata',
      origin: '*',
    });
    const res = await fetch(`${WIKIMEDIA_API}?${params}`);
    const data = (await res.json()) as {
      query?: {
        pages?: Record<
          string,
          {
            title: string;
            pageid: number;
            imageinfo?: Array<{ url: string; extmetadata?: Record<string, { value: string }> }>;
          }
        >;
      };
    };

    const pages = data.query?.pages ?? {};
    return Object.values(pages).map((page) => {
      const info = page.imageinfo?.[0];
      const artist = info?.extmetadata?.Artist?.value?.replace(/<[^>]+>/g, '') ?? '';
      const desc = info?.extmetadata?.ImageDescription?.value?.replace(/<[^>]+>/g, '') ?? '';
      return {
        title: page.title.replace('File:', ''),
        pageid: page.pageid,
        imageUrl: info?.url,
        description: desc,
        artist,
        sourceUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title)}`,
      };
    });
  } catch (e) {
    console.error('Wikimedia search failed:', e);
    return [];
  }
}

export async function findArtHistoryMatches(
  userId: string,
  projectId: string | undefined,
  themes: string[],
  visualSignals: string[],
  patternClusterIds: string[] = [],
  creativeLawIds: string[] = [],
): Promise<Omit<ArtworkMatch, 'id' | 'userId' | 'createdAt'>[]> {
  const query = [...themes, ...visualSignals].slice(0, 3).join(' ');
  if (!query.trim()) return [];

  const [metResults, wikiResults] = await Promise.all([
    searchMetMuseum(query, 3),
    searchWikimedia(query, 3),
  ]);

  const matches: Omit<ArtworkMatch, 'id' | 'userId' | 'createdAt'>[] = [];

  for (const obj of metResults) {
    matches.push({
      projectId,
      artworkTitle: obj.title,
      artist: obj.artistDisplayName ?? 'Unknown',
      date: obj.objectDate,
      museum: 'The Metropolitan Museum of Art',
      imageUrl: obj.primaryImage,
      sourceUrl: obj.objectURL ?? `https://www.metmuseum.org/art/collection/search/${obj.objectID}`,
      publicDomainStatus: obj.isPublicDomain ? 'public_domain' : 'unknown',
      matchedThemes: themes,
      matchedVisualSignals: visualSignals,
      differences: [
        'Historical context and material production differ from your references',
        'This is a thematic comparison, not an identity match',
      ],
      educationalSummary: sanitizeTailorText(
        `This work from the Met collection explores related themes: ${themes.join(', ')}. ` +
          `Your references share visual signals such as ${visualSignals.slice(0, 3).join(', ')}. ` +
          'This is a reference point for creative literacy, not a definition of you.',
      ),
      suggestedUserExperiment:
        'Create an original piece using one shared visual strategy without copying composition.',
      linkedPatternClusterIds: patternClusterIds,
      linkedCreativeLawIds: creativeLawIds,
    });
  }

  for (const wiki of wikiResults) {
    matches.push({
      projectId,
      artworkTitle: wiki.title,
      artist: wiki.artist || 'Unknown',
      museum: 'Wikimedia Commons',
      imageUrl: wiki.imageUrl,
      sourceUrl: wiki.sourceUrl,
      publicDomainStatus: 'public_domain',
      matchedThemes: themes,
      matchedVisualSignals: visualSignals,
      differences: ['Source medium and historical period may differ significantly'],
      educationalSummary: sanitizeTailorText(
        wiki.description ||
          `This public-domain work explores related visual ideas to your taste graph.`,
      ),
      suggestedUserExperiment: 'Study the formal technique, then apply the principle to your own subject.',
      linkedPatternClusterIds: patternClusterIds,
      linkedCreativeLawIds: creativeLawIds,
    });
  }

  return matches;
}

export async function generateArtHistoryMatchesForProject(
  userId: string,
  projectId: string,
  searchQueries: string[],
  patternClusterIds: string[],
  creativeLawIds: string[],
): Promise<Omit<ArtworkMatch, 'id' | 'userId' | 'createdAt'>[]> {
  const allMatches: Omit<ArtworkMatch, 'id' | 'userId' | 'createdAt'>[] = [];

  for (const q of searchQueries.slice(0, 5)) {
    const themes = q.split(' ').filter((w) => w.length > 3);
    const matches = await findArtHistoryMatches(
      userId,
      projectId,
      themes,
      themes,
      patternClusterIds,
      creativeLawIds,
    );
    allMatches.push(...matches);
  }

  const seen = new Set<string>();
  return allMatches.filter((m) => {
    const key = `${m.artworkTitle}-${m.artist}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
