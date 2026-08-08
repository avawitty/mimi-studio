import type { TasteState } from "../../types";

/**
 * Format a TasteState as a concise prompt segment for generation context.
 * Pure function — safe for server routes (no Firebase client imports).
 */
export function tasteStateToPromptContext(state: TasteState): string {
  const lines: string[] = [];

  if (state.stablePreferences.length > 0) {
    lines.push("CONFIRMED PREFERENCES:");
    for (const a of state.stablePreferences.slice(0, 5)) {
      const concept = a.conceptB
        ? `${a.conceptA} ${a.relation} ${a.conceptB}`
        : `${a.conceptA}`;
      lines.push(`  • ${concept} (confidence: ${(a.confidence * 100).toFixed(0)}%)`);
    }
  }

  if (state.negativePreferences.length > 0) {
    lines.push("AVOIDANCES:");
    for (const a of state.negativePreferences.slice(0, 5)) {
      lines.push(`  • DISLIKES ${a.conceptA} (confidence: ${(a.confidence * 100).toFixed(0)}%)`);
    }
  }

  if (state.emergingPreferences.length > 0) {
    lines.push("EMERGING SIGNALS:");
    for (const a of state.emergingPreferences.slice(0, 3)) {
      lines.push(`  • ${a.conceptA} (signal strength: ${(a.confidence * 100).toFixed(0)}%)`);
    }
  }

  if (state.currentExplorations.length > 0) {
    lines.push(
      "CURRENT EXPLORATIONS: " + state.currentExplorations.map((c) => c.label).join(", "),
    );
  }

  if (state.tensions.length > 0) {
    lines.push("TENSIONS:");
    for (const t of state.tensions.slice(0, 3)) {
      lines.push(`  • ${t.conceptA} ↔ ${t.conceptB}`);
    }
  }

  if (lines.length === 0) return "";
  return lines.join("\n");
}
