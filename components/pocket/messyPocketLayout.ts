export interface MessyClipLayout {
  x: number; // percent 0–100 within desk
  y: number;
  rotate: number; // degrees
  z: number;
}

const STORAGE_KEY = "mimi:messy-pocket-layout:v1";

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export const loadMessyLayouts = (): Record<string, MessyClipLayout> => {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, MessyClipLayout>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

export const saveMessyLayouts = (layouts: Record<string, MessyClipLayout>) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(layouts));
  } catch {
    // ignore quota / private mode
  }
};

export const scatterLayout = (seed: string, index: number): MessyClipLayout => {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  const col = index % 4;
  const row = Math.floor(index / 4);
  const x = clamp(8 + col * 22 + (hash % 9) - 4, 4, 78);
  const y = clamp(10 + row * 22 + ((hash >> 3) % 11) - 5, 6, 72);
  const rotate = ((hash % 15) - 7) + (index % 2 === 0 ? -2 : 3);
  return { x, y, rotate, z: index + 1 };
};
