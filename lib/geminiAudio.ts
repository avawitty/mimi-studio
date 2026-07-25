/** Helpers for Gemini TTS payloads (often raw 16-bit PCM @ 24kHz, sometimes WAV). */

export function isRiffWav(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 4 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46
  );
}

/** Copy into an aligned buffer so Int16Array construction never fails on odd offsets. */
export function decodePcm16le(
  ctx: AudioContext,
  data: Uint8Array,
  sampleRate = 24000,
): AudioBuffer {
  const evenLen = data.byteLength - (data.byteLength % 2);
  const copy = new Uint8Array(evenLen);
  copy.set(data.subarray(0, evenLen));
  const samples = new Int16Array(copy.buffer);
  const audioBuffer = ctx.createBuffer(1, samples.length, sampleRate);
  const channel = audioBuffer.getChannelData(0);
  for (let i = 0; i < samples.length; i++) {
    channel[i] = samples[i] / 32768;
  }
  return audioBuffer;
}

export async function decodeGeminiAudioBytes(
  ctx: AudioContext,
  bytes: Uint8Array,
): Promise<AudioBuffer> {
  if (isRiffWav(bytes)) {
    const ab = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    );
    return ctx.decodeAudioData(ab);
  }
  return decodePcm16le(ctx, bytes);
}

/** Wrap raw PCM as a playable WAV data URL for HTMLAudioElement. */
export function pcmBytesToWavDataUrl(
  pcm: Uint8Array,
  sampleRate = 24000,
): string {
  const evenLen = pcm.byteLength - (pcm.byteLength % 2);
  const dataLen = evenLen;
  const buffer = new ArrayBuffer(44 + dataLen);
  const view = new DataView(buffer);
  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataLen, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, dataLen, true);

  const pcmView = new Uint8Array(buffer, 44);
  pcmView.set(pcm.subarray(0, dataLen));

  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return `data:audio/wav;base64,${btoa(binary)}`;
}

export function geminiInlineAudioToDataUrl(base64: string): string {
  const cleaned = base64.replace(/\s/g, "");
  const binaryString = atob(cleaned);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  if (isRiffWav(bytes)) {
    return `data:audio/wav;base64,${cleaned}`;
  }
  return pcmBytesToWavDataUrl(bytes);
}
