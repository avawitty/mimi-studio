import { ensureDb } from "./firebase";
import { doc, setDoc } from "firebase/firestore";
import { TasteProfile, TasteEvent, ThimbleItem } from "../types";

export interface CodexState {
  entropy: number;   // exploration / chaos (0–1)
  density: number;   // focus / cohesion (0–1)
  velocity: number;  // drift speed (0–1)
  thimbleSummary?: string; // Breakdown of Thimble activity
  timestamp: number;
}

/**
 * derive entropy + density from interaction patterns
 */
export const deriveCodexState = (
  profile: TasteProfile, 
  recentEvents: TasteEvent[], 
  thimbleItems: ThimbleItem[] = []
): CodexState => {
  const archetypeWeights = profile?.archetype_weights || {};

  // ENTROPY: diversity of archetypes touched recently
  const recentArchetypes = new Set(
    (recentEvents || [])
      .slice(-20)
      .map(e => e?.output_context?.generated_archetype)
      .filter(Boolean)
  );
  const totalArchetypes = Object.keys(archetypeWeights).length || 1;
  const entropy = Math.min(1, recentArchetypes.size / totalArchetypes);

  // DENSITY: concentration of interaction on dominant archetype
  const weights = Object.values(archetypeWeights);
  const maxWeight = Math.max(...weights, 0.01);
  const meanWeight = weights.reduce((a, b) => a + b, 0) / (weights.length || 1);
  const density = Math.min(1, maxWeight / (meanWeight + 0.01));

  // VELOCITY: how fast the taste is shifting
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentDrifts = (profile?.audit_history || [])
    .filter(d => d.timestamp > oneWeekAgo);
  const velocity = Math.min(1, recentDrifts.length / 5);

  const thimbleSummary = thimbleItems.length > 0 
    ? `You have ${thimbleItems.length} items in your Thimble boards, including ${thimbleItems[0].title || 'an item'}.`
    : "Your Thimble is empty.";

  return {
    entropy,
    density,
    velocity,
    thimbleSummary,
    timestamp: Date.now()
  };
};

export const saveCodexState = async (userId: string, codex: CodexState): Promise<void> => {
  try {
    const db = await ensureDb();
    await setDoc(doc(db, "users", userId, "codex", "current"), codex);
  } catch (error) {
    console.warn("MIMI // Codex Save Failed:", error);
  }
};
