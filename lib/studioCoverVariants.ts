import type { UsedContextEntry, ZineCoverVariant } from "../types";

export const STUDIO_COVER_DRAFT_KEY = "mimi_draft_covers";

export const parseStoredCoverVariants = (raw: string | null): ZineCoverVariant[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as ZineCoverVariant[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (v) =>
        v &&
        typeof v.url === "string" &&
        typeof v.seed === "string" &&
        typeof v.prompt === "string" &&
        typeof v.selected === "boolean",
    );
  } catch {
    return [];
  }
};

export const persistCoverVariants = (covers: ZineCoverVariant[]) => {
  try {
    localStorage.setItem(STUDIO_COVER_DRAFT_KEY, JSON.stringify(covers));
  } catch {
    /* quota / private mode */
  }
};

/** Promote a strip variant; previous main returns to strip (not deleted). */
export const promoteCoverVariant = (
  covers: ZineCoverVariant[],
  seed: string,
): ZineCoverVariant[] => {
  const target = covers.find((c) => c.seed === seed);
  if (!target) return covers;
  return covers.map((c) => ({ ...c, selected: c.seed === seed }));
};

export const stripVariants = (covers: ZineCoverVariant[]): ZineCoverVariant[] =>
  covers.filter((c) => !c.selected);

export const selectedCoverVariant = (
  covers: ZineCoverVariant[],
): ZineCoverVariant | undefined => covers.find((c) => c.selected);

export const mergeContactSheetBatch = (
  existing: ZineCoverVariant[],
  batch: ZineCoverVariant[],
): ZineCoverVariant[] => {
  const selected = existing.find((c) => c.selected);
  const retained = selected ? [selected] : [];
  const strip = existing.filter((c) => !c.selected);
  const mergedStrip = [...strip, ...batch.map((v) => ({ ...v, selected: false }))];
  // Keep latest four strip slots for 2×2 contact sheet.
  const trimmedStrip = mergedStrip.slice(-4);
  return [...retained, ...trimmedStrip];
};

export interface CompileCoverSignalsInput {
  title?: string;
  input?: string;
  leftPrompt?: string;
  coverSubject?: string;
  coverComposition?: string;
  coverMood?: string;
  coverAvoid?: string;
  activeTags?: string[];
  treatmentLabel?: string;
  approvedContext?: UsedContextEntry[];
}

export const compileCoverPromptFromSignals = (input: CompileCoverSignalsInput): string => {
  const parts: string[] = [];

  if (input.activeTags?.length) {
    parts.push(`Filed signals: ${input.activeTags.join(", ")}`);
  }

  if (input.approvedContext?.length) {
    const ctx = input.approvedContext
      .map((e) => `${e.title}: ${e.content.slice(0, 200)}`)
      .join(" · ");
    parts.push(`Approved context: ${ctx}`);
  }

  if (input.treatmentLabel) {
    parts.push(`Treatment: ${input.treatmentLabel}`);
  }

  if (input.coverSubject) parts.push(`Subject: ${input.coverSubject}`);
  if (input.coverComposition) parts.push(`Composition: ${input.coverComposition}`);
  if (input.coverMood) parts.push(`Mood: ${input.coverMood}`);
  if (input.coverAvoid) parts.push(`Avoid: ${input.coverAvoid}`);

  if (parts.length > 0) {
    return parts.join(" ○ ");
  }

  return (
    input.leftPrompt?.trim() ||
    input.title?.trim() ||
    input.input?.trim().slice(0, 320) ||
    "Editorial zine cover plate with cinematic composition and title-safe negative space"
  );
};
