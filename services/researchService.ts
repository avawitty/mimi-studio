export interface TrendSource {
  title: string;
  url: string;
  credibility: number;
}

export interface ForecastTrend {
  format: string;
  velocity: 'Surging' | 'Rising' | 'Decaying';
  score: number;
  sources: TrendSource[];
  analysis: string;
}

export interface ResearchSynthesisResponse {
  synthesis: string;
  trends: ForecastTrend[];
  provider: string; // Tells us which API actually supplied this
}

/**
 * Standardized Pipeline:
 * We map any research API (ThinkingLabs, Exa, Tavily, Perplexity) into our standard `ResearchSynthesisResponse` interface.
 * If you implement the "real" fetch calls, they all pipe their custom JSON schemas into this one format.
 */
export const fetchContentForecast = async (apiKeys?: Record<string, string>): Promise<ResearchSynthesisResponse> => {
  // Determine which API to use based on what keys the user provided
  const hasThinkingLabs = !!apiKeys?.['thinkinglabs'];
  const hasExa = !!apiKeys?.['exa'];
  const hasPerplexity = !!apiKeys?.['perplexity'];
  const hasTavily = !!apiKeys?.['tavily'];

  // This simulates the network layer that unifies responses
  return new Promise((resolve) => {
    setTimeout(() => {
      
      if (hasExa) {
        // Simulated Exa Neural Search Response mapped to our interface
        resolve({
          provider: 'Simulated · Exa Neural Search',
          synthesis: "[Exa Synthesized] The current neural graph shows dense clustering around low-fidelity visual media combined with high-fidelity audio.",
          trends: [
            {
              format: 'High-Fi Audio Overlays',
              velocity: 'Surging',
              score: 92,
              analysis: 'Users are ignoring visuals to listen to high-bitrate environmental soundscapes on TikTok and Reels.',
              sources: [{ title: 'Exa Neural Graph: Trend 992', url: 'https://exa.ai/search/992', credibility: 0.98 }]
            }
          ]
        });
      } else if (hasPerplexity) {
        // Simulated Perplexity Sonar Response mapped to our interface
        resolve({
          provider: 'Simulated · Perplexity Sonar',
          synthesis: "[Perplexity Indexed] Analysis of 10,000 recent tech newsletters indicates a hard pivot towards 'Slow Web' architectures.",
          trends: [
            {
              format: 'Serialized Text Drops',
              velocity: 'Rising',
              score: 85,
              analysis: 'Long-form text broken into multi-day chunks is generating deep engagement.',
              sources: [{ title: 'Perplexity LLM Summarization', url: 'https://perplexity.ai/research', credibility: 0.95 }]
            }
          ]
        });
      } else if (hasTavily) {
        resolve({
          provider: 'Simulated · Tavily Agentic Search',
          synthesis: "[Tavily Agent] Deep web scraping suggests a revival in decentralized, self-hosted blogs interlinked via WebRings.",
          trends: [
            {
              format: 'WebRings & Blogrolls',
              velocity: 'Surging',
              score: 89,
              analysis: 'Curated link-lists are replacing algorithmic discovery for niche aesthetic communities.',
              sources: [{ title: 'Tavily Deep Report', url: 'https://tavily.com/', credibility: 0.92 }]
            }
          ]
        });
      } else {
        // Default to ThinkingLabs (simulated/mock response if no keys, or if thinkinglabs key is present)
        resolve({
          provider: hasThinkingLabs
            ? 'Simulated · ThinkingLabs API'
            : 'Simulated · ThinkingLabs (Mock Mode)',
          synthesis: "Pivot towards artifact-based storytelling. The audience is exhausted by direct address; they prefer to discover meaning through curated, heavily-sourced fragments.",
          trends: [
            {
              format: 'Interactive Archives',
              velocity: 'Surging',
              score: 88,
              analysis: 'Audience retention is 3x higher in environments where users compile and sift through raw semantic data rather than being spoon-fed narratives.',
              sources: [
                 { title: 'The Post-Feed Web Index', url: 'https://research.thinkinglabs.io/post-feed', credibility: 0.94 },
                 { title: 'Q1 Interface Engagement Report', url: 'https://research.thinkinglabs.io/q1-report', credibility: 0.89 }
              ]
            },
            {
              format: 'Raw Audio Diaries',
              velocity: 'Rising',
              score: 65,
              analysis: 'Listeners are gravitating towards unedited, conversational formats that mimic intimate voice memoranda.',
              sources: [
                 { title: 'Acoustic Authenticity Study', url: 'https://research.thinkinglabs.io/audio-authenticity', credibility: 0.91 }
              ]
            }
          ]
        });
      }
    }, 1500);
  });
};
