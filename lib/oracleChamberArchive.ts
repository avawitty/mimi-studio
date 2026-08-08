import type { MemoryAtom, PocketItem } from "../types";
import { fetchPocketItems } from "../services/firebaseUtils";
import { fetchMemoryAtoms } from "../services/memoryService";
import { getLocalPocket } from "../services/localArchive";

export type ChamberEntity = "mimi" | "cyrus" | "synthesis" | "unknown";

export interface ChamberConversationReport {
  id: string;
  title: string;
  entity: ChamberEntity;
  preview: string;
  fullText: string;
  timestamp: number;
  source: string;
  tags: string[];
}

export interface ConversationThemeSignal {
  label: string;
  score: number;
  kind: "tag" | "lexeme" | "profile";
}

const STOP_WORDS = new Set([
  "about",
  "after",
  "again",
  "also",
  "been",
  "being",
  "could",
  "from",
  "have",
  "into",
  "just",
  "like",
  "more",
  "most",
  "only",
  "other",
  "over",
  "some",
  "such",
  "than",
  "that",
  "their",
  "them",
  "then",
  "there",
  "these",
  "they",
  "this",
  "through",
  "very",
  "what",
  "when",
  "where",
  "which",
  "while",
  "with",
  "would",
  "your",
  "oracle",
  "chamber",
  "mimi",
  "cyrus",
]);

function inferChamberEntity(title: string, source: string): ChamberEntity {
  const haystack = `${title} ${source}`.toLowerCase();
  if (haystack.includes("synthesis")) return "synthesis";
  if (haystack.includes("cyrus")) return "cyrus";
  if (haystack.includes("mimi")) return "mimi";
  return "unknown";
}

function pocketMetadata(item: PocketItem): Record<string, unknown> {
  const content = item.content as Record<string, unknown> | string | null | undefined;
  if (content && typeof content === "object" && content.metadata) {
    return content.metadata as Record<string, unknown>;
  }
  return {};
}

function extractPocketText(item: PocketItem): string {
  const content = item.content;
  if (typeof content === "string") return content;
  if (content && typeof content === "object") {
    if (typeof content.content === "string") return content.content;
    if (typeof content.text === "string") return content.text;
  }
  return item.notes ?? "";
}

export function isOracleChamberPocketItem(item: PocketItem): boolean {
  const meta = pocketMetadata(item);
  const source = String(meta.source ?? item.source ?? "");
  const title = String(meta.title ?? item.title ?? "");
  const tagHit = (item.tags ?? []).some((tag) => /oracle|chamber/i.test(tag));
  return (
    /oracle/i.test(source) ||
    /chamber log/i.test(title) ||
    tagHit
  );
}

function isOracleMemoryAtom(atom: MemoryAtom): boolean {
  if (atom.signalType === "conversation_log" || atom.signalType === "dialogue_paste") {
    return true;
  }
  const source = atom.source ?? "";
  if (/oracle/i.test(source)) return true;
  return (atom.tags ?? []).some((tag) =>
    ["conversation", "dialogue", "oracle", "chamber"].includes(tag.toLowerCase()),
  );
}

export function chamberReportFromPocketItem(item: PocketItem): ChamberConversationReport | null {
  if (item.type !== "text" && item.type !== "script") return null;
  if (!isOracleChamberPocketItem(item)) return null;

  const meta = pocketMetadata(item);
  const title = String(meta.title ?? item.title ?? "Chamber transmission");
  const source = String(meta.source ?? item.source ?? "Oracle Chamber");
  const fullText = extractPocketText(item).trim();
  if (!fullText) return null;

  return {
    id: `pocket_${item.id}`,
    title,
    entity: inferChamberEntity(title, source),
    preview: fullText.slice(0, 220),
    fullText,
    timestamp: item.savedAt ?? item.timestamp ?? Date.now(),
    source,
    tags: item.tags ?? [],
  };
}

export function chamberReportFromMemoryAtom(atom: MemoryAtom): ChamberConversationReport | null {
  if (!isOracleMemoryAtom(atom)) return null;
  const fullText = atom.content?.trim() ?? "";
  if (!fullText) return null;

  const title = atom.title ?? atom.source ?? "Captured dialogue";
  const source = atom.source ?? "Scribe memory";

  return {
    id: `atom_${atom.id}`,
    title,
    entity: inferChamberEntity(title, source),
    preview: fullText.slice(0, 220),
    fullText,
    timestamp: atom.timestamp ?? Date.now(),
    source,
    tags: atom.tags ?? [],
  };
}

export async function loadChamberConversationReports(
  userId: string,
): Promise<ChamberConversationReport[]> {
  const [localPocket, cloudPocket, atoms] = await Promise.all([
    getLocalPocket().catch((): PocketItem[] | null => null),
    userId && userId !== "ghost"
      ? fetchPocketItems(userId).catch(() => [] as PocketItem[])
      : Promise.resolve([] as PocketItem[]),
    userId && userId !== "ghost"
      ? fetchMemoryAtoms(userId).catch(() => [] as MemoryAtom[])
      : Promise.resolve([] as MemoryAtom[]),
  ]);

  const pocketById = new Map<string, PocketItem>();
  for (const item of [...(localPocket ?? []), ...cloudPocket]) {
    pocketById.set(item.id, item);
  }

  const reports: ChamberConversationReport[] = [];
  const seen = new Set<string>();

  for (const item of pocketById.values()) {
    const report = chamberReportFromPocketItem(item);
    if (!report || seen.has(report.id)) continue;
    seen.add(report.id);
    reports.push(report);
  }

  for (const atom of atoms) {
    const report = chamberReportFromMemoryAtom(atom);
    if (!report || seen.has(report.id)) continue;
    seen.add(report.id);
    reports.push(report);
  }

  return reports.sort((a, b) => b.timestamp - a.timestamp);
}

export function deriveConversationThemes(
  reports: ChamberConversationReport[],
  profileKeywords: string[] = [],
): ConversationThemeSignal[] {
  const scores = new Map<string, ConversationThemeSignal>();

  const bump = (label: string, delta: number, kind: ConversationThemeSignal["kind"]) => {
    const key = label.toLowerCase();
    const existing = scores.get(key);
    if (existing) {
      existing.score += delta;
      return;
    }
    scores.set(key, { label, score: delta, kind });
  };

  for (const keyword of profileKeywords) {
    const trimmed = keyword.trim();
    if (trimmed.length < 3) continue;
    bump(trimmed, 1.5, "profile");
  }

  for (const report of reports) {
    for (const tag of report.tags) {
      const trimmed = tag.trim();
      if (trimmed.length < 3) continue;
      bump(trimmed, 2, "tag");
    }

    const tokens = report.fullText.toLowerCase().match(/\b[a-z][a-z'-]{3,}\b/g) ?? [];
    for (const token of tokens) {
      if (STOP_WORDS.has(token)) continue;
      bump(token, 1, "lexeme");
    }
  }

  return [...scores.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, 14);
}

export function formatChamberTimestamp(ms: number): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(ms);
  } catch {
    return new Date(ms).toLocaleString();
  }
}
