import {
  MimiImageAspectRatio,
  MimiImageMode,
  MimiImageReference,
  MimiImageResponse,
  MimiImageSize,
} from "./mimiImageTypes.js";
import { compileMimiImagePrompt, generateMimiImageServer } from "./serverMimiImage.js";
import { getServerAiGatewayKey } from "./aiGatewayCompat.js";
import { modelFor } from "../services/modelConfig.js";

export interface MimiGenerateImageInput {
  userPrompt: string;
  references?: MimiImageReference[];
  mode?: MimiImageMode | string;
  styleGuide?: string;
  negativePrompt?: string;
  aspectRatio?: MimiImageAspectRatio | string;
  imageSize?: MimiImageSize | string;
  quality?: string;
  userId?: string;
  provider?: string;
  model?: string;
  metadata?: Record<string, unknown>;
}

export interface MimiImageProviderAdapter {
  generateImage(input: MimiGenerateImageInput): Promise<MimiImageResponse>;
}

const aspectRatioToOpenAiSize = (aspectRatio?: string) => {
  if (aspectRatio === "16:9" || aspectRatio === "3:2" || aspectRatio === "landscape") return "1536x1024";
  if (aspectRatio === "9:16" || aspectRatio === "2:3" || aspectRatio === "portrait") return "1024x1536";
  return "1024x1024";
};

const normalizeMode = (mode?: string): MimiImageMode => {
  const allowed: MimiImageMode[] = ["reference-led", "archive-surreal", "product", "zine-plate", "mimi-deck"];
  return allowed.includes(mode as MimiImageMode) ? (mode as MimiImageMode) : "reference-led";
};

const normalizeAspectRatio = (aspectRatio?: string): MimiImageAspectRatio => {
  const allowed: MimiImageAspectRatio[] = ["1:1", "16:9", "9:16", "4:3", "3:4"];
  return allowed.includes(aspectRatio as MimiImageAspectRatio) ? (aspectRatio as MimiImageAspectRatio) : "1:1";
};

const normalizeImageSize = (imageSize?: string): MimiImageSize => {
  const allowed: MimiImageSize[] = ["1K", "2K"];
  return allowed.includes(imageSize as MimiImageSize) ? (imageSize as MimiImageSize) : "1K";
};

const safeJson = (text: string) => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

// Simulated Image Generator - returns a beautiful, high-aesthetic SVG representing the theme/prompt.
// Does not make any external network requests, ensuring offline/no-key resilience.
export function getSimulatedImageBase64(prompt: string, aspectRatio = "1:1"): string {
  const width = aspectRatio === "16:9" ? 1600 : aspectRatio === "9:16" ? 900 : 1000;
  const height = aspectRatio === "16:9" ? 900 : aspectRatio === "9:16" ? 1600 : 1000;
  
  // High-aesthetic editorial graphic inspired by Vogue Italia "Luminous Diaphanity"
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
    <defs>
      <!-- Film grain and mixed media paper filter -->
      <filter id="grainFilter" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="3" result="noise" />
        <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.05 0" />
        <feComposite operator="in" in2="SourceGraphic" />
      </filter>
      
      <!-- Translucent porcelain/glass radial gradient -->
      <radialGradient id="plateGrad" cx="35%" cy="35%" r="65%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.32" />
        <stop offset="60%" stop-color="#f5f4f0" stop-opacity="0.14" />
        <stop offset="90%" stop-color="#e3e1db" stop-opacity="0.06" />
        <stop offset="100%" stop-color="#c7c5be" stop-opacity="0.02" />
      </radialGradient>
      
      <radialGradient id="shadowGrad" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#000000" stop-opacity="0.75" />
        <stop offset="100%" stop-color="#000000" stop-opacity="0" />
      </radialGradient>
    </defs>

    <style>
      .title-text { font-family: 'Cormorant Garamond', Cormorant, Georgia, serif; font-size: 26px; font-style: italic; fill: #faf9f6; }
      .mono-text { font-family: 'Space Mono', 'JetBrains Mono', monospace; font-size: 9px; letter-spacing: 3px; fill: #a8a7a5; font-weight: bold; }
      .desc-text { font-family: 'Cormorant Garamond', Cormorant, Georgia, serif; font-size: 12px; font-style: italic; fill: #8c8b88; line-height: 1.4; }
    </style>

    <!-- Obsidian dark room backdrop -->
    <rect width="100%" height="100%" fill="#0a0a0a"/>
    
    <!-- Fine alignment boundaries (editorial guides) -->
    <rect x="40" y="40" width="${width - 80}" height="${height - 80}" fill="none" stroke="rgba(250, 249, 246, 0.08)" stroke-width="0.75"/>
    <line x1="${width * 0.5}" y1="40" x2="${width * 0.5}" y2="${height - 40}" stroke="rgba(250, 249, 246, 0.06)" stroke-width="0.5" stroke-dasharray="3 3"/>
    <line x1="40" y1="${height * 0.45}" x2="${width - 40}" y2="${height * 0.45}" stroke="rgba(250, 249, 246, 0.06)" stroke-width="0.5" stroke-dasharray="3 3"/>

    <!-- Symmetrical Mixed-Media Circular Sculpture Composition -->
    <g transform="translate(${width * 0.5}, ${height * 0.42})">
      <!-- Dark drop shadow behind the center structure -->
      <ellipse cx="0" cy="0" rx="190" ry="190" fill="url(#shadowGrad)" opacity="0.9" />
      
      <!-- Structural wire framework -->
      <line x1="-200" y1="-230" x2="-200" y2="230" stroke="rgba(250, 249, 246, 0.12)" stroke-width="0.5" />
      <line x1="200" y1="-230" x2="200" y2="230" stroke="rgba(250, 249, 246, 0.12)" stroke-width="0.5" />
      <line x1="0" y1="-260" x2="0" y2="260" stroke="rgba(250, 249, 246, 0.18)" stroke-width="0.75" />
      
      <!-- LEFT HANGING PLATES -->
      <g transform="translate(-200, 0)">
        <circle cx="0" cy="-60" r="40" fill="url(#plateGrad)" stroke="rgba(250, 249, 246, 0.22)" stroke-width="0.5" />
        <circle cx="0" cy="60" r="30" fill="url(#plateGrad)" stroke="rgba(250, 249, 246, 0.18)" stroke-width="0.5" />
        <g transform="translate(0, 110)">
          <ellipse cx="0" cy="-15" rx="20" ry="6" fill="url(#plateGrad)" stroke="rgba(250, 249, 246, 0.25)" stroke-width="0.5" />
          <ellipse cx="0" cy="-7" rx="20" ry="6" fill="url(#plateGrad)" stroke="rgba(250, 249, 246, 0.25)" stroke-width="0.5" />
          <ellipse cx="0" cy="1" rx="20" ry="6" fill="url(#plateGrad)" stroke="rgba(250, 249, 246, 0.25)" stroke-width="0.5" />
          <ellipse cx="0" cy="9" rx="20" ry="6" fill="url(#plateGrad)" stroke="rgba(250, 249, 246, 0.25)" stroke-width="0.5" />
          <ellipse cx="0" cy="17" rx="20" ry="6" fill="url(#plateGrad)" stroke="rgba(250, 249, 246, 0.25)" stroke-width="0.5" />
        </g>
      </g>

      <!-- RIGHT HANGING PLATES -->
      <g transform="translate(200, 0)">
        <circle cx="0" cy="-80" r="38" fill="url(#plateGrad)" stroke="rgba(250, 249, 246, 0.22)" stroke-width="0.5" />
        <circle cx="0" cy="40" r="32" fill="url(#plateGrad)" stroke="rgba(250, 249, 246, 0.18)" stroke-width="0.5" />
        <g transform="translate(0, 120)">
          <ellipse cx="0" cy="-15" rx="22" ry="7" fill="url(#plateGrad)" stroke="rgba(250, 249, 246, 0.25)" stroke-width="0.5" />
          <ellipse cx="0" cy="-7" rx="22" ry="7" fill="url(#plateGrad)" stroke="rgba(250, 249, 246, 0.25)" stroke-width="0.5" />
          <ellipse cx="0" cy="1" rx="22" ry="7" fill="url(#plateGrad)" stroke="rgba(250, 249, 246, 0.25)" stroke-width="0.5" />
          <ellipse cx="0" cy="9" rx="22" ry="7" fill="url(#plateGrad)" stroke="rgba(250, 249, 246, 0.25)" stroke-width="0.5" />
        </g>
      </g>

      <!-- HORIZONTAL SEQUENCE -->
      <g>
        <ellipse cx="-120" cy="0" rx="18" ry="46" fill="url(#plateGrad)" stroke="rgba(250, 249, 246, 0.22)" stroke-width="0.5" />
        <ellipse cx="-100" cy="0" rx="18" ry="46" fill="url(#plateGrad)" stroke="rgba(250, 249, 246, 0.22)" stroke-width="0.5" />
        <ellipse cx="-80" cy="0" rx="18" ry="46" fill="url(#plateGrad)" stroke="rgba(250, 249, 246, 0.22)" stroke-width="0.5" />
        <ellipse cx="-60" cy="0" rx="18" ry="46" fill="url(#plateGrad)" stroke="rgba(250, 249, 246, 0.22)" stroke-width="0.5" />
        <ellipse cx="-40" cy="0" rx="18" ry="46" fill="url(#plateGrad)" stroke="rgba(250, 249, 246, 0.22)" stroke-width="0.5" />
        <ellipse cx="-20" cy="0" rx="18" ry="46" fill="url(#plateGrad)" stroke="rgba(250, 249, 246, 0.22)" stroke-width="0.5" />
        
        <!-- Central Split pieces -->
        <path d="M -10,-42 A 18 42 0 0 1 10 -42 Z" fill="url(#plateGrad)" stroke="rgba(250, 249, 246, 0.28)" stroke-width="0.5" />
        <path d="M -10,42 A 18 42 0 0 0 10 42 Z" fill="url(#plateGrad)" stroke="rgba(250, 249, 246, 0.28)" stroke-width="0.5" />
        
        <ellipse cx="20" cy="0" rx="18" ry="46" fill="url(#plateGrad)" stroke="rgba(250, 249, 246, 0.22)" stroke-width="0.5" />
        <ellipse cx="40" cy="0" rx="18" ry="46" fill="url(#plateGrad)" stroke="rgba(250, 249, 246, 0.22)" stroke-width="0.5" />
        <ellipse cx="60" cy="0" rx="18" ry="46" fill="url(#plateGrad)" stroke="rgba(250, 249, 246, 0.22)" stroke-width="0.5" />
        <ellipse cx="80" cy="0" rx="18" ry="46" fill="url(#plateGrad)" stroke="rgba(250, 249, 246, 0.22)" stroke-width="0.5" />
        <ellipse cx="100" cy="0" rx="18" ry="46" fill="url(#plateGrad)" stroke="rgba(250, 249, 246, 0.22)" stroke-width="0.5" />
        <ellipse cx="120" cy="0" rx="18" ry="46" fill="url(#plateGrad)" stroke="rgba(250, 249, 246, 0.22)" stroke-width="0.5" />
      </g>

      <!-- VERTICAL SEQUENCE -->
      <g>
        <ellipse cx="0" cy="-140" rx="48" ry="17" fill="url(#plateGrad)" stroke="rgba(250, 249, 246, 0.22)" stroke-width="0.5" />
        <ellipse cx="0" cy="-115" rx="48" ry="17" fill="url(#plateGrad)" stroke="rgba(250, 249, 246, 0.22)" stroke-width="0.5" />
        <ellipse cx="0" cy="-90" rx="48" ry="17" fill="url(#plateGrad)" stroke="rgba(250, 249, 246, 0.22)" stroke-width="0.5" />
        <ellipse cx="0" cy="-65" rx="48" ry="17" fill="url(#plateGrad)" stroke="rgba(250, 249, 246, 0.22)" stroke-width="0.5" />
        
        <ellipse cx="0" cy="65" rx="48" ry="17" fill="url(#plateGrad)" stroke="rgba(250, 249, 246, 0.22)" stroke-width="0.5" />
        <ellipse cx="0" cy="90" rx="48" ry="17" fill="url(#plateGrad)" stroke="rgba(250, 249, 246, 0.22)" stroke-width="0.5" />
        <ellipse cx="0" cy="115" rx="48" ry="17" fill="url(#plateGrad)" stroke="rgba(250, 249, 246, 0.22)" stroke-width="0.5" />
        <ellipse cx="0" cy="140" rx="48" ry="17" fill="url(#plateGrad)" stroke="rgba(250, 249, 246, 0.22)" stroke-width="0.5" />
      </g>

      <!-- CORE FOCUS ELEMENTS -->
      <circle cx="0" cy="-175" r="42" fill="url(#plateGrad)" stroke="rgba(250, 249, 246, 0.25)" stroke-width="0.5" />
      <circle cx="0" cy="175" r="42" fill="url(#plateGrad)" stroke="rgba(250, 249, 246, 0.25)" stroke-width="0.5" />
      <circle cx="0" cy="0" r="68" fill="url(#plateGrad)" stroke="rgba(250, 249, 246, 0.3)" stroke-width="0.75" />
      
      <line x1="-58" y1="0" x2="58" y2="0" stroke="rgba(250, 249, 246, 0.15)" stroke-width="0.5" />
      <line x1="0" y1="-58" x2="0" y2="58" stroke="rgba(250, 249, 246, 0.15)" stroke-width="0.5" />
    </g>

    <!-- Elegant background silhouette representing the temporal doll proxy -->
    <g transform="translate(${width * 0.72}, ${height * 0.35})" opacity="0.4">
      <path d="M 0,-35 C -8,-35 -12,-15 -12,0 C -12,15 -4,30 -4,70 C -4,110 -15,150 -15,200 L 15,200 C 15,150 4,110 4,70 C 4,15 12,15 12,0 C 12,-15 8,-35 0,-35 Z" fill="rgba(250, 249, 246, 0.04)" stroke="rgba(250, 249, 246, 0.1)" stroke-width="0.5" />
      <circle cx="0" cy="-48" r="8" fill="rgba(250, 249, 246, 0.04)" stroke="rgba(250, 249, 246, 0.1)" stroke-width="0.5" />
      <line x1="0" y1="-40" x2="0" y2="-35" stroke="rgba(250, 249, 246, 0.12)" stroke-width="0.5" />
    </g>

    <!-- Mixed-media vellum overlay texture -->
    <rect width="100%" height="100%" filter="url(#grainFilter)" pointer-events="none" mix-blend-mode="overlay" />

    <!-- Lower metadata block (Vogue Italia publishing format) -->
    <g transform="translate(60, ${height - 110})">
      <text x="0" y="0" class="mono-text">Mimi // TEMPORAL REFRACTION SYSTEM</text>
      <text x="0" y="32" class="title-text">${prompt.slice(0, 48)}${prompt.length > 48 ? '...' : ''}</text>
      <text x="0" y="56" class="desc-text">Simulated mirror state // Vogue Italia Luminous Diaphanity concept</text>
    </g>
  </svg>`;
  
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export class OpenAIImageAdapter implements MimiImageProviderAdapter {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model = process.env.OPENAI_IMAGE_MODEL || "dall-e-3") {
    this.apiKey = apiKey;
    this.model = model;
  }

  async generateImage(input: MimiGenerateImageInput): Promise<MimiImageResponse> {
    const prompt = compileMimiImagePrompt({
      provider: "openai",
      prompt: input.userPrompt,
      references: input.references,
      mode: normalizeMode(input.mode),
      styleGuide: input.styleGuide,
      negativePrompt: input.negativePrompt,
      aspectRatio: normalizeAspectRatio(input.aspectRatio),
      imageSize: normalizeImageSize(input.imageSize),
      metadata: input.metadata,
    });

    const startedAt = Date.now();
    const quality =
      input.quality ||
      (this.model.startsWith("dall-e") ? "standard" : "medium");
    const upstream = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        prompt,
        n: 1,
        size: aspectRatioToOpenAiSize(input.aspectRatio),
        quality,
        user: input.userId,
      }),
    });

    const raw = await upstream.text();
    const payload = safeJson(raw);
    if (!upstream.ok) {
      const providerCode = payload?.error?.code || "OPENAI_IMAGE_FAILED";
      const providerMessage = payload?.error?.message || "OpenAI image generation failed.";
      throw Object.assign(new Error(providerMessage), {
        status: upstream.status,
        code: providerCode,
        providerStatus: upstream.status,
      });
    }

    const first = payload?.data?.[0] || {};
    const base64 = first.b64_json || "";
    const imageUrl = base64 ? `data:image/png;base64,${base64}` : first.url;
    if (!imageUrl) {
      throw Object.assign(new Error("OpenAI did not return an image."), {
        status: 502,
        code: "NO_IMAGE_RETURNED",
      });
    }

    return {
      ok: true,
      provider: "openai",
      model: this.model,
      imageUrl,
      base64: base64 || undefined,
      mimeType: "image/png",
      compiledPrompt: prompt,
      warnings: [],
      metadata: {
        mode: input.mode || "reference-led",
        referenceCount: input.references?.length || 0,
        latencyMs: Date.now() - startedAt,
        openaiUsage: payload?.usage,
        ...input.metadata,
      },
    };
  }
}

export class GeminiImageAdapter implements MimiImageProviderAdapter {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model = process.env.GEMINI_IMAGE_MODEL || "imagen-3.0-generate-002") {
    this.apiKey = apiKey;
    this.model = model;
  }

  async generateImage(input: MimiGenerateImageInput): Promise<MimiImageResponse> {
    return generateMimiImageServer(
      {
        prompt: input.userPrompt,
        references: input.references,
        mode: normalizeMode(input.mode),
        styleGuide: input.styleGuide,
        negativePrompt: input.negativePrompt,
        aspectRatio: normalizeAspectRatio(input.aspectRatio),
        imageSize: normalizeImageSize(input.imageSize),
        provider: "gemini",
        model: this.model,
        metadata: input.metadata,
      },
      { apiKey: this.apiKey, provider: "gemini" }
    );
  }
}

export class LocalImageAdapter implements MimiImageProviderAdapter {
  async generateImage(input: MimiGenerateImageInput): Promise<MimiImageResponse> {
    const localUrl = process.env.MIMI_LOCAL_IMAGE_URL || "http://127.0.0.1:7860/sdapi/v1/txt2img";
    const startedAt = Date.now();
    console.info("MIMI // ImageProvider: Local Stable Diffusion generation using URL:", localUrl);
    
    try {
      const response = await fetch(localUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prompt: `${input.userPrompt}. ${input.styleGuide || ""}`,
          negative_prompt: input.negativePrompt || "",
          steps: 20,
          cfg_scale: 7,
          width: input.aspectRatio === "16:9" ? 768 : input.aspectRatio === "9:16" ? 432 : 512,
          height: input.aspectRatio === "16:9" ? 432 : input.aspectRatio === "9:16" ? 768 : 512,
        })
      });

      if (!response.ok) {
        throw new Error(`SD API failed with status ${response.status}`);
      }

      const payload = await response.json();
      const base64 = payload.images?.[0];
      if (!base64) {
        throw new Error("No image base64 returned in Stable Diffusion payload.");
      }

      return {
        ok: true,
        provider: "local",
        model: "stable-diffusion-txt2img",
        imageUrl: `data:image/png;base64,${base64}`,
        base64,
        mimeType: "image/png",
        compiledPrompt: input.userPrompt,
        warnings: [],
        metadata: {
          mode: input.mode || "reference-led",
          latencyMs: Date.now() - startedAt,
          ...input.metadata
        }
      };
    } catch (err: any) {
      console.warn("MIMI // ImageProvider: Local Stable Diffusion failed. Falling back to simulation.", err);
      return new SimulatedImageAdapter().generateImage(input);
    }
  }
}

export class SimulatedImageAdapter implements MimiImageProviderAdapter {
  async generateImage(input: MimiGenerateImageInput): Promise<MimiImageResponse> {
    const startedAt = Date.now();
    const dataUrl = getSimulatedImageBase64(input.userPrompt, input.aspectRatio || "1:1");
    
    return {
      ok: true,
      provider: "simulated",
      model: "mock-spine-vector",
      imageUrl: dataUrl,
      base64: dataUrl.split(",")[1] || "",
      mimeType: "image/svg+xml",
      compiledPrompt: input.userPrompt,
      warnings: ["Operating in Simulated Mirror Mode."],
      metadata: {
        mode: input.mode || "reference-led",
        latencyMs: Date.now() - startedAt,
        ...input.metadata
      }
    };
  }
}

export class ReplicateImageAdapter implements MimiImageProviderAdapter {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model = process.env.REPLICATE_IMAGE_MODEL || "black-forest-labs/flux-schnell") {
    this.apiKey = apiKey;
    this.model = model;
  }

  async generateImage(input: MimiGenerateImageInput): Promise<MimiImageResponse> {
    const prompt = compileMimiImagePrompt({
      provider: "replicate" as any,
      prompt: input.userPrompt,
      references: input.references,
      mode: normalizeMode(input.mode),
      styleGuide: input.styleGuide,
      negativePrompt: input.negativePrompt,
      aspectRatio: normalizeAspectRatio(input.aspectRatio),
      imageSize: normalizeImageSize(input.imageSize),
      metadata: input.metadata,
    });

    const startedAt = Date.now();
    let url = "https://api.replicate.com/v1/predictions";
    let bodyData: any = {};

    if (this.model.includes("/")) {
      url = `https://api.replicate.com/v1/models/${this.model}/predictions`;
      bodyData = {
        input: {
          prompt: prompt,
          aspect_ratio: input.aspectRatio || "1:1",
          num_outputs: 1
        }
      };
    } else {
      bodyData = {
        version: this.model,
        input: {
          prompt: prompt,
          aspect_ratio: input.aspectRatio || "1:1",
          num_outputs: 1
        }
      };
    }

    const upstream = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Token ${this.apiKey}`,
      },
      body: JSON.stringify(bodyData),
    });

    const raw = await upstream.text();
    const payload = safeJson(raw);
    if (!upstream.ok) {
      const providerCode = payload?.error?.code || "REPLICATE_IMAGE_FAILED";
      const providerMessage = payload?.error?.message || "Replicate image generation failed.";
      throw Object.assign(new Error(providerMessage), {
        status: upstream.status,
        code: providerCode,
        providerStatus: upstream.status,
      });
    }

    const predictionId = payload?.id;
    if (!predictionId) {
      throw Object.assign(new Error("Replicate did not return a prediction ID."), {
        status: 502,
        code: "NO_PREDICTION_ID",
      });
    }

    // Poll prediction status
    let status = payload?.status || "starting";
    let predictionOutput = payload?.output;
    let pollAttempts = 0;
    const maxPollAttempts = 20;

    while ((status === "starting" || status === "processing") && pollAttempts < maxPollAttempts) {
      await new Promise(r => setTimeout(r, 1000));
      pollAttempts++;

      const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
        headers: {
          "Authorization": `Token ${this.apiKey}`,
        }
      });
      if (pollRes.ok) {
        const pollPayload = await pollRes.json();
        status = pollPayload.status;
        predictionOutput = pollPayload.output;
      }
    }

    if (status !== "succeeded" || !predictionOutput) {
      throw Object.assign(new Error(`Replicate prediction ${predictionId} finished with status: ${status}`), {
        status: 502,
        code: "REPLICATE_POLL_FAILED",
      });
    }

    const imageUrl = Array.isArray(predictionOutput) ? predictionOutput[0] : predictionOutput;
    if (!imageUrl) {
      throw Object.assign(new Error("Replicate did not return any output image URL."), {
        status: 502,
        code: "NO_IMAGE_RETURNED",
      });
    }

    let base64: string | undefined = undefined;
    try {
      const imgFetch = await fetch(imageUrl);
      if (imgFetch.ok) {
        const arrayBuf = await imgFetch.arrayBuffer();
        const base64Str = Buffer.from(arrayBuf).toString("base64");
        base64 = base64Str;
      }
    } catch (e) {
      console.warn("Mimi // Replicate could not convert output image to base64, using raw URL instead:", e);
    }

    const finalUrl = base64 ? `data:image/png;base64,${base64}` : imageUrl;

    return {
      ok: true,
      provider: "replicate" as any,
      model: this.model,
      imageUrl: finalUrl,
      base64: base64 || undefined,
      mimeType: "image/png",
      compiledPrompt: prompt,
      warnings: [],
      metadata: {
        mode: input.mode || "reference-led",
        referenceCount: input.references?.length || 0,
        latencyMs: Date.now() - startedAt,
        predictionId,
        ...input.metadata,
      },
    };
  }
}

export class GatewayImageAdapter implements MimiImageProviderAdapter {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model = "") {
    this.apiKey = apiKey;
    this.model = model;
  }

  async generateImage(input: MimiGenerateImageInput): Promise<MimiImageResponse> {
    const defaultRole = (input.references && input.references.length > 0) ? 'imageEdit' : 'image';
    const finalModel = this.model || modelFor(defaultRole, 'gateway');

    return generateMimiImageServer(
      {
        prompt: input.userPrompt,
        references: input.references,
        mode: normalizeMode(input.mode),
        styleGuide: input.styleGuide,
        negativePrompt: input.negativePrompt,
        aspectRatio: normalizeAspectRatio(input.aspectRatio),
        imageSize: normalizeImageSize(input.imageSize),
        provider: "gateway",
        model: finalModel,
        metadata: input.metadata,
      },
      { apiKey: this.apiKey, provider: "gateway" }
    );
  }
}

export class MimiProvider {
  static gateway(apiKey = getServerAiGatewayKey(), model?: string) {
    if (!apiKey) {
      throw Object.assign(new Error("AI_GATEWAY_API_KEY is not configured server-side."), {
        status: 503,
        code: "MISSING_GATEWAY_KEY",
      });
    }
    return new GatewayImageAdapter(apiKey, model);
  }

  static openai(apiKey = process.env.OPENAI_API_KEY || "", model?: string) {
    if (!apiKey) {
      throw Object.assign(new Error("OPENAI_API_KEY is not configured server-side."), {
        status: 503,
        code: "MISSING_OPENAI_KEY",
      });
    }
    return new OpenAIImageAdapter(apiKey, model);
  }

  static gemini(apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || "", model?: string) {
    if (!apiKey) {
      throw Object.assign(new Error("GEMINI_API_KEY is not configured server-side."), {
        status: 503,
        code: "MISSING_GEMINI_KEY",
      });
    }
    return new GeminiImageAdapter(apiKey, model);
  }

  static replicate(apiKey = process.env.REPLICATE_API_TOKEN || process.env.REPLICATE_API_KEY || "", model?: string) {
    if (!apiKey) {
      throw Object.assign(new Error("REPLICATE_API_TOKEN is not configured server-side."), {
        status: 503,
        code: "MISSING_REPLICATE_KEY",
      });
    }
    return new ReplicateImageAdapter(apiKey, model);
  }

  static local() {
    return new LocalImageAdapter();
  }

  static simulated() {
    return new SimulatedImageAdapter();
  }

  static async generateImage(input: MimiGenerateImageInput, userKey?: string): Promise<MimiImageResponse> {
    const provider = input.provider || process.env.MIMI_DEFAULT_IMAGE_PROVIDER || 
                     (process.env.OPENAI_API_KEY || userKey ? "openai" : "gemini");

    // If Simulated Mode is selected or no keys are configured
    if (provider === "simulated") {
      return await MimiProvider.simulated().generateImage(input);
    }

    if (provider === "local") {
      if (process.env.NODE_ENV !== "production" && process.env.MIMI_LOCAL_IMAGE_MODE === "true") {
        return await MimiProvider.local().generateImage(input);
      } else {
        console.warn("MIMI // ImageProvider: Local image dev mode is not active. Falling back to simulation.");
        return await MimiProvider.simulated().generateImage(input);
      }
    }

    const openaiKey = userKey || process.env.OPENAI_API_KEY || "";
    const geminiKey = userKey || process.env.GEMINI_API_KEY || process.env.API_KEY || "";
    const replicateKey = userKey || process.env.REPLICATE_API_TOKEN || process.env.REPLICATE_API_KEY || "";
    const gatewayKey = userKey || getServerAiGatewayKey();

    const defaultRole = (input.references && input.references.length > 0) ? 'imageEdit' : 'image';

    if (provider === "gemini") {
      try {
        if (!geminiKey) throw new Error("Gemini key missing.");
        const model = input.model || modelFor(defaultRole, 'gemini');
        return await MimiProvider.gemini(geminiKey, model).generateImage(input);
      } catch (geminiErr: any) {
        if (openaiKey) {
          console.warn("Mimi // Gemini generation failed, trying OpenAI fallback...", geminiErr);
          const model = input.model || modelFor(defaultRole, 'openai');
          return await MimiProvider.openai(openaiKey, model).generateImage(input);
        }
        console.warn("Mimi // Gemini failed and no OpenAI fallback key. Entering Simulated Mirror Mode.");
        return await MimiProvider.simulated().generateImage(input);
      }
    } else if (provider === "replicate") {
      try {
        if (!replicateKey) throw new Error("Replicate key missing.");
        return await MimiProvider.replicate(replicateKey, input.model).generateImage(input);
      } catch (replicateErr: any) {
        if (geminiKey) {
          console.warn("Mimi // Replicate generation failed, trying Gemini fallback...", replicateErr);
          const model = input.model || modelFor(defaultRole, 'gemini');
          return await MimiProvider.gemini(geminiKey, model).generateImage(input);
        }
        console.warn("Mimi // Replicate failed and no Gemini fallback key. Entering Simulated Mirror Mode.");
        return await MimiProvider.simulated().generateImage(input);
      }
    } else if (provider === "gateway") {
      try {
        if (!gatewayKey) throw new Error("Gateway key missing.");
        const model = input.model || modelFor(defaultRole, 'gateway');
        return await MimiProvider.gateway(gatewayKey, model).generateImage(input);
      } catch (gatewayErr: any) {
        if (geminiKey) {
          console.warn("Mimi // Gateway generation failed, trying Gemini fallback...", gatewayErr);
          const model = input.model || modelFor(defaultRole, 'gemini');
          return await MimiProvider.gemini(geminiKey, model).generateImage(input);
        }
        console.warn("Mimi // Gateway failed and no Gemini fallback key. Entering Simulated Mirror Mode.");
        return await MimiProvider.simulated().generateImage(input);
      }
    } else {
      try {
        if (!openaiKey) throw new Error("OpenAI key missing.");
        const model = input.model || modelFor(defaultRole, 'openai');
        return await MimiProvider.openai(openaiKey, model).generateImage(input);
      } catch (openaiErr: any) {
        if (geminiKey) {
          console.warn("Mimi // OpenAI generation failed, trying Gemini fallback...", openaiErr);
          const model = input.model || modelFor(defaultRole, 'gemini');
          return await MimiProvider.gemini(geminiKey, model).generateImage(input);
        }
        console.warn("Mimi // OpenAI failed and no Gemini fallback key. Entering Simulated Mirror Mode.");
        return await MimiProvider.simulated().generateImage(input);
      }
    }
  }
}
