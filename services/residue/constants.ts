/**
 * Mimi Residue Engine — shared constants (Phase 2).
 * Cultural and Emotional modes share these versions and layer definitions.
 */

export const RESIDUE_SCHEMA_VERSION = "1.0.0" as const;
export const RESIDUE_PROMPT_VERSION = "1.0.0-phase9" as const;
export const RESIDUE_ENGINE_ID = "mimi-residue-engine" as const;

/** Evidence quality layers (must be disclosed on claims / confidence summaries). */
export const EVIDENCE_LAYERS = ["A", "B", "C", "D"] as const;
export type EvidenceLayer = (typeof EVIDENCE_LAYERS)[number];

export const EVIDENCE_LAYER_DEFINITIONS: Record<
  EvidenceLayer,
  { label: string; description: string; sourceTypes: readonly string[] }
> = {
  A: {
    label: "Higher-quality evidence",
    description:
      "Peer-reviewed research, systematic reviews, clinical/institutional guidance, established archives, verified primary sources.",
    sourceTypes: ["academic-research", "clinical-guidance", "archive"],
  },
  B: {
    label: "Interpretive and cultural evidence",
    description:
      "Philosophy, memoir, literature, criticism, journalism, cultural analysis.",
    sourceTypes: [
      "philosophy",
      "memoir",
      "literature",
      "journalism",
      "trend-data",
    ],
  },
  C: {
    label: "Community-reported experience",
    description:
      "Reddit, forums, social posts, personal essays, comment threads — evidence of how people describe experiences, not objective proof.",
    sourceTypes: ["reddit", "forum", "social-post", "user-note"],
  },
  D: {
    label: "Model synthesis",
    description:
      "Inferred associations, proposed neighborhoods, semantic grouping, generated summaries. Must be labeled model-proposed when unsupported by A–C.",
    sourceTypes: ["model-proposed"],
  },
};

export const SOURCE_TYPE_TO_LAYER: Record<string, EvidenceLayer> = {
  "academic-research": "A",
  "clinical-guidance": "A",
  archive: "A",
  journalism: "B",
  memoir: "B",
  literature: "B",
  philosophy: "B",
  "trend-data": "B",
  "product-page": "B",
  "uploaded-document": "B",
  reddit: "C",
  forum: "C",
  "social-post": "C",
  "user-note": "C",
  "model-proposed": "D",
};

export const LAYER_QUALITY_WEIGHT: Record<EvidenceLayer, number> = {
  A: 1.0,
  B: 0.75,
  C: 0.45,
  D: 0.2,
};

export const EVIDENCE_STRENGTH_WEIGHT: Record<string, number> = {
  strong: 1.0,
  moderate: 0.7,
  weak: 0.4,
  speculative: 0.2,
};

export const EMOTIONAL_SAFETY_NOTICE =
  "This map organizes possible interpretive neighborhoods found across research, culture, and reported experience. It does not determine what is true about you or provide a diagnosis.";

export const EMOTIONAL_FORBIDDEN_CLAIM_PATTERNS = [
  /\byou are\b/i,
  /\byou have\b/i,
  /\bthis proves\b/i,
  /\bthe real reason is\b/i,
  /\b\d{1,3}%\s+chance you\b/i,
  /\beveryone feels\b/i,
  /\breddit confirms\b/i,
  /\byou (suffer from|were diagnosed|have a disorder)\b/i,
  /\bdiagnostic likelihood\b/i,
] as const;

export const EMOTIONAL_PREFERRED_FRAMING = {
  peopleOftenMention: "People describing similar experiences often mention…",
  possibleNeighborhood: "One possible interpretive neighborhood is…",
  mayOverlap: "This may overlap with…",
  researchDiffers: "Research and community reports differ here…",
  hypothesisNotConclusion:
    "This is a hypothesis for reflection, not a conclusion about you.",
} as const;

export const RESIDUE_COLLECTION = {
  runs: "residueRuns",
  sources: "residueSources",
  evidence: "residueEvidence",
  claims: "residueClaims",
  associations: "residueAssociations",
  artifacts: "residueArtifacts",
  memoryProposals: "residueMemoryProposals",
} as const;

export const DEFAULT_ANALYSIS_DEPTH = "standard" as const;
