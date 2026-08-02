/**
 * Stable astronomy-engine accessor.
 * Imports the ESM build by relative path so Vite + tsx both get real named exports
 * (package "exports" otherwise flapping between CJS/ESM under tsx).
 */

import type * as AstronomyTypes from "astronomy-engine";
import * as AstronomyNS from "../../node_modules/astronomy-engine/esm/astronomy.js";

type AstronomyModule = typeof AstronomyTypes;

function resolveAstronomy(): AstronomyModule {
  const ns = AstronomyNS as unknown as AstronomyModule & { default?: AstronomyModule };
  if (typeof ns.Body !== "undefined" && typeof ns.SunPosition === "function") {
    return ns;
  }
  if (ns.default && typeof ns.default.Body !== "undefined") {
    return ns.default;
  }
  throw new Error("astronomy-engine ESM build failed to load");
}

export const Astronomy = resolveAstronomy();
