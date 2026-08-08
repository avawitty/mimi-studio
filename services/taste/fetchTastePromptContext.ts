import { auth } from "../firebaseInit";
import { tasteStateToPromptContext } from "./tasteStateService";
import type { TasteScope, TasteState } from "../../types";

/**
 * Fetch computed taste state from the server and format for generation prompts.
 * Fire-and-forget safe — returns empty string when unsigned or unavailable.
 */
export async function fetchTastePromptContext(
  context?: TasteScope,
  queryText?: string,
): Promise<string> {
  try {
    const user = auth.currentUser;
    if (!user) return "";

    const token = await user.getIdToken();
    const params = new URLSearchParams();
    if (context) params.set("context", context);
    if (queryText?.trim()) params.set("q", queryText.trim().slice(0, 8000));
    const qs = params.toString() ? `?${params.toString()}` : "";
    const response = await fetch(`/api/mimi/taste-state${qs}`, {
      headers: { "x-user-token": `Bearer ${token}` },
    });
    if (!response.ok) return "";

    const payload = (await response.json()) as { state?: TasteState };
    const block = tasteStateToPromptContext(payload.state ?? ({} as TasteState));
    if (!block) return "";

    return `TASTE INTELLIGENCE (approved / inferred — do not invent beyond this):\n${block}`;
  } catch {
    return "";
  }
}
