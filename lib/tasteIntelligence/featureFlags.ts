/**
 * Taste Intelligence OS v2 feature flags.
 */
export const TASTE_INTELLIGENCE_FLAGS = {
  tasteCalibrationV2: "tasteCalibrationV2",
  tasteNegativeModel: "tasteNegativeModel",
  tasteGraphEditorV2: "tasteGraphEditorV2",
  tasteGraphMergeSplit: "tasteGraphMergeSplit",
  tasteCompiler: "tasteCompiler",
  tasteCritic: "tasteCritic",
  tasteSemanticSearchV2: "tasteSemanticSearchV2",
  tasteSentinelMemory: "tasteSentinelMemory",
  tastePassport: "tastePassport",
  tasteCollaboration: "tasteCollaboration",
  tasteCulturalPositioning: "tasteCulturalPositioning",
  tasteEvaluation: "tasteEvaluation",
} as const;

export type TasteIntelligenceFlag =
  (typeof TASTE_INTELLIGENCE_FLAGS)[keyof typeof TASTE_INTELLIGENCE_FLAGS];

const DEFAULT_FLAGS: Record<TasteIntelligenceFlag, boolean> = {
  tasteCalibrationV2: true,
  tasteNegativeModel: true,
  tasteGraphEditorV2: true,
  tasteGraphMergeSplit: false,
  tasteCompiler: true,
  tasteCritic: true,
  tasteSemanticSearchV2: true,
  tasteSentinelMemory: true,
  tastePassport: true,
  tasteCollaboration: true,
  tasteCulturalPositioning: true,
  tasteEvaluation: true,
};

export function resolveTasteIntelligenceFlag(
  flag: TasteIntelligenceFlag,
  overrides?: Partial<Record<TasteIntelligenceFlag, boolean>>,
): boolean {
  if (overrides && flag in overrides) {
    return Boolean(overrides[flag]);
  }
  if (flag === "tasteGraphMergeSplit") {
    if (typeof import.meta !== "undefined") {
      const viteFlag = import.meta.env?.VITE_TASTE_GRAPH_MERGE_SPLIT;
      if (viteFlag === "1" || viteFlag === "true") return true;
      if (viteFlag === "0" || viteFlag === "false") return false;
    }
  }
  if (typeof localStorage !== "undefined") {
    const raw = localStorage.getItem(`mimi_flag_${flag}`);
    if (raw === "0" || raw === "false") return false;
    if (raw === "1" || raw === "true") return true;
  }
  return DEFAULT_FLAGS[flag];
}

/** Conservative default: private data stays private when flag misconfigured. */
export function isTasteIntelligenceSurfaceEnabled(
  flag: TasteIntelligenceFlag,
  overrides?: Partial<Record<TasteIntelligenceFlag, boolean>>,
): boolean {
  return resolveTasteIntelligenceFlag(flag, overrides);
}
