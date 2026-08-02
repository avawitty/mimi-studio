import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useUser } from "../../contexts/UserContext";
import {
  dispatchChamberIntent,
  type ChamberIntent,
} from "../../lib/chamberIntents";
import type { StudioPhase } from "../../lib/productCanon";

/**
 * Active Studio desk context (phase + loose materials).
 * Distinct from Worktable `DossierTabs` folders and Tailor evidence dossiers —
 * do not treat those as interchangeable sources of truth until a bridge exists.
 */

export type StudioMaterialType =
  | "text"
  | "image"
  | "link"
  | "voice"
  | "conversation"
  | "artifact";

export interface MaterialProvenance {
  source: string;
  sourceUrl?: string;
  capturedAt?: number;
}

export interface StudioMaterial {
  id: string;
  type: StudioMaterialType;
  label: string;
  provenance: MaterialProvenance;
  createdAt: number;
}

export interface ActiveDossier {
  id: string;
  title: string;
  phase: StudioPhase;
  fragmentCount: number;
  sourceCount: number;
  directionStatus: "unformed" | "proposed" | "approved";
  updatedAt: number;
}

export interface StudioContextState {
  activeDossier: ActiveDossier | null;
  recentMaterials: StudioMaterial[];
  lastIntent: ChamberIntent | null;
  updatedAt: number;
}

interface DossierContextValue extends StudioContextState {
  setActiveDossier: (dossier: ActiveDossier | null) => void;
  addRecentMaterial: (material: StudioMaterial) => void;
  dispatchIntent: (intent: ChamberIntent) => string;
  clearLooseDesk: () => void;
}

const STORAGE_KEY = "mimi:studio-context:v1";

function scopedStorageKey(uid: string | undefined, override?: string): string {
  if (override) return override;
  return `${STORAGE_KEY}::${uid ?? "local"}`;
}

function migrateLegacyStudioContext(uid: string): void {
  if (typeof window === "undefined") return;
  const scopedKey = scopedStorageKey(uid);
  if (window.localStorage.getItem(scopedKey)) return;
  const legacy = window.localStorage.getItem(STORAGE_KEY);
  if (!legacy) return;
  try {
    window.localStorage.setItem(scopedKey, legacy);
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage can be unavailable in private browsing.
  }
}

export const EMPTY_STUDIO_CONTEXT: StudioContextState = {
  activeDossier: null,
  recentMaterials: [],
  lastIntent: null,
  updatedAt: 0,
};

const StudioDossierContext = createContext<DossierContextValue | null>(null);

function readStoredContext(
  storageKey: string,
  initialState?: StudioContextState,
): StudioContextState {
  if (initialState) return initialState;
  if (typeof window === "undefined") return EMPTY_STUDIO_CONTEXT;

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return EMPTY_STUDIO_CONTEXT;
    const parsed = JSON.parse(raw) as Partial<StudioContextState>;
    return {
      activeDossier: parsed.activeDossier ?? null,
      recentMaterials: Array.isArray(parsed.recentMaterials)
        ? parsed.recentMaterials.slice(0, 3)
        : [],
      lastIntent: parsed.lastIntent ?? null,
      updatedAt:
        typeof parsed.updatedAt === "number" ? parsed.updatedAt : Date.now(),
    };
  } catch {
    return EMPTY_STUDIO_CONTEXT;
  }
}

export interface DossierProviderProps {
  children: React.ReactNode;
  initialState?: StudioContextState;
  storageKey?: string;
}

export const DossierProvider: React.FC<DossierProviderProps> = ({
  children,
  initialState,
  storageKey: storageKeyOverride,
}) => {
  const { user } = useUser();
  const storageKey = useMemo(
    () => scopedStorageKey(user?.uid, storageKeyOverride),
    [storageKeyOverride, user?.uid],
  );

  const [state, setState] = useState<StudioContextState>(() => {
    if (initialState) return initialState;
    if (storageKeyOverride) {
      return readStoredContext(storageKeyOverride);
    }
    migrateLegacyStudioContext(user?.uid ?? "local");
    return readStoredContext(scopedStorageKey(user?.uid));
  });

  useEffect(() => {
    if (initialState || storageKeyOverride) return;
    migrateLegacyStudioContext(user?.uid ?? "local");
    setState(readStoredContext(scopedStorageKey(user?.uid)));
  }, [initialState, storageKeyOverride, user?.uid]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // Storage can be unavailable in private browsing; in-memory state remains valid.
    }
  }, [state, storageKey]);

  const setActiveDossier = useCallback((activeDossier: ActiveDossier | null) => {
    setState((current) => ({
      ...current,
      activeDossier,
      updatedAt: Date.now(),
    }));
  }, []);

  const addRecentMaterial = useCallback((material: StudioMaterial) => {
    setState((current) => ({
      ...current,
      recentMaterials: [
        material,
        ...current.recentMaterials.filter((item) => item.id !== material.id),
      ].slice(0, 3),
      updatedAt: Date.now(),
    }));
  }, []);

  const dispatchIntent = useCallback((intent: ChamberIntent) => {
    setState((current) => ({
      ...current,
      lastIntent: intent,
      updatedAt: Date.now(),
    }));
    return dispatchChamberIntent(intent);
  }, []);

  const clearLooseDesk = useCallback(() => {
    setState((current) => ({
      ...current,
      recentMaterials: [],
      updatedAt: Date.now(),
    }));
  }, []);

  const value = useMemo<DossierContextValue>(
    () => ({
      ...state,
      setActiveDossier,
      addRecentMaterial,
      dispatchIntent,
      clearLooseDesk,
    }),
    [
      addRecentMaterial,
      clearLooseDesk,
      dispatchIntent,
      setActiveDossier,
      state,
    ],
  );

  return (
    <StudioDossierContext.Provider value={value}>
      {children}
    </StudioDossierContext.Provider>
  );
};

export function useDossierContext(): DossierContextValue {
  const context = useContext(StudioDossierContext);
  if (!context) {
    throw new Error("useDossierContext must be used within DossierProvider");
  }
  return context;
}
