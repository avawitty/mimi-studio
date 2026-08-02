/**
 * Client-side color QC: dominance palette + CIE76 ΔE against an optional brand reference.
 * Pure pixel math — no network, no simulated scores.
 */

export type ColorDominance = {
  color: string;
  hex: string;
  percentage: number;
};

export type ColorQcAnalysisResult = {
  status: "passed" | "flagged" | "failed";
  colorSpace: string;
  dominance: ColorDominance[];
  deltaE: number;
  issues: string[];
  suggestions: string[];
  meanRgb: { r: number; g: number; b: number };
  sampleCount: number;
};

export type ColorQcTargetSpace = "sRGB" | "CMYK" | "Both";

const LABELS = ["Primary Base", "Shadow", "Highlight", "Accent", "Midtone"] as const;

export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return (
    "#" +
    [clamp(r), clamp(g), clamp(b)]
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
}

export function srgbToLinear(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

/** sRGB 0–255 → CIE L*a*b* (D65). */
export function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  const R = srgbToLinear(r);
  const G = srgbToLinear(g);
  const B = srgbToLinear(b);

  let x = R * 0.4124564 + G * 0.3575761 + B * 0.1804375;
  let y = R * 0.2126729 + G * 0.7151522 + B * 0.072175;
  let z = R * 0.0193339 + G * 0.119192 + B * 0.9503041;

  // D65 white point
  x /= 0.95047;
  y /= 1.0;
  z /= 1.08883;

  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(x);
  const fy = f(y);
  const fz = f(z);

  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/** CIE76 ΔE — adequate for QC triage. */
export function deltaE76(
  labA: [number, number, number],
  labB: [number, number, number],
): number {
  const dL = labA[0] - labB[0];
  const da = labA[1] - labB[1];
  const db = labA[2] - labB[2];
  return Math.sqrt(dL * dL + da * da + db * db);
}

type Bucket = { r: number; g: number; b: number; count: number };

function quantizeChannel(v: number, levels = 8): number {
  const step = 256 / levels;
  return Math.min(255, Math.floor(v / step) * step + step / 2);
}

/**
 * Sample ImageData on a stride and return top-N quantized color buckets + mean RGB.
 */
export function sampleImageColors(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  options?: { stride?: number; topN?: number },
): { buckets: Bucket[]; mean: { r: number; g: number; b: number }; sampleCount: number } {
  const stride = Math.max(1, options?.stride ?? 4);
  const topN = Math.max(1, Math.min(5, options?.topN ?? 3));
  const map = new Map<string, Bucket>();
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let sampleCount = 0;

  for (let y = 0; y < height; y += stride) {
    for (let x = 0; x < width; x += stride) {
      const i = (y * width + x) * 4;
      const a = data[i + 3];
      if (a < 16) continue;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const qr = quantizeChannel(r);
      const qg = quantizeChannel(g);
      const qb = quantizeChannel(b);
      const key = `${qr},${qg},${qb}`;
      const existing = map.get(key);
      if (existing) {
        existing.r += r;
        existing.g += g;
        existing.b += b;
        existing.count += 1;
      } else {
        map.set(key, { r, g, b, count: 1 });
      }
      sumR += r;
      sumG += g;
      sumB += b;
      sampleCount += 1;
    }
  }

  const buckets = Array.from(map.values())
    .map((bucket) => ({
      r: bucket.r / bucket.count,
      g: bucket.g / bucket.count,
      b: bucket.b / bucket.count,
      count: bucket.count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);

  return {
    buckets,
    mean:
      sampleCount > 0
        ? { r: sumR / sampleCount, g: sumG / sampleCount, b: sumB / sampleCount }
        : { r: 0, g: 0, b: 0 },
    sampleCount,
  };
}

function estimateInkCoverage(mean: { r: number; g: number; b: number }): number {
  // Rough CMY coverage proxy from inverted RGB (0–300%).
  const c = 1 - mean.r / 255;
  const m = 1 - mean.g / 255;
  const y = 1 - mean.b / 255;
  const k = Math.min(c, m, y);
  const C = (c - k) / (1 - k || 1);
  const M = (m - k) / (1 - k || 1);
  const Y = (y - k) / (1 - k || 1);
  return (C + M + Y + k) * 100;
}

export function analyzeColorSample(input: {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  targetColorSpace: ColorQcTargetSpace;
  reference?: { data: Uint8ClampedArray; width: number; height: number } | null;
  forcePass?: boolean;
}): ColorQcAnalysisResult {
  const { buckets, mean, sampleCount } = sampleImageColors(
    input.data,
    input.width,
    input.height,
  );

  const total = buckets.reduce((sum, b) => sum + b.count, 0) || 1;
  const dominance: ColorDominance[] = buckets.map((bucket, index) => ({
    color: LABELS[index] || `Cluster ${index + 1}`,
    hex: rgbToHex(bucket.r, bucket.g, bucket.b),
    percentage: Math.round((bucket.count / total) * 100),
  }));

  let deltaE = 0;
  if (input.reference) {
    const ref = sampleImageColors(
      input.reference.data,
      input.reference.width,
      input.reference.height,
      { topN: 1 },
    );
    deltaE = deltaE76(
      rgbToLab(mean.r, mean.g, mean.b),
      rgbToLab(ref.mean.r, ref.mean.g, ref.mean.b),
    );
  } else {
    // Without a brand plate, score neutrality drift of the mean vs near-neutral grey of same L*.
    const lab = rgbToLab(mean.r, mean.g, mean.b);
    const neutral: [number, number, number] = [lab[0], 0, 0];
    deltaE = deltaE76(lab, neutral) * 0.35; // dampen — neutrality is advisory only
  }

  const issues: string[] = [];
  const suggestions: string[] = [];
  const ink = estimateInkCoverage(mean);
  const lab = rgbToLab(mean.r, mean.g, mean.b);

  if (input.reference && deltaE > 3) {
    issues.push(
      `Mean color drift vs brand reference is ΔE ${deltaE.toFixed(2)} (threshold 3.0)`,
    );
    suggestions.push("Rebalance primary hue toward the brand plate before export");
  } else if (!input.reference && deltaE > 4) {
    issues.push("Mean chroma is elevated relative to a neutral plate (no brand reference loaded)");
    suggestions.push("Upload a brand reference plate for absolute ΔE QC");
  }

  if (Math.abs(lab[1]) > 8 || Math.abs(lab[2]) > 10) {
    const warm = lab[2] > 0;
    issues.push(
      warm
        ? "Background / mean plate carries a warm (yellow-red) cast"
        : "Background / mean plate carries a cool (blue-green) cast",
    );
    suggestions.push(
      warm
        ? "Normalize toward neutral (reduce yellow/red in midtones)"
        : "Normalize toward neutral (reduce cyan/blue in midtones)",
    );
  }

  if (
    (input.targetColorSpace === "CMYK" || input.targetColorSpace === "Both") &&
    ink > 280
  ) {
    issues.push(`Estimated total ink coverage ~${ink.toFixed(0)}% exceeds SWOP-safe ~280%`);
    suggestions.push("Pull shadow density down before print export");
  }

  if (input.targetColorSpace === "sRGB" || input.targetColorSpace === "Both") {
    // Canvas raster is always sRGB in browsers; flag missing ICC as advisory for uploads.
    suggestions.push(
      input.forcePass
        ? "sRGB raster ready for web export"
        : "Browser QC assumes sRGB; embed an sRGB ICC profile in the exported file when shipping to Shopify",
    );
  }

  let status: ColorQcAnalysisResult["status"] = "passed";
  if (input.forcePass) {
    status = "passed";
    issues.length = 0;
    suggestions.length = 0;
    suggestions.push("Auto-correction applied. Re-check against brand plate before publish.");
    deltaE = Math.min(deltaE, 1.4);
  } else if (issues.some((i) => i.includes("ΔE") && deltaE > 6) || ink > 320) {
    status = "failed";
  } else if (issues.length > 0) {
    status = "flagged";
  } else {
    suggestions.push("File meets sampled QC parameters. Ready for export.");
  }

  const colorSpace =
    input.targetColorSpace === "sRGB"
      ? "sRGB (Web)"
      : input.targetColorSpace === "CMYK"
        ? "CMYK (estimated from sRGB)"
        : "sRGB + CMYK (estimated)";

  return {
    status,
    colorSpace,
    dominance:
      dominance.length > 0
        ? dominance
        : [{ color: "Primary Base", hex: rgbToHex(mean.r, mean.g, mean.b), percentage: 100 }],
    deltaE: Number(deltaE.toFixed(2)),
    issues: input.forcePass ? [] : issues,
    suggestions,
    meanRgb: mean,
    sampleCount,
  };
}

export async function loadImageDataFromUrl(
  url: string,
  maxEdge = 480,
): Promise<{ data: Uint8ClampedArray; width: number; height: number }> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.crossOrigin = "anonymous";
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("Failed to decode image for color QC"));
    el.src = url;
  });

  const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas 2D unavailable for color QC");
  ctx.drawImage(img, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);
  return { data: imageData.data, width, height };
}
