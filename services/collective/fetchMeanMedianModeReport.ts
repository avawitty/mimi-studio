/**
 * Client fetch for live collective perception reports (MMM + Mesopic).
 */

import type { MeanMedianModeReport, MesopicReport } from "../../schemas/collectiveIntelligenceContracts";
import {
  meanMedianModeReportSchema,
  mesopicReportSchema,
} from "../../schemas/collectiveIntelligenceContracts";

export type CollectiveMmmReportResponse = {
  report: MeanMedianModeReport;
  mesopic?: MesopicReport;
  corpus: {
    zinesScanned: number;
    contributingZines: number;
    signalCount: number;
    windowDays: number;
  };
};

export const OBSERVATORY_WINDOW_DAYS = [7, 14, 30, 90] as const;
export type ObservatoryWindowDays = (typeof OBSERVATORY_WINDOW_DAYS)[number];

export type CollectiveMmmFetchResult =
  | { kind: "success"; data: CollectiveMmmReportResponse }
  | { kind: "empty" }
  | { kind: "error" };

export async function fetchLiveMeanMedianModeReport(
  options?: { days?: number },
): Promise<CollectiveMmmFetchResult> {
  try {
    const days = options?.days ?? 7;
    const res = await fetch(`/api/collective/mmm-report?days=${days}`);
    if (!res.ok) return { kind: "error" };
    const data = (await res.json()) as CollectiveMmmReportResponse;
    const parsed = meanMedianModeReportSchema.safeParse(data.report);
    if (!parsed.success) return { kind: "error" };
    const mesopicParsed = data.mesopic
      ? mesopicReportSchema.safeParse(data.mesopic)
      : null;
    return {
      kind: "success",
      data: {
        report: parsed.data,
        mesopic: mesopicParsed?.success ? mesopicParsed.data : undefined,
        corpus: data.corpus,
      },
    };
  } catch {
    return { kind: "error" };
  }
}
