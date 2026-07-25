import type { UsedContextEntry } from "../types";

export const EDIT_COMPILE_DRAFT_KEY = "mimi_edit_compile_draft";
export const EDIT_COMPILE_EXPORT_KEY = "mimi_edit_compile_export";
export const EDITORIAL_COMPILE_CHANGED = "mimi:editorial-compile-export-changed";

export interface CompileDraft {
  thesis: string;
  lead: string;
  excludedAtomIds: string[];
}

export interface EditorialCompileExport {
  markdown: string;
  thesis: string;
  lead: string;
  fragmentAtomIds: string[];
  compiledAt: number;
}

export function readCompileDraft(): CompileDraft {
  try {
    const raw = localStorage.getItem(EDIT_COMPILE_DRAFT_KEY);
    if (!raw) return { thesis: "", lead: "", excludedAtomIds: [] };
    return JSON.parse(raw) as CompileDraft;
  } catch {
    return { thesis: "", lead: "", excludedAtomIds: [] };
  }
}

export function writeCompileDraft(draft: CompileDraft): void {
  localStorage.setItem(EDIT_COMPILE_DRAFT_KEY, JSON.stringify(draft));
}

export function buildCompileMarkdown(
  thesis: string,
  lead: string,
  entries: UsedContextEntry[],
): string {
  const lines: string[] = ["# Editorial Read", ""];

  if (thesis.trim()) {
    lines.push(`> ${thesis.trim()}`, "");
  }

  if (lead.trim()) {
    lines.push(lead.trim(), "");
  }

  if (entries.length === 0) {
    lines.push("_No approved Scribe atoms in this compile._");
    return lines.join("\n");
  }

  lines.push("## Approved context", "");
  entries.forEach((entry, index) => {
    lines.push(`### ${index + 1}. ${entry.title}`);
    if (entry.source) {
      lines.push(`_Source: ${entry.source}_`, "");
    }
    lines.push(entry.content.trim(), "");
  });

  lines.push("---", `_Compiled in The Edit · ${new Date().toLocaleDateString()}_`);
  return lines.join("\n");
}

export function syncEditorialCompileExport(payload: EditorialCompileExport): void {
  localStorage.setItem(EDIT_COMPILE_EXPORT_KEY, JSON.stringify(payload));
  window.dispatchEvent(new CustomEvent(EDITORIAL_COMPILE_CHANGED));
}

export function getEditorialCompileExport(): EditorialCompileExport | null {
  try {
    const raw = localStorage.getItem(EDIT_COMPILE_EXPORT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as EditorialCompileExport;
    if (!parsed.markdown?.trim()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearEditorialCompileExport(): void {
  localStorage.removeItem(EDIT_COMPILE_EXPORT_KEY);
  window.dispatchEvent(new CustomEvent(EDITORIAL_COMPILE_CHANGED));
}
