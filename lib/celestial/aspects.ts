/**
 * Major tropical aspects between natal bodies. Honest orbs; no minor aspects.
 */

import type {
  AspectKind,
  CelestialBodyId,
  NatalAspect,
  NatalBodyPosition,
} from "../../schemas/celestialCalibrationContracts";
import { CELESTIAL_BODY_LABELS } from "./bodyLabels";

const ASPECT_DEFS: Array<{ kind: AspectKind; angle: number; orb: number }> = [
  { kind: "conjunction", angle: 0, orb: 8 },
  { kind: "sextile", angle: 60, orb: 4 },
  { kind: "square", angle: 90, orb: 6 },
  { kind: "trine", angle: 120, orb: 6 },
  { kind: "opposition", angle: 180, orb: 8 },
];

function angularSeparation(a: number, b: number): number {
  let d = Math.abs(a - b) % 360;
  if (d > 180) d = 360 - d;
  return d;
}

export function computeMajorAspects(bodies: NatalBodyPosition[]): NatalAspect[] {
  const aspects: NatalAspect[] = [];
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const a = bodies[i];
      const b = bodies[j];
      const sep = angularSeparation(a.eclipticLongitudeDeg, b.eclipticLongitudeDeg);
      for (const def of ASPECT_DEFS) {
        const delta = Math.abs(sep - def.angle);
        if (delta <= def.orb) {
          aspects.push({
            a: a.body,
            b: b.body,
            kind: def.kind,
            orbDeg: Math.round(delta * 1000) / 1000,
            exactAngleDeg: def.angle,
          });
          break;
        }
      }
    }
  }
  aspects.sort((x, y) => x.orbDeg - y.orbDeg);
  return aspects;
}

export function formatAspect(aspect: NatalAspect): string {
  return `${CELESTIAL_BODY_LABELS[aspect.a as CelestialBodyId]} ${aspect.kind} ${CELESTIAL_BODY_LABELS[aspect.b as CelestialBodyId]} (orb ${aspect.orbDeg.toFixed(1)}°)`;
}
