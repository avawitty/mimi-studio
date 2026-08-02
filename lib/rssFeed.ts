/**
 * RSS 2.0 builder for creator public-issue feeds ("Keep Tabs").
 */

export type RssFeedItem = {
  id: string;
  title: string;
  link: string;
  description: string;
  pubDateMs: number;
  authorHandle?: string;
  coverImageUrl?: string | null;
};

export type RssFeedChannel = {
  title: string;
  link: string;
  description: string;
  feedUrl: string;
  language?: string;
  items: RssFeedItem[];
};

export const escapeXml = (value: string): string =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

export const toRfc822 = (ms: number): string => {
  const date = new Date(Number.isFinite(ms) && ms > 0 ? ms : Date.now());
  return date.toUTCString();
};

const cdata = (value: string): string => {
  const safe = String(value || "").replace(/]]>/g, "]]]]><![CDATA[>");
  return `<![CDATA[${safe}]]>`;
};

export const buildRssXml = (channel: RssFeedChannel): string => {
  const language = channel.language || "en-us";
  const lastBuild =
    channel.items.length > 0
      ? toRfc822(Math.max(...channel.items.map((item) => item.pubDateMs || 0)))
      : toRfc822(Date.now());

  const itemsXml = channel.items
    .map((item) => {
      const enclosure =
        item.coverImageUrl && /^https?:\/\//i.test(item.coverImageUrl)
          ? `\n      <enclosure url="${escapeXml(item.coverImageUrl)}" type="image/jpeg" />`
          : "";
      const author = item.authorHandle
        ? `\n      <author>${escapeXml(`noreply@mimi.you (${item.authorHandle})`)}</author>`
        : "";
      return `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.link)}</link>
      <guid isPermaLink="true">${escapeXml(item.link)}</guid>
      <pubDate>${toRfc822(item.pubDateMs)}</pubDate>
      <description>${cdata(item.description)}</description>${author}${enclosure}
    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(channel.title)}</title>
    <link>${escapeXml(channel.link)}</link>
    <description>${escapeXml(channel.description)}</description>
    <language>${escapeXml(language)}</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
    <atom:link href="${escapeXml(channel.feedUrl)}" rel="self" type="application/rss+xml" />
${itemsXml}
  </channel>
</rss>
`;
};

export const mapZineToRssItem = (
  zine: {
    id: string;
    title?: string;
    concept?: string;
    summary?: string;
    userHandle?: string;
    coverImageUrl?: string | null;
    publishedAt?: number;
    timestamp?: number;
    createdAt?: number;
  },
  zineLink: string,
): RssFeedItem => {
  const description =
    String(zine.concept || zine.summary || "").trim() ||
    "Public issue filed via Mimi Studio.";
  return {
    id: zine.id,
    title: String(zine.title || "Untitled Manifestation").trim() || "Untitled Manifestation",
    link: zineLink,
    description,
    pubDateMs: Number(zine.publishedAt || zine.timestamp || zine.createdAt || Date.now()),
    authorHandle: zine.userHandle,
    coverImageUrl: zine.coverImageUrl || null,
  };
};
