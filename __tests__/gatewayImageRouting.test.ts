import { describe, expect, it } from "vitest";
import {
  extractGatewayChatImageBytes,
  gatewayImageUsesChatModalities,
  imageSizeFromAspectRatio,
} from "../lib/aiGatewayCompat.js";

describe("gatewayImageUsesChatModalities", () => {
  it("routes Gemini image language models through chat completions", () => {
    expect(gatewayImageUsesChatModalities("google/gemini-3.1-flash-image")).toBe(true);
    expect(gatewayImageUsesChatModalities("google/gemini-3.1-flash-image-preview")).toBe(true);
    expect(gatewayImageUsesChatModalities("google/gemini-3-pro-image")).toBe(true);
  });

  it("keeps dedicated image models on /images/generations", () => {
    expect(gatewayImageUsesChatModalities("openai/gpt-image-2")).toBe(false);
    expect(gatewayImageUsesChatModalities("google/imagen-4.0-fast-generate-001")).toBe(false);
    expect(gatewayImageUsesChatModalities("bfl/flux-2-pro")).toBe(false);
    expect(gatewayImageUsesChatModalities("google/gemini-3.6-flash")).toBe(false);
  });
});

describe("extractGatewayChatImageBytes", () => {
  it("reads data URLs from message.images", () => {
    const extracted = extractGatewayChatImageBytes({
      images: [
        {
          type: "image_url",
          image_url: { url: "data:image/png;base64,QUJDRA==" },
        },
      ],
    });
    expect(extracted).toEqual({ base64: "QUJDRA==", mimeType: "image/png" });
  });

  it("reads image_url content parts", () => {
    const extracted = extractGatewayChatImageBytes({
      content: [
        { type: "text", text: "here" },
        {
          type: "image_url",
          image_url: { url: "data:image/jpeg;base64,eyJrIjoiIn0=" },
        },
      ],
    });
    expect(extracted).toEqual({ base64: "eyJrIjoiIn0=", mimeType: "image/jpeg" });
  });
});

describe("imageSizeFromAspectRatio", () => {
  it("maps studio cover 3:4 to a tall OpenAI size", () => {
    expect(imageSizeFromAspectRatio("3:4")).toBe("1024x1536");
    expect(imageSizeFromAspectRatio("9:16")).toBe("1024x1536");
    expect(imageSizeFromAspectRatio("16:9")).toBe("1536x1024");
    expect(imageSizeFromAspectRatio("1:1")).toBe("1024x1024");
  });
});
