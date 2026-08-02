/** Resolve palette tokens (hex or named) into CSS hex for procedural rendering. */

const NAMED: Record<string, string> = {
  black: "#0c0c0e",
  charcoal: "#1a1a1c",
  ink: "#121214",
  ivory: "#f3efe6",
  cream: "#ebe4d6",
  bone: "#e6dfd2",
  white: "#f5f5f2",
  gold: "#c4a35a",
  gilt: "#e1ad01",
  brass: "#b08d57",
  copper: "#b87333",
  rose: "#c48b9f",
  blush: "#d4a5a5",
  crimson: "#8b1e3f",
  burgundy: "#5c1a2e",
  oxblood: "#4a0e1f",
  navy: "#1a2744",
  indigo: "#2a2a4a",
  slate: "#5a6570",
  steel: "#6b7280",
  sage: "#8a9a7b",
  moss: "#4a5d3f",
  olive: "#5c6b3a",
  emerald: "#2d9a6c",
  teal: "#2a7a7a",
  cyan: "#00f0ff",
  ochre: "#c4a35a",
  terracotta: "#c47a5a",
  rust: "#a0522d",
  sand: "#c2b280",
  taupe: "#8b7d6b",
  mauve: "#9a7b8f",
  lavender: "#9b8bb4",
  violet: "#6b4c9a",
  plum: "#5c3a5c",
  pearl: "#e8e0d8",
  silver: "#c0c0c0",
  graphite: "#2e2e32",
  muted: "#7a756c",
  neutral: "#8a867c",
};

function hashHue(token: string): number {
  let h = 0;
  for (let i = 0; i < token.length; i++) {
    h = (h * 31 + token.charCodeAt(i)) >>> 0;
  }
  return h % 360;
}

function hslToHex(h: number, s: number, l: number): string {
  const sat = s / 100;
  const light = l / 100;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = light - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  const to = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

export function resolveColorToken(token: string | undefined, fallback: string): string {
  const raw = (token || "").trim();
  if (!raw) return fallback;
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(raw)) {
    if (raw.length === 4) {
      const r = raw[1];
      const g = raw[2];
      const b = raw[3];
      return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
    }
    return raw.toLowerCase();
  }

  const lower = raw.toLowerCase();
  for (const [name, hex] of Object.entries(NAMED)) {
    if (lower.includes(name)) return hex;
  }

  // Soft editorial hash — avoid neon default bias
  const hue = hashHue(lower);
  return hslToHex(hue, 28, 42);
}

export function pickPalettePair(
  palette: string[] | undefined,
  fallbackPrimary = "#9d62f2",
  fallbackSecondary = "#131313",
): { primary: string; secondary: string } {
  const tokens = (palette || []).map((p) => p.trim()).filter(Boolean);
  if (tokens.length === 0) {
    return { primary: fallbackPrimary, secondary: fallbackSecondary };
  }
  const primary = resolveColorToken(tokens[0], fallbackPrimary);
  const secondary = resolveColorToken(
    tokens[1] || tokens[0],
    fallbackSecondary,
  );
  // If both resolve identically, darken secondary
  if (primary === secondary) {
    return { primary, secondary: "#131313" };
  }
  return { primary, secondary };
}
