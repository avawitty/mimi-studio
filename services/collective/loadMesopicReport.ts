/**
 * Phase 6 — Mesopic Lens report loader.
 * Prototype: labeled demonstration findings only; never mixes with live certainty.
 */

import type { MesopicReport } from "./types";
import {
  DEMO_MESOPIC_REPORT,
  emptyMesopicReport,
} from "../../fixtures/collective/demoMesopicReport";

export type MesopicReportSource = "demonstration" | "empty";

export function loadMesopicReport(
  source: MesopicReportSource = "demonstration",
): MesopicReport {
  if (source === "empty") {
    return emptyMesopicReport();
  }
  return DEMO_MESOPIC_REPORT;
}
