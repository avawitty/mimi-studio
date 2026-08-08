/**
 * Client fetch for live collective Mean Median Mode report.
 */

import type { MeanMedianModeReport } from "../../schemas/collectiveIntelligenceContracts";
import { meanMedianModeReportSchema } from "../../schemas/collectiveIntelligenceContracts";

export type CollectiveMmmReportResponse = {
  report: MeanMedianModeReport;
  corpus: {
    zinesScanned: number;
    contributingZines: number;
    signalCount: number;
    windowDays: number;
  };
};

export async function fetchLiveMeanMedianModeReport(
  options?: { days?: number },
): Promise<CollectiveMmmReportResponse | null> {
  try {
    const days = options?.days ?? 7;
    const res = await fetch(`/api/collective/mmm-report?days=${days}`);
    if (!res.ok) return null;
    const data = (await res.json()) as CollectiveMmmReportResponse;
    const parsed = meanMedianModeReportSchema.safeParse(data.report);
    if (!parsed.success) return null;
    return {
      report: parsed.data,
      corpus: data.corpus,
    };
  } catch {
    return null;
  }
}
