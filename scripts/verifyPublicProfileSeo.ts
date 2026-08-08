import assert from "node:assert/strict";
import {
  buildPublicProfileSeoData,
  injectPublicProfileSEOMetadata,
  renderPublicProfileOgHtml,
} from "../lib/publicProfileSeo";

const profile = {
  handle: "atelier",
  displayName: "Atelier",
  bio: "Editorial studio.",
  publicShowcase: {
    handle: "atelier",
    dollLabel: "Studio Doll",
    philosophy: "Quiet evidence.",
    accentHex: "#5A5A40",
    voiceAdjectives: [] as string[],
    motifCandidates: [] as string[],
    updatedAt: Date.now(),
  },
};

const seo = buildPublicProfileSeoData(profile as any, "https://mimi.you");
assert.equal(seo.pageUrl, "https://mimi.you/u/atelier");
assert.match(renderPublicProfileOgHtml(seo), /og:type" content="profile"/);

const html = injectPublicProfileSEOMetadata(
  "<html><head><title>Old</title></head><body></body></html>",
  seo,
);
assert.match(html, /<title>Atelier \(@atelier\) \| Mimi<\/title>/);
assert.match(html, /property="og:type" content="profile"/);

console.log("verify:public-profile-seo ok");
