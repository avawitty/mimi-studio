import type { AestheticSignature, UserProfile } from "../../types";

const DEFAULT_OG_IMAGE =
  "https://raw.githubusercontent.com/Aris-A-C/mimi-assets/main/mimi_logo_new.png";

export type PublicSignatureSeo = {
  handle: string;
  title: string;
  description: string;
  imageUrl: string;
  pageUrl: string;
};

/** Published signatures only — approved private readings stay off public routes. */
export function extractPublishedPublicSignature(
  profile: Pick<UserProfile, "publicSignature"> | Record<string, unknown> | null | undefined,
): AestheticSignature | null {
  if (!profile) return null;
  const snapshot = (profile as UserProfile).publicSignature;
  if (!snapshot?.signature || !snapshot.publishedAt) return null;
  return snapshot.signature;
}

/** @deprecated Use extractPublishedPublicSignature — approval alone is not publication. */
export const extractApprovedPublicSignature = extractPublishedPublicSignature;

export function publicSignaturePlateTitle(sig: AestheticSignature): string {
  return sig.primaryAxis || sig.motifs?.[0] || "Aesthetic signature";
}

export function publicSignatureDescription(
  sig: AestheticSignature,
  handle: string,
): string {
  const thesis = sig.reading?.thesis?.trim();
  if (thesis) return thesis.slice(0, 280);
  const motifs = (sig.motifs ?? []).slice(0, 4).join(" · ");
  if (motifs) return `${motifs} — taste signature for @${handle} on Mimi.`;
  return `Collectible aesthetic signature plate for @${handle} on Mimi.`;
}

export function buildPublicSignatureSeo(
  handle: string,
  sig: AestheticSignature | null,
  opts?: { baseUrl?: string; imageFallback?: string },
): PublicSignatureSeo {
  const normalized = handle.trim().toLowerCase().replace(/^@/, "");
  const base = (opts?.baseUrl || "https://www.mimi.you").replace(/\/$/, "");
  const pageUrl = `${base}/u/${normalized}/signature`;

  if (!sig) {
    return {
      handle: normalized,
      title: `@${normalized} · Signature`,
      description: `Taste signature for @${normalized} on Mimi.`,
      imageUrl: opts?.imageFallback || DEFAULT_OG_IMAGE,
      pageUrl,
    };
  }

  const plateTitle = publicSignaturePlateTitle(sig);
  return {
    handle: normalized,
    title: `${plateTitle} · @${normalized}`,
    description: publicSignatureDescription(sig, normalized),
    imageUrl: opts?.imageFallback || DEFAULT_OG_IMAGE,
    pageUrl,
  };
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderPublicSignatureOgHtml(seo: PublicSignatureSeo): string {
  const title = escapeHtml(`${seo.title} | Mimi`);
  const description = escapeHtml(seo.description);
  const imageUrl = escapeHtml(seo.imageUrl);
  const pageUrl = escapeHtml(seo.pageUrl);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <meta name="description" content="${description}" />
  <meta property="og:title" content="${escapeHtml(seo.title)}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="${imageUrl}" />
  <meta property="og:url" content="${pageUrl}" />
  <meta property="og:type" content="profile" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(seo.title)}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${imageUrl}" />
  <meta http-equiv="refresh" content="0;url=${pageUrl}" />
</head>
<body>
  <p><a href="${pageUrl}">${escapeHtml(seo.title)}</a></p>
</body>
</html>`;
}

export function injectSignatureSeoIntoIndexHtml(
  html: string,
  seo: PublicSignatureSeo,
): string {
  const replaceMeta = (
    source: string,
    propertyValue: string,
    content: string,
    isProperty: boolean,
  ): string => {
    const attr = isProperty ? "property" : "name";
    const newTag = `<meta ${attr}="${propertyValue}" content="${escapeHtml(content)}" />`;
    const regex = new RegExp(
      `<meta\\s+[^>]*?${attr}="${propertyValue}"[^>]*?>`,
      "i",
    );
    if (regex.test(source)) return source.replace(regex, newTag);
    const altAttr = isProperty ? "name" : "property";
    const altRegex = new RegExp(
      `<meta\\s+[^>]*?${altAttr}="${propertyValue}"[^>]*?>`,
      "i",
    );
    if (altRegex.test(source)) return source.replace(altRegex, newTag);
    return source.replace("<head>", `<head>\n    ${newTag}`);
  };

  let modified = html;
  const title = `${seo.title} | Mimi`;
  modified = modified.replace(/<title>.*?<\/title>/gi, `<title>${escapeHtml(title)}</title>`);
  modified = replaceMeta(modified, "description", seo.description, false);
  modified = replaceMeta(modified, "og:title", seo.title, true);
  modified = replaceMeta(modified, "og:description", seo.description, true);
  modified = replaceMeta(modified, "og:image", seo.imageUrl, true);
  modified = replaceMeta(modified, "og:url", seo.pageUrl, true);
  modified = replaceMeta(modified, "og:type", "profile", true);
  modified = replaceMeta(modified, "twitter:card", "summary_large_image", false);
  modified = replaceMeta(modified, "twitter:title", seo.title, false);
  modified = replaceMeta(modified, "twitter:description", seo.description, false);
  modified = replaceMeta(modified, "twitter:image", seo.imageUrl, false);
  modified = replaceMeta(modified, "twitter:url", seo.pageUrl, false);
  return modified;
}
