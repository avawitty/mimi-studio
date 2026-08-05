export type StudioInspoSource = "unsplash" | "reference";

export interface StudioInspoSlide {
  id: string;
  imageUrl: string;
  label: string;
  attribution?: string;
  source: StudioInspoSource;
}
