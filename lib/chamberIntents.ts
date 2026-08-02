import {
  CANON_MODULE_BY_ID,
  type CanonModule,
} from "./productCanon";

export interface CaptureDraft {
  text?: string;
  attachmentIds?: string[];
}

export type ChamberIntent =
  | { type: "capture"; payload?: CaptureDraft }
  | { type: "research"; query: string; contextIds: string[] }
  | { type: "save-memory"; atomIds: string[] }
  | { type: "shape-direction"; dossierId: string }
  | { type: "compose"; dossierId: string; artifactType?: string }
  | { type: "approve"; dossierId: string; decisionId: string }
  | { type: "publish"; artifactId: string }
  | { type: "preserve"; artifactId: string; collectionId?: string }
  | { type: "start-service"; dossierId: string };

export type ChamberIntentType = ChamberIntent["type"];

/**
 * Canon stores only the stable intent discriminator. Runtime payload belongs to
 * the active dossier and is materialized immediately before dispatch.
 */
export interface ChamberIntentDescriptor {
  type: ChamberIntentType;
}

export const CHAMBER_INTENT_EVENT = "mimi:chamber-intent";

const INTENT_MODULE_ID: Record<ChamberIntentType, CanonModule["id"]> = {
  capture: "scribe",
  research: "scry",
  "save-memory": "scribe",
  "shape-direction": "the-edit",
  compose: "studio",
  approve: "the-edit",
  publish: "the-press",
  preserve: "pocket",
  "start-service": "private-studio",
};

function intentType(
  intent: ChamberIntent | ChamberIntentDescriptor | ChamberIntentType,
): ChamberIntentType {
  return typeof intent === "string" ? intent : intent.type;
}

export function resolveChamberIntent(
  intent: ChamberIntent | ChamberIntentDescriptor | ChamberIntentType,
): string {
  const moduleId = INTENT_MODULE_ID[intentType(intent)];
  const module = CANON_MODULE_BY_ID[moduleId];
  if (!module?.implementedMode) {
    throw new Error(`No implemented chamber resolves intent "${intentType(intent)}"`);
  }
  return module.implementedMode;
}

export function routeForChamberIntent(
  intent: ChamberIntent | ChamberIntentDescriptor | ChamberIntentType,
): string {
  const moduleId = INTENT_MODULE_ID[intentType(intent)];
  const module = CANON_MODULE_BY_ID[moduleId];
  if (!module?.canonicalRoute) {
    throw new Error(`No canonical route resolves intent "${intentType(intent)}"`);
  }
  return module.canonicalRoute;
}

export function dispatchChamberIntent(intent: ChamberIntent): string {
  const mode = resolveChamberIntent(intent);
  const path = routeForChamberIntent(intent);

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(CHAMBER_INTENT_EVENT, {
        detail: { intent, mode, path },
      }),
    );
    window.dispatchEvent(
      new CustomEvent("mimi:route-request", {
        detail: { path },
      }),
    );
  }

  return mode;
}
