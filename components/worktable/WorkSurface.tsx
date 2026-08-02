import React from "react";

type WorkSurfaceProps = {
  children: React.ReactNode;
  /** Show corner reticle marks (desktop) */
  reticles?: boolean;
  className?: string;
};

/**
 * WT-004 — Desk background: paper grain, pencil grid, corner brackets.
 * Scoped archival field for the Studio worktable (not a public-face wash).
 */
export const WorkSurface: React.FC<WorkSurfaceProps> = ({
  children,
  reticles = true,
  className = "",
}) => {
  return (
    <div
      data-specimen="WT-004"
      className={`studio-worktable-v2 relative h-full min-h-0 overflow-hidden ${className}`.trim()}
      style={{
        backgroundColor: "var(--wt-paper, var(--mimi-manila-sheet, #f7f3e8))",
        color: "var(--wt-ink, var(--mimi-ink-soft, #111110))",
      }}
    >
      {/* Pencil grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: `
            linear-gradient(var(--wt-line, var(--mimi-hairline, #d8d4c9)) 1px, transparent 1px),
            linear-gradient(90deg, var(--wt-line, var(--mimi-hairline, #d8d4c9)) 1px, transparent 1px)
          `,
          backgroundSize: "24px 24px",
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
