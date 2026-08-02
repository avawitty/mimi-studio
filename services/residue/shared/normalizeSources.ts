/**
 * Normalize + dedupe acquired / manual sources into SourceReference records.
 */

import { layerForSourceType, sourceQualityScore } from "../scoring";
import type { AcquiredSource, SourceReference, SourceType } from "../validation";

function guessSourceType(uri?: string, explicit?: SourceType): SourceType {
  if (explicit) return explicit;
  const u = (uri || "").toLowerCase();
  if (u.includes("reddit.com")) return "reddit";
  if (u.includes("twitter.com") || u.includes("x.com") || u.includes("tiktok.com") || u.includes("instagram.com")) {
    return "social-post";
  }
  if (u.includes("doi.org") || u.includes("jstor.org") || u.includes("pubmed")) return "academic-research";
  return "journalism";
}

export function normalizeSources(input: {
  acquired?: AcquiredSource[];
  sourceUrls?: string[];
  userNotes?: string[];
  accessedAt?: string;
}): SourceReference[] {
  const accessedAt = input.accessedAt ?? new Date().toISOString();
  const out: SourceReference[] = [];
  const seen = new Set<string>();

  for (const [index, acquired] of (input.acquired ?? []).entries()) {
    const sourceType = guessSourceType(acquired.uri, acquired.sourceType);
    const sourceId = `src_acq_${index}_${hashShort(acquired.uri || acquired.title || String(index))}`;
    if (seen.has(sourceId)) continue;
    seen.add(sourceId);
    out.push({
      sourceId,
      title: acquired.title,
      author: acquired.author,
      url: acquired.uri,
      sourceType,
      accessedAt: acquired.capturedAt || accessedAt,
      excerpt: acquired.text?.slice(0, 500),
      evidenceLayer: layerForSourceType(sourceType),
      metadata: {
        platform: acquired.platform,
        provenance: acquired.provenance,
        qualityHint: sourceQualityScore(sourceType, "moderate"),
      },
    });
  }

  for (const [index, url] of (input.sourceUrls ?? []).entries()) {
    const sourceType = guessSourceType(url);
    const sourceId = `src_url_${index}_${hashShort(url)}`;
    if (seen.has(url) || seen.has(sourceId)) continue;
    seen.add(url);
    seen.add(sourceId);
    out.push({
      sourceId,
      title: url,
      url,
      sourceType,
      accessedAt,
      evidenceLayer: layerForSourceType(sourceType),
    });
  }

  for (const [index, note] of (input.userNotes ?? []).entries()) {
    const sourceId = `src_note_${index}`;
    out.push({
      sourceId,
      title: `User note ${index + 1}`,
      sourceType: "user-note",
      accessedAt,
      excerpt: note.slice(0, 500),
      evidenceLayer: "C",
      metadata: { fullText: note },
    });
  }

  return out;
}

function hashShort(value: string): string {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) h = (h * 31 + value.charCodeAt(i)) >>> 0;
  return h.toString(36).slice(0, 8);
}
