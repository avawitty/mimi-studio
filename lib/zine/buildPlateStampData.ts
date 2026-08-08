import type {
  ForecastDriftPlateData,
  MaterialSpecimenPlateData,
  UsedContextSnapshot,
  UserProfile,
  ZineContactSheetFrame,
} from "../../types";

type IntakeMedia = {
  type?: string;
  url?: string;
  data?: string;
  mimeType?: string;
  name?: string;
};

type UsedContextEntry = {
  atomId: string;
  title: string;
  content: string;
  source?: string;
};

export function buildUsedContextAtoms(
  entries?: UsedContextEntry[] | null,
): UsedContextSnapshot[] {
  if (!entries?.length) return [];
  return entries
    .filter((entry) => entry.title?.trim() || entry.content?.trim())
    .map((entry) => ({
      atomId: entry.atomId,
      title: entry.title || "Untitled fragment",
      content: entry.content || "",
      source: entry.source,
      capturedAt: Date.now(),
    }));
}

export function buildContactSheetFrames(
  media?: IntakeMedia[] | null,
): ZineContactSheetFrame[] {
  if (!media?.length) return [];
  return media
    .filter((item) => item.type === "image")
    .slice(0, 9)
    .map((item, index) => {
      const imageUrl =
        item.url ||
        (item.data && item.mimeType
          ? `data:${item.mimeType};base64,${item.data}`
          : item.data || undefined);
      return {
        id: `contact-${index + 1}`,
        imageUrl,
        label: item.name?.trim() || `Frame ${index + 1}`,
        mimeType: item.mimeType,
      };
    })
    .filter((frame) => Boolean(frame.imageUrl));
}

export function buildMaterialSpecimenFromProfile(
  profile?: Pick<UserProfile, "tailorDraft"> | null,
): MaterialSpecimenPlateData | null {
  const draft = profile?.tailorDraft;
  const core = draft?.positioningCore?.aestheticCore;
  if (!core) return null;

  const materiality = core.materiality?.filter(Boolean) || [];
  const silhouettes = core.silhouettes?.filter(Boolean) || [];
  const config = draft?.materialityConfig;

  if (
    materiality.length === 0 &&
    silhouettes.length === 0 &&
    !core.eraBias &&
    !config?.paperStock
  ) {
    return null;
  }

  return {
    materiality,
    silhouettes,
    eraBias: core.eraBias,
    presentation: core.presentation,
    paperStock: config?.paperStock,
    typographyLineage: config?.typographyLineage,
    colorScheme: config?.colorScheme,
    sourceLabel: "Tailor · Materiality",
  };
}

export function buildForecastDriftFromProfile(
  profile?: Pick<UserProfile, "tailorDraft"> | null,
): ForecastDriftPlateData | null {
  const draft = profile?.tailorDraft;
  const saturation = draft?.strategicVectors?.saturationAwareness;
  const diagnostics = draft?.diagnostics;

  const oversaturated = saturation?.oversaturatedClusters?.filter(Boolean) || [];
  const fragile = saturation?.fragileDifferentiators?.filter(Boolean) || [];
  const dilution = diagnostics?.dilutionRisks?.filter(Boolean) || [];
  const driftVulnerability = diagnostics?.driftVulnerability;
  const expansionTolerance = draft?.strategicVectors?.expansionTolerance;

  const hasSignal =
    oversaturated.length > 0 ||
    fragile.length > 0 ||
    dilution.length > 0 ||
    typeof driftVulnerability === "number" ||
    typeof expansionTolerance === "number";

  if (!hasSignal) return null;

  return {
    oversaturatedClusters: oversaturated,
    fragileDifferentiators: fragile,
    dilutionRisks: dilution,
    driftVulnerability,
    expansionTolerance,
    isDemonstration: false,
    sourceLabel: "Tailor · Strategic vectors",
  };
}
