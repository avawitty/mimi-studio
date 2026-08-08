import type { PublicRipSnapshot, RipReading } from "../../types";

export function buildPublicRipSnapshot(
  handle: string,
  reading: RipReading,
  accentHex = "#5c1a2e",
): PublicRipSnapshot {
  return {
    handle: handle.toLowerCase().replace(/^@/, ""),
    title: reading.title,
    shadowThesis: reading.shadowThesis,
    antiMotifs: reading.antiMotifs.slice(0, 8),
    thingsToAvoid: reading.thingsToAvoid.slice(0, 8),
    blindSpots: reading.blindSpots.slice(0, 6),
    oppositePalette: reading.oppositePalette.slice(0, 4),
    oppositeSilhouette: reading.oppositeSilhouette,
    oppositeRegister: reading.oppositeRegister,
    inversions: reading.inversions.slice(0, 4),
    shadowExperiments: reading.shadowExperiments.slice(0, 4),
    semioticTouchpoints: (reading.semioticTouchpoints || []).slice(0, 4),
    inverseRecommendations: (reading.inverseRecommendations || []).slice(0, 3),
    inputCoverage: reading.inputCoverage,
    sourceRipId: reading.id,
    accentHex: reading.oppositePalette.find((p) => p.startsWith("#")) || accentHex,
    updatedAt: Date.now(),
  };
}
