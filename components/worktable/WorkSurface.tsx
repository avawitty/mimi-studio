import React from "react";

type WorkSurfaceProps = {
  children: React.ReactNode;
  /** Show corner reticle marks (desktop) — off by default; atelier parchment, not drafting grid */
  reticles?: boolean;
  className?: string;
};

/**
 * WT-004 — Desk background: parchment grain and faint deckle edges.
 * Scoped archival field for the Studio worktable (not a public-face wash).
 */
export const WorkSurface: React.FC<WorkSurfaceProps> = ({
  children,
  reticles = false,
  className = "",
}) => {
  return (
    <div
      data-specimen="WT-004"
      className={`studio-worktable-v2 relative h-full min-h-0 overflow-hidden ${className}`.trim()}
      style={
        {
          /* Parchment / warm ivory — Hub QA palette */
          "--wt-paper": "#f6f3ec",
          "--wt-paper-2": "#f0ede6",
          "--wt-line": "#d8d3c6",
          "--wt-ink": "#1b1b19",
          "--wt-ink-2": "#6b6a66",
          backgroundColor: "#f6f3ec",
          color: "#1b1b19",
        } as React.CSSProperties
      }
    >
      {/* Faint deckle — irregular paper edge, not engineering grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.55]"
        style={{
          background: `
            radial-gradient(ellipse 95% 70% at 0% 0%, transparent 58%, rgba(196, 186, 168, 0.14) 100%),
            radial-gradient(ellipse 90% 75% at 100% 100%, transparent 52%, rgba(188, 178, 160, 0.12) 100%),
            radial-gradient(ellipse 70% 55% at 100% 0%, transparent 62%, rgba(202, 192, 174, 0.09) 100%),
            radial-gradient(ellipse 65% 50% at 0% 100%, transparent 64%, rgba(194, 184, 166, 0.08) 100%)
          `,
        }}
      />
      {/* Paper grain */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.08] mix-blend-multiply"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      {reticles && (
        <>
          <span
            aria-hidden
            className="pointer-events-none absolute top-3 left-3 hidden font-mono text-[11px] text-[var(--wt-ink-2,#8a877f)] lg:block"
          >
            +
          </span>
          <span
            aria-hidden
            className="pointer-events-none absolute top-3 right-3 hidden font-mono text-[11px] text-[var(--wt-ink-2,#8a877f)] lg:block"
          >
            +
          </span>
          <span
            aria-hidden
            className="pointer-events-none absolute bottom-3 left-3 hidden font-mono text-[11px] text-[var(--wt-ink-2,#8a877f)] lg:block"
          >
            +
          </span>
          <span
            aria-hidden
            className="pointer-events-none absolute bottom-3 right-3 hidden font-mono text-[11px] text-[var(--wt-ink-2,#8a877f)] lg:block"
          >
            +
          </span>
        </>
      )}

      <div className="relative z-[1] h-full min-h-0 flex flex-col">{children}</div>
    </div>
  );
};
