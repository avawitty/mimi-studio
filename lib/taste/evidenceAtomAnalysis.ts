/**
 * Server-side Evidence Atom interpretation pipeline.
 * Runs after ingest (API create or client mirror) when AI Gateway is available.
 */
import { generateGatewayText, embedGatewayText } from "../ai/generate.js";
import { modelFor } from "../../services/modelConfig.js";
import {
  fetchTrustedStorageAsset,
  TrustedStorageFetchError,
} from "../trustedStorageFetch.js";
import type { EvidenceAtom } from "../../types.js";

type AdminDb = any;

const IMAGE_KINDS = new Set<EvidenceAtom["kind"]>(["image", "screenshot", "generated"]);

function formatVisionAnalysis(analysis: Record<string, unknown>): string {
  const motifs = Array.isArray(analysis.motifs)
    ? (analysis.motifs as string[]).filter(Boolean).join(", ")
    : "";
  const mood = Array.isArray(analysis.mood)
    ? (analysis.mood as string[]).filter(Boolean).join(", ")
    : "";
  const palette = Array.isArray(analysis.palette)
    ? (analysis.palette as string[]).filter(Boolean).join(", ")
    : "";
  const tension = typeof analysis.tension === "string" ? analysis.tension : "";
  const parts = [
    motifs && `Motifs: ${motifs}`,
    mood && `Mood: ${mood}`,
    palette && `Palette: ${palette}`,
    tension && `Tension: ${tension}`,
  ].filter(Boolean);
  if (parts.length > 0) return parts.join(". ");
  const raw = typeof analysis.raw === "string" ? analysis.raw : JSON.stringify(analysis);
  return raw.slice(0, 480);
}

async function loadImageBase64(
  atom: EvidenceAtom,
): Promise<{ base64: string; mimeType: string } | null> {
  const candidates = [atom.assetUrl, atom.thumbnailUrl].filter(Boolean) as string[];
  for (const url of candidates) {
    if (url.startsWith("data:")) {
      const match = url.match(/^data:([^;]+);base64,(.+)$/);
      if (match) return { mimeType: match[1]!, base64: match[2]! };
    }
    if (url.startsWith("https://")) {
      try {
        const { buffer, mimeType } = await fetchTrustedStorageAsset(url);
        return { base64: buffer.toString("base64"), mimeType };
      } catch (err) {
        if (err instanceof TrustedStorageFetchError) {
          console.warn("MIMI // Blocked untrusted asset fetch:", err.code, url.slice(0, 120));
        }
        continue;
      }
    }
  }
  return null;
}

async function analyzeImageAtom(
  atom: EvidenceAtom,
  apiKey: string,
): Promise<{ semanticDescription: string; confidence: number }> {
  const image = await loadImageBase64(atom);
  if (!image) {
    throw new Error("No fetchable image for vision analysis.");
  }

  const model = modelFor("textFast", "gateway");
  const upstream = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are Mimi's vision engine. Return ONLY JSON with keys: culturalReferences (string[3]), motifs (string[]), palette (string[]), mood (string[]), form (string[]), tension (string).",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this image for aesthetic DNA. Source: ${atom.originalSource.slice(0, 200)}`,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${image.mimeType};base64,${image.base64}`,
              },
            },
          ],
        },
      ],
    }),
  });

  const raw = await upstream.text();
  if (!upstream.ok) {
    throw new Error(raw.slice(0, 200) || "Vision analysis failed");
  }

  const payload = JSON.parse(raw) as { choices?: Array<{ message?: { content?: string } }> };
  const content = payload?.choices?.[0]?.message?.content || "{}";
  let analysis: Record<string, unknown> = {};
  try {
    analysis = JSON.parse(content);
  } catch {
    analysis = { raw: content };
  }

  return {
    semanticDescription: formatVisionAnalysis(analysis),
    confidence: 0.55,
  };
}

async function analyzeTextAtom(
  atom: EvidenceAtom,
  apiKey: string,
): Promise<{ semanticDescription: string; confidence: number }> {
  const result = await generateGatewayText({
    apiKey,
    role: "textFast",
    temperature: 0.35,
    system:
      "You are Mimi's taste reader. Write one sparse editorial sentence describing the aesthetic signal in this evidence. No lists, no hedging.",
    prompt: `Kind: ${atom.kind}\nSource type: ${atom.sourceType}\nOriginal:\n${atom.originalSource.slice(0, 4000)}`,
  });

  const semanticDescription = result.text.trim().slice(0, 500);
  if (!semanticDescription) {
    throw new Error("Empty text interpretation.");
  }

  return { semanticDescription, confidence: 0.45 };
}

export async function interpretEvidenceAtom(
  atom: EvidenceAtom,
  apiKey: string,
): Promise<{ semanticDescription: string; confidence: number }> {
  if (IMAGE_KINDS.has(atom.kind)) {
    try {
      return await analyzeImageAtom(atom, apiKey);
    } catch (imageErr) {
      console.warn("MIMI // Evidence atom image analysis failed, falling back to text:", imageErr);
    }
  }
  return analyzeTextAtom(atom, apiKey);
}

function atomRef(db: NonNullable<AdminDb>, userId: string, atomId: string) {
  return db.collection("users").doc(userId).collection("evidenceAtoms").doc(atomId);
}

/**
 * Analyze one evidence atom and persist interpretation fields.
 * No-op when gateway or Firestore admin is unavailable.
 */
export async function runEvidenceAtomAnalysis(
  db: AdminDb,
  userId: string,
  atomId: string,
  apiKey: string,
): Promise<void> {
  if (!db || !userId || userId === "ghost") return;
  if (!apiKey) {
    console.info("MIMI // Evidence atom analysis skipped — no funded gateway key.");
    return;
  }

  const ref = atomRef(db, userId, atomId);
  const snap = await ref.get();
  if (!snap.exists) return;

  const atom = snap.data() as EvidenceAtom;
  if (atom.processingState === "analyzed") return;

  await ref.update({ processingState: "processing", updatedAt: Date.now() });

  try {
    const { semanticDescription, confidence } = await interpretEvidenceAtom(atom, apiKey);

    let embeddingRef: string | undefined;
    try {
      const embedText = semanticDescription || atom.originalSource.slice(0, 2000);
      const { embedding, model } = await embedGatewayText({
        value: embedText,
        apiKey,
      });
      if (embedding.length > 0) {
        const embRef = db
          .collection("users")
          .doc(userId)
          .collection("evidenceAtomEmbeddings")
          .doc(atomId);
        await embRef.set({
          vector: embedding,
          model,
          dims: embedding.length,
          updatedAt: Date.now(),
        });
        embeddingRef = `evidenceAtomEmbeddings/${atomId}`;
      }
    } catch (embedErr) {
      console.warn("MIMI // Evidence atom embedding failed (interpretation saved):", embedErr);
    }

    await ref.update({
      semanticDescription,
      confidence,
      ...(embeddingRef ? { embeddingRef } : {}),
      processingState: "analyzed",
      updatedAt: Date.now(),
    });
  } catch (error) {
    console.warn("MIMI // Evidence atom analysis failed:", {
      atomId,
      message: error instanceof Error ? error.message : String(error),
    });
    await ref.update({
      processingState: "failed",
      updatedAt: Date.now(),
    });
  }
}

/** @deprecated Server-side fire-and-forget bypasses credit accounting — use client scheduleEvidenceAtomAnalysis. */
export function queueEvidenceAtomAnalysis(
  _db: AdminDb,
  _userId: string,
  _atomId: string,
): void {
  console.warn(
    "MIMI // queueEvidenceAtomAnalysis is disabled — call POST /api/mimi/evidence/analyze via funded route.",
  );
}
