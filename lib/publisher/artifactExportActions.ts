import { doc, updateDoc } from "firebase/firestore";
import type { ZineMetadata } from "../../types";
import { db } from "../../services/firebase";
import type { ProsceniumPublishConsent } from "../../schemas/collectiveIntelligenceContracts";
import {
  buildPublishConsent,
  consentFieldsForZine,
  publishToastMessage,
} from "../../services/collective/consent";

export type ExportChamberMode = "pdf" | "assets" | "shopify";

export type PressDestinationId =
  | "web-issue"
  | "archival-pdf"
  | "asset-package"
  | "shopify-draft"
  | "newsletter"
  | "social-plates";

export function destinationToExportMode(destinationId: string): ExportChamberMode | null {
  switch (destinationId) {
    case "archival-pdf":
      return "pdf";
    case "asset-package":
    case "social-plates":
      return "assets";
    case "shopify-draft":
      return "shopify";
    default:
      return null;
  }
}

export function destinationRequiresPublish(destinationId: string): boolean {
  return destinationId === "web-issue";
}

function formatForExportMode(mode: ExportChamberMode): "pdf" | "zip" {
  return mode === "pdf" ? "pdf" : "zip";
}

export async function recordArtifactExport(
  metadata: ZineMetadata,
  mode: ExportChamberMode,
): Promise<ZineMetadata> {
  const format = formatForExportMode(mode);
  const prior = metadata.exportState?.formats || [];
  const formats = Array.from(new Set([...prior, format])) as Array<"pdf" | "png" | "zip" | "mimizine">;
  const exportState = {
    ...metadata.exportState,
    lastExportedAt: Date.now(),
    formats,
  };

  await updateDoc(doc(db, "zines", metadata.id), { exportState });

  try {
    const { mirrorZineToSovereign } = await import("../../services/sovereignClient");
    void mirrorZineToSovereign({ ...metadata, exportState });
  } catch (mirrorErr) {
    console.warn("MIMI // Sovereign export mirror failed", mirrorErr);
  }

  return { ...metadata, exportState };
}

export async function publishArtifactWithConsent(
  metadata: ZineMetadata,
  contributeToMeanMedianMode: boolean,
): Promise<ZineMetadata> {
  const consent: ProsceniumPublishConsent = buildPublishConsent({
    artifactId: metadata.id,
    contributeToMeanMedianMode,
  });
  const fields = consentFieldsForZine(consent);
  await updateDoc(doc(db, "zines", metadata.id), fields);

  const updated = { ...metadata, ...fields };

  try {
    const { mirrorZineToSovereign } = await import("../../services/sovereignClient");
    void mirrorZineToSovereign(updated);
  } catch (mirrorErr) {
    console.warn("MIMI // Sovereign publish mirror failed", mirrorErr);
  }

  window.dispatchEvent(
    new CustomEvent("mimi:registry_alert", {
      detail: {
        message: publishToastMessage({
          contribute: contributeToMeanMedianMode,
          handle: metadata.userHandle,
        }),
        type: "success",
      },
    }),
  );

  return updated;
}
