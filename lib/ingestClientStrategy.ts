export interface IngestScrapePayload {
  url: string;
  title: string;
  description: string;
  heroImage: string;
  source: string;
}

export interface ClientStrategyShape {
  clientName: string;
  tagline: string;
  wedgeFocus: number;
  editorialOrthodoxy: number;
  dataSovereignty: boolean;
  thesis: {
    chapter: string;
    title: string;
    summary1: string;
    summary2: string;
    bullets: string[];
  };
  wedge: {
    title: string;
    summary: string;
  };
  technical: {
    pipelineName: string;
    step1: string;
    step2: string;
    step3: string;
  };
  monetization: {
    tier1Title: string;
    tier1Description: string;
    tier2Title: string;
    tier2Description: string;
  };
  roadmap: Array<{ id: string; title: string; description: string; checked: boolean }>;
}

export const mapScrapeToClientStrategy = (
  scrape: IngestScrapePayload,
  baseline: ClientStrategyShape,
): ClientStrategyShape => {
  const host = scrape.source || new URL(scrape.url).hostname.replace(/^www\./, "");
  const brandName = scrape.title.split(/[|\-–—]/)[0]?.trim() || host;
  const description =
    scrape.description ||
    `Strategic positioning draft for ${brandName}, refracted from public web signals at ${host}.`;

  const sentences = description
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    ...baseline,
    clientName: brandName,
    tagline: description.slice(0, 160),
    thesis: {
      chapter: `CHAPTER I // ${host.toUpperCase()} SIGNAL`,
      title: scrape.title || `${brandName} Brand Thesis`,
      summary1: sentences[0] || description,
      summary2: sentences[1] || `Source refracted from ${scrape.url}.`,
      bullets: sentences.slice(2, 5).length
        ? sentences.slice(2, 5)
        : [
            `Primary domain: ${host}`,
            scrape.heroImage ? "Hero imagery detected for visual moodboard seeding." : "No hero imagery — text-first positioning.",
            "Wedge calibrated from public positioning copy.",
          ],
    },
    wedge: {
      title: `${brandName} Entry Wedge`,
      summary: description,
    },
    technical: {
      ...baseline.technical,
      step1: `URL ingest: ${scrape.url}`,
      step2: scrape.heroImage ? `Hero asset: ${scrape.heroImage}` : "Text-only scrape — no hero asset",
      step3: "Structured ClientStrategy memo hydrated for Intel Hub review",
    },
  };
};
