type SovereignEvent =
  | { type: "zine_upsert"; id: string; userId: string; isPublic: boolean }
  | { type: "zine_delete"; id: string; userId: string }
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
