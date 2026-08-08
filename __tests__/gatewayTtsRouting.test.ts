import { describe, expect, it } from "vitest";
import {
  isGeminiAudioRequest,
  mapGeminiVoiceToGateway,
} from "../lib/aiGatewayCompat.js";

describe("isGeminiAudioRequest", () => {
  it("detects Gemini TTS model ids", () => {
    expect(isGeminiAudioRequest({ model: "gemini-3.1-flash-tts-preview" })).toBe(true);
  });

  it("detects AUDIO response modality", () => {
    expect(
      isGeminiAudioRequest({
        model: "gemini-2.5-flash",
        config: { responseModalities: ["AUDIO"] },
      }),
    ).toBe(true);
  });

  it("does not flag ordinary text generation", () => {
    expect(
      isGeminiAudioRequest({
        model: "gemini-2.5-flash",
        config: { responseMimeType: "application/json" },
      }),
    ).toBe(false);
  });
});

describe("mapGeminiVoiceToGateway", () => {
  it("maps Oracle cyberdeck Gemini voices to supported gateway ids", () => {
    expect(mapGeminiVoiceToGateway("Kore")).toBe("alloy");
    expect(mapGeminiVoiceToGateway("Aoede")).toBe("cedar");
    expect(mapGeminiVoiceToGateway("Puck")).toBe("ballad");
    expect(mapGeminiVoiceToGateway("Charon")).toBe("echo");
  });

  it("passes through gateway voice ids unchanged", () => {
    expect(mapGeminiVoiceToGateway("alloy")).toBe("alloy");
    expect(mapGeminiVoiceToGateway("shimmer")).toBe("shimmer");
    expect(mapGeminiVoiceToGateway("cedar")).toBe("cedar");
  });

  it("remaps deprecated gateway voice ids", () => {
    expect(mapGeminiVoiceToGateway("fable")).toBe("ballad");
    expect(mapGeminiVoiceToGateway("nova")).toBe("sage");
    expect(mapGeminiVoiceToGateway("onyx")).toBe("ash");
  });
});
