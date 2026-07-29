/**
 * Optional Apify acquisition adapter — Phase 9 live implementation.
 * Phase 2: disabled stub when APIFY_TOKEN is missing or apify-client is not installed.
 *
 * Package note: integration uses `apify-client` (not the `apify` Actor SDK).
 * Do not generate Apify output schemas until a real Actor run produces dataset items.
 */

import type {
  SourceAcquisitionProvider,
  SourceAcquisitionRequest,
  SourceAcquisitionResult,
} from "../../SourceAcquisitionProvider";
import { emptyAcquisitionResult } from "../../SourceAcquisitionProvider";

function readApifyToken(): string | undefined {
  if (typeof process === "undefined") return undefined;
  const token = process.env.APIFY_TOKEN?.trim();
  return token || undefined;
}

export class ApifySourceAcquisitionProvider implements SourceAcquisitionProvider {
  readonly id = "apify";
  readonly label = "Apify Actor source acquisition";

  isAvailable(): boolean {
    return Boolean(readApifyToken());
  }

  async acquire(request: SourceAcquisitionRequest): Promise<SourceAcquisitionResult> {
    if (!this.isAvailable()) {
      return emptyAcquisitionResult(
        "disabled",
        [
          "APIFY_TOKEN not provided. Apify source acquisition disabled.",
          "Set APIFY_TOKEN in Cloud Agents / Vercel / .env.local to enable Phase 9 acquisition.",
        ],
      );
    }

    // Live Actor calls land in Phase 9. Token presence alone is not enough without
    // apify-client + actor registry wiring.
    return emptyAcquisitionResult(
      "disabled",
      [
        "APIFY_TOKEN is present, but the live Apify acquisition client is not wired until Phase 9.",
        `Inquiry received (${request.mode}): acquisition stub only.`,
      ],
    );
  }
}

export function createApifySourceAcquisitionProvider(): ApifySourceAcquisitionProvider {
  return new ApifySourceAcquisitionProvider();
}
