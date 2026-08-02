import type { CelestialBodyId } from "../../schemas/celestialCalibrationContracts";

export const CELESTIAL_BODY_LABELS: Record<CelestialBodyId, string> = {
  sun: "Sun",
  moon: "Moon",
  mercury: "Mercury",
  venus: "Venus",
  mars: "Mars",
  jupiter: "Jupiter",
  saturn: "Saturn",
  uranus: "Uranus",
  neptune: "Neptune",
  pluto: "Pluto",
  ascendant: "Ascendant",
};
