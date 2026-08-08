import { useEffect } from "react";

export interface SEOData {
  title: string;
  description: string;
  imageUrl: string;
  authorName: string;
  publishDate: string;
  url?: string;
}

const upsertMeta = (selector: string, attributes: Record<string, string>) => {
  if (typeof document === "undefined") return;
  let node = document.querySelector(selector) as HTMLMetaElement | null;
  if (!node) {
    node = document.createElement("meta");
    const key = attributes.property ? "property" : "name";
    node.setAttribute(key, attributes.property || attributes.name || "");
    document.head.appendChild(node);
  }
  Object.entries(attributes).forEach(([key, value]) => {
    if (key !== "property" && key !== "name") node?.setAttribute(key, value);
  });
  if (attributes.content) node.setAttribute("content", attributes.content);
};

export const setZineMetaTags = (data: SEOData) => {
  if (typeof document === "undefined") return;

  document.title = `${data.title} | Mimi`;
  upsertMeta('meta[name="description"]', { name: "description", content: data.description });

  const pageUrl = data.url || window.location.href;
  upsertMeta('meta[property="og:title"]', { property: "og:title", content: data.title });
  upsertMeta('meta[property="og:description"]', { property: "og:description", content: data.description });
  upsertMeta('meta[property="og:image"]', { property: "og:image", content: data.imageUrl });
  upsertMeta('meta[property="og:url"]', { property: "og:url", content: pageUrl });
  upsertMeta('meta[property="og:type"]', { property: "og:type", content: "article" });
  upsertMeta('meta[name="twitter:card"]', { name: "twitter:card", content: "summary_large_image" });
  upsertMeta('meta[name="twitter:title"]', { name: "twitter:title", content: data.title });
  upsertMeta('meta[name="twitter:description"]', { name: "twitter:description", content: data.description });
  upsertMeta('meta[name="twitter:image"]', { name: "twitter:image", content: data.imageUrl });

  const existingScript = document.getElementById("mimi-seo-jsonld");
  if (existingScript) existingScript.remove();

  const script = document.createElement("script");
  script.id = "mimi-seo-jsonld";
  script.type = "application/ld+json";
  script.text = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    headline: data.title,
    description: data.description,
    image: data.imageUrl,
    datePublished: data.publishDate,
    author: {
      "@type": "Person",
      name: data.authorName,
      jobTitle: "Aesthetic Curator",
    },
    publisher: {
      "@type": "Organization",
      name: "Mimi",
      logo: {
        "@type": "ImageObject",
        url: "https://raw.githubusercontent.com/Aris-A-C/mimi-assets/main/mimi_logo_new.png",
      },
    },
  });
  document.head.appendChild(script);
};

export const setPublicProfileMetaTags = (data: {
  title: string;
  description: string;
  imageUrl: string;
  url?: string;
}) => {
  if (typeof document === "undefined") return;

  document.title = `${data.title} | Mimi`;
  upsertMeta('meta[name="description"]', { name: "description", content: data.description });

  const pageUrl = data.url || window.location.href;
  upsertMeta('meta[property="og:title"]', { property: "og:title", content: data.title });
  upsertMeta('meta[property="og:description"]', { property: "og:description", content: data.description });
  upsertMeta('meta[property="og:image"]', { property: "og:image", content: data.imageUrl });
  upsertMeta('meta[property="og:url"]', { property: "og:url", content: pageUrl });
  upsertMeta('meta[property="og:type"]', { property: "og:type", content: "profile" });
  upsertMeta('meta[name="twitter:card"]', { name: "twitter:card", content: "summary_large_image" });
  upsertMeta('meta[name="twitter:title"]', { name: "twitter:title", content: data.title });
  upsertMeta('meta[name="twitter:description"]', { name: "twitter:description", content: data.description });
  upsertMeta('meta[name="twitter:image"]', { name: "twitter:image", content: data.imageUrl });
};

/** @deprecated Use useZineSEO instead */
export const injectZineSEO = (data: SEOData) => {
  useEffect(() => {
    setZineMetaTags(data);
    return () => {
      const scriptToRemove = document.getElementById("mimi-seo-jsonld");
      if (scriptToRemove) scriptToRemove.remove();
    };
  }, [data.title, data.description, data.imageUrl, data.authorName, data.publishDate, data.url]);
};

export const useZineSEO = (data: SEOData | null) => {
  useEffect(() => {
    if (!data) return;
    setZineMetaTags(data);
    return () => {
      const scriptToRemove = document.getElementById("mimi-seo-jsonld");
      if (scriptToRemove) scriptToRemove.remove();
    };
  }, [data?.title, data?.description, data?.imageUrl, data?.authorName, data?.publishDate, data?.url]);
};

export interface SchemaOrgData {
  context: string;
  type: string;
  name: string;
  description: string;
  logo?: string;
  url: string;
}

export function injectJSONLD(viewMode: string, docUrl: string = "https://www.mimi.you") {
  let schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Mimi",
    url: docUrl,
    logo: `${docUrl}/logo.png`,
    description: "A structured independent editorial studio for taste-driven creator communities.",
    sameAs: ["https://instagram.com/mimizine", "https://github.com/mimizine"],
  };

  switch (viewMode) {
    case "editorial-home":
      schema = {
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        headline: "Mimi // Tactile Monoliths on the Latent Grid",
        datePublished: "2026-05-24T00:00:00Z",
        dateModified: "2026-05-24T01:30:00Z",
        description:
          "Independent analytical essays mapping soft brutalism, concrete layout geometries and defensive visual curation layers.",
        author: {
          "@type": "Person",
          name: "Anastasia Moreau",
          jobTitle: "Lead Curator",
        },
        publisher: {
          "@type": "Organization",
          name: "Mimi",
          logo: {
            "@type": "ImageObject",
            url: `${docUrl}/logo.png`,
          },
        },
      };
      break;
    case "archival":
      schema = {
        "@context": "https://schema.org",
        "@type": "DataCatalog",
        name: "Mimi Curation Archive & Library",
        description:
          "Searchable, filterable structural indices organizing flagship essays, briefings, and subculture evidence clips.",
        provider: {
          "@type": "Organization",
          name: "Mimi Engine",
        },
      };
      break;
    case "publisher":
      schema = {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "Publisher Intelligence Console",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web-Based",
        description:
          "High-fidelity instrumentation platform monitoring newsletters deliverability, reach metrics, retention curves and active B2B sponsor bookings.",
      };
      break;
    default:
      break;
  }

  try {
    let scriptNode = document.getElementById("mimi-jsonld") as HTMLScriptElement;
    if (!scriptNode) {
      scriptNode = document.createElement("script");
      scriptNode.id = "mimi-jsonld";
      scriptNode.type = "application/ld+json";
      document.head.appendChild(scriptNode);
    }
    scriptNode.textContent = JSON.stringify(schema, null, 2);
  } catch (err) {
    console.warn("MIMI // Machine metadata automation offline in non-browser context:", err);
  }
}
