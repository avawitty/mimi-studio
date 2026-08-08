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
import {
  computeSignatureFingerprint,
  fingerprintKey,
} from "../lib/signature/signatureFingerprint";

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
  opts?: { preserveVersion?: boolean; resetApproval?: boolean },
): AestheticSignature {
  const priorVersion = ctx.priorSignature?.version ?? 0;
  const fingerprint = fingerprintKey(computeSignatureFingerprint(ctx));
  const prior = ctx.priorSignature;
  return {
    ...parsed,
    generatedAt: Date.now(),
    status: opts?.resetApproval === false && prior?.status === "approved" ? "approved" : "draft",
    approvedAt: opts?.resetApproval === false ? prior?.approvedAt : undefined,
    version: opts?.preserveVersion ? priorVersion : priorVersion + 1,
    contextFingerprint: fingerprint,
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

const PATCH_SYSTEM = `You are Mimi, updating an existing Taste Signature reading after a small evidence change (approved Used Context atoms added, removed, or toggled).

Rules:
- Preserve stable identity axes and motifs unless the new evidence clearly contradicts them.
- Update reading, semioticTouchpoints, recommendations, evidenceRefs, and confidence to reflect the delta.
- Do NOT invent evidence IDs — only use IDs from the provided bundles.
- Return JSON with ONLY these keys:
  reading, semioticTouchpoints, recommendations, evidenceRefs, antiSignature (optional), creativeDirections (optional)
- No markdown wrappers.`;

export async function patchSignatureFromEvidence(
  current: AestheticSignature,
  ctx: SignatureGenerationContext,
  delta: {
    addedApproved: UsedContextEntry[];
    removedAtomIds: string[];
  },
): Promise<AestheticSignature> {
  const approved = (ctx.approvedUsedContext ?? []).filter((e) => e.approved);
  const prompt = `CURRENT SIGNATURE (preserve plate identity unless contradicted):
${JSON.stringify({
  primaryAxis: current.primaryAxis,
  secondaryAxis: current.secondaryAxis,
  motifs: current.motifs,
  moodCluster: current.moodCluster,
  reading: current.reading,
})}

EVIDENCE DELTA:
Added or newly approved atoms: ${JSON.stringify(delta.addedApproved.map((e) => ({ id: e.atomId, title: e.title, excerpt: e.content.slice(0, 200) })))}
Removed atom IDs: ${JSON.stringify(delta.removedAtomIds)}

FULL APPROVED CONTEXT NOW (${approved.length}):
${JSON.stringify(approved.slice(0, 24).map((e) => ({ id: e.atomId, title: e.title, excerpt: e.content.slice(0, 160) })))}

Known evidence atom IDs: ${JSON.stringify(approved.map((e) => e.atomId))}

Return updated reading sections only.`;

  const applyPatch = (parsed: Record<string, unknown>): AestheticSignature => {
    const fingerprint = fingerprintKey(computeSignatureFingerprint(ctx));
    return {
      ...current,
      reading: (parsed.reading as AestheticSignature["reading"]) ?? current.reading,
      semioticTouchpoints:
        (parsed.semioticTouchpoints as AestheticSignature["semioticTouchpoints"]) ??
        current.semioticTouchpoints,
      recommendations:
        (parsed.recommendations as AestheticSignature["recommendations"]) ??
        current.recommendations,
      creativeDirections:
        (parsed.creativeDirections as AestheticSignature["creativeDirections"]) ??
        current.creativeDirections,
      antiSignature:
        (parsed.antiSignature as AestheticSignature["antiSignature"]) ?? current.antiSignature,
      evidenceRefs:
        (parsed.evidenceRefs as AestheticSignature["evidenceRefs"]) ?? current.evidenceRefs,
      generatedAt: Date.now(),
      status: "draft",
      approvedAt: undefined,
      contextFingerprint: fingerprint,
    };
  };

  try {
    const gateway = await generateViaGateway({
      prompt,
      system: PATCH_SYSTEM,
      role: "textFast",
      temperature: 0.45,
    });
    if (gateway?.text) {
      let cleaned = gateway.text.trim();
      if (cleaned.startsWith("```json")) {
        cleaned = cleaned.replace(/```json\n?/, "").replace(/```$/, "");
      } else if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/```\n?/, "").replace(/```$/, "");
      }
      try {
        const raw = JSON.parse(cleaned) as Record<string, unknown>;
        return applyPatch(raw);
      } catch {
        /* fall through */
      }
    }
  } catch (e) {
    console.warn("MIMI // patchSignatureFromEvidence gateway failed:", e);
  }

  return {
    ...current,
    generatedAt: Date.now(),
    status: "draft",
    approvedAt: undefined,
    contextFingerprint: fingerprintKey(computeSignatureFingerprint(ctx)),
    evidenceRefs: approved.slice(0, 8).map((e) => ({
      id: e.atomId,
      title: e.title,
      source: e.source,
    })),
  };
}
