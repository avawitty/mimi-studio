/**
 * Render a compact spectrogram-style PNG data URL from an audio blob.
 * Used for voice memo artifacts in Studio (collect + optional reverse transcribe).
 */
export async function renderVoiceSpectrogramDataUrl(
  blob: Blob,
  opts: { width?: number; height?: number } = {},
): Promise<string> {
  const width = opts.width ?? 240;
  const height = opts.height ?? 72;

  const audioContext = new AudioContext();
  try {
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
    const channel = audioBuffer.getChannelData(0);
    const samplesPerColumn = Math.max(1, Math.floor(channel.length / width));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");

    ctx.fillStyle = "var(--mimi-field, #f5f1e8)";
    ctx.fillRect(0, 0, width, height);

    for (let x = 0; x < width; x += 1) {
      const start = x * samplesPerColumn;
      const end = Math.min(channel.length, start + samplesPerColumn);
      let sum = 0;
      for (let i = start; i < end; i += 1) {
        const sample = channel[i] ?? 0;
        sum += sample * sample;
      }
      const rms = Math.sqrt(sum / Math.max(1, end - start));
      const barHeight = Math.max(2, Math.floor(rms * height * 4));
      const y = height - barHeight;
      const intensity = Math.min(1, rms * 6);
      const gray = Math.floor(40 + intensity * 180);
      ctx.fillStyle = `rgb(${gray}, ${gray}, ${gray})`;
      ctx.fillRect(x, y, 1, barHeight);
    }

    return canvas.toDataURL("image/png");
  } finally {
    await audioContext.close();
  }
}
