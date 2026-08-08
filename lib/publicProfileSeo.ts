import type { UserProfile } from "../types";
import {
  buildPublicSignatureExcerpt,
  resolvePublicProfileIdentity,
} from "./publicProfileCard";
import { getCreatorProfileUrl, getPublicBaseUrl } from "./publicBaseUrl";

export type PublicProfileSeoData = {
  title: string;
  description: string;
  imageUrl: string;
  handle: string;
  pageUrl: string;
};

const DEFAULT_OG_IMAGE =
  "https://raw.githubusercontent.com/Aris-A-C/mimi-assets/main/mimi_logo_new.png";

export const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export const buildPublicProfileSeoData = (
  profile: Pick<
    UserProfile,
    "handle" | "displayName" | "bio" | "photoURL" | "publicShowcase" | "tasteProfile"
  >,
  baseUrl?: string,
): PublicProfileSeoData => {
  const handle = (profile.handle || "creator").toLowerCase();
  const showcase = profile.publicShowcase ?? null;
  const identity = resolvePublicProfileIdentity(profile as UserProfile, showcase);
  const signature = buildPublicSignatureExcerpt(profile as UserProfile, showcase);
  const base = (baseUrl || getPublicBaseUrl()).replace(/\/$/, "");

  const title = identity.displayName
    ? `${identity.displayName} (@${handle})`
    : `@${handle}`;
  const description =
    identity.bio ||
    signature?.semanticLine ||
    showcase?.philosophy ||
    "Public creator profile on Mimi.";

  return {
    title,
    description,
    imageUrl: identity.avatarUrl || DEFAULT_OG_IMAGE,
    handle,
    pageUrl: getCreatorProfileUrl(handle, base),
  };
};

export const renderPublicProfileOgHtml = (seo: PublicProfileSeoData): string => {
  const documentTitle = `${seo.title} | Mimi`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(documentTitle)}</title>
  <meta name="description" content="${escapeHtml(seo.description)}" />
  <meta property="og:title" content="${escapeHtml(seo.title)}" />
  <meta property="og:description" content="${escapeHtml(seo.description)}" />
  <meta property="og:image" content="${escapeHtml(seo.imageUrl)}" />
  <meta property="og:url" content="${escapeHtml(seo.pageUrl)}" />
  <meta property="og:type" content="profile" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(seo.title)}" />
  <meta name="twitter:description" content="${escapeHtml(seo.description)}" />
  <meta name="twitter:image" content="${escapeHtml(seo.imageUrl)}" />
  <meta http-equiv="refresh" content="0;url=${escapeHtml(seo.pageUrl)}" />
</head>
<body>
  <p><a href="${escapeHtml(seo.pageUrl)}">${escapeHtml(seo.title)}</a></p>
</body>
</html>`;
};

export const injectPublicProfileSEOMetadata = (
  html: string,
  seo: PublicProfileSeoData,
): string => {
  const replaceMeta = (
    source: string,
    propertyValue: string,
    content: string,
    isProperty: boolean,
  ): string => {
    const newTag = isProperty
      ? `<meta property="${propertyValue}" content="${escapeHtml(content)}">`
      : `<meta name="${propertyValue}" content="${escapeHtml(content)}">`;
    const regex = new RegExp(
      `<meta\\s+[^>]*?${isProperty ? "property" : "name"}="${propertyValue}"[^>]*?>`,
      "i",
    );
    if (regex.test(source)) return source.replace(regex, newTag);
    return source.replace("<head>", `<head>\n    ${newTag}`);
  };

  let modifiedHtml = html;
  const documentTitle = `${seo.title} | Mimi`;
  modifiedHtml = modifiedHtml.replace(/<title>.*?<\/title>/gi, `<title>${escapeHtml(documentTitle)}</title>`);

  modifiedHtml = replaceMeta(modifiedHtml, "description", seo.description, false);
  modifiedHtml = replaceMeta(modifiedHtml, "og:title", seo.title, true);
  modifiedHtml = replaceMeta(modifiedHtml, "og:description", seo.description, true);
  modifiedHtml = replaceMeta(modifiedHtml, "og:image", seo.imageUrl, true);
  modifiedHtml = replaceMeta(modifiedHtml, "og:url", seo.pageUrl, true);
  modifiedHtml = replaceMeta(modifiedHtml, "og:type", "profile", true);
  modifiedHtml = replaceMeta(modifiedHtml, "twitter:card", "summary_large_image", false);
  modifiedHtml = replaceMeta(modifiedHtml, "twitter:title", seo.title, false);
  modifiedHtml = replaceMeta(modifiedHtml, "twitter:description", seo.description, false);
  modifiedHtml = replaceMeta(modifiedHtml, "twitter:image", seo.imageUrl, false);
  modifiedHtml = replaceMeta(modifiedHtml, "twitter:url", seo.pageUrl, false);

  return modifiedHtml;
};
