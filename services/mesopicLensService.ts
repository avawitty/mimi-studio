/**
 * Mesopic Lens orchestration — profile × celestial × web-grounded reading.
 * Web retrieval stays on Gemini Google Search; synthesis via AI Gateway.
 */

import { auth } from "./firebaseInit";
import { scryWebSignals } from "./geminiService";
import type { UserProfile } from "../types";
import { celestialReadoutForOracle } from "../lib/celestial/compileCelestialReadout";
import type { CelestialCalibrationDraft } from "../schemas/celestialCalibrationContracts";
import {
  mapWebHits,
  generateViaGateway,
} from "./scryService";
import type { ResearchResult } from "../schemas/scryContracts";
import type { CuriosityPromptId } from "./tailorEvidenceIntake";
import { buildCuriosityHandoff } from "./tailorEvidenceIntake";
import { saveCuriosityRecord } from "./curiosityStore";

export interface MesopicLensReading {
  text: string;
  model?: string;
  via: "gateway" | "fallback";
  webSignals: ResearchResult[];
  celestialEnabled: boolean;
  curiosityRecordId?: string;
}

export interface MesopicLensRun {
  id: string;
  question: string;
  startedAt: number;
  completedAt?: number;
  reading?: MesopicLensReading;
  webStatus: "success" | "empty" | "failed";
  failure?: string;
}

function draftFromProfile(profile: UserProfile | null): CelestialCalibrationDraft | null {
  return profile?.tailorDraft?.celestialCalibration ?? null;
}

function formatWebCitations(hits: ResearchResult[]): string {
  if (hits.length === 0) return "No live web signals returned.";
  return hits
    .slice(0, 6)
    .map((h, i) => `[${i + 1}] ${h.title}${h.url ? ` (${h.url})` : ""}: ${(h.snippet || "").slice(0, 160)}`)
    .join("\n");
}

function buildProfileContext(profile: UserProfile | null): Record<string, unknown> {
  const draft = profile?.tailorDraft;
  return {
    displayName: profile?.displayName || profile?.handle || null,
    aestheticCore: draft?.positioningCore?.aestheticCore ?? null,
    narrativeVoice: draft?.expressionEngine?.narrativeVoice ?? null,
    tags: draft?.positioningCore?.aestheticCore?.tags?.slice?.(0, 10) ?? [],
    aestheticSignature: profile?.tasteProfile?.aestheticSignature ?? null,
  };
}

export function composeMesopicQuestion(
  question: string,
  curiosityIds: CuriosityPromptId[],
  customCuriosity: string,
): string {
  const handoff = buildCuriosityHandoff(curiosityIds, customCuriosity);
  const parts = [question.trim(), ...handoff.intendedHelp].filter(Boolean);
  return parts.join(" · ");
}

export async function runMesopicLensReading(options: {
  question: string;
  profile: UserProfile | null;
  curiosityIds?: CuriosityPromptId[];
  customCuriosity?: string;
  userId?: string;
  persistCuriosity?: boolean;
}): Promise<MesopicLensRun> {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `mesopic-${Date.now()}`;
  const startedAt = Date.now();
  const composed = composeMesopicQuestion(
    options.question,
    options.curiosityIds ?? [],
    options.customCuriosity ?? "",
  );

  let webSignals: ResearchResult[] = [];
  let webStatus: MesopicLensRun["webStatus"] = "empty";

  try {
    const web = await scryWebSignals(composed);
    webSignals = mapWebHits(web.results, web.groundingChunks);
    webStatus = webSignals.length > 0 ? "success" : "empty";
  } catch (err) {
    webStatus = "failed";
    return {
      id,
      question: composed,
      startedAt,
      completedAt: Date.now(),
      webStatus,
      failure: err instanceof Error ? err.message : String(err),
    };
  }

  const celestialDraft = draftFromProfile(options.profile);
  const celestial = celestialReadoutForOracle(celestialDraft);
  const celestialEnabled = Boolean(celestial.enabled);

  const gateway = await generateViaGateway({
    role: "textFast",
    temperature: 0.82,
    system: `You are Mimi's Mesopic Lens — twilight vision between certainty and shadow.
Write one rich paragraph (4–6 sentences) answering the user's question.
Ground in: (1) their taste profile, (2) structured celestial readout when enabled, (3) numbered web signals when present.
Never invent natal positions, aspects, or web facts absent from the provided JSON.
When celestial is disabled or web is empty, say so honestly — mesopic vision admits what it cannot see.
Symbolic celestial context is self-expressive, not predictive science.
No JSON, no preamble, no bullet lists.`,
    prompt: `Question: ${composed}

Taste profile:
${JSON.stringify(buildProfileContext(options.profile)).slice(0, 1400)}

Celestial readout (authoritative — do not invent beyond this):
${JSON.stringify(celestial).slice(0, 2000)}

Web signals:
${formatWebCitations(webSignals)}`,
  });

  const text =
    gateway?.text ??
    (webSignals.length > 0
      ? `Twilight holds partial light on “${composed}”. Web returned ${webSignals.length} signal${webSignals.length === 1 ? "" : "s"}, but synthesis is unavailable — check your connection or sign in for Gateway credits.`
      : `The obsidian mirror is quiet on “${composed}”. No web signals returned and synthesis is unavailable.`);

  let curiosityRecordId: string | undefined;
  if (options.persistCuriosity !== false) {
    try {
      const tokenUid = auth.currentUser?.uid;
      const record = await saveCuriosityRecord({
        source: "mesopic-lens",
        question: composed,
        userId: options.userId ?? tokenUid,
        curiosityIds: options.curiosityIds,
        customCuriosity: options.customCuriosity,
        readingPreview: text,
        webCitationCount: webSignals.length,
        celestialEnabled,
      });
      curiosityRecordId = record.id;
    } catch {
      // non-fatal
    }
  }

  return {
    id,
    question: composed,
    startedAt,
    completedAt: Date.now(),
    webStatus,
    reading: {
      text,
      model: gateway?.model,
      via: gateway ? "gateway" : "fallback",
      webSignals,
      celestialEnabled,
      curiosityRecordId,
    },
  };
}
