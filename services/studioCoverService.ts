import type { MimiImageReference, MimiImageResponse } from "../lib/mimiImageTypes";

export type StudioCoverProvider = "gateway" | "openai" | "gemini" | "replicate";

export interface GenerateStudioCoverInput {
  prompt: string;
  title?: string;
  author?: string;
  reference?: MimiImageReference;
  treatmentLabel?: string;
  tailorContext?: unknown;
  provider?: StudioCoverProvider;
  apiKey?: string;
  openaiKey?: string;
}

const blobUrlToDataUrl = async (url: string): Promise<string> => {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export const mediaFileToImageReference = async (media: {
  url?: string;
  data?: string;
  mimeType?: string;
  name?: string;
}): Promise<MimiImageReference | undefined> => {
  if (media.data?.startsWith("data:")) {
    return { dataUrl: media.data, mimeType: media.mimeType || "image/png", name: media.name || "cover-reference" };
  }
  if (media.url?.startsWith("data:")) {
    return { dataUrl: media.url, mimeType: media.mimeType || "image/png", name: media.name || "cover-reference" };
  }
  if (media.data) {
    return {
      dataUrl: `data:${media.mimeType || "image/png"};base64,${media.data}`,
      mimeType: media.mimeType || "image/png",
      name: media.name || "cover-reference",
    };
  }
  if (media.url) {
    try {
      const dataUrl = await blobUrlToDataUrl(media.url);
      return { dataUrl, mimeType: media.mimeType || "image/png", name: media.name || "cover-reference" };
    } catch (e) {
      console.warn("MIMI // Failed to fetch reference image locally. Passing as-is.", e);
      return { url: media.url, mimeType: media.mimeType || "image/png", name: media.name || "cover-reference" };
    }
  }
  return undefined;
};

const compileCoverPrompt = (input: GenerateStudioCoverInput) => {
  const parts = [
    input.prompt.trim(),
    input.title ? `Issue title: ${input.title}` : "",
    input.author ? `Byline: ${input.author}` : "",
    input.treatmentLabel ? `Visual treatment: ${input.treatmentLabel}` : "",
    "Editorial zine cover plate. Leave clean negative space for title overlay. No embedded typography unless requested.",
  ].filter(Boolean);
  return parts.join(" ");
};

const postMimiImage = async (body: Record<string, unknown>, headers: Record<string, string> = {}): Promise<MimiImageResponse> => {
  const res = await fetch("/api/mimi-image", {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      ...headers
    },
    credentials: "include",
    body: JSON.stringify(body),
  });
  
  let payload: any;
  try {
    payload = await res.json();
  } catch (err) {
    throw new Error(`Server returned invalid response structure (${res.status} ${res.statusText})`);
  }

  if (!res.ok) {
    throw new Error(payload?.error?.message || "Cover generation failed");
  }
  return payload as MimiImageResponse;
};

export const generateStudioCover = async (
  input: GenerateStudioCoverInput,
): Promise<MimiImageResponse> => {
  const prompt = compileCoverPrompt(input);
  const references = input.reference ? [input.reference] : undefined;
  const baseBody = {
    prompt,
    userPrompt: prompt,
    mode: "zine-plate",
    aspectRatio: "3:4",
    references,
    tailorContext: input.tailorContext,
    metadata: { source: "studio-cover-compose" },
  };

  const headers: Record<string, string> = {};
  const provider = input.provider || (input.openaiKey ? "openai" : "gemini");
  if (provider === "openai" && input.openaiKey) {
    headers["Authorization"] = `Bearer ${input.openaiKey}`;
  } else if (input.apiKey) {
    headers["x-api-key"] = input.apiKey;
  }

  try {
    return await postMimiImage({ ...baseBody, provider }, headers);
  } catch (primaryError) {
    console.warn("MIMI // Studio cover: primary path failed, trying simulated.", primaryError);
    return postMimiImage({ ...baseBody, provider: "simulated" }, headers);
  }
};
