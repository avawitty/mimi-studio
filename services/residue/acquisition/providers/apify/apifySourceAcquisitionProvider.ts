/**
 * Optional Apify acquisition adapter — Phase 9 live implementation.
 * Uses `apify-client` (not the `apify` Actor SDK).
 * Injectable client for offline verify; no network in CI.
 */

import type {
  SourceAcquisitionProvider,
  SourceAcquisitionRequest,
  SourceAcquisitionResult,
} from "../../SourceAcquisitionProvider";
import { emptyAcquisitionResult } from "../../SourceAcquisitionProvider";
import {
  getResidueApifyClient,
  readApifyToken,
  type ResidueApifyClient,
} from "./apifyClient";
import { resolveResidueApifyActorId } from "./actorRegistry";
import { mapApifyDatasetItemsToAcquiredSources } from "./mapApifyDatasetItems";

export type ApifySourceAcquisitionProviderOptions = {
  /** Explicit token (defaults to process.env.APIFY_TOKEN). */
  token?: string;
  /** Injected client for tests / offline mapping coverage. */
  client?: ResidueApifyClient;
  /** Force disabled even if a token exists (verify / dry-run). */
  forceDisabled?: boolean;
  /** Override Actor id (defaults to RESIDUE_APIFY_ACTOR_ID / APIFY_ACTOR_ID / rag-web-browser). */
  actorId?: string;
};

export class ApifySourceAcquisitionProvider implements SourceAcquisitionProvider {
  readonly id = "apify";
  readonly label = "Apify Actor source acquisition";

  private readonly token?: string;
  private readonly client?: ResidueApifyClient;
  private readonly forceDisabled: boolean;
  private readonly actorId: string;

  constructor(options: ApifySourceAcquisitionProviderOptions = {}) {
    this.token = readApifyToken(options.token);
    this.client = options.client;
    this.forceDisabled = Boolean(options.forceDisabled);
    this.actorId = options.actorId || resolveResidueApifyActorId();
  }

  isAvailable(): boolean {
    if (this.forceDisabled) return false;
    return Boolean(this.token || this.client);
  }

  async acquire(request: SourceAcquisitionRequest): Promise<SourceAcquisitionResult> {
    if (this.forceDisabled || (!this.token && !this.client)) {
      return emptyAcquisitionResult("disabled", [
        "APIFY_TOKEN not provided. Apify source acquisition disabled.",
        "Set APIFY_TOKEN in Cloud Agents / Vercel / .env.local to enable Phase 9 acquisition.",
      ]);
    }

    const inquiry = request.inquiry.trim();
    if (!inquiry) {
      return emptyAcquisitionResult("failed", [], ["Inquiry is required for Apify acquisition."]);
    }

    const maxItems = Math.min(Math.max(request.maxItems ?? 8, 1), 12);
    const waitSecs = Math.min(
      35,
      Math.max(
        10,
        Number(
          (typeof process !== "undefined" && process.env.APIFY_WAIT_SECS) || 35,
        ) || 35,
      ),
    );

    try {
      const client = this.client ?? getResidueApifyClient(this.token!);
      const run = await client.actor(this.actorId).call(
        {
          query: buildApifyQuery(inquiry, request),
          maxResults: Math.min(maxItems, 5),
          outputFormats: ["markdown"],
          requestTimeoutSecs: 20,
          scrapingTool:
            String(
              (typeof process !== "undefined" && process.env.APIFY_SCRAPING_TOOL) ||
                "raw-http",
            ).trim() || "raw-http",
          dynamicContentWaitSecs: 5,
          removeCookieWarnings: false,
        },
        { waitSecs },
      );

      if (run.status && run.status !== "SUCCEEDED") {
        return emptyAcquisitionResult(
          "failed",
          [`Apify Actor run status: ${run.status}`],
          [`Apify acquisition failed with status ${run.status}`],
        );
      }
      if (!run.defaultDatasetId) {
        return emptyAcquisitionResult(
          "failed",
          [],
          ["Apify run succeeded but returned no defaultDatasetId."],
        );
      }

      const { items } = await client.dataset(run.defaultDatasetId).listItems({
        limit: maxItems,
      });
      const sources = mapApifyDatasetItemsToAcquiredSources(items || [], {
        actorId: this.actorId,
        maxItems,
        defaultSourceType: request.mode === "emotional" ? "journalism" : "journalism",
      });

      if (sources.length === 0) {
        return {
          status: "empty",
          sources: [],
          providerRuns: [
            {
              provider: this.id,
              actorId: this.actorId,
              runId: run.id,
              datasetId: run.defaultDatasetId,
              count: 0,
            },
          ],
          failures: [],
          warnings: ["Apify returned no mappable dataset items for this inquiry."],
        };
      }

      return {
        status: sources.length < maxItems ? "partial" : "success",
        sources,
        providerRuns: [
          {
            provider: this.id,
            actorId: this.actorId,
            runId: run.id,
            datasetId: run.defaultDatasetId,
            count: sources.length,
            mode: request.mode,
          },
        ],
        failures: [],
        warnings: [
          `Live Apify acquisition via ${this.actorId}. Treat scraped text as Layer B/C evidence pending review.`,
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn("MIMI // Residue Apify acquisition failed:", message);
      return emptyAcquisitionResult(
        "failed",
        [`Apify acquisition error: ${message}`],
        [message],
      );
    }
  }
}

export function createApifySourceAcquisitionProvider(
  options?: ApifySourceAcquisitionProviderOptions,
): ApifySourceAcquisitionProvider {
  return new ApifySourceAcquisitionProvider(options);
}

function buildApifyQuery(
  inquiry: string,
  request: SourceAcquisitionRequest,
): string {
  const terms = (request.searchTerms || []).filter(Boolean).join(" ");
  const urls = (request.sourceUrls || []).slice(0, 3).join(" ");
  return [inquiry, terms, urls].filter(Boolean).join(" ").trim();
}
