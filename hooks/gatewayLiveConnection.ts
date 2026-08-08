/**
 * Browser-side AI Gateway realtime session for Oracle Cyberdeck.
 * Uses the AI SDK gateway codec + WebSocket (no Gemini API key required).
 */
import type {
  Experimental_RealtimeModel as RealtimeModel,
  Experimental_RealtimeServerEvent as RealtimeServerEvent,
} from "ai";

export type GatewayLiveConnectionOptions = {
  model: RealtimeModel;
  token: string;
  url: string;
  sessionConfig?: Record<string, unknown>;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Error) => void;
  onTranscriptDelta?: (delta: string) => void;
  onSpeakingChange?: (speaking: boolean) => void;
  onToolCall?: (name: string, args: unknown, callId: string) => Promise<unknown>;
};

export class GatewayLiveConnection {
  private ws: WebSocket | null = null;
  private sendQueue: Promise<void> = Promise.resolve();
  private audioQueue: AudioBufferSourceNode[] = [];
  private nextStartTime = 0;
  private outputCtx: AudioContext | null = null;
  private inputCtx: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private disposed = false;

  constructor(
    private readonly options: GatewayLiveConnectionOptions,
  ) {}

  async start(micStream: MediaStream, outputCtx: AudioContext, inputCtx: AudioContext) {
    this.disposed = false;
    this.outputCtx = outputCtx;
    this.inputCtx = inputCtx;
    this.stream = micStream;

    const wsConfig = this.options.model.getWebSocketConfig({
      token: this.options.token,
      url: this.options.url,
    });

    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(wsConfig.url, wsConfig.protocols);
      this.ws = ws;

      ws.onopen = async () => {
        try {
          const sessionUpdate = await this.options.model.serializeClientEvent({
            type: "session-update",
            config: this.options.sessionConfig || {},
          });
          if (sessionUpdate != null) {
            ws.send(typeof sessionUpdate === "string" ? sessionUpdate : JSON.stringify(sessionUpdate));
          }
          this.wireMicrophone();
          this.options.onOpen?.();
          resolve();
        } catch (err) {
          reject(err);
        }
      };

      ws.onmessage = (event) => {
        void this.handleMessage(event.data);
      };

      ws.onerror = () => {
        const err = new Error("Gateway realtime WebSocket error.");
        this.options.onError?.(err);
        reject(err);
      };

      ws.onclose = () => {
        this.options.onClose?.();
      };
    });
  }

  private wireMicrophone() {
    if (!this.inputCtx || !this.stream || !this.ws) return;

    this.source = this.inputCtx.createMediaStreamSource(this.stream);
    this.processor = this.inputCtx.createScriptProcessor(4096, 1, 1);

    this.processor.onaudioprocess = (e) => {
      if (this.disposed || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
      const inputData = e.inputBuffer.getChannelData(0);
      const pcm = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        const s = Math.max(-1, Math.min(1, inputData[i]));
        pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
      const bytes = new Uint8Array(pcm.buffer);
      let binary = "";
      for (let j = 0; j < bytes.byteLength; j++) {
        binary += String.fromCharCode(bytes[j]);
      }
      const base64 = btoa(binary);
      void this.sendClientEvent({ type: "input-audio-append", audio: base64 });
    };

    this.source.connect(this.processor);
    this.processor.connect(this.inputCtx.destination);
  }

  private async sendClientEvent(event: Record<string, unknown>) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.sendQueue = this.sendQueue.then(async () => {
      const serialized = await this.options.model.serializeClientEvent(event as any);
      if (serialized == null || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
      if (typeof serialized === "string") {
        this.ws.send(serialized);
      } else if (serialized instanceof ArrayBuffer || ArrayBuffer.isView(serialized)) {
        this.ws.send(serialized);
      } else {
        this.ws.send(JSON.stringify(serialized));
      }
    });
    await this.sendQueue;
  }

  private async handleMessage(raw: unknown) {
    if (this.disposed) return;
    let parsed: unknown;
    try {
      parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch {
      return;
    }

    const events = this.options.model.parseServerEvent(parsed as any);
    const list = Array.isArray(events) ? events : [events];

    for (const event of list as RealtimeServerEvent[]) {
      switch (event.type) {
        case "audio-transcript-delta":
          if (event.delta) this.options.onTranscriptDelta?.(event.delta);
          break;
        case "audio-delta":
          await this.playPcmDelta(event.delta);
          break;
        case "response-done":
          this.options.onSpeakingChange?.(false);
          break;
        case "speech-started":
          this.clearPlayback();
          break;
        case "function-call-arguments-done":
          if (this.options.onToolCall && event.callId && event.name) {
            let args: unknown = {};
            try {
              args = event.arguments ? JSON.parse(event.arguments) : {};
            } catch {
              args = {};
            }
            void this.handleToolCall(event.callId, event.name, args);
          }
          break;
        case "error":
          this.options.onError?.(new Error(event.message || "Gateway realtime error"));
          break;
        default:
          break;
      }
    }
  }

  private async handleToolCall(callId: string, name: string, args: unknown) {
    if (!this.options.onToolCall) return;
    try {
      const response = await this.options.onToolCall(name, args, callId);
      await this.sendClientEvent({
        type: "conversation-item-create",
        item: {
          type: "function-call-output",
          callId,
          name,
          output: response ?? { status: "success" },
        },
      });
      await this.sendClientEvent({ type: "response-create" });
    } catch (err) {
      await this.sendClientEvent({
        type: "conversation-item-create",
        item: {
          type: "function-call-output",
          callId,
          name,
          output: { status: "error", message: String(err) },
        },
      });
    }
  }

  private async playPcmDelta(base64Audio: string) {
    if (!this.outputCtx || !base64Audio) return;
    this.options.onSpeakingChange?.(true);

    if (this.outputCtx.state === "suspended") {
      await this.outputCtx.resume().catch((): undefined => undefined);
    }

    const binary = atob(base64Audio);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const dataInt16 = new Int16Array(bytes.buffer);
    const audioBuffer = this.outputCtx.createBuffer(1, dataInt16.length, 24000);
    const channelData = audioBuffer.getChannelData(0);
    for (let j = 0; j < dataInt16.length; j++) {
      channelData[j] = dataInt16[j] / 32768.0;
    }

    const source = this.outputCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.outputCtx.destination);

    const currentTime = this.outputCtx.currentTime;
    const startTime = Math.max(currentTime, this.nextStartTime);
    this.nextStartTime = startTime + audioBuffer.duration;
    source.start(startTime);
    source.onended = () => {
      if (this.outputCtx && this.outputCtx.currentTime >= this.nextStartTime) {
        this.options.onSpeakingChange?.(false);
      }
    };
    this.audioQueue.push(source);
  }

  private clearPlayback() {
    this.audioQueue.forEach((s) => {
      try {
        s.stop();
      } catch {
        // ignore
      }
    });
    this.audioQueue = [];
    this.nextStartTime = 0;
    this.options.onSpeakingChange?.(false);
  }

  close() {
    this.disposed = true;
    this.clearPlayback();
    try {
      this.processor?.disconnect();
      this.source?.disconnect();
    } catch {
      // ignore
    }
    this.processor = null;
    this.source = null;
    this.stream?.getTracks().forEach((t) => {
      try {
        t.stop();
      } catch {
        // ignore
      }
    });
    this.stream = null;
    try {
      this.ws?.close();
    } catch {
      // ignore
    }
    this.ws = null;
  }
}
