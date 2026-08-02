export type SovereignEvent =
  | {
      type: "zine_upsert";
      id: string;
      userId: string;
      isPublic: boolean;
      /** Prior Floor visibility — true only if this id was public before the upsert. */
      wasPublic: boolean;
    }
  | {
      type: "zine_delete";
      id: string;
      userId: string;
      /** True when the deleted row was public (Floor-visible). */
      wasPublic: boolean;
    }
  /** Quiet batch import/replace finished — Floor clients should refetch. */
  | { type: "floor_refresh" }
  | { type: "profile_upsert"; uid: string }
  | { type: "pocket_upsert"; id: string; userId: string }
  | { type: "pocket_delete"; id: string; userId: string };

type Listener = (event: SovereignEvent) => void;

const listeners = new Set<Listener>();

export const emitSovereignEvent = (event: SovereignEvent): void => {
  for (const listener of listeners) {
    try {
      listener(event);
    } catch {
      // never let a subscriber break writers
    }
  }
};

export const subscribeSovereignEvents = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/**
 * Payload for unauthenticated `scope=public` SSE.
 * Never discloses private-only create/edit/delete metadata — only public
 * publishes and transitions off the Floor (wasPublic → private/delete).
 */
export const publicFloorSsePayload = (
  event: SovereignEvent,
): Record<string, unknown> | null => {
  switch (event.type) {
    case "zine_upsert":
      if (event.isPublic) {
        return {
          type: event.type,
          id: event.id,
          userId: event.userId,
          isPublic: true,
        };
      }
      if (event.wasPublic) {
        return { type: "zine_delete", id: event.id };
      }
      return null;
    case "zine_delete":
      if (event.wasPublic) {
        return { type: "zine_delete", id: event.id };
      }
      return null;
    case "floor_refresh":
      // Clients treat any `zine` SSE as “refetch Floor”; payload is a nudge only.
      return { type: "floor_refresh" };
    case "profile_upsert":
    case "pocket_upsert":
    case "pocket_delete":
      return null;
    default: {
      const _exhaustive: never = event;
      return _exhaustive;
    }
  }
};
