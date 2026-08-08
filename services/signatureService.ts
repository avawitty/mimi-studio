import {
  ZineMetadata,
  AestheticSignature,
  TailorLogicDraft,
  UsedContextEntry,
} from "../types";
import type { TasteModelSnapshot } from "../lib/tasteModel";
import { withResilience, generateTagsFromMedia } from "./geminiService";
import { generateViaGateway } from "./scryService";
import {
  parseSignatureJson,
  type ParsedAestheticSignature,
} from "../lib/signature/signatureSchema";

export interface SignatureGenerationContext {
  zines: ZineMetadata[];
  tailorDraft?: TailorLogicDraft | null;
  approvedUsedContext?: UsedContextEntry[];
  tasteSnapshot?: TasteModelSnapshot | null;
  priorSignature?: AestheticSignature | null;
}

const SIGNATURE_SYSTEM = `You are Mimi, an aesthetic editor producing a Taste Signature — a traceable editorial reading of a creator's aesthetic position.

Rules:
- This is NOT a personality diagnosis. Write as an editor citing evidence.
- Distinguish well_supported claims (multiple corroborating signals) from emerging or speculative reads.
- Every major claim should map to evidenceRefs when possible.
- antiSignature = hard refusals and off-limits combinations (not negations of taste).
- semioticTouchpoints = ranked motifs with context, visual directive, and rationale.
- creativeDirections = 3-5 operable brief vectors with optional chamber handoff.
- recommendations = next experiments with hypothesis + concrete action.
- driftNotes = where stated Tailor intent diverges from manifested zine output (omit if no tailor draft).
- reading.thesis = 2-4 sentence editorial opening; supportingParagraphs expand with evidence.
- Do not invent evidence IDs — only use IDs from the provided context bundles.
- Return strictly valid JSON matching the requested schema. No markdown wrappers.`;

function buildTasteSnapshotSummary(snapshot: TasteModelSnapshot | null | undefined): string {
  if (!snapshot) return "";
  const topFeatures = (snapshot.featureWeights ?? [])
    .slice()
    .sort((a, b) => b.signedWeight - a.signedWeight)
    .slice(0, 12)
    .map((f) => ({
      label: f.label,
      weight: Number(f.signedWeight.toFixed(2)),
      trend: f.trend,
      confidence: Number(f.confidence.toFixed(2)),
    }));
  const trajectory = snapshot.trajectory;
  const rules = (snapshot.interactionRules ?? [])
    .slice(0, 6)
    .map((r) => ({
      relation: r.relation,
      features: r.featureIds,
      confidence: r.confidence,
    }));
  return JSON.stringify({
    topFeatures,
    trajectory,
    interactionRules: rules,
    diagnostics: snapshot.diagnostics,
  });
}

function buildUsedContextBundle(entries: UsedContextEntry[]): string {
  return JSON.stringify(
    entries.slice(0, 24).map((e) => ({
      id: e.atomId,
      title: e.title,
      source: e.source,
      tags: e.tags,
      excerpt: e.content.slice(0, 280),
    })),
  );
}

async function buildZineSummaries(zines: ZineMetadata[]) {
  const zineSummaries = [];
  for (const z of zines.slice(0, 10)) {
    let tags = z.tags;
    if (!tags || tags.length === 0) {
      tags = await generateTagsFromMedia(
        z.content.vocal_summary_blurb || z.content.poetic_provocation || "",
        [],
      );
    }
    zineSummaries.push({
      id: z.id,
      title: z.title,
      tone: z.tone,
      content: z.content.vocal_summary_blurb || z.content.poetic_provocation || "",
      tags: tags || [],
      semiotic_signals: z.content.semiotic_signals?.slice(0, 5) ?? [],
    });
  }
  return zineSummaries;
}

function buildSignaturePrompt(ctx: SignatureGenerationContext, zineSummaries: unknown[]): string {
  const evidenceIds = (ctx.approvedUsedContext ?? []).map((e) => e.atomId);
  let prompt = `Synthesize an Aesthetic Signature from the evidence bundles below.\n\n`;

  if (ctx.tailorDraft) {
    prompt += `TAILOR LOGIC (stated intent):\n${JSON.stringify(ctx.tailorDraft)}\n\n`;
  }

  prompt += `MANIFESTED ZINES:\n${JSON.stringify(zineSummaries)}\n\n`;

  if (ctx.approvedUsedContext?.length) {
    prompt += `APPROVED USED CONTEXT (${ctx.approvedUsedContext.length} atoms):\n${buildUsedContextBundle(ctx.approvedUsedContext)}\n\n`;
  }

  const tasteSummary = buildTasteSnapshotSummary(ctx.tasteSnapshot);
  if (tasteSummary && tasteSummary !== "{}") {
    prompt += `TASTE MODEL SNAPSHOT:\n${tasteSummary}\n\n`;
  }

  if (ctx.priorSignature) {
    prompt += `PRIOR SIGNATURE (for drift narrative):\n${JSON.stringify({
      primaryAxis: ctx.priorSignature.primaryAxis,
      secondaryAxis: ctx.priorSignature.secondaryAxis,
      motifs: ctx.priorSignature.motifs,
      approvedAt: ctx.priorSignature.approvedAt,
    })}\n\n`;
  }

  prompt += `Known evidence atom IDs (use only these in evidenceRefs / evidenceRefIds): ${JSON.stringify(evidenceIds)}\n\n`;

  prompt += `Return a JSON object with:
- primaryAxis, secondaryAxis, coreTrait (string)
- motifs (array of 4 strings)
- moodCluster (string)
- influenceLineage (array: {artist, movement, connectionStrength})
- creativeCycles (array: {period, mood, motifSpikes, outputCount})
- motifEvolution (array: {motif, frequency, date as unix ms})
- paletteExtraction (4-6 hex codes)
- tactileBias ({dominant, secondary})
- typographicPairing ({serif, sans})
- promptMatrix (3-4 copy-pasteable image-gen prompts)
- reading ({thesis, supportingParagraphs[], confidence: well_supported|emerging|speculative, coverageNote})
- antiSignature (string array of refusals)
- semioticTouchpoints (array: {motif, context, visualDirective, rationale, confidence, evidenceRefIds?})
- creativeDirections (array: {title, thesis, constraints?, handoff?})
- recommendations (array: {title, hypothesis, action, handoff?, evidenceRefIds?})
- driftNotes (array: {aspect, statedIntent?, manifestedOutput?, read}) — only if tailor + zines diverge
- evidenceRefs (array: {id, title, source?} from approved context + zine titles)`;

  return prompt;
}

function normalizeSignature(
  parsed: ParsedAestheticSignature,
  ctx: SignatureGenerationContext,
): AestheticSignature {
  const priorVersion = ctx.priorSignature?.version ?? 0;
  return {
    ...parsed,
    generatedAt: Date.now(),
    status: "draft",
    version: priorVersion + 1,
    evidenceRefs:
      parsed.evidenceRefs?.length
        ? parsed.evidenceRefs
        : (ctx.approvedUsedContext ?? []).slice(0, 8).map((e) => ({
            id: e.atomId,
            title: e.title,
            source: e.source,
          })),
  };
}

const EMPTY_SIGNATURE: AestheticSignature = {
  primaryAxis: "Unknown",
  secondaryAxis: "Unknown",
  motifs: [],
  moodCluster: "Unknown",
  influenceLineage: [],
  creativeCycles: [],
  motifEvolution: [],
  paletteExtraction: ["#000000", "#FFFFFF", "#888888", "#444444"],
  tactileBias: { dominant: "Unknown", secondary: "Unknown" },
  typographicPairing: { serif: "Unknown", sans: "Unknown" },
  promptMatrix: [],
  reading: {
    thesis:
      "Not enough evidence to form a supported reading yet. Capture and approve more context, then re-sync.",
    confidence: "speculative",
    coverageNote: "Fewer than one manifested artifact or approved atom.",
  },
  antiSignature: [],
  semioticTouchpoints: [],
  creativeDirections: [],
  recommendations: [],
  driftNotes: [],
  evidenceRefs: [],
  status: "draft",
  generatedAt: Date.now(),
};

export async function generateSignature(
  ctx: SignatureGenerationContext,
): Promise<AestheticSignature> {
  const zines = ctx.zines ?? [];
  if (zines.length === 0 && !(ctx.approvedUsedContext?.length)) {
    return { ...EMPTY_SIGNATURE, generatedAt: Date.now() };
  }

  const zineSummaries = await buildZineSummaries(zines);
  const prompt = buildSignaturePrompt(ctx, zineSummaries);

  try {
    const gateway = await generateViaGateway({
      prompt,
      system: SIGNATURE_SYSTEM,
      role: "textDeep",
      temperature: 0.55,
    });

    if (gateway?.text) {
      const parsed = parseSignatureJson(gateway.text);
      if (parsed) {
        return normalizeSignature(parsed, ctx);
      }
    }

    return await withResilience(async (ai) => {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: `${SIGNATURE_SYSTEM}\n\n${prompt}`,
        config: { responseMimeType: "application/json" },
      });

      if (response.text) {
        const parsed = parseSignatureJson(response.text);
        if (parsed) {
          return normalizeSignature(parsed, ctx);
        }
      }
      throw new Error("Empty or invalid signature response");
    });
  } catch (e) {
    console.error("MIMI // Signature Generation Error:", e);
  }

  return { ...EMPTY_SIGNATURE, generatedAt: Date.now() };
}
