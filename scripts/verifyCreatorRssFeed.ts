/**
 * Keep Tabs RSS — fixture verification (no Firebase required).
 * Run: npx tsx scripts/verifyCreatorRssFeed.ts
 */

import { getCreatorFeedPath, getCreatorFeedUrl, getZineCanonicalUrl } from "../lib/publicBaseUrl";
import { buildRssXml, escapeXml, mapZineToRssItem, toRfc822 } from "../lib/rssFeed";

let failures = 0;

const assert = (condition: boolean, message: string) => {
  if (!condition) {
    failures += 1;
    console.error(`FAIL  ${message}`);
  } else {
    console.log(`ok    ${message}`);
  }
};

const base = "https://mimi.you";
const handle = "atelier-test";

assert(getCreatorFeedPath(handle) === "/u/atelier-test/feed.xml", "pretty feed path");
assert(
  getCreatorFeedUrl("@Atelier-Test", base) === "https://mimi.you/u/atelier-test/feed.xml",
  "absolute feed URL normalizes handle",
);
assert(
  getZineCanonicalUrl("zine_abc", base) === "https://mimi.you/zine/zine_abc",
  "canonical zine URL",
);

const item = mapZineToRssItem(
  {
    id: "zine_1",
    title: "Manila Heat & <Signal>",
    concept: "A dossier on reciprocal gaze & evidence.",
    userHandle: handle,
    publishedAt: Date.UTC(2026, 6, 29, 12, 0, 0),
    coverImageUrl: "https://cdn.example.com/cover.jpg",
  },
  getZineCanonicalUrl("zine_1", base),
);

assert(item.title.includes("Manila"), "item title preserved");
assert(item.pubDateMs === Date.UTC(2026, 6, 29, 12, 0, 0), "publishedAt preferred for pubDate");

const xml = buildRssXml({
  title: `@${handle} · public issues`,
  link: `${base}/u/${handle}`,
  description: "Keep tabs on public issues.",
  feedUrl: getCreatorFeedUrl(handle, base),
  items: [item],
});

assert(xml.startsWith("<?xml version=\"1.0\""), "xml declaration");
assert(xml.includes("<rss version=\"2.0\""), "rss 2.0 root");
assert(xml.includes("application/rss+xml"), "atom self link type");
assert(xml.includes(escapeXml("Manila Heat & <Signal>")), "title escaped");
assert(xml.includes("<![CDATA[A dossier on reciprocal gaze & evidence.]]>"), "description cdata");
assert(xml.includes(toRfc822(item.pubDateMs)), "rfc822 pubDate");
assert(xml.includes('enclosure url="https://cdn.example.com/cover.jpg"'), "cover enclosure");
assert(xml.includes("https://mimi.you/zine/zine_1"), "item link");

const emptyXml = buildRssXml({
  title: "@empty · public issues",
  link: `${base}/u/empty`,
  description: "No issues yet.",
  feedUrl: getCreatorFeedUrl("empty", base),
  items: [],
});
assert(emptyXml.includes("<channel>"), "empty feed still valid channel");
assert(!emptyXml.includes("<item>"), "empty feed has no items");

// Recency helpers: publishedAt must beat older timestamp when ranking feed items.
{
  const newerPublish = mapZineToRssItem(
    {
      id: "zine_new_pub",
      title: "Newly public old draft",
      publishedAt: 2_000,
      timestamp: 100,
    },
    getZineCanonicalUrl("zine_new_pub", base),
  );
  const olderFresh = mapZineToRssItem(
    {
      id: "zine_old",
      title: "Older creation",
      timestamp: 1_500,
    },
    getZineCanonicalUrl("zine_old", base),
  );
  const ranked = [olderFresh, newerPublish].sort(
    (a, b) => b.pubDateMs - a.pubDateMs,
  );
  assert(ranked[0].id === "zine_new_pub", "publishedAt wins feed recency over older timestamp");
}

if (failures > 0) {
  console.error(`\n${failures} assertion(s) failed`);
  process.exit(1);
}

console.log("\nKeep Tabs RSS fixtures verified.");
