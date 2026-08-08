/**
 * Taste Compiler — medium-specific generation contracts from snapshots.
 */
import type {
  GenerationMedium,
  GenerationMode,
  TasteGenerationContract,
  TasteRefusal,
  TasteSaturationState,
} from "../../schemas/tasteIntelligenceContracts.js";
import type { TasteModelSnapshot } from "../tasteModel/contracts.js";
import {
  GENERATION_MODE_NOVELTY,
  TASTE_COMPILER_VERSION,
} from "./constants.js";

export interface CompileContractContext {
  ownerId: string;
  workspaceId?: string;
  projectId?: string;
  refusals?: TasteRefusal[];
  saturationStates?: TasteSaturationState[];
}

const MEDIUM_ADAPTERS: Record<
  GenerationMedium,
  (snapshot: TasteModelSnapshot) => {
    preserve: string[];
    emphasize: string[];
    permit: string[];
    transform: string[];
    avoid: string[];
    interactionRules: string[];
    contextRules: string[];
  }
> = {
  image: (snapshot) => ({
    preserve: topLabels(snapshot, 5, "positive"),
    emphasize: emergingLabels(snapshot),
    permit: topLabels(snapshot, 3, "moderate"),
    transform: ["lighting", "composition", "palette"],
    avoid: negativeLabels(snapshot),
    interactionRules: interactionStrings(snapshot),
    contextRules: ["Maintain evidence-linked palette and texture logic."],
  }),
  writing: (snapshot) => ({
    preserve: topLabels(snapshot, 4, "positive"),
    emphasize: emergingLabels(snapshot),
    permit: ["sentence density variation within approved tone"],
    transform: ["emotional distance", "object specificity"],
    avoid: negativeLabels(snapshot),
    interactionRules: interactionStrings(snapshot),
    contextRules: ["Lexical exclusions from active refusals apply."],
  }),
  ui: (snapshot) => ({
    preserve: topLabels(snapshot, 4, "positive"),
    emphasize: emergingLabels(snapshot),
    permit: ["hierarchy experiments within density bounds"],
    transform: ["asymmetry", "interaction tone"],
    avoid: negativeLabels(snapshot),
    interactionRules: interactionStrings(snapshot),
    contextRules: ["No interface anti-patterns from refusal list."],
  }),
  fashion: (snapshot) => ({
    preserve: topLabels(snapshot, 5, "positive"),
    emphasize: emergingLabels(snapshot),
    permit: ["silhouette variation", "material tension"],
    transform: ["proportion", "styling context"],
    avoid: negativeLabels(snapshot),
    interactionRules: interactionStrings(snapshot),
    contextRules: ["Contextual refusals apply to occasion pairing."],
  }),
  editorial: (snapshot) => ({
    preserve: topLabels(snapshot, 5, "positive"),
    emphasize: emergingLabels(snapshot),
    permit: ["image-text ratio shifts"],
    transform: ["narrative rhythm", "visual grammar"],
    avoid: negativeLabels(snapshot),
    interactionRules: interactionStrings(snapshot),
    contextRules: ["Citation and provenance requirements preserved."],
  }),
  brand: (snapshot) => ({
    preserve: topLabels(snapshot, 6, "positive"),
    emphasize: emergingLabels(snapshot),
    permit: ["secondary motif exploration"],
    transform: ["tone", "positioning contrast"],
    avoid: negativeLabels(snapshot),
    interactionRules: interactionStrings(snapshot),
    contextRules: ["Signature features remain non-negotiable."],
  }),
  photography: (snapshot) => ({
    preserve: topLabels(snapshot, 5, "positive"),
    emphasize: emergingLabels(snapshot),
    permit: ["lens language variation"],
    transform: ["lighting", "camera distance"],
    avoid: negativeLabels(snapshot),
    interactionRules: interactionStrings(snapshot),
    contextRules: ["Texture and grain preferences from evidence."],
  }),
  product: (snapshot) => ({
    preserve: topLabels(snapshot, 4, "positive"),
    emphasize: emergingLabels(snapshot),
    permit: ["form factor adjacency"],
    transform: ["material finish", "proportion"],
    avoid: negativeLabels(snapshot),
    interactionRules: interactionStrings(snapshot),
    contextRules: ["Commercial feeling bounded by refusal rules."],
  }),
};

function topLabels(
  snapshot: TasteModelSnapshot,
  count: number,
  band: "positive" | "moderate",
): string[] {
  const threshold = band === "positive" ? 0.25 : 0.1;
  return snapshot.featureWeights
    .filter((f) => f.signedWeight >= threshold)
    .sort((a, b) => b.signedWeight - a.signedWeight)
    .slice(0, count)
    .map((f) => f.label);
}

function negativeLabels(snapshot: TasteModelSnapshot): string[] {
  return snapshot.featureWeights
    .filter((f) => f.signedWeight < -0.1)
    .map((f) => f.label);
}

function emergingLabels(snapshot: TasteModelSnapshot): string[] {
  return snapshot.trajectory.emergingFeatureIds
    .map((id) => snapshot.featureWeights.find((f) => f.featureId === id)?.label)
    .filter((l): l is string => Boolean(l));
}

function interactionStrings(snapshot: TasteModelSnapshot): string[] {
  return snapshot.interactionRules
    .filter((r) => r.confidence >= 0.4)
    .slice(0, 6)
    .map((r) => `${r.relation}: ${r.featureIds.join(" + ")}`);
}

export function compileTasteGenerationContract(
  snapshot: TasteModelSnapshot,
  context: CompileContractContext,
  medium: GenerationMedium,
  mode: GenerationMode,
): TasteGenerationContract {
  const adapter = MEDIUM_ADAPTERS[medium](snapshot);
  const noveltyEnvelope = GENERATION_MODE_NOVELTY[mode];
  const signatureIds = snapshot.featureWeights
    .filter((f) => f.signedWeight > 0.6)
    .map((f) => f.featureId);
  const exploratoryIds = snapshot.trajectory.emergingFeatureIds.slice(0, 4);
  const evidenceIds = [
    ...new Set(
      snapshot.featureWeights.flatMap((f) => f.sourceIds).slice(0, 40),
    ),
  ];
  const refusals = context.refusals ?? [];
  const saturated = (context.saturationStates ?? [])
    .filter((s) => s.state === "saturated")
    .map((s) => s.featureId);

  const avoid = [
    ...adapter.avoid,
    ...refusals
      .filter((r) => r.status === "active")
      .flatMap((r) => r.featureIds),
  ];

  const confidence = Math.min(
    1,
    snapshot.featureWeights.reduce((s, f) => s + f.confidence, 0) /
      Math.max(1, snapshot.featureWeights.length),
  );

  return {
    schemaVersion: 1,
    id: crypto.randomUUID(),
    ownerId: context.ownerId,
    workspaceId: context.workspaceId,
    projectId: context.projectId,
    sourceSnapshotId: snapshot.id,
    medium,
    mode,
    preserve: adapter.preserve,
    emphasize:
      mode === "aligned"
        ? adapter.preserve.slice(0, 3)
        : mode === "adjacent"
          ? [...adapter.emphasize, ...exploratoryIds.slice(0, 2)]
          : [...adapter.emphasize, ...exploratoryIds],
    permit: adapter.permit,
    transform:
      mode === "aligned"
        ? adapter.transform.slice(0, 1)
        : adapter.transform,
    avoid: [...new Set(avoid)],
    interactionRules: adapter.interactionRules,
    contextRules: [
      ...adapter.contextRules,
      ...(saturated.length > 0
        ? [`Temporarily vary saturated features: ${saturated.join(", ")}`]
        : []),
    ],
    noveltyEnvelope,
    nonNegotiableFeatureIds: signatureIds,
    exploratoryFeatureIds:
      mode === "aligned" ? exploratoryIds.slice(0, 1) : exploratoryIds,
    evidenceIds,
    confidence,
    compiledAt: Date.now(),
    compilerVersion: TASTE_COMPILER_VERSION,
  };
}
