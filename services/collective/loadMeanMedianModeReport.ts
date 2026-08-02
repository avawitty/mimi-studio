/**
 * Load Mean Median Mode report for the Observatory chamber.
 * Prototype: demonstration fixture by default (labeled), or honest empty.
 */

import type { MeanMedianModeReport } from "./types";
import {
  DEMO_MEAN_MEDIAN_MODE_REPORT,
  emptyMeanMedianModeReport,
} from "../../fixtures/collective/demoMeanMedianModeReport";

export type MmmReportSource = "demonstration" | "empty";

/**
 * Prefer demonstration specimen so the instrument strip is reviewable offline.
 * Pass `empty` for honest insufficient state (e.g. tests / flag).
 */
export function loadMeanMedianModeReport(
  source: MmmReportSource = "demonstration",
): MeanMedianModeReport {
  if (source === "empty") {
    return emptyMeanMedianModeReport();
  }
  return DEMO_MEAN_MEDIAN_MODE_REPORT;
}
