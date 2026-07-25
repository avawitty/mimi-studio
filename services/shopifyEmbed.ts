export interface ShopifyZineEmbedOptions {
  zineId: string;
  title?: string;
  baseUrl?: string;
  aspectRatio?: "16/9" | "4/3" | "3/4" | "1/1";
  themeMode?: "light" | "dark";
}

const escapeHtmlAttribute = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const normalizeBaseUrl = (baseUrl: string): string =>
  baseUrl.trim().replace(/\/+$/, "");

export const buildPublicZineUrl = (
  zineId: string,
  baseUrl: string,
): string => `${normalizeBaseUrl(baseUrl)}/s/${encodeURIComponent(zineId.trim())}`;

export const generateShopifyEmbedCode = ({
  zineId,
  title = "Mimi Editorial Zine",
  baseUrl = "https://mimizine.app",
  aspectRatio = "16/9",
  themeMode = "light",
}: ShopifyZineEmbedOptions): string => {
  if (!zineId.trim()) {
    throw new Error("A zine ID is required to generate a Shopify embed.");
  }

  const zineUrl = buildPublicZineUrl(zineId, baseUrl);
  const safeTitle = escapeHtmlAttribute(title.trim() || "Mimi Editorial Zine");
  const background = themeMode === "dark" ? "#0c0a09" : "#f7f5ef";
  const border = themeMode === "dark" ? "#292524" : "#e7e5e4";

  return `{% comment %}
  Mimi Zine Embedded Reader
  Paste into a Shopify Custom Liquid block or save as snippets/mimi-zine-embed.liquid.
{% endcomment %}

<div
  class="mimi-zine-embed"
  data-mimi-zine-id="${escapeHtmlAttribute(zineId)}"
  style="position:relative;width:100%;aspect-ratio:${aspectRatio};overflow:hidden;background:${background};border:1px solid ${border};"
>
  <iframe
    src="${escapeHtmlAttribute(zineUrl)}"
    title="${safeTitle}"
    loading="lazy"
    allow="autoplay; clipboard-write; fullscreen"
    style="position:absolute;inset:0;width:100%;height:100%;border:0;"
  ></iframe>
</div>`;
};
