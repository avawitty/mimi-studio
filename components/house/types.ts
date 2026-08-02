export type DebrisKind = "link" | "text" | "image" | "upload";

export type DebrisStatus = "held" | "kept" | "refused";

export interface DebrisTag {
  label: string;
  intensity: number;
}

export interface Debris {
  id: string;
  kind: DebrisKind;
  raw: string;
  tags: DebrisTag[];
  status: DebrisStatus;
  ingestedAt: number;
  note?: string;
  imageUrl?: string;
  imagePalette?: string[];
}

export interface Plate {
  id: string;
  title: string;
  narrative: string;
  mood: string;
  palette: string[];
  seed: number;
  createdAt: number;
}

export interface AestheticReading {
  archetype: string;
  positioning: string;
  critique: string;
  directive: string;
  tension: string;
  palette: string[];
  manifesto: string;
}

export interface Issue {
  id: string;
  title: string;
  manifesto: string;
  archetype: string;
  plateIds: string[];
  publishedAt: number;
  edition: number;
}

export interface MimiState {
  debris: Debris[];
  plates: Plate[];
  issues: Issue[];
  reading: AestheticReading | null;
  night: boolean;
  onboardingComplete: boolean;
}

export interface HistoryFrame {
  state: MimiState;
  action: string;
  timestamp: number;
}
