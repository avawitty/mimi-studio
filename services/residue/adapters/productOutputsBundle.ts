/**
 * Phase 7 product-output bundle — one residue run → multiple proposed artifacts.
 */

import { adaptResidueToEditorialDirection } from "./editAdapter";
import { adaptResidueToForecast } from "./forecastAdapter";
import { adaptResidueToMemoryAtomProposals } from "./memoryAtomAdapter";
import { adaptResidueToTasteGraphDelta } from "./tasteGraphAdapter";
import { adaptResidueToZinePages } from "./zineAdapter";
import { createMemoryResidueStore } from "../storage/residueStore";
import type { ResidueAdapterSource } from "./sharedClaims";

export function buildResidueProductOutputBundle(result: ResidueAdapterSource) {
  return {
    zine: adaptResidueToZinePages(result),
    editorialDirection: adaptResidueToEditorialDirection(result),
    forecast: adaptResidueToForecast(result),
    tasteGraphDelta: adaptResidueToTasteGraphDelta(result),
    memoryAtomProposals: adaptResidueToMemoryAtomProposals(result),
  };
}

/** Persist Phase 7 artifacts + memory proposals; never auto-approves memory. */
export async function persistPhase7ArtifactsForRun(input: {
  ownerUid: string;
  result: ResidueAdapterSource;
  store?: ReturnType<typeof createMemoryResidueStore>;
}) {
  const store = input.store ?? createMemoryResidueStore();
  const bundle = buildResidueProductOutputBundle(input.result);
  const runId = input.result.metadata.runId;

  await store.saveArtifact(input.ownerUid, {
    artifactId: bundle.zine.artifactId,
    runId,
    kind: "zine",
    payload: bundle.zine,
  });
  await store.saveArtifact(input.ownerUid, {
    artifactId: bundle.editorialDirection.directionId,
    runId,
    kind: "the-edit",
    payload: bundle.editorialDirection,
  });
  await store.saveArtifact(input.ownerUid, {
    artifactId: bundle.forecast.forecastId,
    runId,
    kind: "forecast",
    payload: bundle.forecast,
  });
  await store.saveArtifact(input.ownerUid, {
    artifactId: bundle.tasteGraphDelta.graphId,
    runId,
    kind: "taste-graph",
    payload: bundle.tasteGraphDelta,
  });

  for (const proposal of bundle.memoryAtomProposals) {
    await store.saveProposal(input.ownerUid, {
      proposalId: proposal.proposalId,
      runId,
      approvalState: "proposed",
    });
  }

  return bundle;
}
