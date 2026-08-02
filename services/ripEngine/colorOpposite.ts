/** Derive opposite / complementary palette tokens for Rip readings. */

function expandHex(hex: string): string | null {
  const raw = hex.trim();
  if (/^#([0-9a-f]{3})$/i.test(raw)) {
    const r = raw[1];
    const g = raw[2];
    const b = raw[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  if (/^#([0-9a-f]{6})$/i.test(raw)) return raw.toLowerCase();
  return null;
}

function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const full = expandHex(hex);
  if (!full) return null;
  const r = parseInt(full.slice(1, 3), 16) / 255;
  const g = parseInt(full.slice(3, 5), 16) / 255;
  const b = parseInt(full.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: l * 100 };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  switch (max) {
    case r:
      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      break;
    case g:
      h = ((b - r) / d + 2) / 6;
      break;
    default:
      h = ((r - g) / d + 4) / 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
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

const NAMED_OPPOSITES: Record<string, string> = {
  black: "bone",
  ink: "ivory",
  charcoal: "chalk",
  ivory: "ink",
  cream: "graphite",
  gold: "ultramarine",
  ochre: "slate blue",
  rose: "viridian",
  crimson: "sea glass",
  navy: "saffron",
  sage: "magenta ash",
  emerald: "oxide red",
  violet: "citron",
  sand: "deep indigo",
  taupe: "electric cobalt",
  muted: "high-chroma signal",
  neutral: "saturated conflict",
};

/** Invert a single color token (hex → complementary; named → mapped opposite). */
export function oppositeColorToken(token: string): string {
  const t = (token || "").trim();
  if (!t) return "high-chroma conflict";
  const hsl = hexToHsl(t);
  if (hsl) {
    const h = (hsl.h + 180) % 360;
    const s = Math.min(90, Math.max(25, hsl.s + 15));
    const l = hsl.l > 55 ? Math.max(18, 100 - hsl.l) : Math.min(82, 100 - hsl.l);
    return hslToHex(h, s, l);
  }
  const lower = t.toLowerCase();
  for (const [name, opp] of Object.entries(NAMED_OPPOSITES)) {
    if (lower.includes(name)) return opp;
  }
  return `anti-${lower.slice(0, 24)}`;
}

export function oppositePaletteFrom(tokens: string[], max = 4): string[] {
  const out: string[] = [];
  for (const token of tokens) {
    const opp = oppositeColorToken(token);
    if (!out.includes(opp)) out.push(opp);
    if (out.length >= max) break;
  }
  if (out.length === 0) out.push("high-chroma conflict", "ash white");
  return out;
}
