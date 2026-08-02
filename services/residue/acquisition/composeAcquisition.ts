/**
 * Compose manual + optional Apify acquisition into SourceReference[].
 */

import { ManualSourceProvider } from "./providers/manualSourceProvider";
import { createApifySourceAcquisitionProvider } from "./providers/apify/apifySourceAcquisitionProvider";
import type { SourceAcquisitionProvider } from "./SourceAcquisitionProvider";
import { normalizeSources } from "../shared/normalizeSources";
import type { ResidueMode, SourceReference } from "../validation";

export async function acquireResidueSources(input: {
  inquiry: string;
  mode: ResidueMode;
  sourceUrls?: string[];
  userNotes?: string[];
  maxItems?: number;
  useApify?: boolean;
  apifyProvider?: SourceAcquisitionProvider;
  now?: string;
}): Promise<{
  sources: SourceReference[];
  warnings: string[];
  providerRuns: Record<string, unknown>[];
  apifyStatus?: string;
}> {
  const maxItems = input.maxItems ?? 25;
  const warnings: string[] = [];
  const providerRuns: Record<string, unknown>[] = [];
  const now = input.now ?? new Date().toISOString();

  const manual = new ManualSourceProvider();
  const manualResult = await manual.acquire({
    inquiry: input.inquiry,
    mode: input.mode,
    sourceUrls: input.sourceUrls,
    maxItems,
  });
  warnings.push(...manualResult.warnings);
  providerRuns.push(...(manualResult.providerRuns as Record<string, unknown>[]));

  let acquired = [...manualResult.sources];
  let apifyStatus: string | undefined;

  if (input.useApify) {
    const apify = input.apifyProvider ?? createApifySourceAcquisitionProvider();
    if (!apify.isAvailable()) {
      warnings.push(
        "Apify acquisition requested but unavailable (APIFY_TOKEN missing or provider disabled).",
      );
      apifyStatus = "disabled";
    } else {
      const apifyResult = await apify.acquire({
        inquiry: input.inquiry,
        mode: input.mode,
        sourceUrls: input.sourceUrls,
        maxItems: Math.min(maxItems, 8),
      });
      apifyStatus = apifyResult.status;
      warnings.push(...apifyResult.warnings);
      if (apifyResult.failures.length) {
        warnings.push(...apifyResult.failures.map((f) => `Apify: ${f}`));
      }
      providerRuns.push(...(apifyResult.providerRuns as Record<string, unknown>[]));
      acquired = [...acquired, ...apifyResult.sources];
    }
  }

  const sources = normalizeSources({
    acquired,
    userNotes: input.userNotes,
    accessedAt: now,
  });

  return { sources, warnings, providerRuns, apifyStatus };
}
