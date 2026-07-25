export type StudioCoverOverlayLayer =
  | {
      id: string;
      kind: "text";
      text: string;
      x: number;
      y: number;
      fontSize: number;
      color: string;
    }
  | {
      id: string;
      kind: "image";
      url: string;
      x: number;
      y: number;
      width: number;
      opacity: number;
      label?: string;
    };

export const STUDIO_COVER_STICKERS = [
  { id: "mimi-dark", label: "Mimi mark", url: "/mimi-logo-dark.png" },
  { id: "mimi-light", label: "Mimi light", url: "/mimi-logo-light.png" },
  { id: "star", label: "Star", url: "" },
] as const;

export const createTextLayer = (text: string): StudioCoverOverlayLayer => ({
  id: `text-${Date.now()}`,
  kind: "text",
  text,
  x: 12,
  y: 78,
  fontSize: 14,
  color: "#FAF9F6",
});

export const createImageLayer = (
  url: string,
  label?: string,
  width = 28,
): StudioCoverOverlayLayer => ({
  id: `img-${Date.now()}`,
  kind: "image",
  url,
  x: 68,
  y: 8,
  width,
  opacity: 0.92,
  label,
});
