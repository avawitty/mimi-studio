
import { useState, useRef, useEffect, useCallback } from 'react';
import { LiveServerMessage, Modality, Type } from '@google/genai';
import { resolveLiveAiCredentials, type LiveAiCredentials } from '../services/liveAuth';

// Audio helpers
function floatTo16BitPCM(input: Float32Array) {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return output;
}

function base64ToUint8Array(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function closeAudioContext(ctx: AudioContext | null) {
  if (!ctx) return;
  try { ctx.close(); } catch {}
}

export const useLiveSession = (
  systemInstruction: string,
  voiceName: string = 'Kore',
  onToolCall?: (name: string, args: any) => Promise<any>,
) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [volume, setVolume] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>('');
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  // Refs for cleanup
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Stable attempt token — avoids stale closures from storing state on `connect` itself
  const currentAttemptRef = useRef(0);
  const attemptCounterRef = useRef(0);

  // Keep latest props in refs so `connect` identity stays stable across re-renders
  const systemInstructionRef = useRef(systemInstruction);
  const voiceNameRef = useRef(voiceName);
  const onToolCallRef = useRef(onToolCall);
  systemInstructionRef.current = systemInstruction;
  voiceNameRef.current = voiceName;
  onToolCallRef.current = onToolCall;

  // Audio Playback Queue
  const nextStartTimeRef = useRef<number>(0);
  const audioQueueRef = useRef<AudioBufferSourceNode[]>([]);

  const cleanup = useCallback(() => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => {
          try { t.stop(); } catch(e) {}
        });
        streamRef.current = null;
      }
      if (processorRef.current) {
        try { processorRef.current.disconnect(); } catch(e) {}
      }
      if (sourceRef.current) {
        try { sourceRef.current.disconnect(); } catch(e) {}
      }
      processorRef.current = null;
      sourceRef.current = null;
      if (audioContextRef.current) {
        closeAudioContext(audioContextRef.current);
        audioContextRef.current = null;
      }
      if (inputContextRef.current) {
        closeAudioContext(inputContextRef.current);
        inputContextRef.current = null;
      }
      if (analyserRef.current) {
        try { analyserRef.current.disconnect(); } catch(e) {}
        analyserRef.current = null;
      }

      if (sessionRef.current && typeof sessionRef.current.close === 'function') {
        try { sessionRef.current.close(); } catch(e) {}
      }
      sessionRef.current = null;
      audioQueueRef.current.forEach(s => {
        try { s.stop(); } catch(e) {}
      });
      audioQueueRef.current = [];
      nextStartTimeRef.current = 0;
      setIsConnected(false);
      setIsConnecting(false);
      setIsSpeaking(false);
      setAnalyser(null);
    } catch (e) {
      console.error("MIMI // Error during cleanup:", e);
    }
  }, []);

  const disconnect = useCallback(() => {
    currentAttemptRef.current = 0;
    cleanup();
  }, [cleanup]);

  const connect = useCallback(async (retries = 3) => {
    setError(null);
    setIsConnecting(true);

    // Tear down any prior session/contexts before opening a new one
    if (sessionRef.current || audioContextRef.current || inputContextRef.current || streamRef.current) {
      cleanup();
      setIsConnecting(true);
    }

    const currentAttempt = ++attemptCounterRef.current;
    currentAttemptRef.current = currentAttempt;

    // Unlock audio synchronously inside the tap gesture BEFORE any network await.
    // Safari drops user-activation across awaits; creating/resuming here keeps playback alive.
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    let outputCtx: AudioContext | null = new AudioContextClass({ sampleRate: 24000 });
    let inputCtx: AudioContext | null = new AudioContextClass({ sampleRate: 16000 });
    const resumeOutput = outputCtx.resume().catch((): undefined => undefined);
    const resumeInput = inputCtx.resume().catch((): undefined => undefined);
    // Start mic permission from the same gesture (iOS); wire after session opens.
    const micPromise = navigator.mediaDevices.getUserMedia({ audio: true }).catch((e: any) => {
      throw e;
    });

    // Mint credentials ONCE per user tap — retries must not re-bill funded gateway credits.
    let credentials: LiveAiCredentials;
    try {
      credentials = await resolveLiveAiCredentials();
      await Promise.all([resumeOutput, resumeInput]);
    } catch (e: any) {
      if (currentAttemptRef.current === currentAttempt) {
        closeAudioContext(outputCtx);
        closeAudioContext(inputCtx);
        outputCtx = null;
        inputCtx = null;
        micPromise.then(s => s.getTracks().forEach(t => t.stop())).catch((): undefined => undefined);
        setError(e?.message || "Failed to establish link.");
        setIsConnecting(false);
      } else {
        closeAudioContext(outputCtx);
        closeAudioContext(inputCtx);
        micPromise.then(s => s.getTracks().forEach(t => t.stop())).catch((): undefined => undefined);
      }
      return;
    }

    if (currentAttemptRef.current !== currentAttempt) {
      // Superseded: dispose only our local contexts — do NOT call shared cleanup().
      closeAudioContext(outputCtx);
      closeAudioContext(inputCtx);
      micPromise.then(s => s.getTracks().forEach(t => t.stop())).catch((): undefined => undefined);
      return;
    }

    // Publish contexts to shared refs only while we still own the attempt.
    audioContextRef.current = outputCtx;
    inputContextRef.current = inputCtx;

    const abandonLocalIfStale = () => {
      if (currentAttemptRef.current === currentAttempt) return false;
      // Newer attempt may already own the shared refs — only close locals we still hold.
      if (audioContextRef.current === outputCtx) audioContextRef.current = null;
      if (inputContextRef.current === inputCtx) inputContextRef.current = null;
      closeAudioContext(outputCtx);
      closeAudioContext(inputCtx);
      outputCtx = null;
      inputCtx = null;
      micPromise.then(s => s.getTracks().forEach(t => t.stop())).catch((): undefined => undefined);
      return true;
    };

    for (let i = 0; i < retries; i++) {
      if (abandonLocalIfStale()) return;
      try {
        if (!outputCtx || !inputCtx) {
          throw new Error("Audio contexts unavailable.");
        }

        // Re-resume in case Safari suspended during the credential await
        await Promise.all([
          outputCtx.resume().catch((): undefined => undefined),
          inputCtx.resume().catch((): undefined => undefined),
        ]);
        if (abandonLocalIfStale()) return;

        // Analyser for visualizer (expose via state only after onopen)
        const localAnalyser = outputCtx.createAnalyser();
        localAnalyser.fftSize = 256;
        localAnalyser.connect(outputCtx.destination);
        analyserRef.current = localAnalyser;

        const { ai, model } = credentials;
        const sessionPromise = ai.live.connect({
          model,
          config: {
            responseModalities: [Modality.AUDIO],
            systemInstruction: systemInstructionRef.current,
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceNameRef.current } }
            },
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            tools: [
              { googleSearch: {} },
              {
                functionDeclarations: [
                  {
                    name: "saveToKnowledgeQueue",
                    description: "Save an insight, reference, or piece of knowledge to the user's Pocket (knowledge queue). Use this when you find something valuable on the web or during conversation that the user should retain.",
                    parameters: {
                      type: Type.OBJECT,
                      properties: {
                        content: {
                          type: Type.STRING,
                          description: "The knowledge, insight, or reference to save."
                        },
                        title: {
                          type: Type.STRING,
                          description: "A short, descriptive title for the knowledge."
                        }
                      },
                      required: ["content", "title"]
                    }
                  }
                ]
              }
            ]
          },
          callbacks: {
            onopen: async () => {
              if (currentAttemptRef.current !== currentAttempt) return;
              setIsConnected(true);
              setIsConnecting(false);
              setAnalyser(analyserRef.current);

              try {
                const stream = await micPromise;
                if (currentAttemptRef.current !== currentAttempt) {
                  stream.getTracks().forEach(t => t.stop());
                  return;
                }
                streamRef.current = stream;

                if (!inputContextRef.current) return;

                if (inputContextRef.current.state === 'suspended') {
                  await inputContextRef.current.resume().catch((): undefined => undefined);
                }

                const source = inputContextRef.current.createMediaStreamSource(stream);
                sourceRef.current = source;

                const processor = inputContextRef.current.createScriptProcessor(4096, 1, 1);
                processorRef.current = processor;

                processor.onaudioprocess = (e) => {
                  if (currentAttemptRef.current !== currentAttempt) return;
                  const inputData = e.inputBuffer.getChannelData(0);
                  const pcmData = floatTo16BitPCM(inputData);
                  const uint8Buffer = new Uint8Array(pcmData.buffer);

                  let binary = '';
                  const len = uint8Buffer.byteLength;
                  for (let j = 0; j < len; j++) {
                    binary += String.fromCharCode(uint8Buffer[j]);
                  }
                  const base64 = btoa(binary);

                  sessionPromise.then((session: any) => {
                    if (currentAttemptRef.current !== currentAttempt) return;
                    return session.sendRealtimeInput({
                      audio: {
                        mimeType: 'audio/pcm;rate=16000',
                        data: base64
                      }
                    });
                  }).catch((e: any) => {
                    console.error("MIMI // Failed to send realtime input", e);
                  });
                };

                source.connect(processor);
                processor.connect(inputContextRef.current.destination);
              } catch (e: any) {
                console.warn("Mic Access Failed", e);
                if (currentAttemptRef.current !== currentAttempt) return;
                if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
                  setError("Microphone permission denied. Enable in browser.");
                } else if (e.name === 'NotFoundError' || (e.message && e.message.includes('Requested device not found'))) {
                  setError("No microphone detected.");
                } else {
                  setError("Audio input system failure.");
                }
                disconnect();
              }
            },
            onmessage: async (msg: LiveServerMessage) => {
              if (currentAttemptRef.current !== currentAttempt) return;
              try {
                if (msg.serverContent?.modelTurn?.parts) {
                  msg.serverContent.modelTurn.parts.forEach(part => {
                    if (part.text) {
                      setTranscript(prev => prev + part.text);
                    }
                  });
                }
                if (msg.serverContent?.outputTranscription?.text) {
                  setTranscript(prev => prev + msg.serverContent!.outputTranscription!.text);
                }
                if (msg.serverContent?.inputTranscription?.text) {
                  setTranscript(prev => prev + msg.serverContent!.inputTranscription!.text);
                }

                if (msg.toolCall) {
                  const functionCalls = msg.toolCall.functionCalls;
                  if (functionCalls) {
                    for (const call of functionCalls) {
                      const toolHandler = onToolCallRef.current;
                      if (toolHandler) {
                        try {
                          const response = await toolHandler(call.name, call.args);
                          sessionPromise.then((session: any) => {
                            if (currentAttemptRef.current !== currentAttempt) return;
                            session.sendToolResponse({
                              functionResponses: [{
                                id: call.id,
                                name: call.name,
                                response: response || { status: "success" }
                              }]
                            });
                          });
                        } catch (e) {
                          console.error("MIMI // Tool call failed:", e);
                          sessionPromise.then((session: any) => {
                            if (currentAttemptRef.current !== currentAttempt) return;
                            session.sendToolResponse({
                              functionResponses: [{
                                id: call.id,
                                name: call.name,
                                response: { status: "error", message: String(e) }
                              }]
                            });
                          });
                        }
                      }
                    }
                  }
                }

                const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                if (audioData && audioContextRef.current) {
                  setIsSpeaking(true);
                  if (audioContextRef.current.state === 'suspended') {
                    await audioContextRef.current.resume().catch((): undefined => undefined);
                  }
                  const bytes = base64ToUint8Array(audioData);

                  const dataInt16 = new Int16Array(bytes.buffer);
                  const audioBuffer = audioContextRef.current.createBuffer(1, dataInt16.length, 24000);
                  const channelData = audioBuffer.getChannelData(0);
                  for (let j = 0; j < dataInt16.length; j++) {
                    channelData[j] = dataInt16[j] / 32768.0;
                  }

                  const source = audioContextRef.current.createBufferSource();
                  source.buffer = audioBuffer;

                  if (analyserRef.current) {
                    source.connect(analyserRef.current);
                  } else {
                    source.connect(audioContextRef.current.destination);
                  }

                  const currentTime = audioContextRef.current.currentTime;
                  const startTime = Math.max(currentTime, nextStartTimeRef.current);
                  nextStartTimeRef.current = startTime + audioBuffer.duration;

                  source.start(startTime);
                  source.onended = () => {
                     if (audioContextRef.current && audioContextRef.current.currentTime >= nextStartTimeRef.current) {
                         setIsSpeaking(false);
                     }
                  };
                  audioQueueRef.current.push(source);
                }

                if (msg.serverContent?.interrupted) {
                   audioQueueRef.current.forEach(s => {
                       try { s.stop(); } catch(e) {}
                   });
                   audioQueueRef.current = [];
                   nextStartTimeRef.current = 0;
                   setIsSpeaking(false);
                }
              } catch (e) {
                console.error("MIMI // Error processing live message:", e);
              }
            },
            onclose: () => {
              if (currentAttemptRef.current !== currentAttempt) return;
              setIsConnected(false);
              cleanup();
            },
            onerror: (e: any) => {
              if (currentAttemptRef.current !== currentAttempt) return;
              const errMsg = e?.message || String(e);
              if (errMsg.includes('Deadline expired')) {
                console.warn("MIMI // Live Session ended (timeout).");
              } else if (errMsg.includes('aborted')) {
                console.warn("MIMI // Live Session aborted.");
              } else {
                console.error("Live Session Error", e);
                setError("Connection severed by server.");
              }
              setIsConnected(false);
              cleanup();
            }
          }
        });

        const session = await sessionPromise;
        if (currentAttemptRef.current !== currentAttempt) {
          if (typeof session.close === 'function') {
            try { session.close(); } catch(e) {}
          }
          // Do not shared-cleanup — a newer attempt owns the refs.
          return;
        }
        sessionRef.current = session;
        return; // Success
      } catch (e: any) {
        if (currentAttemptRef.current !== currentAttempt) {
          // Stale — leave the newer attempt alone.
          return;
        }
        console.error(`Connection Attempt ${i + 1} Failed`, e);

        // Soft-reset session/analyser for retry, but keep unlocked audio contexts + credentials.
        if (sessionRef.current && typeof sessionRef.current.close === 'function') {
          try { sessionRef.current.close(); } catch {}
        }
        sessionRef.current = null;
        if (analyserRef.current) {
          try { analyserRef.current.disconnect(); } catch {}
          analyserRef.current = null;
        }
        setAnalyser(null);
        setIsConnected(false);
        setIsConnecting(true);

        if (i === retries - 1) {
          setError(e.message || "Failed to establish link.");
          setIsConnecting(false);
          // Full cleanup only on final failure of the active attempt.
          // If onopen never fired, the eagerly-granted mic stream was never
          // assigned to streamRef, so cleanup() can't stop it — stop it here.
          micPromise.then(s => s.getTracks().forEach(t => t.stop())).catch((): undefined => undefined);
          cleanup();
        } else {
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
      }
    }
  }, [cleanup, disconnect]);

  const sendVideoFrame = useCallback((base64Image: string) => {
    if (sessionRef.current) {
      try {
        const result = sessionRef.current.sendRealtimeInput({
            video: {
                mimeType: 'image/jpeg',
                data: base64Image
            }
        });
        if (result && result.catch) {
          result.catch((e: any) => console.error("MIMI // Error sending video frame promise:", e));
        }
      } catch (e) {
        console.error("MIMI // Error sending video frame:", e);
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      currentAttemptRef.current = 0;
      cleanup();
    };
  }, [cleanup]);

  return { connect, disconnect, isConnected, isConnecting, isSpeaking, volume, error, sendVideoFrame, analyser, transcript };
};
