// 1. CLIENT-SIDE SHA-256 HASH GENERATOR
const generatePromptHash = async (prompt: string, options: any): Promise<string> => {
  const combinedString = prompt + JSON.stringify(options || {});
  const msgUint8 = new TextEncoder().encode(combinedString);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
};

// 2. CLIENT-SIDE LOCAL AI CACHE MANAGER
export interface CachedResponse {
  timestamp: number;
  payload: any;
}

const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 Hours Cache Validity

export const AICacheManager = {
  get: async (prompt: string, options: any): Promise<any | null> => {
    try {
      const key = await generatePromptHash(prompt, options);
      const cachedString = localStorage.getItem(`mimi_cache_${key}`);
      if (!cachedString) return null;

      const cachedData = JSON.parse(cachedString) as CachedResponse;
      const isExpired = Date.now() - cachedData.timestamp > CACHE_EXPIRY_MS;

      if (isExpired) {
        localStorage.removeItem(`mimi_cache_${key}`);
        return null;
      }

      console.info("MIMI // Cache Hit! Bypassed API inference in <2ms. Hash Key:", key);
      return cachedData.payload;
    } catch (err) {
      console.warn("MIMI // AICacheManager GET retrieval failed:", err);
      return null;
    }
  },

  set: async (prompt: string, options: any, payload: any): Promise<void> => {
    try {
      const key = await generatePromptHash(prompt, options);
      const cachedData: CachedResponse = {
        timestamp: Date.now(),
        payload,
      };
      localStorage.setItem(`mimi_cache_${key}`, JSON.stringify(cachedData));
      console.info("MIMI // AICacheManager SET successfully cached Hash Key:", key);
    } catch (err) {
      console.warn("MIMI // AICacheManager SET caching failed:", err);
    }
  },

  clearExpired: (): void => {
    try {
      Object.keys(localStorage)
        .filter((key) => key.startsWith("mimi_cache_"))
        .forEach((key) => {
          try {
            const dataString = localStorage.getItem(key);
            if (dataString) {
              const data = JSON.parse(dataString) as CachedResponse;
              if (Date.now() - data.timestamp > CACHE_EXPIRY_MS) {
                localStorage.removeItem(key);
              }
            }
          } catch {
            localStorage.removeItem(key); // Clear corrupted data
          }
        });
    } catch (err) {
      console.warn("MIMI // AICacheManager Cache Clean failed:", err);
    }
  },
};

// 3. SERVER AI GATEWAY INFERENCE ROUTER & CLIENT-SIDE HANDLER

export const APIKeyRouter = {
  runInference: async (
    prompt: string,
    systemInstruction: string,
    options: { temperature?: number; responseSchema?: any; useCache?: boolean } = {}
  ): Promise<any> => {
    const { useCache = true, temperature = 0.7, responseSchema } = options;

    // A. Intercept and evaluate local cache first
    if (useCache) {
      const cachedPayload = await AICacheManager.get(prompt, { systemInstruction, options });
      if (cachedPayload) return cachedPayload;
    }

    console.info("MIMI // Routing inference through the server AI Gateway.");
    const res = await fetch("/api/proxy/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "generateContent",
        params: {
          contents: prompt,
          config: {
            temperature,
            systemInstruction,
            responseMimeType: responseSchema ? "application/json" : undefined,
            responseSchema,
          },
        },
      }),
    });

    if (!res.ok) {
      if (res.status === 429 || res.status === 402) {
        throw new Error("CENTRAL_ORACLE_LIMIT_EXCEEDED: Mimi's AI Gateway budget is currently unavailable.");
      }
      throw new Error(`Inference pipeline failed with status: ${res.status}`);
    }

    const responseData = await res.json();
    const textResult = responseData.text || "";
    const resultPayload = responseSchema ? JSON.parse(textResult) : textResult;

    // C. Save successfully returned values to cache
    if (useCache && resultPayload) {
      await AICacheManager.set(prompt, { systemInstruction, options }, resultPayload);
    }

    return resultPayload;
  },
};
