import { GoogleGenAI } from "@google/genai";
import { MimiProvider } from "./mimiProvider.js";
import {
  DEFAULT_MIMI_IMAGE_MODEL,
  MimiImageProvider,
  MimiImageReference,
  MimiImageRequest,
  MimiImageResponse,
} from "./mimiImageTypes.js";
import { modelFor } from "../services/modelConfig.js";
import { generateGatewayImageBytesForModel } from "./aiGatewayCompat.js";

const DATA_URL_RE = /^data:([^;]+);base64,(.+)$/;

const toArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.map((item) => String(item || "").trim()).filter(Boolean)
    : [];

const extractTailorCameraContext = (tailorContext: any) => {
  const draft = tailorContext?.tailorDraft || tailorContext;
  const aesthetic = draft?.positioningCore?.aestheticCore || {};
  const expression = draft?.expressionEngine || {};
  const chromatic = expression?.chromaticRegistry || draft?.chromaticRegistry || {};
  const visualPresets = expression?.visualPresets || {};

  return [
    toArray(aesthetic?.mediaStyle).length ? `camera language: ${toArray(aesthetic.mediaStyle).join(", ")}` : "",
    toArray(aesthetic?.materiality).length ? `materials: ${toArray(aesthetic.materiality).join(", ")}` : "",
    toArray(aesthetic?.tags).length ? `light identity tags: ${toArray(aesthetic.tags).slice(0, 8).join(", ")}` : "",
    chromatic?.baseNeutral ? `base neutral: ${chromatic.baseNeutral}` : "",
    chromatic?.accentSignal ? `accent signal: ${chromatic.accentSignal}` : "",
    visualPresets?.texture ? `texture: ${visualPresets.texture}` : "",
    visualPresets?.era ? `era: ${visualPresets.era}` : "",
    visualPresets?.silhouette ? `silhouette discipline: ${visualPresets.silhouette}` : "",
  ]
    .filter(Boolean)
    .join("; ");
};

const extractTailorWardrobeContext = (tailorContext: any) => {
  const draft = tailorContext?.tailorDraft || tailorContext;
  const aesthetic = draft?.positioningCore?.aestheticCore || {};
  const expression = draft?.expressionEngine || {};
  const insight = aesthetic?.silhouetteInsight || {};
  const presentation = aesthetic?.presentation || "";
  const binaryToSpectrum = draft?.algoDials?.binaryToSpectrum;

  return [
    presentation ? `presentation: ${presentation}` : "",
    toArray(aesthetic?.silhouettes).length ? `preferred silhouette logic: ${toArray(aesthetic.silhouettes).join(", ")}` : "",
    insight?.bodyType ? `body line: ${insight.bodyType}` : "",
    toArray(insight?.recommendedSilhouettes).length ? `recommended fit shapes: ${toArray(insight.recommendedSilhouettes).join(", ")}` : "",
    insight?.rationale ? `fit rationale: ${insight.rationale}` : "",
    expression?.visualPresets?.silhouette ? `silhouette preset: ${expression.visualPresets.silhouette}` : "",
    toArray(aesthetic?.materiality).length ? `wardrobe material cues: ${toArray(aesthetic.materiality).join(", ")}` : "",
    typeof binaryToSpectrum === "number" ? `binary-to-spectrum styling dial: ${binaryToSpectrum}%` : "",
  ]
    .filter(Boolean)
    .join("; ");
};

const referenceToInlineData = (reference: MimiImageReference) => {
  const candidate = reference.dataUrl || reference.data || reference.url || "";
  const match = candidate.match(DATA_URL_RE);
  if (!match) return null;
  return {
    inlineData: {
      mimeType: reference.mimeType || match[1] || "image/png",
      data: match[2],
    },
  };
};

const describeReference = (reference: MimiImageReference, index: number) => {
  const labels = [
    `Reference ${index + 1}`,
    reference.name ? `name: ${reference.name}` : "",
    reference.description ? `description: ${reference.description}` : "",
    reference.transcription ? `notes: ${reference.transcription}` : "",
    reference.url && !reference.url.startsWith("data:") ? `url: ${reference.url}` : "",
    toArray(reference.tags).length ? `tags: ${toArray(reference.tags).join(", ")}` : "",
  ].filter(Boolean);
  return labels.join(" | ");
};

const buildReferenceParts = (references: MimiImageReference[] = []) => {
  const parts: any[] = [];
  const textNotes: string[] = [];

  references.slice(0, 6).forEach((reference, index) => {
    const inlineData = referenceToInlineData(reference);
    if (inlineData) parts.push(inlineData);
    const note = describeReference(reference, index);
    if (note) textNotes.push(note);
  });

  const hasDollRef = references.some(ref =>
    /doll/i.test(ref.name || "") || /doll/i.test(ref.description || "")
  );

  if (textNotes.length) {
    const refInstructions = [
      "USER REFERENCE REGISTER:",
      ...textNotes,
      "These references are primary evidence. Preserve their visible subject, composition hierarchy, lighting, material cues, palette, and texture before applying any broader style.",
    ];
    if (hasDollRef) {
      refInstructions.push(
        "DOLL IDENTITY & STABLE FACE RULE: The references contain a calibrated doll proxy ('Doll Portrait', 'Doll Full Body', or 'Doll Profile'). You MUST carefully lock in, align, and preserve the face structure, features, hairstyle, and likeness of the doll from the 'Doll Portrait' reference. Allow the doll's clothing to vary based on the prompt while maintaining cohesive material signatures and fit shapes from 'Doll Full Body'. Depict the same stable character proxy travelling through different times, settings, or editorial backdrops."
      );
    }
    parts.push({
      text: refInstructions.join("\n"),
    });
  }

  return parts;
};

export const getMimiImageProviderEnvKey = (provider: MimiImageProvider) => {
  if (provider === "openai") return process.env.OPENAI_API_KEY || "";
  return process.env.GEMINI_API_KEY || process.env.API_KEY || "";
};

export const sanitizePromptForImagen = (prompt: string): string => {
  if (!prompt) return "";
  return prompt.replace(/\s*--\w+(?:\s+(?!--)\S+)?/g, "").trim();
};

export const compileMimiImagePrompt = (request: MimiImageRequest) => {
  const references = request.references || [];
  const hasReferences = references.length > 0;
  const tailorCamera = extractTailorCameraContext(request.tailorContext);
  const tailorWardrobe = extractTailorWardrobeContext(request.tailorContext);
  const allowFaces = request.allowFaces === true;
  const mode = request.mode || "reference-led";

  const draft = ((request.tailorContext as any)?.tailorDraft || request.tailorContext) as any;
  const tonalFriction = draft?.algoDials?.tonalFriction;
  const frictionDirective = typeof tonalFriction === "number"
    ? `TONAL FRICTION (Compliance vs. Rebellion): ${tonalFriction}. ${
        tonalFriction < 0 
          ? "Allow higher stylistic rebellion, raw visual grit, higher style deviation, bold/avant-garde stylistic choices, and more provocative styling while staying within platform policy." 
          : tonalFriction > 0 
            ? "Prioritize standard safety, high compliance, conservative choices, clean/standard styling, and avoiding controversial layouts or styling."
            : "Maintain standard safety and aesthetic balance."
      }`
    : "";

  const promptSurface = [
    request.prompt,
    request.styleGuide,
    request.metadata?.source,
    ...references.flatMap((reference) => [
      reference.name,
      reference.description,
      reference.transcription,
      ...(reference.tags || []),
    ]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const isWardrobeRelevant = /wardrobe|outfit|garment|clothing|clothes|dress|skirt|shirt|coat|jacket|shoe|boot|bag|accessory|styling|silhouette|capsule|look|fashion|wear|worn|try-on|try on/.test(promptSurface);

  const hasDollRef = references.some(ref =>
    /doll/i.test(ref.name || "") || /doll/i.test(ref.description || "")
  );

  const modeDirective =
    mode === "mimi-deck"
      ? "MIMI DECK MODE: obsidian, bone, blue-gray, cinematic backlight, faceless silhouettes, wide-brim shadows, brutalist editorial layout discipline, print-ready zine/deck composition."
      : mode === "archive-surreal"
        ? "ARCHIVE SURREAL MODE: cinematic editorial artifact, 35mm film grain, controlled negative space, institutional architecture, occult annotation marks, spectral motion, strange symbolic props, and precise archival tension."
        : mode === "product"
          ? "PRODUCT MODE: make the object readable, useful, and commercially legible while preserving Mimi's editorial restraint."
          : mode === "zine-plate" && hasReferences
            ? "REFERENCE-LED MODE: transform the uploaded reference per the user prompt. Preserve subject identity and composition unless the prompt asks otherwise. No forced magazine cover typography."
            : mode === "zine-plate"
              ? "ZINE PLATE MODE: render as a publishable issue plate with strong composition, restrained type-safe negative space, and export-ready visual hierarchy."
              : "REFERENCE-LED MODE: build from the user's prompt and references first; style is a finish, not a replacement.";

  const cleanPrompt = sanitizePromptForImagen(request.prompt || "");

  return [
    "You are Mimi's server-side image director. Generate one high-quality image.",
    modeDirective,
    hasReferences
      ? "WEIGHTING: uploaded/pulled references are the subject and composition source. Do not overwrite them with Tailor motifs."
      : "WEIGHTING: the written prompt is the subject. Do not invent repeated Tailor motifs unless asked.",
    tailorCamera
      ? `TAILOR CAMERA FINISH ONLY: ${tailorCamera}. Use this for crop, grain, lens, material finish, palette discipline, and exclusions only.`
      : "TAILOR CAMERA FINISH: a clean flat-flash photograph, utilizing a professional 35mm film photography camera, restrained editorial composition, sharp focus, natural colors, non-generic material detail.",
    isWardrobeRelevant && tailorWardrobe
      ? `TAILOR WARDROBE STYLING ONLY: ${tailorWardrobe}. Use this to shape outfit proportion, fit attitude, garment pairing, styling restraint, and presentation. Do not replace uploaded wardrobe pieces or visible garments; style around them.`
      : "",
    frictionDirective,
    hasDollRef
      ? "DOLL STABLE FACE DIRECTION: Ensure the face and identity of the generated subject matches the 'Doll Portrait' reference with high fidelity. Preserve the character's facial alignment, features, and hairstyle across time."
      : (allowFaces ? "" : "FACE RULE: avoid clear identifiable faces. Use backs, silhouettes, shadows, hands, veils, backlight, or cropped framing."),
    request.styleGuide ? `STYLE GUIDE: ${request.styleGuide}` : "",
    request.negativePrompt ? `AVOID: ${request.negativePrompt}` : "",
    `USER PROMPT: ${cleanPrompt}`,
  ]
    .filter(Boolean)
    .join("\n\n");
};

export const generateMimiImageServer = async (
  request: MimiImageRequest,
  options: { apiKey: string; provider?: MimiImageProvider },
): Promise<MimiImageResponse> => {
  const provider = options.provider || request.provider || "gemini";
  const apiKey = String(options.apiKey || "").trim();

  if (provider === "gateway") {
    if (!apiKey) {
      throw Object.assign(new Error("Mimi Image requires AI_GATEWAY_API_KEY or VERCEL_OIDC_TOKEN."), {
        status: 403,
        code: "MISSING_IMAGE_KEY",
      });
    }

    const prompt = String(request.prompt || "").trim();
    if (!prompt) {
      throw Object.assign(new Error("Prompt is required for Mimi image generation."), {
        status: 400,
        code: "MISSING_PROMPT",
      });
    }

    const defaultRole = (request.references && request.references.length > 0) ? 'imageEdit' : 'image';
    const model = request.model || modelFor(defaultRole, 'gateway');
    const compiledPrompt = compileMimiImagePrompt({ ...request, prompt });

    const startedAt = Date.now();
    // Gemini image models must use chat+modalities; gpt-image/Imagen/Flux use
    // /images/generations. Shared helper routes both (see aiGatewayCompat).
    const { base64, mimeType } = await generateGatewayImageBytesForModel({
      apiKey,
      model,
      prompt: compiledPrompt,
      aspectRatio: request.aspectRatio,
      references: request.references,
    });
    const imageUrl = `data:${mimeType || "image/png"};base64,${base64}`;

    return {
      ok: true,
      provider: "gateway",
      model,
      imageUrl,
      base64,
      mimeType: mimeType || "image/png",
      compiledPrompt,
      warnings: [],
      metadata: {
        mode: request.mode || "reference-led",
        referenceCount: request.references?.length || 0,
        latencyMs: Date.now() - startedAt,
        ...request.metadata,
      },
    };
  }

  if (provider === "openai") {
    if (!apiKey) {
      throw Object.assign(new Error("Mimi Image requires OPENAI_API_KEY or a user-owned OpenAI key."), {
        status: 403,
        code: "MISSING_IMAGE_KEY",
      });
    }

    const prompt = String(request.prompt || "").trim();
    if (!prompt) {
      throw Object.assign(new Error("Prompt is required for Mimi image generation."), {
        status: 400,
        code: "MISSING_PROMPT",
      });
    }

    const defaultRole = (request.references && request.references.length > 0) ? 'imageEdit' : 'image';
    const model = request.model || modelFor(defaultRole, 'openai');

    const result = await MimiProvider.openai(apiKey, model).generateImage({
      userPrompt: prompt,
      references: request.references,
      mode: request.mode,
      styleGuide: request.styleGuide,
      negativePrompt: request.negativePrompt,
      aspectRatio: request.aspectRatio,
      imageSize: request.imageSize,
      metadata: request.metadata,
    });

    return {
      ok: true,
      provider: "openai",
      model: result.model,
      imageUrl: result.imageUrl,
      mimeType: result.mimeType,
      base64: result.base64,
      compiledPrompt: result.compiledPrompt || compileMimiImagePrompt({ ...request, prompt }),
      warnings: result.warnings || [],
      metadata: result.metadata,
    };
  }

  if (provider === "replicate") {
    if (!apiKey) {
      throw Object.assign(new Error("Mimi Image requires REPLICATE_API_TOKEN or a user-owned Replicate key."), {
        status: 403,
        code: "MISSING_IMAGE_KEY",
      });
    }

    const prompt = String(request.prompt || "").trim();
    if (!prompt) {
      throw Object.assign(new Error("Prompt is required for Mimi image generation."), {
        status: 400,
        code: "MISSING_PROMPT",
      });
    }

    const result = await MimiProvider.replicate(apiKey).generateImage({
      userPrompt: prompt,
      references: request.references,
      mode: request.mode,
      styleGuide: request.styleGuide,
      negativePrompt: request.negativePrompt,
      aspectRatio: request.aspectRatio,
      imageSize: request.imageSize,
      metadata: request.metadata,
    });

    return {
      ok: true,
      provider: "replicate",
      model: result.model,
      imageUrl: result.imageUrl,
      mimeType: result.mimeType,
      base64: result.base64,
      compiledPrompt: result.compiledPrompt || compileMimiImagePrompt({ ...request, prompt }),
      warnings: result.warnings || [],
      metadata: result.metadata,
    };
  }

  if (provider === "svg") {
    if (!apiKey) {
      throw Object.assign(new Error("Mimi SVG Image requires a Gemini API key."), {
        status: 403,
        code: "MISSING_IMAGE_KEY",
      });
    }

    const prompt = String(request.prompt || "").trim();
    if (!prompt) {
      throw Object.assign(new Error("Prompt is required for Mimi SVG generation."), {
        status: 400,
        code: "MISSING_PROMPT",
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    const model = request.model || modelFor('textDeep', 'gemini');
    
    const systemInstruction = `You are an expert graphic designer and SVG developer.
Generate a high-fidelity, clean, responsive, valid SVG vector graphic representing the user's prompt: "${prompt}".
Rules:
1. Output ONLY valid, self-contained SVG code.
2. Do NOT wrap in markdown code blocks (\`\`\`xml or \`\`\`).
3. Ensure the background is transparent (do not add a solid background rect unless requested).
4. Use clean shapes, curves, paths, linear/radial gradients, and modern editorial colors.
5. Set appropriate width, height, and viewBox attributes.
6. The SVG should feel premium, artistic, conceptual, and fit for an editorial web app or zine page.`;

    const response = await ai.models.generateContent({
      model,
      contents: { parts: [{ text: `Generate SVG for: ${prompt}` }] },
      config: {
        systemInstruction,
        temperature: 0.2
      }
    });

    let svgText = response.text || "";
    if (svgText.includes("```")) {
      svgText = svgText.replace(/```[a-zA-Z]*\n?/g, "").replace(/```/g, "").trim();
    }
    if (!svgText.includes("<svg") || !svgText.includes("</svg>")) {
      throw new Error("Model failed to output a valid SVG graphic.");
    }

    const mimeType = "image/svg+xml";
    const dataUrl = `data:${mimeType};utf8,${encodeURIComponent(svgText)}`;

    return {
      ok: true,
      provider: "svg",
      model,
      imageUrl: dataUrl,
      mimeType,
      base64: Buffer.from(svgText).toString("base64"),
      compiledPrompt: prompt,
      warnings: [],
      metadata: {
        mode: "vector-svg",
        ...request.metadata
      }
    };
  }

  if (provider !== "gemini") {
    throw Object.assign(new Error("Mimi image generation supports Gemini, OpenAI, Replicate, and SVG server-side."), {
      status: 501,
      code: "PROVIDER_NOT_IMPLEMENTED",
    });
  }

  if (!apiKey) {
    throw Object.assign(new Error("Mimi Image requires a server Gemini key or a user-owned Gemini key."), {
      status: 403,
      code: "MISSING_IMAGE_KEY",
    });
  }

  const prompt = String(request.prompt || "").trim();
  if (!prompt) {
    throw Object.assign(new Error("Prompt is required for Mimi image generation."), {
      status: 400,
      code: "MISSING_PROMPT",
    });
  }

  const model = request.model || process.env.GEMINI_IMAGE_MODEL || DEFAULT_MIMI_IMAGE_MODEL;
  
  // Resolve remote URLs to data URLs server-side
  const resolvedReferences = request.references ? await Promise.all(
    request.references.map(async (ref) => {
      if (ref.url && ref.url.startsWith("http") && !ref.dataUrl && !ref.data) {
        try {
          const res = await fetch(ref.url);
          if (res.ok) {
            const blob = await res.blob();
            const arrayBuffer = await blob.arrayBuffer();
            const base64 = Buffer.from(arrayBuffer).toString("base64");
            const mimeType = res.headers.get("content-type") || ref.mimeType || "image/png";
            return {
              ...ref,
              dataUrl: `data:${mimeType};base64,${base64}`,
              mimeType,
            };
          }
        } catch (e) {
          console.warn(`MIMI // Failed to fetch remote reference URL: ${ref.url}`, e);
        }
      }
      return ref;
    })
  ) : undefined;

  const compiledPrompt = compileMimiImagePrompt({ ...request, prompt, references: resolvedReferences });
  const parts = [...buildReferenceParts(resolvedReferences), { text: compiledPrompt }];
  const ai = new GoogleGenAI({ apiKey });
  const warnings: string[] = [];

  if (model.startsWith("imagen-")) {
    const response = await ai.models.generateImages({
      model,
      prompt: compiledPrompt,
      config: {
        numberOfImages: 1,
        aspectRatio: request.aspectRatio || "1:1",
        outputMimeType: "image/jpeg",
      },
    });

    const generated = response.generatedImages?.[0];
    if (generated?.image?.imageBytes) {
      const mimeType = "image/jpeg";
      return {
        ok: true,
        provider,
        model,
        imageUrl: `data:${mimeType};base64,${generated.image.imageBytes}`,
        mimeType,
        base64: generated.image.imageBytes,
        compiledPrompt,
        warnings,
        metadata: {
          mode: request.mode || "reference-led",
          referenceCount: request.references?.length || 0,
          ...request.metadata,
        },
      };
    }

    throw Object.assign(
      new Error(`Mimi Image did not receive image bytes from Gemini Imagen model.`),
      {
        status: 502,
        code: "NO_IMAGE_RETURNED",
      }
    );
  }

  const response = await ai.models.generateContent({
    model,
    contents: { parts },
    config: {
      imageConfig: {
        aspectRatio: request.aspectRatio || "1:1",
        imageSize: request.imageSize || "1K",
      },
    },
  });

  let textEcho = "";
  for (const part of response?.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData?.data) {
      const mimeType = part.inlineData.mimeType || "image/png";
      return {
        ok: true,
        provider,
        model,
        imageUrl: `data:${mimeType};base64,${part.inlineData.data}`,
        mimeType,
        base64: part.inlineData.data,
        compiledPrompt,
        warnings,
        metadata: {
          mode: request.mode || "reference-led",
          referenceCount: request.references?.length || 0,
          finishReason: response?.candidates?.[0]?.finishReason,
          ...request.metadata,
        },
      };
    }
    if (part.text) textEcho += part.text;
  }

  throw Object.assign(
    new Error(`Mimi Image did not receive image bytes from Gemini. ${textEcho ? `Model text: ${textEcho}` : ""}`),
    {
      status: 502,
      code: "NO_IMAGE_RETURNED",
      finishReason: response?.candidates?.[0]?.finishReason,
    },
  );
};
