/**
 * Residue UI chamber contract (Phase 8).
 * Shared by the chamber UI and offline verify — keeps tabs + safety copy aligned.
 */

import { EMOTIONAL_SAFETY_NOTICE } from "../services/residue/constants";

export const RESIDUE_CHAMBER_MODULE_ID = "residue" as const;
export const RESIDUE_CHAMBER_ROUTE = "/residue" as const;
export const RESIDUE_CHAMBER_MODE = "residue" as const;

export const RESIDUE_ENGINE_TABS = [
  "cultural",
  "emotional",
] as const;

export type ResidueEngineTab = (typeof RESIDUE_ENGINE_TABS)[number];

export const RESIDUE_RESULT_TABS = [
  "synthesis",
  "evidence",
  "mmm",
  "products",
  "history",
] as const;

export type ResidueResultTab = (typeof RESIDUE_RESULT_TABS)[number];

export const RESIDUE_RESULT_TAB_LABELS: Record<ResidueResultTab, string> = {
  synthesis: "Synthesis",
  evidence: "Evidence",
  mmm: "Mean / Median / Mode",
  products: "Product proposals",
  history: "Session runs",
};

export const RESIDUE_HANDOFF_TARGETS = [
  { view: "intel-hub", label: "Intel Hub" },
  { view: "the-edit", label: "The Edit" },
  { view: "forecast", label: "Forecast" },
  { view: "taste-graph", label: "Taste Graph" },
  { view: "scribe", label: "Scribe" },
] as const;

/** Mandatory copy for emotional mode — must match engine default. */
export const RESIDUE_UI_SAFETY_NOTICE = EMOTIONAL_SAFETY_NOTICE;

export const RESIDUE_CHAMBER_COPY = {
  thesis:
    "Map cultural or emotional residue from sources — offline-first, labeled, never diagnostic.",
  culturalHint:
    "Name a look, scene, or motif. The engine extracts lineage, codes, absorption, and countersignals.",
  emotionalHint:
    "Describe an experience in your own words. Neighborhoods are interpretive maps, not conclusions about you.",
  temporaryNote:
    "Runs default to temporary session memory. Consent is required before persisting to your archive.",
  productsNote:
    "Product adapters emit proposals only — memory atoms, Taste Graph nodes, and Edit directions stay unapproved until you accept them elsewhere.",
} as const;
