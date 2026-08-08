/**
 * Curiosity tracking contract checks.
 * Run: npm run verify:curiosity-tracking
 */
import {
  buildCuriosityRecord,
  safeParseCuriosityPatternReport,
  safeParseCuriosityRecord,
} from "../schemas/curiosityContracts";
import {
  compileCuriosityPatternReport,
  deriveCuriosityThemes,
} from "../lib/curiosity/curiosityAnalytics";
import { composeScryQuery } from "../services/scryService";
import { composeMesopicQuestion } from "../services/mesopicLensService";

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

const record = buildCuriosityRecord({
  source: "mesopic-lens",
  question: "What creative direction am I missing?",
  curiosityIds: ["direction", "patterns"],
  webCitationCount: 3,
  celestialEnabled: true,
});
safeParseCuriosityRecord(record);
assert(record.themes.length >= 0, "themes field present");
assert(record.source === "mesopic-lens", "source set");

const scryRecord = buildCuriosityRecord({
  source: "scry",
  question: "Saturation chic drift signals",
});
assert(scryRecord.source === "scry", "scry source");

const themes = deriveCuriosityThemes(
  "Why do I keep returning to monochrome tailoring patterns?",
);
assert(themes.some((t) => t.includes("monochrome") || t.includes("tailoring")), "theme tokens");

const report = compileCuriosityPatternReport([
  record,
  { ...scryRecord, createdAt: Date.now() - 1000 },
  {
    ...record,
    id: "dup-theme",
    question: "What patterns keep repeating in my wardrobe?",
    createdAt: Date.now() - 2000,
  },
]);
safeParseCuriosityPatternReport(report);
assert(report.totalQuestions === 3, "window count");
assert(report.sourceBreakdown["mesopic-lens"] === 2, "mesopic breakdown");
assert(report.sourceBreakdown.scry === 1, "scry breakdown");
assert(report.narrativeSummary.length > 0, "narrative");

const composedScry = composeScryQuery("ghost question", ["wear"], "custom thread");
assert(composedScry.includes("ghost question"), "scry query base");
assert(composedScry.includes("What should I wear?"), "scry curiosity chip");

const composedMesopic = composeMesopicQuestion("twilight mood", ["patterns"], "");
assert(composedMesopic.includes("patterns"), "mesopic curiosity");

console.log("verify:curiosity-tracking passed");
