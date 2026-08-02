import { sanitizeTailorText } from "../constants/tailorSafetyRules";
import type {
  AestheticSignature,
  EvidenceBasedCreativeDossier,
  TailorAuditReport,
  TailorLogicDraft,
} from "../types";

export interface PriorTasteContext {
  aestheticSignature?: AestheticSignature | null;
  lastAuditReport?: TailorAuditReport | null;
  styleEvidenceSummary?: string[];
  /** Atelier pins weighted as desire / buyer orientation */
  atelierDesireSignals?: string[];
  /** Atelier pins marked reference-only (lower weight) */
  atelierReferenceSignals?: string[];
}

export interface LocalVisualSignal {
  refId: string;
  palette: string[];
  brightness: number;
  contrastHint: "low" | "medium" | "high";
  warmBias: number;
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))];
}

function clamp(n: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, n));
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b]
    .map((c) => Math.round(c).toString(16).padStart(2, "0"))
    .join("")}`;
}

/**
 * Sample dominant colors from a data URL via canvas — no vision API required.
 */
export async function extractVisualSignalsFromDataUrl(
  dataUrl: string,
  refIndex: number,
): Promise<LocalVisualSignal> {
  const refId = `ref_${String(refIndex + 1).padStart(2, "0")}`;
  if (typeof document === "undefined") {
    return {
      refId,
      palette: ["#1a1a1a", "#4a4a4a", "#8a8a8a", "#c8c8c8", "#f0f0f0"],
      brightness: 0.45,
      contrastHint: "medium",
      warmBias: 0,
    };
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const size = 48;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          resolve({
            refId,
            palette: ["#222222", "#555555", "#888888", "#bbbbbb", "#eeeeee"],
            brightness: 0.5,
            contrastHint: "medium",
            warmBias: 0,
          });
          return;
        }
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);

        const buckets = new Map<string, { count: number; r: number; g: number; b: number }>();
        let lumSum = 0;
        let warmSum = 0;
        let pixelCount = 0;
        const lums: number[] = [];

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          if (a < 128) continue;
          const qr = Math.round(r / 32) * 32;
          const qg = Math.round(g / 32) * 32;
          const qb = Math.round(b / 32) * 32;
          const key = `${qr},${qg},${qb}`;
          const existing = buckets.get(key);
          if (existing) {
            existing.count += 1;
            existing.r += r;
            existing.g += g;
            existing.b += b;
          } else {
            buckets.set(key, { count: 1, r, g, b });
          }
          const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
          lumSum += lum;
          lums.push(lum);
          warmSum += (r - b) / 255;
          pixelCount += 1;
        }

        const sorted = [...buckets.values()].sort((a, b) => b.count - a.count);
        const palette = sorted.slice(0, 5).map((bucket) =>
          rgbToHex(bucket.r / bucket.count, bucket.g / bucket.count, bucket.b / bucket.count),
        );
        while (palette.length < 5) {
          palette.push(palette[palette.length - 1] || "#808080");
        }

        const brightness = pixelCount ? lumSum / pixelCount : 0.5;
        lums.sort((a, b) => a - b);
        const p10 = lums[Math.floor(lums.length * 0.1)] ?? 0;
        const p90 = lums[Math.floor(lums.length * 0.9)] ?? 1;
        const spread = p90 - p10;
        const contrastHint: LocalVisualSignal["contrastHint"] =
          spread > 0.55 ? "high" : spread < 0.25 ? "low" : "medium";

        resolve({
          refId,
          palette,
          brightness,
          contrastHint,
          warmBias: pixelCount ? warmSum / pixelCount : 0,
        });
      } catch {
        resolve({
          refId,
          palette: ["#1f1f1f", "#3d3d3d", "#6b6b6b", "#a8a8a8", "#e5e5e5"],
          brightness: 0.4,
          contrastHint: "medium",
          warmBias: 0,
        });
      }
    };
    img.onerror = () =>
      resolve({
        refId,
        palette: ["#111111", "#333333", "#666666", "#999999", "#cccccc"],
        brightness: 0.35,
        contrastHint: "medium",
        warmBias: 0,
      });
    img.src = dataUrl;
  });
}

function parseDigestLines(digest?: string): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  if (!digest?.trim()) return out;
  for (const raw of digest.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("—")) continue;
    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const key = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();
    if (!value || value === "Not set") continue;
    out[key] = unique(value.split(/[,·|;]/).map((v) => v.trim()));
  }
  return out;
}

function titleCaseJoin(parts: string[], fallback: string): string {
  const cleaned = unique(parts).slice(0, 3);
  if (!cleaned.length) return fallback;
  return cleaned.map((p) => p.replace(/\b\w/g, (c) => c.toUpperCase())).join(" / ");
}

/**
 * Build a usable Evidence-Based Creative Dossier without Gemini —
 * from Tailor blueprint, local visual signals, and prior Style Lab / audit memory.
 */
export function synthesizeLocalCreativeDossier(input: {
  imageCount: number;
  userBlurb?: string;
  blueprintDigest?: string;
  visualSignals?: LocalVisualSignal[];
  prior?: PriorTasteContext;
}): EvidenceBasedCreativeDossier {
  const fields = parseDigestLines(input.blueprintDigest);
  const signals = input.visualSignals ?? [];
  const priorSig = input.prior?.aestheticSignature;
  const priorAudit = input.prior?.lastAuditReport;
  const evidenceNotes = unique([
    ...(input.prior?.styleEvidenceSummary ?? []),
    ...(input.prior?.atelierDesireSignals ?? []).map((s) => `atelier desire: ${s}`),
    ...(input.prior?.atelierReferenceSignals ?? []).map((s) => `atelier reference: ${s}`),
  ]);

  const atelierMotifs = (input.prior?.atelierDesireSignals ?? [])
    .map((s) => s.split(" · ")[0]?.trim())
    .filter(Boolean);

  const materiality = unique([
    ...(fields["materiality"] ?? []),
    ...(fields["aesthetic core"] ?? []),
    priorSig?.tactileBias?.dominant ?? "",
    priorSig?.tactileBias?.secondary ?? "",
    ...atelierMotifs.slice(0, 3),
  ]);
  const silhouettes = unique([
    ...(fields["silhouettes"] ?? []),
    ...(priorSig?.motifs ?? []),
    ...atelierMotifs.slice(0, 3),
  ]);
  const palette = unique([
    ...(fields["primary color"] ?? []),
    ...(fields["accent color"] ?? []),
    ...(fields["base neutral"] ?? []),
    ...(priorSig?.paletteExtraction ?? []),
    ...signals.flatMap((s) => s.palette),
  ]).filter((v) => v.startsWith("#") || /^[a-z]/i.test(v));

  const hexPalette = unique([
    ...palette,
    ...signals.flatMap((s) => s.palette),
    ...(priorSig?.paletteExtraction ?? []),
  ]).filter((v) => /^#[0-9a-f]{3,8}$/i.test(v));

  const voice = unique([
    ...(fields["voice — emotional temperature"] ?? []),
    ...(fields["tone"] ?? []),
    ...(fields["voice notes"] ?? []),
    ...(priorSig?.moodCluster ? [priorSig.moodCluster] : []),
  ]);
  const deepen = unique([...(fields["deepen"] ?? []), ...(fields["experiment"] ?? [])]);
  // Digest label is "Exclusion principles (what they refuse)" — also accept short keys.
  const exclusionFromDigest = Object.entries(fields)
    .filter(([key]) => key === "exclusion principles" || key.startsWith("exclusion principles"))
    .flatMap(([, values]) => values);
  const refuse = unique([
    ...(fields["refuse"] ?? []),
    ...(fields["refusals"] ?? []),
    ...(fields["exclusion rules"] ?? []),
    ...exclusionFromDigest,
  ]);
  const references = unique([
    ...(fields["references"] ?? []),
    ...(fields["cultural references"] ?? []),
    ...(priorAudit?.suggestedTouchpoints ?? []),
    ...evidenceNotes,
  ]);
  const typography = unique([
    ...(fields["typography"] ?? []),
    ...(fields["serif / sans / mono"] ?? []),
    priorSig?.typographicPairing?.serif ?? "",
    priorSig?.typographicPairing?.sans ?? "",
  ]);

  const axisLabel =
    priorSig?.primaryAxis ||
    titleCaseJoin(
      [silhouettes[0], materiality[0]].filter(Boolean) as string[],
      "Evidence Lattice",
    );
  const secondary =
    priorSig?.secondaryAxis ||
    titleCaseJoin([voice[0], deepen[0]].filter(Boolean) as string[], "Declared Vector");

  const containerName = sanitizeTailorText(
    priorSig?.primaryAxis
      ? `${priorSig.primaryAxis} Chamber`
      : `${axisLabel.replace(/\s*\/\s*/g, " · ")} Protocol`,
  );

  const philosophy = sanitizeTailorText(
    priorSig?.coreTrait ||
      priorAudit?.profileManifesto ||
      `Build from ${materiality[0] || "tactile restraint"} and ${voice[0] || "measured voice"}; refuse ${refuse[0] || "generic spectacle"} while deepening ${deepen[0] || "what already coheres"}.`,
  );

  const totalRefs = Math.max(input.imageCount, signals.length, 1);
  const refIds = Array.from({ length: Math.max(input.imageCount, signals.length) }, (_, i) =>
    `ref_${String(i + 1).padStart(2, "0")}`,
  );
  if (!refIds.length) refIds.push("ref_bp");

  const cite = (ids: string[] = refIds.slice(0, Math.min(3, refIds.length))) =>
    ids.length ? ids : ["ref_bp"];

  const recurringSignals = [
    materiality[0] && {
      signal: `Material bias toward ${materiality[0]}`,
      count: Math.min(totalRefs, Math.max(2, materiality.length)),
      totalReferences: totalRefs,
      evidenceRefIds: cite(),
      confidence: clamp(0.45 + materiality.length * 0.08),
    },
    hexPalette[0] && {
      signal: `Chromatic gravity around ${hexPalette.slice(0, 3).join(", ")}`,
      count: Math.min(totalRefs, Math.max(2, signals.length || 2)),
      totalReferences: totalRefs,
      evidenceRefIds: cite(signals.slice(0, 3).map((s) => s.refId)),
      confidence: clamp(0.5 + signals.length * 0.07),
    },
    voice[0] && {
      signal: `Emotional register: ${voice[0]}`,
      count: Math.min(totalRefs, 2),
      totalReferences: totalRefs,
      evidenceRefIds: ["ref_bp"],
      confidence: 0.55,
    },
    silhouettes[0] && {
      signal: `Form language returns to ${silhouettes[0]}`,
      count: Math.min(totalRefs, Math.max(2, silhouettes.length)),
      totalReferences: totalRefs,
      evidenceRefIds: cite(),
      confidence: clamp(0.4 + silhouettes.length * 0.1),
    },
    priorSig?.motifs?.[0] && {
      signal: `Motif continuity from Style Lab: ${priorSig.motifs.slice(0, 2).join(" · ")}`,
      count: Math.min(totalRefs, priorSig.motifs.length),
      totalReferences: totalRefs,
      evidenceRefIds: cite(),
      confidence: 0.62,
    },
  ].filter(Boolean) as EvidenceBasedCreativeDossier["patternGraph"]["recurringSignals"];

  if (recurringSignals.length === 0) {
    recurringSignals.push({
      signal: "Sparse but intentional evidence — treat restraint as the signal",
      count: 1,
      totalReferences: totalRefs,
      evidenceRefIds: cite(),
      confidence: 0.35,
    });
  }

  const contrastVotes = signals.map((s) => s.contrastHint);
  const dominantContrast =
    contrastVotes.sort(
      (a, b) =>
        contrastVotes.filter((x) => x === b).length - contrastVotes.filter((x) => x === a).length,
    )[0] || "medium";

  const designLaws = [
    {
      law: sanitizeTailorText(
        `Prefer ${materiality[0] || "tactile materials"} over decorative gloss`,
      ),
      rationale: sanitizeTailorText(
        materiality.length
          ? `Declared / observed material vocabulary: ${materiality.slice(0, 3).join(", ")}.`
          : "Blueprint lacks material detail; default to restraint until more evidence arrives.",
      ),
      evidenceRefIds: cite(),
      confidence: clamp(0.4 + materiality.length * 0.1),
    },
    {
      law: sanitizeTailorText(
        `Keep contrast ${dominantContrast}; do not flatten the value range`,
      ),
      rationale: sanitizeTailorText(
        signals.length
          ? `Local image sampling across ${signals.length} frame(s) shows ${dominantContrast} contrast.`
          : "No images sampled — contrast rule inferred from declared palette / mood.",
      ),
      evidenceRefIds: cite(signals.map((s) => s.refId).slice(0, 3)),
      confidence: signals.length ? 0.7 : 0.4,
    },
    {
      law: sanitizeTailorText(
        refuse[0]
          ? `Actively refuse ${refuse[0]}`
          : "Refuse trend labels that erase decision-level specificity",
      ),
      rationale: sanitizeTailorText(
        refuse.length
          ? `Exclusion principles: ${refuse.slice(0, 3).join("; ")}.`
          : priorAudit?.aestheticDirectives?.[0] ||
              "No explicit refusals yet — keep language decision-based.",
      ),
      evidenceRefIds: ["ref_bp"],
      confidence: refuse.length ? 0.75 : 0.45,
    },
    ...(priorAudit?.aestheticDirectives ?? []).slice(0, 2).map((d) => ({
      law: sanitizeTailorText(d),
      rationale: "Carried forward from a prior Scry Directives audit on this profile.",
      evidenceRefIds: ["ref_bp"],
      confidence: 0.58,
    })),
  ];

  const readings = unique([
    ...references.slice(0, 5),
    ...(priorAudit?.suggestedTouchpoints ?? []),
    priorSig?.primaryAxis ? `Re-read ${priorSig.primaryAxis} against new uploads` : "",
    secondary ? `Adjacent vector study: ${secondary}` : "",
  ]).slice(0, 6);

  const referenceReadings = (signals.length ? signals : [{ refId: "ref_bp", palette: hexPalette, brightness: 0.45, contrastHint: "medium" as const, warmBias: 0 }]).map(
    (sig, i) => ({
      id: sig.refId,
      visualSummary: sanitizeTailorText(
        sig.refId === "ref_bp"
          ? `Blueprint-only read grounded in ${axisLabel}.`
          : `Frame ${i + 1}: ${sig.contrastHint} contrast, brightness ${Math.round(sig.brightness * 100)}%, warm bias ${sig.warmBias.toFixed(2)}.`,
      ),
      objects: silhouettes.slice(0, 3),
      composition: [
        sig.contrastHint === "high" ? "stark figure–ground split" : "soft field continuity",
      ],
      colorSystem: {
        palette: sig.palette.length ? sig.palette : hexPalette.slice(0, 5),
        logic: sanitizeTailorText(
          sig.warmBias > 0.08
            ? "Warm-leaning chroma clustered toward earth / mineral tones."
            : sig.warmBias < -0.08
              ? "Cool-leaning chroma; keep accents sparse."
              : "Neutral-balanced chroma; rely on value, not hue drama.",
        ),
      },
      typography: typography.slice(0, 3),
      materials: materiality.slice(0, 3),
      texture: [priorSig?.tactileBias?.dominant, priorSig?.tactileBias?.secondary].filter(
        Boolean,
      ) as string[],
      historicalTouchpoints: readings.slice(0, 3),
      emotionalTone: voice.slice(0, 3),
      interestingDecisions: deepen.slice(0, 2),
      underlyingPrinciples: [
        {
          principle: sanitizeTailorText(philosophy.split(".")[0] || philosophy),
          confidence: 0.55,
        },
      ],
    }),
  );

  const accentHex = hexPalette[1] || hexPalette[0] || "#1a1a1a";
  const avgBrightness =
    signals.reduce((sum, s) => sum + s.brightness, 0) / Math.max(signals.length, 1);
  const paperWarmth =
    signals.some((s) => s.warmBias > 0.1) || avgBrightness > 0.65
      ? "warm"
      : signals.some((s) => s.warmBias < -0.1)
        ? "cool"
        : "neutral";

  return {
    dossierTitle: "Evidence-Based Creative Dossier",
    userIntent: sanitizeTailorText(
      input.userBlurb?.trim() ||
        `Compile a full read of ${axisLabel}${priorSig ? " building on prior Style Lab calibration" : ""}.`,
    ),
    references: referenceReadings,
    patternGraph: {
      recurringSignals,
      outliers: signals
        .filter((s) => Math.abs(s.brightness - avgBrightness) > 0.25)
        .slice(0, 2)
        .map((s) => ({
          signal: s.brightness > avgBrightness ? "Unusually bright frame" : "Unusually dark frame",
          refId: s.refId,
          note: "Value outlier relative to the set — may be a deliberate tension plate.",
        })),
    },
    creativeOperatingSystem: {
      containerName,
      oneSentencePhilosophy: philosophy,
      designLaws,
      visualGrammar: unique([
        ...silhouettes.slice(0, 3),
        dominantContrast === "high" ? "hard silhouette edges" : "soft perimeter dissolves",
        priorSig?.moodCluster || "",
      ]),
      materialVocabulary: materiality.slice(0, 5),
      emotionalVocabulary: voice.slice(0, 5),
      colorLogic: sanitizeTailorText(
        hexPalette.length
          ? `Anchor on ${hexPalette.slice(0, 3).join(", ")}; treat remaining hues as rare punctuation.`
          : "Palette still under-specified — extract from next image batch before locking.",
      ),
      compositionLogic: sanitizeTailorText(
        `Favor ${dominantContrast} contrast compositions with clear hierarchy; avoid equal-weight collage.`,
      ),
      typographyLogic: sanitizeTailorText(
        typography.length
          ? `Pair ${typography.slice(0, 2).join(" with ")} — editorial voice over display noise.`
          : "Typography undeclared; prefer one serif + one mono until calibrated.",
      ),
      symbolLogic: sanitizeTailorText(
        priorSig?.motifs?.length
          ? `Recurring motifs: ${priorSig.motifs.slice(0, 4).join(", ")}.`
          : "Motifs emerge from material + silhouette, not decorative icons.",
      ),
      thingsToAvoid: unique([
        ...refuse.slice(0, 4),
        "Generic aesthetic genre labels without decision citations",
        "Palette drift away from sampled / declared anchors",
      ]),
    },
    applications: {
      illustration: [
        `Lead with ${materiality[0] || "texture"} studies before character work`,
        `Keep motif set to ${priorSig?.motifs?.[0] || silhouettes[0] || "one recurring object"}`,
      ],
      brand: [
        `Position around ${containerName}`,
        refuse[0] ? `Public refusals: ${refuse[0]}` : "Publish one clear exclusion rule",
      ],
      ui: [
        `UI chrome inherits ${hexPalette[0] || "neutral base"} + one accent (${accentHex})`,
        "Prefer hairline rules and mono metadata over card chrome",
      ],
      writing: [
        philosophy,
        voice[0] ? `Maintain ${voice[0]} temperature across captions` : "Keep captions observational",
      ],
      photography: [
        `Target ${dominantContrast} contrast plates`,
        tactileHint(priorSig),
      ],
      packaging: [
        `Surface language: ${materiality[0] || "uncoated stock"}`,
        typography[0] ? `Type lockup in ${typography[0]}` : "One typeface family max",
      ],
      fashion: [
        silhouettes[0] ? `Silhouette bias: ${silhouettes[0]}` : "Define one silhouette law next",
        materiality[1] ? `Secondary handfeel: ${materiality[1]}` : "Document fabric refs",
      ],
      product: [
        deepen[0] ? `Roadmap deepen: ${deepen[0]}` : "Pick one deepen vector for Q1",
        "Ship evidence-linked SKUs, not vibe merch",
      ],
    },
    inversions: [
      {
        becauseYouTendTo: sanitizeTailorText(
          `Return to ${materiality[0] || axisLabel} as safety`,
        ),
        tryInstead: sanitizeTailorText(
          deepen[0]
            ? `Run a controlled experiment on ${deepen[0]} for one week`
            : "Introduce one opposing texture while locking palette",
        ),
        evidenceRefIds: cite(),
      },
    ],
    nextExperiments: [
      {
        title: "Contact-sheet calibration",
        hypothesis:
          "A 9-frame contact sheet of new refs will either confirm chromatic gravity or force a palette split.",
        evidenceRefIds: cite(),
      },
      ...readings.slice(0, 4).map((reading) => ({
        title: `Reading / reference: ${reading}`,
        hypothesis: `Study this touchpoint against your container (${containerName}) and note which laws hold.`,
        evidenceRefIds: ["ref_bp"],
      })),
      ...(priorAudit?.strategicOpportunity
        ? [
            {
              title: "Prior strategic opportunity",
              hypothesis: priorAudit.strategicOpportunity,
              evidenceRefIds: ["ref_bp"],
            },
          ]
        : []),
    ],
    likenessManifest: {
      accentHex,
      paperWarmth: paperWarmth as "cool" | "warm" | "neutral",
      voiceAdjectives: voice.slice(0, 4).length
        ? voice.slice(0, 4)
        : ["observational", "precise"],
      motifCandidates: unique([...(priorSig?.motifs ?? []), ...silhouettes]).slice(0, 5),
      antiMotifs: refuse.slice(0, 4),
      containerName,
      oneSentencePhilosophy: philosophy,
    },
    synthesizedAt: Date.now(),
  };
}

function tactileHint(priorSig?: AestheticSignature | null): string {
  if (priorSig?.tactileBias?.dominant) {
    return `Push tactile presence of ${priorSig.tactileBias.dominant}`;
  }
  return "Capture one tactile close-up per shoot";
}

/**
 * Offline Scry Directives / manifesto audit from Tailor draft + prior memory.
 */
export function synthesizeLocalTailorAudit(
  draft: Partial<TailorLogicDraft> | null | undefined,
  prior?: PriorTasteContext,
): TailorAuditReport {
  const pc = draft?.positioningCore;
  const ee = draft?.expressionEngine;
  const sv = draft?.strategicVectors;
  const ss = draft?.strategicSummary;
  const sig = prior?.aestheticSignature;

  const materials = unique([
    ...(pc?.aestheticCore?.materiality ?? []),
    sig?.tactileBias?.dominant ?? "",
    sig?.tactileBias?.secondary ?? "",
  ]);
  const silhouettes = unique([...(pc?.aestheticCore?.silhouettes ?? []), ...(sig?.motifs ?? [])]);
  const deepen = unique([...(sv?.desireVectors?.deepen ?? []), ...(sv?.desireVectors?.experiment ?? [])]);
  const refuse = unique([
    ...(pc?.exclusionPrinciples ?? []),
    ...(sv?.desireVectors?.refuse ?? []),
    ...(ss?.exclusionRules ?? []),
  ]);
  const refs = unique([
    ...(pc?.anchors?.culturalReferences ?? []),
    ...(prior?.lastAuditReport?.suggestedTouchpoints ?? []),
    ...(prior?.styleEvidenceSummary ?? []),
    ...(prior?.atelierDesireSignals ?? []),
    ...(prior?.atelierReferenceSignals ?? []),
  ]);

  const axis = sig?.primaryAxis || silhouettes[0] || materials[0] || "Unnamed Axis";
  const secondary = sig?.secondaryAxis || deepen[0] || "Open Vector";

  const profileManifesto = sanitizeTailorText(
    sig?.coreTrait ||
      ss?.aestheticDNA ||
      prior?.lastAuditReport?.profileManifesto ||
      `Operate as ${axis} against ${secondary}: let ${materials[0] || "material honesty"} set the law, and treat ${refuse[0] || "spectacle without structure"} as off-limits.`,
  );

  const aestheticDirectives = unique([
    materials[0] ? `Lead with ${materials[0]} before ornament` : "",
    silhouettes[0] ? `Hold silhouette grammar to ${silhouettes[0]}` : "",
    ee?.chromaticRegistry?.baseNeutral
      ? `Keep base neutral at ${ee.chromaticRegistry.baseNeutral}`
      : sig?.paletteExtraction?.[0]
        ? `Lock palette gravity to ${sig.paletteExtraction.slice(0, 3).join(", ")}`
        : "",
    refuse[0] ? `Hard refuse: ${refuse[0]}` : "Name one hard refusal this week",
    ee?.narrativeVoice?.emotionalTemperature
      ? `Voice temperature stays ${ee.narrativeVoice.emotionalTemperature}`
      : "",
    ...(prior?.lastAuditReport?.aestheticDirectives ?? []).slice(0, 2),
  ]).slice(0, 5);

  const suggestedTouchpoints = unique([
    ...refs.slice(0, 4),
    axis !== "Unnamed Axis" ? `${axis} field notes / adjacent makers` : "",
    secondary !== "Open Vector" ? `${secondary} case studies` : "",
    materials[0] ? `${materials[0]} fabrication references` : "",
    "One essay + one exhibition text adjacent to your container",
  ]).slice(0, 5);

  const strategicOpportunity = sanitizeTailorText(
    prior?.lastAuditReport?.strategicOpportunity ||
      ss?.identityVector ||
      (deepen[0]
        ? `Authority compounds if you deepen ${deepen[0]} while publishing exclusions around ${refuse[0] || "diffuse trend mimicry"}.`
        : `Convert ${axis} from mood into operational laws others can audit — that is the leverage.`),
  );

  return {
    profileManifesto,
    strategicOpportunity,
    aestheticDirectives: aestheticDirectives.length
      ? aestheticDirectives
      : ["Document one material law", "Document one refusal", "Document one deepen vector"],
    suggestedTouchpoints,
  };
}

export function buildPriorTasteContextFromProfile(profile: {
  tasteProfile?: { aestheticSignature?: AestheticSignature };
  lastAuditReport?: TailorAuditReport;
  tailorDraft?: Partial<TailorLogicDraft> | null;
} | null | undefined): PriorTasteContext {
  const evidence = profile?.tailorDraft?.styleEvidence ?? [];
  return {
    aestheticSignature: profile?.tasteProfile?.aestheticSignature ?? null,
    lastAuditReport: profile?.lastAuditReport ?? null,
    styleEvidenceSummary: evidence
      .filter((e) => e?.value)
      .slice(0, 8)
      .map((e) => `${e.type}: ${e.value}`),
  };
}
