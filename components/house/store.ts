import { useEffect, useState } from "react";
import type { HistoryFrame, MimiState } from "./types";

const KEY = "mimi.studio.v2";
const LEGACY_KEY = "mimi.studio.v1";
const MAX_HISTORY = 50;

const initial: MimiState = {
  debris: [],
  plates: [],
  issues: [],
  reading: null,
  night: false,
  onboardingComplete: false,
};

function load(): MimiState {
  try {
    const raw = localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY_KEY);
    if (!raw) return { ...initial };
    const parsed = JSON.parse(raw) as Partial<MimiState>;
    return { ...initial, ...parsed };
  } catch {
    return { ...initial };
  }
}

let state: MimiState = typeof window !== "undefined" ? load() : { ...initial };
const listeners = new Set<() => void>();

const history: HistoryFrame[] = [
  { state: structuredCloneSafe(state), action: "init", timestamp: Date.now() },
];
let historyIndex = 0;

function structuredCloneSafe<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Quota / private mode — keep in-memory state.
  }
}

function notify() {
  listeners.forEach((l) => l());
}

function pushHistory(action: string) {
  if (historyIndex < history.length - 1) {
    history.splice(historyIndex + 1);
  }
  history.push({
    state: structuredCloneSafe(state),
    action,
    timestamp: Date.now(),
  });
  if (history.length > MAX_HISTORY) {
    history.shift();
  } else {
    historyIndex++;
  }
}

export function getState(): MimiState {
  return state;
}

export function setState(
  patch: Partial<MimiState> | ((s: MimiState) => Partial<MimiState>),
  action = "update",
): void {
  const p = typeof patch === "function" ? patch(state) : patch;
  state = { ...state, ...p };
  persist();
  pushHistory(action);
  notify();
}

export function undo(): boolean {
  if (historyIndex <= 0) return false;
  historyIndex--;
  state = structuredCloneSafe(history[historyIndex].state);
  persist();
  notify();
  return true;
}

export function redo(): boolean {
  if (historyIndex >= history.length - 1) return false;
  historyIndex++;
  state = structuredCloneSafe(history[historyIndex].state);
  persist();
  notify();
  return true;
}

export function canUndo(): boolean {
  return historyIndex > 0;
}

export function canRedo(): boolean {
  return historyIndex < history.length - 1;
}

export function resetState(): void {
  state = { ...initial };
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    // ignore
  }
  history.length = 0;
  history.push({
    state: structuredCloneSafe(initial),
    action: "reset",
    timestamp: Date.now(),
  });
  historyIndex = 0;
  notify();
}

export function useMimi(): MimiState {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return state;
}

export function useHistory(): { canUndo: boolean; canRedo: boolean } {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return { canUndo: historyIndex > 0, canRedo: historyIndex < history.length - 1 };
}

export const uid = (): string => Math.random().toString(36).slice(2, 10);

const FALLBACK_PALETTE = ["#0A0A0A", "#FFFFFF", "#5A5A40", "#78716C", "#D4D4D4"];

export function extractPaletteFromImage(file: File): Promise<string[]> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(url);
          resolve([...FALLBACK_PALETTE]);
          return;
        }
        canvas.width = 64;
        canvas.height = 64;
        ctx.drawImage(img, 0, 0, 64, 64);
        const data = ctx.getImageData(0, 0, 64, 64).data;
        const colorMap = new Map<string, number>();
        for (let i = 0; i < data.length; i += 16) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const hex = `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
          colorMap.set(hex, (colorMap.get(hex) ?? 0) + 1);
        }
        const sorted = [...colorMap.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([c]) => c);
        URL.revokeObjectURL(url);
        resolve(sorted.length >= 5 ? sorted.slice(0, 5) : [...FALLBACK_PALETTE]);
      } catch {
        URL.revokeObjectURL(url);
        resolve([...FALLBACK_PALETTE]);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve([...FALLBACK_PALETTE]);
    };
    img.src = url;
  });
}

export function imageFileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Image file could not be encoded for persistence."));
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error("Image file could not be read."));
    };
    reader.readAsDataURL(file);
  });
}
