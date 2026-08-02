import React from "react";
import { MimiGlyph } from "../MimiGlyph";

export interface ClippedAssetProps {
  src: string;
  alt: string;
  caption: string;
  className?: string;
}

export const ClippedAsset: React.FC<ClippedAssetProps> = ({
  src,
  alt,
  caption,
  className = "",
}) => (
  <figure
    className={`relative border border-[var(--mimi-rule,#d8d4c9)] bg-[var(--mimi-newsprint,#ede9df)] p-2 ${className}`}
  >
    <MimiGlyph
      name="clip"
      decorative
      size={18}
      className="absolute -top-2 left-4 z-10 rotate-[-10deg] text-[var(--mimi-pencil,#8a877f)]"
    />
    <img src={src} alt={alt} className="block w-full object-cover grayscale" />
    <figcaption className="pt-2 font-mono text-[8px] uppercase tracking-[0.18em] text-[var(--mimi-pencil,#8a877f)]">
      {caption}
    </figcaption>
  </figure>
);
