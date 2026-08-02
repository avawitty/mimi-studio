import { useEffect, useState } from "react";

export const BREAKPOINTS = {
  sm: "(min-width: 640px)",
  md: "(min-width: 768px)",
  lg: "(min-width: 1024px)",
  xl: "(min-width: 1280px)",
  /** Narrow = phone / small tablet — mirrors ArchiveChamberShell + StudioChrome */
  narrow: "(max-width: 767px)",
} as const;

export type BreakpointQuery = keyof typeof BREAKPOINTS | (string & {});

function resolveQuery(query: BreakpointQuery): string {
  if (query in BREAKPOINTS) {
    return BREAKPOINTS[query as keyof typeof BREAKPOINTS];
  }
  return query;
}

/**
 * Subscribe to a CSS media query. Defaults to the narrow (mobile) query.
 * SSR-safe: initial match is false until mounted.
 */
export function useMediaQuery(query: BreakpointQuery = "narrow"): boolean {
  const resolved = resolveQuery(query);
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia(resolved);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [resolved]);

  return matches;
}

/** True when viewport is below the md (768px) breakpoint. */
export function useIsNarrow(): boolean {
  return useMediaQuery("narrow");
}

export type BreakpointName = "xs" | "sm" | "md" | "lg" | "xl";

/**
 * Coarse named breakpoint (mobile-first). Useful for shell layout decisions.
 */
export function useBreakpoint(): BreakpointName {
  const sm = useMediaQuery("sm");
  const md = useMediaQuery("md");
  const lg = useMediaQuery("lg");
  const xl = useMediaQuery("xl");
  if (xl) return "xl";
  if (lg) return "lg";
  if (md) return "md";
  if (sm) return "sm";
  return "xs";
}
