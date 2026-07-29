/**
 * Manual / caller-supplied sources (Phase 2).
 */

import type {
  SourceAcquisitionProvider,
  SourceAcquisitionRequest,
  SourceAcquisitionResult,
} from "../SourceAcquisitionProvider";
import { emptyAcquisitionResult } from "../SourceAcquisitionProvider";

export class ManualSourceProvider implements SourceAcquisitionProvider {
  readonly id = "manual";
  readonly label = "Manual source provider";

  isAvailable(): boolean {
    return true;
  }

  async acquire(request: SourceAcquisitionRequest): Promise<SourceAcquisitionResult> {
    const urls = request.sourceUrls ?? [];
    if (urls.length === 0) {
      return emptyAcquisitionResult("empty", ["No manual source URLs provided."]);
    }

    const now = new Date().toISOString();
    const sources = urls.slice(0, request.maxItems).map((url, index) => ({
      uri: url,
      capturedAt: now,
      title: url,
      sourceType: "journalism" as const,
      text: undefined as string | undefined,
      provenance: { provider: this.id, index },
    }));

    return {
      status: "partial",
      sources,
      providerRuns: [{ provider: this.id, count: sources.length }],
      failures: [],
      warnings: [
        "Manual provider records URLs only; content extraction happens in later pipeline stages.",
      ],
    };
  }
}
