import React from "react";
import type { EditorElement, ZinePageSpec } from "../types";
import { pageHasCustomLayout } from "../lib/zineSpreadLayout";

interface ZineSpreadCanvasProps {
  page: ZinePageSpec;
  className?: string;
  aspectClassName?: string;
}

function sortedElements(elements: EditorElement[]): EditorElement[] {
  return [...elements].sort((a, b) => (a.style.zIndex || 0) - (b.style.zIndex || 0));
}

/**
 * Read-only renderer for composed zine spreads (customLayout).
 * House Style: white field, ink type, no cream/card chrome.
 */
export const ZineSpreadCanvas: React.FC<ZineSpreadCanvasProps> = ({
  page,
  className = "",
  aspectClassName = "aspect-[3/4]",
}) => {
  if (!pageHasCustomLayout(page) || !page.customLayout) return null;
  const elements = sortedElements(page.customLayout.elements);

  return (
    <div
      className={`relative w-full ${aspectClassName} bg-white border border-[var(--mimi-hairline,#D4D4D4)] overflow-hidden ${className}`}
      data-surface="public"
      aria-label={`Composed spread: ${page.headline || `Plate ${page.pageNumber}`}`}
    >
      {elements.map((el) => (
        <div
          key={el.id}
          className="absolute"
          style={{
            top: `${el.style.top}%`,
            left: `${el.style.left}%`,
            width: `${el.style.width}%`,
            height: el.style.height != null ? `${el.style.height}%` : undefined,
            zIndex: el.style.zIndex,
            opacity: el.style.opacity ?? 1,
            transform: el.style.rotation ? `rotate(${el.style.rotation}deg)` : undefined,
            mixBlendMode: el.style.mixBlendMode as React.CSSProperties["mixBlendMode"],
          }}
        >
          {el.type === "image" ? (
            <img
              src={el.content}
              alt=""
              loading="lazy"
              referrerPolicy="no-referrer"
              className="w-full h-full pointer-events-none"
              style={{
                objectFit: el.style.objectFit || "cover",
                filter: el.style.filter || "none",
                borderRadius: el.style.borderRadius ? `${el.style.borderRadius}px` : undefined,
              }}
            />
          ) : null}
          {el.type === "text" ? (
            <div
              className="w-full whitespace-pre-wrap"
              style={{
                fontFamily: el.style.fontFamily
                  ? `'${el.style.fontFamily}', 'Cormorant Garamond', Georgia, serif`
                  : "'Cormorant Garamond', Georgia, serif",
                fontSize: el.style.fontSize ? `${el.style.fontSize}rem` : "1rem",
                color: el.style.color || "var(--mimi-ink, #0A0A0A)",
                textAlign: el.style.textAlign || "left",
                fontStyle: el.style.fontStyle || "normal",
                fontWeight: el.style.fontWeight || "400",
                lineHeight: el.style.lineHeight || 1.4,
                padding: el.style.padding != null ? `${el.style.padding}px` : undefined,
                backgroundColor: el.style.backgroundColor,
              }}
            >
              {el.content}
            </div>
          ) : null}
          {el.type === "box" || el.type === "signal" || el.type === "analysis_pin" ? (
            <div
              className="w-full h-full"
              style={{
                backgroundColor: el.style.backgroundColor || "transparent",
                borderStyle: el.style.borderStyle || "solid",
                borderWidth: el.style.borderWidth != null ? `${el.style.borderWidth}px` : "1px",
                borderColor: el.style.borderColor || "var(--mimi-hairline, #D4D4D4)",
                borderRadius: el.style.borderRadius ? `${el.style.borderRadius}px` : undefined,
                padding: el.style.padding != null ? `${el.style.padding}px` : undefined,
              }}
            >
              {el.content ? (
                <span className="font-mono text-[8px] uppercase tracking-widest text-[var(--mimi-stone,#78716C)]">
                  {el.content}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
};
