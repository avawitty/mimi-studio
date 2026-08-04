import React from "react";
import {
  Archive,
  ArrowRight,
  BookOpen,
  CircleDot,
  FileText,
  Folder,
  Link,
  LockKeyhole,
  Map,
  Paperclip,
  Search,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export type MimiGlyphName =
  | "map"
  | "seal"
  | "find"
  | "arrow"
  | "index"
  | "context"
  | "source"
  | "evidence"
  | "lock"
  | "clip"
  | "spark"
  | "dossier";

type GlyphAccessibility =
  | { label: string; decorative?: false }
  | { label?: never; decorative: true };

export type MimiGlyphProps = GlyphAccessibility & {
  name: MimiGlyphName;
  weight?: "fine" | "regular";
  size?: number;
  className?: string;
};

const GLYPHS: Record<MimiGlyphName, LucideIcon> = {
  map: Map,
  seal: CircleDot,
  find: Search,
  arrow: ArrowRight,
  index: Archive,
  context: BookOpen,
  source: Link,
  evidence: FileText,
  lock: LockKeyhole,
  clip: Paperclip,
  spark: Sparkles,
  dossier: Folder,
};

export const MimiGlyph: React.FC<MimiGlyphProps> = ({
  name,
  label,
  decorative = false,
  weight = "fine",
  size = 16,
  className = "",
}) => {
  const Icon = GLYPHS[name];
  return (
    <span
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : label}
      className={`inline-flex items-center justify-center ${className}`}
    >
      <Icon
        size={size}
        strokeWidth={weight === "fine" ? 1.25 : 1.75}
        aria-hidden
      />
    </span>
  );
};
