/**
 * Deterministic curiosity pattern extraction — no costume certainty.
 */
import type { CuriosityPromptId } from "../../services/tailorEvidenceIntake";
import { CURIOSITY_PROMPTS } from "../../services/tailorEvidenceIntake";
import type {
  CuriosityPatternReport,
  CuriosityRecord,
  CuriositySource,
} from "../../schemas/curiosityContracts";

const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "but",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "with",
  "by",
  "from",
  "as",
  "is",
  "was",
  "are",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "could",
  "should",
  "may",
  "might",
  "must",
  "shall",
  "can",
  "need",
  "dare",
  "ought",
  "used",
  "i",
  "me",
  "my",
  "we",
  "our",
  "you",
  "your",
  "it",
  "its",
  "they",
  "them",
  "their",
  "what",
  "which",
  "who",
  "whom",
  "this",
  "that",
  "these",
  "those",
  "am",
  "how",
  "why",
  "when",
  "where",
  "about",
  "into",
  "through",
  "during",
  "before",
  "after",
  "above",
  "below",
  "up",
  "down",
  "out",
  "off",
  "over",
  "under",
  "again",
  "further",
  "then",
  "once",
  "here",
  "there",
  "all",
  "each",
  "few",
  "more",
  "most",
  "other",
  "some",
  "such",
  "no",
  "nor",
  "not",
  "only",
  "own",
  "same",
  "so",
  "than",
  "too",
  "very",
  "just",
  "also",
  "now",
  "mimi",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

function extractThemesFromQuestion(question: string): string[] {
  const tokens = tokenize(question);
  const bigrams: string[] = [];
  for (let i = 0; i < tokens.length - 1; i++) {
    bigrams.push(`${tokens[i]} ${tokens[i + 1]}`);
  }
  const singles = tokens.slice(0, 6);
  return [...new Set([...bigrams.slice(0, 3), ...singles])].slice(0, 5);
}

export function deriveCuriosityThemes(question: string): string[] {
  return extractThemesFromQuestion(question);
}

export function compileCuriosityPatternReport(
  records: CuriosityRecord[],
  options?: { windowDays?: number },
): CuriosityPatternReport {
  const windowDays = options?.windowDays ?? 90;
  const cutoff = Date.now() - windowDays * 24 * 60 * 60 * 1000;
  const inWindow = records.filter((r) => r.createdAt >= cutoff);

  const sourceBreakdown: Record<CuriositySource, number> = {
    "mesopic-lens": 0,
    scry: 0,
  };
  const chipFrequency: Record<string, number> = {};
  const themeMap = new Map<string, { count: number; samples: string[] }>();

  for (const record of inWindow) {
    sourceBreakdown[record.source] += 1;
    for (const id of record.curiosityIds ?? []) {
      chipFrequency[id] = (chipFrequency[id] ?? 0) + 1;
    }
    const themes =
      record.themes.length > 0 ? record.themes : deriveCuriosityThemes(record.question);
    for (const theme of themes) {
      const existing = themeMap.get(theme) ?? { count: 0, samples: [] };
      existing.count += 1;
      if (existing.samples.length < 3 && !existing.samples.includes(record.question)) {
        existing.samples.push(record.question);
      }
      themeMap.set(theme, existing);
    }
  }

  const recurringThemes = [...themeMap.entries()]
    .filter(([, v]) => v.count >= 2)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 8)
    .map(([theme, v]) => ({
      theme,
      count: v.count,
      sampleQuestions: v.samples,
    }));

  const topChip = Object.entries(chipFrequency).sort((a, b) => b[1] - a[1])[0];
  const topChipLabel = topChip
    ? CURIOSITY_PROMPTS.find((p) => p.id === topChip[0])?.label ?? topChip[0]
    : null;

  let narrativeSummary: string;
  if (inWindow.length === 0) {
    narrativeSummary =
      "No curiosity records in this window yet. Ask a question in Mesopic Lens or Scry to begin tracing twilight patterns.";
  } else if (recurringThemes.length === 0) {
    narrativeSummary = `${inWindow.length} question${inWindow.length === 1 ? "" : "s"} logged — themes are still forming. Keep asking; patterns emerge after repeated motifs.`;
  } else {
    const lead = recurringThemes[0];
    const chipNote = topChipLabel
      ? ` Your most selected curiosity chip is “${topChipLabel}”.`
      : "";
    narrativeSummary = `Across ${inWindow.length} questions, “${lead.theme}” recurred ${lead.count} times — a mesopic thread worth following.${chipNote}`;
  }

  return {
    generatedAt: Date.now(),
    windowDays,
    totalQuestions: inWindow.length,
    sourceBreakdown,
    curiosityChipFrequency: chipFrequency,
    recurringThemes,
    narrativeSummary,
  };
}
